import { Injectable } from '@angular/core';
import {
  Course,
  CourseResult,
  GpaModuleInput,
  ScenarioAssumptions,
  ScenarioResult,
  TargetPlanInput,
  TargetPlanResult,
} from '../models';
import { computeGpa } from './gpa/gpa-engine';
import {
  computeScenarios,
  projectedFgpaForGrade,
  solveTargetPlan,
} from './prediction/prediction-engine';

/**
 * Prediction & target-planning facade. Assembles the planner input from real
 * Supabase data and delegates all maths to the pure prediction engine (which
 * itself uses the authoritative GPA engine). No AI, no duplicate formulas.
 */
@Injectable({ providedIn: 'root' })
export class PredictionService {
  /**
   * Build the target-planner input from the student's modules, actual results,
   * and registered elective selections. Unselected electives and Non-GPA
   * modules are excluded; only remaining GPA-eligible modules are planned.
   */
  buildInput(
    modules: Course[],
    results: CourseResult[],
    selectedCourseIds: string[],
  ): TargetPlanInput {
    const selected = new Set(selectedCourseIds);
    const resultByCourse = new Map(results.map((r) => [r.courseId, r]));

    const eligible = modules.filter(
      (m) => m.gpaEligible !== false && (!m.isElective || selected.has(m.id)),
    );

    const completedYearGpas: (number | null)[] = [null, null, null, null];
    const remainingModules: TargetPlanInput['remainingModules'] = [];
    const yearFixed: { weighted: number; credits: number }[] = [
      { weighted: 0, credits: 0 },
      { weighted: 0, credits: 0 },
      { weighted: 0, credits: 0 },
      { weighted: 0, credits: 0 },
    ];

    for (let year = 1; year <= 4; year++) {
      const yearModules = eligible.filter((m) => Math.ceil(m.semester / 2) === year);
      const yearResults = results.filter(
        (r) => Math.ceil(r.semester / 2) === year && resultByCourse.has(r.courseId),
      );
      const completed =
        yearModules.length > 0 && yearModules.every((m) => resultByCourse.has(m.id));

      if (completed) {
        completedYearGpas[year - 1] = computeGpa(this.toModules(yearResults));
      } else {
        for (const m of yearModules) {
          if (m.credits != null && !resultByCourse.has(m.id)) {
            remainingModules.push({ year, credits: m.credits });
          }
        }
        yearFixed[year - 1] = {
          weighted: yearResults.reduce((s, r) => s + (r.credits ?? 0) * (r.gradePoint ?? 0), 0),
          credits: yearResults.reduce((s, r) => s + (r.credits ?? 0), 0),
        };
      }
    }

    return { completedYearGpas, remainingModules, yearFixed };
  }

  /** Projected FGPA for a uniform expected grade point across remaining modules. */
  projectedFgpa(input: TargetPlanInput, gradePoint: number): number {
    return projectedFgpaForGrade(input, gradePoint);
  }

  /** Conservative / realistic / optimistic scenarios. */
  scenarios(input: TargetPlanInput, assumptions?: ScenarioAssumptions): ScenarioResult[] {
    return computeScenarios(input, assumptions);
  }

  /** Full target plan: required average, feasibility, max achievable, suggestions. */
  solve(input: TargetPlanInput, targetFgpa: number): TargetPlanResult {
    return solveTargetPlan(input, targetFgpa);
  }

  /** Expected semester GPA from modules carrying expected grade points. */
  expectedSemesterGpa(modules: GpaModuleInput[]): number | null {
    return computeGpa(modules);
  }

  private toModules(results: CourseResult[]): GpaModuleInput[] {
    return results.map((r) => ({
      credits: r.credits,
      gradePoint: r.gradePoint,
      isGpaEligible: r.countsTowardGpa,
      isElective: false,
      isSelected: true,
      hasResult: true,
    }));
  }
}