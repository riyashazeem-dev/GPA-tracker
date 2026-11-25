import { describe, expect, it } from 'vitest';
import {
  classify,
  computeGpa,
  gpaFromTotals,
  gradeForMarks,
  gradePointForMarks,
  isGpaEligible,
  officialFgpa,
  projectedFgpa,
  resolveRepeat,
  round2,
  yearGpa,
  OFFICIAL_GRADE_SCALE,
} from './gpa-engine';
import { GpaModuleInput } from '../../models';

/** Build a module input with sensible defaults (eligible, non-elective, has result). */
function mod(partial: Partial<GpaModuleInput>): GpaModuleInput {
  return {
    credits: 3,
    gradePoint: 4.0,
    isGpaEligible: true,
    isElective: false,
    isSelected: true,
    hasResult: true,
    ...partial,
  };
}

describe('grade conversion', () => {
  it('maps every band boundary mark to the correct grade point', () => {
    const cases: Array<[number, string, number]> = [
      [100, 'A+', 4.0],
      [90, 'A+', 4.0],
      [89, 'A', 4.0],
      [80, 'A', 4.0],
      [79, 'A-', 3.7],
      [75, 'A-', 3.7],
      [74, 'B+', 3.3],
      [70, 'B+', 3.3],
      [69, 'B', 3.0],
      [65, 'B', 3.0],
      [64, 'B-', 2.7],
      [60, 'B-', 2.7],
      [59, 'C+', 2.3],
      [55, 'C+', 2.3],
      [54, 'C', 2.0],
      [50, 'C', 2.0],
      [49, 'C-', 1.7],
      [45, 'C-', 1.7],
      [44, 'D+', 1.3],
      [40, 'D+', 1.3],
      [39, 'D', 1.0],
      [30, 'D', 1.0],
      [29, 'E', 0.0],
      [0, 'E', 0.0],
    ];
    for (const [marks, grade, gp] of cases) {
      expect(gradeForMarks(marks)).toBe(grade);
      expect(gradePointForMarks(marks)).toBe(gp);
    }
  });

  it('has 12 official bands', () => {
    expect(OFFICIAL_GRADE_SCALE).toHaveLength(12);
  });

  it('returns null for out-of-range or invalid marks', () => {
    expect(gradePointForMarks(-1)).toBeNull();
    expect(gradePointForMarks(101)).toBeNull();
    expect(gradePointForMarks(Number.NaN)).toBeNull();
    expect(gradePointForMarks(null)).toBeNull();
    expect(gradeForMarks(undefined)).toBeNull();
  });
});

describe('official calculation test', () => {
  it('computes 65.30 / 19 = 3.44 to two decimal places', () => {
    expect(gpaFromTotals(65.3, 19)).toBe(3.44);
  });

  it('computes the same GPA from per-module inputs', () => {
    const modules = [
      mod({ credits: 3, gradePoint: 4.0 }),
      mod({ credits: 3, gradePoint: 3.7 }),
      mod({ credits: 3, gradePoint: 3.3 }),
      mod({ credits: 2, gradePoint: 3.0 }),
      mod({ credits: 2, gradePoint: 2.7 }),
      mod({ credits: 3, gradePoint: 2.3 }),
      mod({ credits: 3, gradePoint: 2.0 }),
    ];
    // credits = 19; weighted = 12 + 11.1 + 9.9 + 6 + 5.4 + 6.9 + 6 = 57.3
    expect(computeGpa(modules)).toBe(round2(57.3 / 19));
  });
});

