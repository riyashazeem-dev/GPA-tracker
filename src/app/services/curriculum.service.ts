import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LocalCurriculumService, DepartmentCode } from './local-curriculum.service';

export type { DepartmentCode };

export interface Department {
  code: DepartmentCode;
  name: string;
}

export interface Course {
  code: string;
  name: string;
  credits: number | null;
  category: string;
  gpaEligible: boolean;
  isElective: boolean;
  semester: number;
}

export interface Semester {
  number: number;
  courses: Course[];
  officialTotalCredits: number;
  requiredElectiveCredits: number | null;
}

export interface Curriculum {
  department: DepartmentCode;
  degreeName: string;
  semesters: Semester[];
}

export interface GradeBand {
  grade: string;
  minimumMark: number;
  maximumMark: number;
  gradePoint: number;
}

export interface AcademicRules {
  gradingScale: GradeBand[];
  fgpaYearWeights: Record<string, number>;
  classifications: { minimumFgpa: number; maximumFgpa: number; class: string }[];
  electiveRequirements: Record<string, Record<string, number>>;
  calculationNotes: string[];
}

interface RawRules {
  grading_scale: GradeBand[];
  fgpa_year_weights: Record<string, number>;
  classifications: { minimum_fgpa: number; maximum_fgpa: number; class: string }[];
  elective_requirements: Record<string, Record<string, number>>;
  calculation_notes: string[];
}

/**
 * Reusable curriculum service. Loads the official JSON (no Supabase required)
 * and exposes the full department/semester/course/rules API used by the UI.
 */
@Injectable({ providedIn: 'root' })
export class CurriculumService {
  private rulesCache: AcademicRules | null = null;

  constructor(
    private readonly local: LocalCurriculumService,
    private readonly http: HttpClient,
  ) {}

  getDepartments(): Department[] {
    return this.local.departments;
  }

  async getCurriculum(department: DepartmentCode): Promise<Curriculum> {
    const c = await this.local.load(department);
    return {
      department: c.department,
      degreeName: c.degreeName,
      semesters: c.semesters.map((s) => ({
        number: s.semester,
        requiredElectiveCredits: s.requiredElectiveCredits,
        officialTotalCredits: s.officialTotalCredits,
        courses: s.courses.map((x) => ({ ...x, semester: s.semester })),
      })),
    };
  }

  async getSemesterCourses(department: DepartmentCode, semesterNumber: number): Promise<Course[]> {
    const c = await this.getCurriculum(department);
    return c.semesters.find((s) => s.number === semesterNumber)?.courses ?? [];
  }

  async getCourseByCode(courseCode: string): Promise<{ course: Course; department: DepartmentCode } | null> {
    for (const d of this.getDepartments()) {
      const c = await this.getCurriculum(d.code);
      for (const s of c.semesters) {
        const found = s.courses.find((x) => x.code === courseCode);
        if (found) return { course: found, department: d.code };
      }
    }
    return null;
  }

  async getCourseCount(department: DepartmentCode): Promise<number> {
    const c = await this.getCurriculum(department);
    return c.semesters.reduce((sum, s) => sum + s.courses.length, 0);
  }

  async getAcademicRules(): Promise<AcademicRules> {
    if (this.rulesCache) return this.rulesCache;
    const raw = await firstValueFrom(
      this.http.get<RawRules>('assets/data/official-academic-rules.json'),
    );
    this.rulesCache = {
      gradingScale: raw.grading_scale,
      fgpaYearWeights: raw.fgpa_year_weights,
      classifications: raw.classifications.map((c) => ({
        minimumFgpa: c.minimum_fgpa,
        maximumFgpa: c.maximum_fgpa,
        class: c.class,
      })),
      electiveRequirements: raw.elective_requirements,
      calculationNotes: raw.calculation_notes,
    };
    return this.rulesCache;
  }
}