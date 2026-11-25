import { describe, expect, it } from 'vitest';
import {
  computeScenarios,
  linearCoeffs,
  maxAchievableFgpa,
  projectedFgpaForGrade,
  solveTargetPlan,
} from './prediction-engine';
import { PredictionService } from '../prediction.service';
import { Course, TargetPlanInput } from '../../models';

function input(partial: Partial<TargetPlanInput>): TargetPlanInput {
  return {
    completedYearGpas: [null, null, null, null],
    remainingModules: [],
    yearFixed: [],
    ...partial,
  };
}

function mods(year: number, credits: number) {
  return { year, credits };
}

describe('linear FGPA model', () => {
  it('computes A and B coefficients', () => {
    const { A, B } = linearCoeffs(
      input({ completedYearGpas: [3.0, 3.0, null, null], remainingModules: [mods(3, 10), mods(4, 10)] }),
    );
    // A = 0.2*3 + 0.2*3 = 1.2 ; B = 0.3*1 + 0.3*1 = 0.6
    expect(A).toBeCloseTo(1.2, 5);
    expect(B).toBeCloseTo(0.6, 5);
  });

  it('projects FGPA for a uniform grade', () => {
    const i = input({ remainingModules: [mods(1, 10), mods(2, 10), mods(3, 10), mods(4, 10)] });
    // B = 1, A = 0 -> FGPA(g) = g
    expect(projectedFgpaForGrade(i, 3.7)).toBe(3.7);
  });
});

describe('target feasibility', () => {
  it('all years complete, no remaining: achievable only at/below current', () => {
    const i = input({ completedYearGpas: [3.0, 3.0, 3.0, 3.0] });
    const ok = solveTargetPlan(i, 3.0);
    expect(ok.feasibility).toBe('achievable');
    expect(ok.maxAchievableFgpa).toBe(3.0);

    const impossible = solveTargetPlan(i, 3.5);
    expect(impossible.feasibility).toBe('impossible');
    expect(impossible.maxAchievableFgpa).toBe(3.0);
    expect(impossible.bestPossibleClass).toBe('Second Class Lower');
  });

  it('no completed first year (boundary) still plans all four years', () => {
    const i = input({ remainingModules: [mods(1, 10), mods(2, 10), mods(3, 20), mods(4, 20)] });
    const plan = solveTargetPlan(i, 3.7);
    expect(plan.currentFgpa).toBeNull();
    expect(plan.maxAchievableFgpa).toBe(4.0);
    expect(plan.requiredAverageGradePoint).toBe(3.7);
    expect(plan.feasibility).toBe('high-performance');
    expect(plan.yearPlans).toHaveLength(4);
  });

  it('classifies achievable vs high-performance vs impossible', () => {
    const i = input({ remainingModules: [mods(1, 10), mods(2, 10), mods(3, 10), mods(4, 10)] });
    expect(solveTargetPlan(i, 2.5).feasibility).toBe('achievable');
    expect(solveTargetPlan(i, 3.5).feasibility).toBe('high-performance');
    expect(solveTargetPlan(i, 4.5).feasibility).toBe('impossible');
  });

  it('respects different module credit values', () => {
    const i = input({ remainingModules: [mods(1, 4), mods(1, 1)] });
    // year1 total 5, all remaining -> B = 0.2, A = 0
    const plan = solveTargetPlan(i, 0.4);
    expect(plan.requiredAverageGradePoint).toBe(2.0);
    expect(plan.maxAchievableFgpa).toBe(0.8);
  });

  it('computes max achievable with partial completed years', () => {
    const i = input({ completedYearGpas: [3.5, 3.0, null, null], remainingModules: [mods(3, 10), mods(4, 10)] });
    // max = 1.3 + 0.6*4 = 3.7
    expect(maxAchievableFgpa(i)).toBe(3.7);
  });
});

describe('scenarios', () => {
  it('produces conservative/realistic/optimistic projections', () => {
    const i = input({ remainingModules: [mods(1, 10), mods(2, 10), mods(3, 10), mods(4, 10)] });
    const s = computeScenarios(i, { conservative: 2.0, realistic: 3.0, optimistic: 3.7 });
    expect(s.map((x) => x.projectedFgpa)).toEqual([2.0, 3.0, 3.7]);
    expect(s[0].expectedClass).toBe('Pass');
    expect(s[2].expectedClass).toBe('First Class');
  });
});

describe('grade combination suggestions', () => {
  it('returns suggestions including a uniform-grade option', () => {
    const i = input({ remainingModules: [mods(1, 10), mods(2, 10), mods(3, 10), mods(4, 10)] });
    const plan = solveTargetPlan(i, 3.7);
    expect(plan.suggestions.length).toBeGreaterThan(0);
    expect(plan.suggestions.some((s) => s.label.includes('All remaining'))).toBe(true);
  });
});

describe('buildInput excludes ineligible and unselected electives', () => {
  const svc = new PredictionService();

  function course(partial: Partial<Course>): Course {
    return {
      id: partial.id ?? 'c',
      code: 'X',
      title: 'X',
      credits: 3,
      category: 'core',
      semester: 1,
      year: 1,
      prerequisites: [],
      hasPractical: false,
      gpaEligible: true,
      isElective: false,
      ...partial,
    } as Course;
  }

  it('excludes Non-GPA and unselected electives from remaining modules', () => {
    const modules = [
      course({ id: 'core', semester: 1 }),
      course({ id: 'elective', semester: 1, isElective: true, category: 'elective' }),
      course({ id: 'nongpa', semester: 1, gpaEligible: false }),
    ];
    const without = svc.buildInput(modules, [], []);
    expect(without.remainingModules).toHaveLength(1);
    expect(without.remainingModules[0].credits).toBe(3);

    const withElective = svc.buildInput(modules, [], ['elective']);
    expect(withElective.remainingModules).toHaveLength(2);
  });
});