describe('semester GPA eligibility', () => {
  it('excludes Non-GPA modules', () => {
    const modules = [
      mod({ credits: 3, gradePoint: 4.0 }),
      mod({ credits: 3, gradePoint: 4.0, isGpaEligible: false }),
    ];
    expect(computeGpa(modules)).toBe(4.0);
  });

  it('excludes modules without a numerical credit (null)', () => {
    const modules = [mod({ credits: null, gradePoint: 4.0 }), mod({ credits: 3, gradePoint: 3.0 })];
    expect(computeGpa(modules)).toBe(3.0);
  });

  it('excludes unselected electives but includes selected ones', () => {
    const modules = [
      mod({ credits: 3, gradePoint: 4.0 }),
      mod({ credits: 3, gradePoint: 1.0, isElective: true, isSelected: false }),
    ];
    expect(computeGpa(modules)).toBe(4.0);

    const withSelected = [
      mod({ credits: 3, gradePoint: 4.0 }),
      mod({ credits: 3, gradePoint: 2.0, isElective: true, isSelected: true }),
    ];
    expect(computeGpa(withSelected)).toBe(3.0);
  });

  it('does not auto-exclude numerical-credit electives that are selected', () => {
    const commSkills = mod({ credits: 2, gradePoint: 3.0, isElective: true, isSelected: true });
    expect(isGpaEligible(commSkills)).toBe(true);
    expect(computeGpa([commSkills])).toBe(3.0);
  });

  it('excludes modules without a valid grade', () => {
    const modules = [mod({ gradePoint: null }), mod({ credits: 3, gradePoint: 3.0 })];
    expect(computeGpa(modules)).toBe(3.0);
  });

  it('excludes modules without results', () => {
    const modules = [mod({ hasResult: false }), mod({ credits: 3, gradePoint: 3.0 })];
    expect(computeGpa(modules)).toBe(3.0);
  });

  it('returns null when there are no eligible credits', () => {
    expect(computeGpa([])).toBeNull();
    expect(computeGpa([mod({ isGpaEligible: false })])).toBeNull();
  });

  it('weights by differing credit values', () => {
    const modules = [mod({ credits: 4, gradePoint: 4.0 }), mod({ credits: 1, gradePoint: 1.0 })];
    // (4*4 + 1*1) / 5 = 17/5 = 3.4
    expect(computeGpa(modules)).toBe(3.4);
  });
});

describe('year GPA', () => {
  it('combines semesters by credit weighting, not by averaging GPAs', () => {
    const sem1 = [mod({ credits: 3, gradePoint: 4.0 })]; // GPA 4.0
    const sem2 = [mod({ credits: 1, gradePoint: 1.0 })]; // GPA 1.0
    // average of GPAs would be 2.5; combined = (12 + 1) / 4 = 3.25
    expect(yearGpa([sem1, sem2])).toBe(3.25);
  });

  it('maps semesters 1+2, 3+4, 5+6, 7+8 by caller grouping', () => {
    const y1 = yearGpa([[mod({ credits: 2, gradePoint: 4.0 })], [mod({ credits: 2, gradePoint: 2.0 })]]);
    // (8 + 4) / 4 = 3.0
    expect(y1).toBe(3.0);
  });
});

describe('FGPA', () => {
  it('applies the official 20/20/30/30 weighting', () => {
    // 0.2*3.5 + 0.2*3.0 + 0.3*3.8 + 0.3*3.2 = 0.7 + 0.6 + 1.14 + 0.96 = 3.40
    expect(officialFgpa([3.5, 3.0, 3.8, 3.2])).toBe(3.4);
  });

  it('is not a simple cumulative average', () => {
    const weighted = officialFgpa([4.0, 4.0, 2.0, 2.0]) as number; // 0.8+0.8+0.6+0.6=2.8
    const simpleAvg = (4.0 + 4.0 + 2.0 + 2.0) / 4; // 3.0
    expect(weighted).toBe(2.8);
    expect(weighted).not.toBe(simpleAvg);
  });

  it('returns null when a year is incomplete (missing not treated as zero)', () => {
    expect(officialFgpa([3.5, 3.0, null, null])).toBeNull();
    expect(officialFgpa([3.5, null, 3.8, 3.2])).toBeNull();
  });

  it('throws if not exactly four years are supplied', () => {
    expect(() => officialFgpa([3.5, 3.0, 3.8])).toThrow();
  });

  it('computes a projected FGPA from explicit expected year GPAs', () => {
    expect(projectedFgpa([3.5, 3.0, 3.8, 3.2])).toBe(3.4);
    expect(() => projectedFgpa([3.5, 3.0, 3.8])).toThrow();
  });
});

