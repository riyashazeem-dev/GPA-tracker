import { OFFICIAL_GRADE_SCALE, round2 } from '../gpa';

export interface PlannedModule {
  id: string;
  code: string;
  title: string;
  credits: number;
}

export interface TargetCombination {
  semesterGpa: number;
  cumulativeGpa: number;
  gradeCounts: { grade: string; count: number }[];
  grades: { module: PlannedModule; grade: string }[];
}

export interface CgpaPlan {
  requiredSemesterGpa: number;
  maximumCumulativeGpa: number;
  upcomingCredits: number;
  achievable: boolean;
  combinations: TargetCombination[];
}

export function planTargetCgpa(
  target: number, earnedPoints: number, completedCredits: number, modules: readonly PlannedModule[],
): CgpaPlan | null {
  const upcomingCredits = modules.reduce((total, module) => total + module.credits, 0);
  if (!upcomingCredits) return null;

  const creditsAfterSemester = completedCredits + upcomingCredits;
  const requiredPoints = target * creditsAfterSemester - earnedPoints;
  const maximumPoints = upcomingCredits * OFFICIAL_GRADE_SCALE[0].gradePoint;
  const plan: CgpaPlan = {
    requiredSemesterGpa: Math.max(0, requiredPoints / upcomingCredits),
    maximumCumulativeGpa: (earnedPoints + maximumPoints) / creditsAfterSemester,
    upcomingCredits,
    achievable: requiredPoints <= maximumPoints + 1e-8,
    combinations: [],
  };
  if (!plan.achievable) return plan;

  // A and A+ yield identical points. Prefer A in suggestions.
  const bands = OFFICIAL_GRADE_SCALE.filter((band) => band.grade !== 'A+');
  // Keep one module-by-module path for each attainable weighted point total.
  let choices = new Map<number, string[]>([[0, []]]);
  for (const module of modules) {
    const next = new Map<number, string[]>();
    for (const [points, grades] of choices) {
      for (const band of bands) {
        const total = Math.round((points + module.credits * band.gradePoint) * 1e6) / 1e6;
        if (!next.has(total)) next.set(total, [...grades, band.grade]);
      }
    }
    choices = next;
  }

  plan.combinations = [...choices.entries()]
    .filter(([points]) => points >= requiredPoints - 1e-8)
    .sort(([left], [right]) => left - right)
    .slice(0, 3)
    .map(([points, grades]) => ({
      semesterGpa: round2(points / upcomingCredits),
      cumulativeGpa: round2((earnedPoints + points) / creditsAfterSemester),
      gradeCounts: bands.map(({ grade }) => ({
        grade, count: grades.filter((chosen) => chosen === grade).length,
      })).filter(({ count }) => count > 0),
      grades: modules.map((module, index) => ({ module, grade: grades[index] })),
    }));
  return plan;
}
