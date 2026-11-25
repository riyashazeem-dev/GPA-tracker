import { Injectable } from '@angular/core';
import { CourseResult, GpaModuleInput } from '../models';
import {
  classify,
  computeGpa,
  gradePointForMarks,
  officialFgpa,
  projectedFgpa,
  yearGpa,
} from './gpa';

/**
 * Single reusable GPA/FGPA calculation service. Contains NO formulas of its
 * own — every value is delegated to the authoritative engine in `./gpa`.
 */
@Injectable({ providedIn: 'root' })
export class GpaCalculationService {
  gradePointForMarks(marks: number | null | undefined): number | null {
    return gradePointForMarks(marks);
  }

  /** Semester GPA = Σ(credit × GP) / Σ(GPA credits). Null when no eligible credits. */
  semesterGpa(modules: readonly GpaModuleInput[]): number | null {
    return computeGpa(modules);
  }

  /** Year GPA from the two semesters (combined credit-weighted, never averaged). */
  yearGpa(semesters: readonly (readonly GpaModuleInput[])[]): number | null {
    return yearGpa(semesters);
  }

  /** Official FGPA (null until all four years are complete). */
  officialFgpa(yearGpas: readonly (number | null)[]): number | null {
    return officialFgpa(yearGpas);
  }

  /** Projected FGPA from four explicit expected year GPAs. */
  projectedFgpa(yearGpas: readonly number[]): number {
    return projectedFgpa(yearGpas);
  }

  classify(gpa: number): string {
    return classify(gpa);
  }

  /** Completed GPA credits from a result set. */
  completedCredits(results: readonly CourseResult[]): number {
    return results
      .filter((r) => r.countsTowardGpa && r.credits != null)
      .reduce((sum, r) => sum + (r.credits as number), 0);
  }

  /** Convert results to engine module inputs. */
  toModules(results: readonly CourseResult[]): GpaModuleInput[] {
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