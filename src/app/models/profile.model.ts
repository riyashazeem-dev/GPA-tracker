import { UserRole } from './user.model';

/** Student/admin profile stored in Supabase (extends auth.users). */
export interface Profile {
  id: string;
  email: string | null;
  role: UserRole;
  departmentId: string | null;
  curriculumVersionId: string | null;
  currentSemester: number | null;
  intakeYear: number | null;
  faculty: string | null;
  createdAt: string;
}

/** Choices captured during first-login onboarding. */
export interface OnboardingSelection {
  departmentId: string;
  curriculumVersionId: string;
  currentSemester: number;
}

/** A selectable department option. */
export interface DepartmentOption {
  id: string;
  code: string;
  name: string;
}

/** A selectable curriculum version option. */
export interface CurriculumVersionOption {
  id: string;
  departmentId: string;
  version: string;
}