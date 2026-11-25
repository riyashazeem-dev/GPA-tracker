import { describe, expect, it } from 'vitest';
import { planTargetCgpa } from './target-cgpa';
import { OFFICIAL_GRADE_SCALE } from '../gpa';

const modules = [
  { id: 'one', code: 'ONE', title: 'One-credit module', credits: 1 },
  { id: 'two', code: 'TWO', title: 'Two-credit module', credits: 2 },
  { id: 'three', code: 'THREE', title: 'Three-credit module', credits: 3 },
];

describe('Target CGPA', () => {
  it('uses actual module credits and only suggests combinations that reach the target', () => {
    const plan = planTargetCgpa(3.35, 36, 12, modules);
    expect(plan?.requiredSemesterGpa).toBeCloseTo(4.05);
    expect(plan?.maximumCumulativeGpa).toBeCloseTo(3.3333);
    expect(plan?.achievable).toBe(false);
    expect(plan?.combinations).toEqual([]);

    const achievable = planTargetCgpa(3.11, 36, 12, modules);
    expect(achievable?.requiredSemesterGpa).toBeCloseTo(3.33);
    expect(achievable?.combinations).toHaveLength(3);
    for (const option of achievable!.combinations) {
      const points = option.grades.reduce((sum, { module, grade }) =>
        sum + module.credits * OFFICIAL_GRADE_SCALE.find((band) => band.grade === grade)!.gradePoint, 0);
      expect((36 + points) / 18).toBeGreaterThanOrEqual(3.11);
    }
  });

  it('handles an exact maximum and a semester without eligible credits', () => {
    expect(planTargetCgpa(4, 0, 0, modules)?.combinations).toHaveLength(1);
    expect(planTargetCgpa(4, 0, 0, [])).toBeNull();
  });
});
