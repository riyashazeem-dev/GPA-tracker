import { Injectable, inject } from '@angular/core';
import { supabase } from '../core/supabase/supabase.client';
import { Course, CourseResult, Profile, RepeatExamRecord } from '../models';
import { gradeForMarks, gradePointForMarks, resolveRepeat } from './gpa';
import { ElectiveService } from './elective.service';

interface CourseRow {
  id: string;
  code: string;
  name: string;
  credits: number | null;
  category: string;
  semester: number;
  year: number | null;
  prerequisites: string[] | null;
  has_practical: boolean | null;
  gpa_eligible: boolean | null;
  is_elective: boolean | null;
}

interface ResultRow {
  id: string;
  student_id: string;
  course_id: string;
  semester: number;
  academic_year: number;
  marks: number | null;
  letter_grade: string | null;
  grade_point: number | null;
  counts_toward_gpa: boolean;
  is_predicted: boolean;
  courses?: CourseRow;
  repeat_exam_records?: { attempt_number: number; marks: number | null }[];
}

/**
 * Student academic records: registered modules, results CRUD (actual vs
 * predicted kept separate), and repeat attempts. RLS restricts to the owner.
 */
@Injectable({ providedIn: 'root' })
export class StudentRecordsService {
  private readonly electives = inject(ElectiveService);

  async getProgrammeRecords(profile: Profile) {
    const [courses, results] = await Promise.all([
      this.getRegisteredModules(profile),
      this.getResults(profile.id),
    ]);
    const academicYear = new Date().getFullYear();
    const years = new Set([academicYear, ...results.map((result) => result.academicYear)]);
    const electiveSelections = new Map(await Promise.all([...years].map(async (year) =>
      [year, new Set(await this.electives.getSelections(profile.id, year))] as const,
    )));
    return { courses, results, electiveSelections, academicYear };
  }

  async saveSemesterGrades(semester: number, grades: Record<string, string | null>): Promise<void> {
    const { error } = await supabase.rpc('save_semester_grades', { p_semester: semester, p_grades: grades });
    if (error) throw error;
  }

  /** Modules registered by the curriculum for the student's department/version. */
  async getRegisteredModules(profile: Profile, semester?: number): Promise<Course[]> {
    if (!profile.departmentId || !profile.curriculumVersionId) {
      return [];
    }
    let query = supabase
      .from('courses')
      .select('*')
      .eq('department_id', profile.departmentId)
      .eq('curriculum_version_id', profile.curriculumVersionId);
    if (semester !== undefined) {
      query = query.eq('semester', semester);
    }
    const { data, error } = await query.order('semester').order('code');
    if (error) throw error;
    return (data ?? []).map((r) => this.mapCourse(r as CourseRow));
  }

  /** Saved results for a student; actual and predicted are separated by flag. */
  async getResults(studentId: string, isPredicted = false): Promise<CourseResult[]> {
    const { data, error } = await supabase
      .from('results')
      .select('*, courses(*), repeat_exam_records(attempt_number, marks)')
      .eq('student_id', studentId)
      .eq('is_predicted', isPredicted)
      .order('academic_year', { ascending: true })
      .order('semester', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => this.mapResult(r as ResultRow));
  }

  /** Create or update a result. Marks are converted to the official grade. */
  async saveResult(input: {
    studentId: string;
    courseId: string;
    semester: number;
    academicYear: number;
    marks?: number | null;
    letterGrade?: string | null;
    countsTowardGpa?: boolean;
    isPredicted?: boolean;
    id?: string;
  }): Promise<CourseResult> {
    if (input.marks != null && (Number.isNaN(input.marks) || input.marks < 0 || input.marks > 100)) {
      throw new Error('Marks must be between 0 and 100.');
    }
    const validGrades = new Set(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'E']);
    if (input.letterGrade && !validGrades.has(input.letterGrade)) {
      throw new Error('Invalid letter grade.');
    }
    const gradePoint =
      input.marks != null ? gradePointForMarks(input.marks) : this.gradePointForLetter(input.letterGrade);
    const letterGrade =
      input.marks != null ? gradeForMarks(input.marks) : (input.letterGrade ?? null);

