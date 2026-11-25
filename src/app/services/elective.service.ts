import { Injectable } from '@angular/core';
import { supabase } from '../core/supabase/supabase.client';
import { Course } from '../models';

interface ElectiveRequirementRow {
  semester: number;
  required_credits: number;
}

/**
 * Elective registration. Only electives a student actually selected are saved
 * and later used in GPA (unselected electives are excluded by the engine).
 */
@Injectable({ providedIn: 'root' })
export class ElectiveService {
  /** Elective courses available for a department/version/semester. */
  async getElectiveCourses(
    departmentId: string,
    curriculumVersionId: string,
    semester: number,
  ): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('department_id', departmentId)
      .eq('curriculum_version_id', curriculumVersionId)
      .eq('is_elective', true)
      .eq('semester', semester)
      .order('code');
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      code: r.code,
      title: r.name,
      credits: r.credits,
      category: r.category,
      semester: r.semester,
      year: r.year ?? 1,
      prerequisites: r.prerequisites ?? [],
      hasPractical: r.has_practical ?? false,
      gpaEligible: r.gpa_eligible ?? true,
      isElective: true,
    })) as Course[];
  }

  /** Required elective credits for a department (all semesters). */
  async getRequirements(departmentId: string): Promise<ElectiveRequirementRow[]> {
    const { data, error } = await supabase
      .from('elective_requirements')
      .select('semester, required_credits')
      .eq('department_id', departmentId);
    if (error) throw error;
    return (data ?? []) as ElectiveRequirementRow[];
  }

  /** Currently registered elective course ids for a student/year. */
  async getSelections(studentId: string, academicYear: number): Promise<string[]> {
    const { data, error } = await supabase
      .from('student_elective_selections')
      .select('course_id')
      .eq('student_id', studentId)
      .eq('academic_year', academicYear);
    if (error) throw error;
    return (data ?? []).map((r) => r.course_id as string);
  }

  /** Validate that selected elective credits meet the requirement. */
  validateCredits(selectedCredits: number, requiredCredits: number): boolean {
    return selectedCredits >= requiredCredits;
  }

  /** Persist the student's elective selections (replaces the set for the year). */
  async saveSelections(studentId: string, courseIds: string[], academicYear: number): Promise<void> {
    const { error: delError } = await supabase
      .from('student_elective_selections')
      .delete()
      .eq('student_id', studentId)
      .eq('academic_year', academicYear);
    if (delError) throw delError;

    if (courseIds.length === 0) return;
    const rows = courseIds.map((courseId) => ({
      student_id: studentId,
      course_id: courseId,
      academic_year: academicYear,
    }));
    const { error } = await supabase.from('student_elective_selections').insert(rows);
    if (error) throw error;
  }
}