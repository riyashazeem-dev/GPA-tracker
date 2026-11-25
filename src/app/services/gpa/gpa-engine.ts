import {
  Classification,
  GpaModuleInput,
  RepeatAttempt,
  RepeatConfig,
  RepeatResolution,
} from '../../models';
import { DEFAULT_REPEAT_CONFIG } from './repeat-policy';

// Re-export the grading scale so the engine is a one-stop import for callers/tests.
export { gradeForMarks, gradePointForMarks, OFFICIAL_GRADE_SCALE } from './grading-scale';
export type { RepeatAttempt, RepeatConfig, RepeatResolution };

/**
 * Authoritative GPA calculation engine.
 *
 * This is the ONLY place GPA / FGPA / classification formulas are defined.
 * UI and services must call these functions and never re-implement the maths.
 *
 * Rules implemented (from the official examination regulations):
 *  - Semester GPA = Σ(credit × gradePoint) / Σ(credits) over eligible modules.
 *  - Year GPA = combined credit-weighted result of both semesters (never an
 *    average of the two semester GPAs).
 *  - FGPA = 0.20·Y1 + 0.20·Y2 + 0.30·Y3 + 0.30·Y4 (official weighting).
 *  - Missing future results are NOT treated as zero; official FGPA is null
 *    until all four years are complete.
 */

const YEAR_WEIGHTS = [0.2, 0.2, 0.3, 0.3] as const;

/** Round to two decimal places (half-up, tolerant of float error). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** A module counts toward GPA only if it satisfies every eligibility rule. */
export function isGpaEligible(m: GpaModuleInput): boolean {
  return (
    m.hasResult &&
    m.isGpaEligible &&
    m.credits != null &&
    m.credits > 0 &&
    m.gradePoint != null &&
    (!m.isElective || m.isSelected)
  );
}

/** Core credit-weighted GPA from aggregate totals. Null when no credits. */
export function gpaFromTotals(totalWeightedPoints: number, totalCredits: number): number | null {
  if (totalCredits <= 0) {
    return null;
  }
  return round2(totalWeightedPoints / totalCredits);
}

/** Semester GPA over a set of modules. Null when no eligible credits. */
export function computeGpa(modules: readonly GpaModuleInput[]): number | null {
  let totalCredits = 0;
  let totalWeighted = 0;
  for (const m of modules) {
    if (!isGpaEligible(m)) {
      continue;
    }
    totalCredits += m.credits as number;
    totalWeighted += (m.credits as number) * (m.gradePoint as number);
  }
  return gpaFromTotals(totalWeighted, totalCredits);
}

/**
 * Year GPA from the semesters that make up the year (1+2, 3+4, 5+6, 7+8).
 * Combines credits across both semesters — never averages semester GPAs.
 */
export function yearGpa(semesters: readonly (readonly GpaModuleInput[])[]): number | null {
  return computeGpa(semesters.flat());
}

/**
 * Official FGPA. Returns null if any year GPA is missing (incomplete), so a
 * partial year is never presented as an official completed FGPA.
 */
export function officialFgpa(yearGpas: readonly (number | null)[]): number | null {
  if (yearGpas.length !== 4) {
    throw new Error('officialFgpa requires exactly 4 year GPAs');
  }
  if (yearGpas.some((g) => g == null)) {
    return null;
  }
  const total = yearGpas.reduce<number>(
    (sum, g, i) => sum + YEAR_WEIGHTS[i] * (g as number),
    0,
  );
  return round2(total);
}

/**
 * Projected FGPA using explicitly supplied expected year GPAs for all four
 * years (including unfinished years). Never silently substitutes zero.
 */
export function projectedFgpa(yearGpas: readonly number[]): number {
  if (yearGpas.length !== 4) {
    throw new Error('projectedFgpa requires exactly 4 projected year GPAs');
  }
  const total = yearGpas.reduce<number>((sum, g, i) => sum + YEAR_WEIGHTS[i] * g, 0);
  return round2(total);
}

/** Official class classification from a GPA (evaluated on the rounded value). */
export function classify(gpa: number): Classification {
  const g = round2(gpa);
  if (g >= 3.7) {
    return 'First Class';
  }
  if (g >= 3.3) {
    return 'Second Class Upper';
  }
  if (g >= 2.7) {
    return 'Second Class Lower';
  }
  if (g >= 2.0) {
    return 'Pass';
  }
  return 'Fail';
}

/**
 * Resolve a module that may have repeat attempts into a single effective
 * grade point. The same module is never counted twice: callers must pass the
 * original module once and use the returned effective grade point.
 */
export function resolveRepeat(
  originalGradePoint: number,
  originalGrade: string,
  attempts: readonly RepeatAttempt[],
  config: RepeatConfig = DEFAULT_REPEAT_CONFIG,
): RepeatResolution {
  const warnings: string[] = [];
  const sorted = [...attempts].sort((a, b) => a.attemptNumber - b.attemptNumber);
  const used = sorted.slice(0, config.maxAttempts);
  if (sorted.length > config.maxAttempts) {
    warnings.push(`Only ${config.maxAttempts} repeat attempts are allowed; extra attempts ignored.`);
  }

  // Grades below C (grade point < 2.00) may be repeated.
  const canRepeat = originalGradePoint < 2.0;
  if (used.length === 0 || !canRepeat) {
    return {
      effectiveGradePoint: originalGradePoint,
      counted: true,
      success: false,
      attemptsUsed: 0,
      replaced: false,
      warnings,
    };
  }

  for (const attempt of used) {
    const success = config.isSuccess(attempt.marks, attempt.attemptNumber);
    if (originalGrade === 'E' && attempt.attemptNumber === 1 && !success) {
      warnings.push('E grade was not improved at the first available opportunity.');
    }
    if (success) {
      const awarded = Math.min(
        config.successfulRepeatGradePoint,
        config.maxAwardedGradePointAfterRepeat,
      );
      return {
        effectiveGradePoint: awarded,
        counted: true,
        success: true,
        attemptsUsed: attempt.attemptNumber,
        replaced: true,
        warnings,
      };
    }
  }

  return {
    effectiveGradePoint: originalGradePoint,
    counted: true,
    success: false,
    attemptsUsed: used.length,
    replaced: false,
    warnings,
  };
}