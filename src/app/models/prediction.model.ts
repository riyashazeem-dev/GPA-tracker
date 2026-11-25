import { Classification } from './gpa.model';

/** A remaining GPA-eligible module for planning (selected electives only). */
export interface PlannerModule {
  year: number;
  credits: number;
}

/** Partial results already recorded in an incomplete year. */
export interface YearFixed {
  weighted: number;
  credits: number;
}

export interface TargetPlanInput {
  /** Completed year GPAs (null = year not yet complete). Length 4. */
  completedYearGpas: (number | null)[];
  /** Remaining GPA-eligible modules (selected electives only). */
  remainingModules: PlannerModule[];
  /** Optional partial results per year (index 0 = year 1). */
  yearFixed?: YearFixed[];
}

export type Feasibility = 'achievable' | 'high-performance' | 'impossible';

export interface YearPlan {
  year: number;
  completed: boolean;
  yearGpa: number | null;
  remainingCredits: number;
}

export interface GradeCombinationSuggestion {
  label: string;
  averageGradePoint: number;
  projectedFgpa: number;
}

export interface TargetPlanResult {
  currentFgpa: number | null;
  targetFgpa: number;
  maxAchievableFgpa: number;
  minAchievableFgpa: number;
  requiredAverageGradePoint: number | null;
  feasibility: Feasibility;
  targetClass: Classification;
  bestPossibleClass: Classification;
  yearPlans: YearPlan[];
  suggestions: GradeCombinationSuggestion[];
}

export interface ScenarioAssumptions {
  conservative: number;
  realistic: number;
  optimistic: number;
}

export interface ScenarioResult {
  key: keyof ScenarioAssumptions;
  label: string;
  averageGradePoint: number;
  projectedFgpa: number;
  expectedClass: Classification;
}

export const DEFAULT_SCENARIO_ASSUMPTIONS: ScenarioAssumptions = {
  conservative: 2.0,
  realistic: 3.0,
  optimistic: 3.7,
};

/* ---- Legacy/simple prediction types (kept for compatibility) ---- */

export interface PredictionInput {
  currentGpa: number;
  completedCredits: number;
  remainingCredits: number;
  targetGpa: number;
}

export interface PredictionResult {
  projectedGpa: number;
  requiredAverageGradePoint: number;
  feasible: boolean;
  notes: string[];
}

export interface TargetPlanCourse {
  courseId: string;
  courseCode: string;
  credits: number;
  requiredGradePoint: number;
}

export interface TargetPlan {
  targetGpa: number;
  projectedGpa: number;
  courses: TargetPlanCourse[];
  createdAt: string;
}

/** Private per-student prediction settings. */
export interface PredictionSettings {
  id: string;
  studentId: string;
  targetGpa: number | null;
  expectedYearGpas: (number | null)[];
  updatedAt: string;
}