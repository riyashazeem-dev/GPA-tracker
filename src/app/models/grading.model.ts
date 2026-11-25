/**
 * Grading domain types.
 *
 * IMPORTANT: The grading scale (letter grades, grade points, and any
 * classification bands) is defined authoritatively in GPA_RULES.md, sourced
 * from the official examination regulations in the project specification.
 * No grade points are hard-coded in the application; they are loaded from the
 * configured grading scale.
 */

export interface LetterGrade {
  /** e.g. "A", "B+", "C" — exact set defined by the regulations. */
  label: string;
  /** Grade point value used in GPA computation. */
  gradePoint: number;
  /** Minimum percentage (inclusive) that maps to this grade, if applicable. */
  minPercentage?: number;
  /** Whether this grade counts toward GPA (e.g. fails may be excluded). */
  countsTowardGpa: boolean;
}

export interface GradingScale {
  id: string;
  name: string;
  grades: LetterGrade[];
}

export type ClassificationBand = 'first' | 'secondUpper' | 'secondLower' | 'general' | 'fail';

export interface ClassificationThreshold {
  band: ClassificationBand;
  minGpa: number;
}