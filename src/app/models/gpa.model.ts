/**
 * GPA / performance domain types.
 *
 * The authoritative computation lives in the GPA engine
 * (`services/gpa/gpa-engine.ts`) and is the ONLY place formulas are defined.
 * The UI and feature code must call the engine, never re-implement formulas.
 */

/** Lifecycle status of a result/year used in GPA reporting. */
export type ResultStatus = 'completed' | 'provisional' | 'projected';

/** Official class classification. */
export type Classification =
  | 'First Class'
  | 'Second Class Upper'
  | 'Second Class Lower'
  | 'Pass'
  | 'Fail';

/**
 * Normalised input for a single module into the GPA engine.
 * The engine decides eligibility; callers must not pre-filter incorrectly.
 */
export interface GpaModuleInput {
  /** Credit value; null when the official value is missing. */
  credits: number | null;
  /** Effective grade point after repeat resolution; null when no valid grade. */
  gradePoint: number | null;
  /** Module-level flag: false = Non-GPA module (excluded). */
  isGpaEligible: boolean;
  /** True for elective slots. */
  isElective: boolean;
  /** For electives: whether the student actually registered for it. */
  isSelected: boolean;
  /** False when the module has no result yet (excluded). */
  hasResult: boolean;
}

/** A single repeat examination attempt. */
export interface RepeatAttempt {
  attemptNumber: number;
  marks: number;
}

/** Configurable repeat-examination policy (regulations are incomplete here). */
export interface RepeatConfig {
  /** Maximum allowed repeat attempts (official: 2). */
  maxAttempts: number;
  /** Determines whether a repeat attempt is successful. Configurable. */
  isSuccess: (marks: number, attemptNumber: number) => boolean;
  /** Grade point awarded for a successful repeat (official: 2.00). */
  successfulRepeatGradePoint: number;
  /** Maximum grade point awardable after a repeat (official: C = 2.00). */
  maxAwardedGradePointAfterRepeat: number;
}

/** Outcome of resolving a module that may have repeat attempts. */
export interface RepeatResolution {
  effectiveGradePoint: number;
  counted: boolean;
  success: boolean;
  attemptsUsed: number;
  replaced: boolean;
  warnings: string[];
}

export interface GpaSummary {
  cumulativeGpa: number | null;
  cumulativeCredits: number;
  classification: Classification | null;
}

export interface GpaTrendPoint {
  semester: number;
  academicYear: number;
  gpa: number | null;
}

export interface GpaComputationInput {
  results: Array<{
    credits: number | null;
    gradePoint: number | null;
    countsTowardGpa: boolean;
  }>;
}