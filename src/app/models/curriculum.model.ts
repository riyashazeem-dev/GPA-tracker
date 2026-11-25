/**
 * Curriculum domain types.
 *
 * IMPORTANT: These interfaces describe the *shape* of curriculum data only.
 * No modules, course codes, or credit values are defined here. The authoritative
 * course catalogue is defined in CURRICULUM_SPEC.md, sourced from the official
 * university curriculum supplied in the project specification.
 */

export type CourseCategory =
  | 'core'
  | 'elective'
  | 'general'
  | 'practical'
  | 'project'
  // Official curriculum labels (preserved verbatim from the source JSON).
  | 'Core'
  | 'Elective'
  | 'Compulsory'
  | 'Compulsory (Non-GPA)';

export type SemesterNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Course {
  id: string;
  code: string;
  title: string;
  credits: number | null;
  category: CourseCategory;
  semester: SemesterNumber;
  year: number;
  prerequisites: string[];
  hasPractical: boolean;
  /** false = Non-GPA module (excluded from GPA). */
  gpaEligible: boolean;
  /** true = elective slot (does not auto-exclude from GPA). */
  isElective: boolean;
}

export interface Curriculum {
  id: string;
  program: string;
  department: string;
  faculty: string;
  totalCredits: number;
  durationYears: number;
  courses: Course[];
}

export interface Semester {
  number: SemesterNumber;
  year: number;
  courseIds: string[];
}