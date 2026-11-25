import { Injectable } from '@angular/core';
import {
  Classification,
  CourseResult,
  GpaComputationInput,
  GpaModuleInput,
  GpaSummary,
  GpaTrendPoint,
} from '../models';
import {
  classify,
  computeGpa,
  gradePointForMarks,
  officialFgpa,
  projectedFgpa,
  yearGpa,
} from './gpa';

/**
 * Angular service facade over the authoritative GPA engine.
 *
 * It contains NO formulas of its own — every calculation is delegated to
 * `services/gpa/gpa-engine.ts`, the single source of truth across the app.
 */
@Injectable({ providedIn: 'root' })
export class GpaService {
  /** Convert a mark to its official grade point (null when invalid). */
  gradePointForMarks(marks: number | null | undefined): number | null {
    return gradePointForMarks(marks);
  }

  /** Semester GPA from normalised module inputs. */
  semesterGpa(modules: readonly GpaModuleInput[]): number | null {
    return computeGpa(modules);
  }

  /** Year GPA from the two semesters of a year (combined, credit-weighted). */
  yearGpa(semesters: readonly (readonly GpaModuleInput[])[]): number | null {
    return yearGpa(semesters);
  }

  /** Official FGPA (null until all four years are complete). */
  officialFgpa(yearGpas: readonly (number | null)[]): number | null {
    return officialFgpa(yearGpas);
  }

  /** Projected FGPA from explicit expected year GPAs. */
  projectedFgpa(yearGpas: readonly number[]): number {
    return projectedFgpa(yearGpas);
  }

  /** Official class classification. */
  classify(gpa: number): Classification {
    return classify(gpa);
  }

  /**
   * Backwards-compatible helper: compute GPA from a lightweight result list.
   * Non-GPA / missing-credit entries are excluded by the engine.
   */
  computeGpa(input: GpaComputationInput): number | null {
    return computeGpa(
      input.results.map((r) => ({
        credits: r.credits,
        gradePoint: r.gradePoint,
        isGpaEligible: r.countsTowardGpa,
        isElective: false,
        isSelected: true,
        hasResult: true,
      })),
    );
  }

  computeSemesterGpas(results: CourseResult[]): GpaTrendPoint[] {
    const bySemester = new Map<string, CourseResult[]>();
    for (const r of results) {
      const key = `${r.academicYear}-${r.semester}`;
      const list = bySemester.get(key) ?? [];
      list.push(r);
      bySemester.set(key, list);
    }
    return [...bySemester.entries()]
      .map(([key, list]) => {
        const [academicYear, semester] = key.split('-').map(Number);
        return {
          semester,
          academicYear,
          gpa: computeGpa(
            list.map((r) => ({
              credits: r.credits,
              gradePoint: r.gradePoint,
              isGpaEligible: r.countsTowardGpa,
              isElective: false,
              isSelected: true,
              hasResult: true,
            })),
          ),
        };
      })
      .sort((a, b) => a.academicYear - b.academicYear || a.semester - b.semester);
  }

  summarize(results: CourseResult[]): GpaSummary {
    const cumulativeCredits = results
      .filter((r) => r.countsTowardGpa && r.credits != null)
      .reduce((sum, r) => sum + (r.credits as number), 0);
    const gpa = computeGpa(
      results.map((r) => ({
        credits: r.credits,
        gradePoint: r.gradePoint,
        isGpaEligible: r.countsTowardGpa,
        isElective: false,
        isSelected: true,
        hasResult: true,
      })),
    );
    return {
      cumulativeGpa: gpa,
      cumulativeCredits,
      classification: gpa == null ? null : classify(gpa),
    };
  }
}