describe('repeat examination', () => {
  it('awards 2.00 for a successful repeat below C and replaces the result', () => {
    const r = resolveRepeat(1.0, 'D', [{ attemptNumber: 1, marks: 60 }]);
    expect(r.success).toBe(true);
    expect(r.replaced).toBe(true);
    expect(r.effectiveGradePoint).toBe(2.0);
    expect(r.counted).toBe(true);
  });

  it('does not allow repeating a C or above', () => {
    const r = resolveRepeat(2.0, 'C', [{ attemptNumber: 1, marks: 40 }]);
    expect(r.success).toBe(false);
    expect(r.attemptsUsed).toBe(0);
    expect(r.effectiveGradePoint).toBe(2.0);
  });

  it('caps repeat attempts at two and warns on extras', () => {
    const r = resolveRepeat(0.0, 'E', [
      { attemptNumber: 1, marks: 10 },
      { attemptNumber: 2, marks: 20 },
      { attemptNumber: 3, marks: 90 },
    ]);
    expect(r.attemptsUsed).toBe(2);
    expect(r.success).toBe(false);
    expect(r.warnings.some((w: string) => w.includes('2 repeat attempts'))).toBe(true);
  });

  it('warns when an E is not improved at the first opportunity but succeeds later', () => {
    const r = resolveRepeat(0.0, 'E', [
      { attemptNumber: 1, marks: 40 },
      { attemptNumber: 2, marks: 55 },
    ]);
    expect(r.success).toBe(true);
    expect(r.attemptsUsed).toBe(2);
    expect(r.warnings.some((w: string) => w.includes('first available opportunity'))).toBe(true);
  });

  it('keeps the original grade when no repeat succeeds', () => {
    const r = resolveRepeat(1.0, 'D', [{ attemptNumber: 1, marks: 10 }]);
    expect(r.success).toBe(false);
    expect(r.replaced).toBe(false);
    expect(r.effectiveGradePoint).toBe(1.0);
  });

  it('uses a configurable success rule', () => {
    const strict = {
      maxAttempts: 2,
      isSuccess: (marks: number) => marks >= 70,
      successfulRepeatGradePoint: 2.0,
      maxAwardedGradePointAfterRepeat: 2.0,
    };
    const r = resolveRepeat(1.0, 'D', [{ attemptNumber: 1, marks: 60 }], strict);
    expect(r.success).toBe(false);
    expect(r.effectiveGradePoint).toBe(1.0);
  });

  it('never counts the same module twice (single effective grade point)', () => {
    const r = resolveRepeat(1.0, 'D', [{ attemptNumber: 1, marks: 80 }]);
    expect(typeof r.effectiveGradePoint).toBe('number');
    // one module -> one GPA contribution of 2.00 over its credits
    const gpa = computeGpa([mod({ credits: 3, gradePoint: r.effectiveGradePoint })]);
    expect(gpa).toBe(2.0);
  });
});

describe('class classification', () => {
  it('classifies by official bands', () => {
    expect(classify(4.0)).toBe('First Class');
    expect(classify(3.7)).toBe('First Class');
    expect(classify(3.69)).toBe('Second Class Upper');
    expect(classify(3.3)).toBe('Second Class Upper');
    expect(classify(3.29)).toBe('Second Class Lower');
    expect(classify(2.7)).toBe('Second Class Lower');
    expect(classify(2.69)).toBe('Pass');
    expect(classify(2.0)).toBe('Pass');
    expect(classify(1.99)).toBe('Fail');
  });
});

describe('decimal rounding', () => {
  it('rounds half-up to two decimals', () => {
    expect(round2(3.4368)).toBe(3.44);
    expect(round2(2.675)).toBe(2.68);
    expect(round2(3.0)).toBe(3.0);
  });

  it('does not round the official example incorrectly', () => {
    expect(gpaFromTotals(65.3, 19)).toBe(3.44);
  });
});