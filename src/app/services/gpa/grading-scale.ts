/**
 * Official university grade scale (source of truth: examination regulations).
 * Do not edit values here without a corresponding regulation change.
 */
export interface GradeBand {
  grade: string;
  min: number;
  max: number;
  gradePoint: number;
}

export const OFFICIAL_GRADE_SCALE: readonly GradeBand[] = [
  { grade: 'A+', min: 90, max: 100, gradePoint: 4.0 },
  { grade: 'A', min: 80, max: 89, gradePoint: 4.0 },
  { grade: 'A-', min: 75, max: 79, gradePoint: 3.7 },
  { grade: 'B+', min: 70, max: 74, gradePoint: 3.3 },
  { grade: 'B', min: 65, max: 69, gradePoint: 3.0 },
  { grade: 'B-', min: 60, max: 64, gradePoint: 2.7 },
  { grade: 'C+', min: 55, max: 59, gradePoint: 2.3 },
  { grade: 'C', min: 50, max: 54, gradePoint: 2.0 },
  { grade: 'C-', min: 45, max: 49, gradePoint: 1.7 },
  { grade: 'D+', min: 40, max: 44, gradePoint: 1.3 },
  { grade: 'D', min: 30, max: 39, gradePoint: 1.0 },
  { grade: 'E', min: 0, max: 29, gradePoint: 0.0 },
] as const;

/** Convert a mark (0–100) to its official grade point, or null if invalid. */
export function gradePointForMarks(marks: number | null | undefined): number | null {
  if (marks == null || Number.isNaN(marks) || marks < 0 || marks > 100) {
    return null;
  }
  const band = OFFICIAL_GRADE_SCALE.find((b) => marks >= b.min && marks <= b.max);
  return band ? band.gradePoint : null;
}

/** Convert a mark (0–100) to its official letter grade, or null if invalid. */
export function gradeForMarks(marks: number | null | undefined): string | null {
  if (marks == null || Number.isNaN(marks) || marks < 0 || marks > 100) {
    return null;
  }
  const band = OFFICIAL_GRADE_SCALE.find((b) => marks >= b.min && marks <= b.max);
  return band ? band.grade : null;
}