/**
 * Student result domain types.
 *
 * IMPORTANT: No sample/fake results are stored in the codebase. Real results
 * are entered by the student and persisted in Supabase. Actual and predicted
 * results are kept separate via `isPredicted`.
 */

export interface CourseResult {
  id: string;
  studentId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  credits: number | null;
  semester: number;
  academicYear: number;
  /** Raw percentage/marks as awarded (null when only a grade was selected). */
  marks: number | null;
  /** Letter grade resolved from the official scale. */
  letterGrade: string | null;
  /** Grade point resolved from the official scale. */
  gradePoint: number | null;
  /** Effective grade point when official repeat rules apply. */
  effectiveGradePoint?: number;
  countsTowardGpa: boolean;
  /** false = actual result; true = predicted/expected result. */
  isPredicted: boolean;
}

export interface SemesterResultSummary {
  semester: number;
  academicYear: number;
  creditsAttempted: number;
  creditsEarned: number;
  semesterGpa: number | null;
}

/** A repeat examination attempt for a result. */
export interface RepeatExamRecord {
  id: string;
  resultId: string;
  attemptNumber: number;
  marks: number | null;
  letterGrade: string | null;
  gradePoint: number | null;
  recordedAt: string;
}
