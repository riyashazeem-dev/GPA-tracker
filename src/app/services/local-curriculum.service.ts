import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/**
 * Loads the official department curriculum directly from the bundled JSON in
 * `src/assets/data/`. This powers LOCAL DEVELOPMENT MODE and requires no
 * Supabase backend. Source data is never modified or invented.
 */
export type DepartmentCode = 'IS' | 'SE' | 'DS';

export interface LocalCourse {
  code: string;
  name: string;
  credits: number | null;
  category: string;
  gpaEligible: boolean;
  isElective: boolean;
}

export interface LocalSemester {
  semester: number;
  officialTotalCredits: number;
  officialCoreCredits: number;
  officialElectiveCredits: number;
  requiredElectiveCredits: number | null;
  courses: LocalCourse[];
}

export interface LocalCurriculum {
  department: DepartmentCode;
  degreeName: string;
  semesters: LocalSemester[];
}

interface RawCourse {
  course_code: string;
  course_name: string;
  credits: number | null;
  category: string;
  gpa_eligible: boolean;
}

interface RawSemester {
  semester: number;
  courses: RawCourse[];
  official_total_credits: number;
  official_core_credits: number;
  official_elective_credits: number;
  required_elective_credits: number | null;
}

interface RawCurriculum {
  department: DepartmentCode;
  degree_name: string;
  semesters: RawSemester[];
}

@Injectable({ providedIn: 'root' })
export class LocalCurriculumService {
  readonly departments: { code: DepartmentCode; name: string }[] = [
    { code: 'IS', name: 'Information Systems' },
    { code: 'SE', name: 'Software Engineering' },
    { code: 'DS', name: 'Data Science' },
  ];

  private readonly cache = new Map<DepartmentCode, LocalCurriculum>();

  constructor(private readonly http: HttpClient) {}

  async load(code: DepartmentCode): Promise<LocalCurriculum> {
    const cached = this.cache.get(code);
    if (cached) return cached;

    const raw = await firstValueFrom(
      this.http.get<RawCurriculum>(`assets/data/${code.toLowerCase()}-curriculum.json`),
    );

    const curriculum: LocalCurriculum = {
      department: raw.department,
      degreeName: raw.degree_name,
      semesters: raw.semesters.map((s) => ({
        semester: s.semester,
        officialTotalCredits: s.official_total_credits,
        officialCoreCredits: s.official_core_credits,
        officialElectiveCredits: s.official_elective_credits,
        requiredElectiveCredits: s.required_elective_credits ?? null,
        courses: s.courses.map((c) => ({
          code: c.course_code,
          name: c.course_name,
          credits: c.credits ?? null,
          category: c.category,
          gpaEligible: c.gpa_eligible,
          isElective: c.category === 'Elective',
        })),
      })),
    };

    this.cache.set(code, curriculum);
    return curriculum;
  }
}