    const payload = {
      student_id: input.studentId,
      course_id: input.courseId,
      semester: input.semester,
      academic_year: input.academicYear,
      marks: input.marks ?? null,
      letter_grade: letterGrade,
      grade_point: gradePoint,
      counts_toward_gpa: (input.countsTowardGpa ?? true) && gradePoint != null,
      is_predicted: input.isPredicted ?? false,
    };

    const { data, error } = input.id
      ? await supabase.from('results').update(payload).eq('id', input.id).select('*, courses(*)').single()
      : await supabase.from('results').insert(payload).select('*, courses(*)').single();
    if (error) throw error;
    return this.mapResult(data as ResultRow);
  }

  async deleteResult(id: string): Promise<void> {
    const { error } = await supabase.from('results').delete().eq('id', id);
    if (error) throw error;
  }

  /** Record a repeat attempt and return the effective grade point per Phase 3. */
  async addRepeatAttempt(resultId: string, attemptNumber: number, marks: number) {
    const { error } = await supabase
      .from('repeat_exam_records')
      .insert({ result_id: resultId, attempt_number: attemptNumber, marks });
    if (error) throw error;
    return this.resolveRepeatForResult(resultId);
  }

  async getRepeats(resultId: string): Promise<RepeatExamRecord[]> {
    const { data, error } = await supabase
      .from('repeat_exam_records')
      .select('*')
      .eq('result_id', resultId)
      .order('attempt_number');
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      resultId: r.result_id,
      attemptNumber: r.attempt_number,
      marks: r.marks,
      letterGrade: r.letter_grade,
      gradePoint: r.grade_point,
      recordedAt: r.recorded_at,
    }));
  }

  /** Resolve the effective grade point for a result using the repeat engine. */
  async resolveRepeatForResult(resultId: string) {
    const { data: result, error } = await supabase
      .from('results')
      .select('id, grade_point, letter_grade')
      .eq('id', resultId)
      .single();
    if (error) throw error;
    const repeats = await this.getRepeats(resultId);
    return resolveRepeat(
      result.grade_point ?? 0,
      result.letter_grade ?? '',
      repeats.map((r) => ({ attemptNumber: r.attemptNumber, marks: r.marks ?? 0 })),
    );
  }

  private gradePointForLetter(letter: string | null | undefined): number | null {
    if (!letter) return null;
    const map: Record<string, number> = {
      'A+': 4.0, A: 4.0, 'A-': 3.7, 'B+': 3.3, B: 3.0, 'B-': 2.7,
      'C+': 2.3, C: 2.0, 'C-': 1.7, 'D+': 1.3, D: 1.0, E: 0.0,
    };
    return map[letter] ?? null;
  }

  private mapCourse(r: CourseRow): Course {
    return {
      id: r.id,
      code: r.code,
      title: r.name,
      credits: r.credits,
      category: r.category as Course['category'],
      semester: r.semester as Course['semester'],
      year: r.year ?? 1,
      prerequisites: r.prerequisites ?? [],
      hasPractical: r.has_practical ?? false,
      gpaEligible: r.gpa_eligible ?? true,
      isElective: r.is_elective ?? false,
    };
  }

  private mapResult(r: ResultRow): CourseResult {
    const c = r.courses;
    const repeats = r.repeat_exam_records?.filter((attempt) => attempt.marks != null);
    const effectiveGradePoint = repeats?.length && r.grade_point != null
      ? resolveRepeat(r.grade_point, r.letter_grade ?? '', repeats.map((attempt) => ({
          attemptNumber: attempt.attempt_number, marks: attempt.marks!,
        }))).effectiveGradePoint
      : undefined;
    return {
      id: r.id,
      studentId: r.student_id,
      courseId: r.course_id,
      courseCode: c?.code ?? '',
      courseTitle: c?.name ?? '',
      credits: c?.credits ?? null,
      semester: r.semester,
      academicYear: r.academic_year,
      marks: r.marks,
      letterGrade: r.letter_grade,
      gradePoint: r.grade_point,
      effectiveGradePoint,
      countsTowardGpa: r.counts_toward_gpa,
      isPredicted: r.is_predicted,
    };
  }
}
