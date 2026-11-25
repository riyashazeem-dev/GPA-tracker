import {
  DEFAULT_SCENARIO_ASSUMPTIONS,
  Feasibility,
  GradeCombinationSuggestion,
  ScenarioAssumptions,
  ScenarioResult,
  TargetPlanInput,
  TargetPlanResult,
  YearPlan,
} from '../../models';
import { classify, officialFgpa, round2 } from '../gpa/gpa-engine';

/**
 * Prediction & target-planning engine (pure, deterministic — no AI).
 *
 * The FGPA is linear in the average grade point `g` applied to all remaining
 * GPA-eligible modules:
 *     FGPA(g) = A + B·g
 * where A collects completed-year contributions and fixed partial results, and
 * B is the weighted share of remaining credits. This lets us solve the target
 * exactly, compute the max achievable FGPA, and classify feasibility.
 *
 * Only GPA-eligible, selected modules are supplied by the caller; unselected
 * electives are excluded before reaching here. Uses the official year weights
 * and the authoritative GPA engine for classification.
 */

const YEAR_WEIGHTS = [0.2, 0.2, 0.3, 0.3] as const;
const MAX_G = 4.0;
const MIN_G = 0.0;
const HIGH_PERFORMANCE_THRESHOLD = 3.3;

interface LinearCoeffs {
  A: number;
  B: number;
}

/** Compute FGPA(g) = A + B·g coefficients from the planner input. */
export function linearCoeffs(input: TargetPlanInput): LinearCoeffs {
  let A = 0;
  let B = 0;
  for (let y = 0; y < 4; y++) {
    const completed = input.completedYearGpas[y];
    if (completed != null) {
      A += YEAR_WEIGHTS[y] * completed;
      continue;
    }
    const fixed = input.yearFixed?.[y] ?? { weighted: 0, credits: 0 };
    const remainingCredits = input.remainingModules
      .filter((m) => m.year === y + 1)
      .reduce((s, m) => s + m.credits, 0);
    const total = fixed.credits + remainingCredits;
    if (total <= 0) {
      continue; // no data for this year; contributes nothing
    }
    A += YEAR_WEIGHTS[y] * (fixed.weighted / total);
    B += YEAR_WEIGHTS[y] * (remainingCredits / total);
  }
  return { A, B };
}

/** Projected FGPA if every remaining module earns grade point `g`. */
export function projectedFgpaForGrade(input: TargetPlanInput, g: number): number {
  const { A, B } = linearCoeffs(input);
  return round2(A + B * g);
}

/** Maximum achievable FGPA (all remaining at 4.00). */
export function maxAchievableFgpa(input: TargetPlanInput): number {
  return projectedFgpaForGrade(input, MAX_G);
}

/** Solve the target plan: required average, feasibility, max, suggestions. */
export function solveTargetPlan(input: TargetPlanInput, target: number): TargetPlanResult {
  const { A, B } = linearCoeffs(input);
  const max = A + B * MAX_G;
  const min = A + B * MIN_G;
  const requiredG = B > 0 ? (target - A) / B : null;

  let feasibility: Feasibility;
  if (target > max + 1e-9) {
    feasibility = 'impossible';
  } else if (requiredG == null) {
    feasibility = target <= max + 1e-9 ? 'achievable' : 'impossible';
  } else if (requiredG > HIGH_PERFORMANCE_THRESHOLD) {
    feasibility = 'high-performance';
  } else {
    feasibility = 'achievable';
  }

  const planG = Math.min(Math.max(requiredG ?? MAX_G, MIN_G), MAX_G);

  const yearPlans: YearPlan[] = [0, 1, 2, 3].map((y) => {
    const completedGpa = input.completedYearGpas[y];
    const remainingCredits = input.remainingModules
      .filter((m) => m.year === y + 1)
      .reduce((s, m) => s + m.credits, 0);
    let yearGpa: number | null;
    if (completedGpa != null) {
      yearGpa = completedGpa;
    } else {
      const fixed = input.yearFixed?.[y] ?? { weighted: 0, credits: 0 };
      const total = fixed.credits + remainingCredits;
      yearGpa = total > 0 ? round2((fixed.weighted + planG * remainingCredits) / total) : null;
    }
    return { year: y + 1, completed: completedGpa != null, yearGpa, remainingCredits };
  });

  return {
    currentFgpa: officialFgpa(input.completedYearGpas),
    targetFgpa: target,
    maxAchievableFgpa: round2(max),
    minAchievableFgpa: round2(min),
    requiredAverageGradePoint: requiredG == null ? null : round2(requiredG),
    feasibility,
    targetClass: classify(target),
    bestPossibleClass: classify(round2(max)),
    yearPlans,
    suggestions: buildSuggestions(input, target, requiredG),
  };
}

/** Conservative / realistic / optimistic projections from editable assumptions. */
export function computeScenarios(
  input: TargetPlanInput,
  assumptions: ScenarioAssumptions = DEFAULT_SCENARIO_ASSUMPTIONS,
): ScenarioResult[] {
  const labels: Record<keyof ScenarioAssumptions, string> = {
    conservative: 'Conservative',
    realistic: 'Realistic',
    optimistic: 'Optimistic',
  };
  return (Object.keys(labels) as (keyof ScenarioAssumptions)[]).map((key) => {
    const g = assumptions[key];
    const projected = projectedFgpaForGrade(input, g);
    return { key, label: labels[key], averageGradePoint: g, projectedFgpa: projected, expectedClass: classify(projected) };
  });
}

function buildSuggestions(
  input: TargetPlanInput,
  target: number,
  requiredG: number | null,
): GradeCombinationSuggestion[] {
  const { A, B } = linearCoeffs(input);
  const uniform = [4.0, 3.7, 3.3, 3.0, 2.7, 2.3, 2.0].map((g) => ({
    label: `All remaining at ${gradeLabel(g)} (${g.toFixed(2)})`,
    averageGradePoint: g,
    projectedFgpa: round2(A + B * g),
  }));

  const suggestions = uniform.sort(
    (a, b) => Math.abs(a.projectedFgpa - target) - Math.abs(b.projectedFgpa - target),
  );

  if (requiredG != null && B > 0 && requiredG > 3.0 && requiredG <= MAX_G) {
    const totalCredits = input.remainingModules.reduce((s, m) => s + m.credits, 0);
    const extraNeeded = (requiredG - 3.0) * totalCredits;
    let assigned = 0;
    let creditsAtA = 0;
    for (const m of [...input.remainingModules].sort((a, b) => b.credits - a.credits)) {
      if (assigned >= extraNeeded) break;
      assigned += m.credits; // each credit upgraded 3.0 -> 4.0 adds 1.0
      creditsAtA += m.credits;
    }
    suggestions.unshift({
      label: `Assign A to ~${creditsAtA} credits, B to the rest`,
      averageGradePoint: round2(requiredG),
      projectedFgpa: round2(A + B * requiredG),
    });
  }

  return suggestions.slice(0, 6);
}

function gradeLabel(g: number): string {
  const map: Record<string, string> = {
    '4.0': 'A', '3.7': 'A-', '3.3': 'B+', '3.0': 'B',
    '2.7': 'B-', '2.3': 'C+', '2.0': 'C',
  };
  return map[g.toFixed(1)] ?? g.toFixed(2);
}