import { Course, CourseResult, GpaModuleInput } from '../models';
import { gradeForMarks, OFFICIAL_GRADE_SCALE } from './gpa';

export function savedGrade(result: CourseResult | undefined): string | null {
  return result?.letterGrade ?? gradeForMarks(result?.marks);
}

export function latestProgrammeResults(courses: readonly Course[], results: readonly CourseResult[]) {
  const courseIds = new Set(courses.map((course) => course.id));
  const byCourse = new Map<string, CourseResult>();
  for (const result of results) {
    if (result.isPredicted || !courseIds.has(result.courseId)) continue;
    const previous = byCourse.get(result.courseId);
    if (!previous || (savedGrade(previous) == null && savedGrade(result) != null)
      || (Boolean(savedGrade(previous)) === Boolean(savedGrade(result)) && result.academicYear >= previous.academicYear)) {
      byCourse.set(result.courseId, result);
    }
  }
  return byCourse;
}

export function isRegisteredModule(
  course: Course, result: CourseResult | undefined, selections: ReadonlyMap<number, ReadonlySet<string>>, academicYear: number,
): boolean {
  return !course.isElective || (selections.get(result?.academicYear ?? academicYear)?.has(course.id) ?? false);
}

export function programmeGpaModule(course: Course, result: CourseResult | undefined, registered: boolean): GpaModuleInput {
  const grade = savedGrade(result);
  const gradePoint = result?.effectiveGradePoint ??
    OFFICIAL_GRADE_SCALE.find((band) => band.grade === grade)?.gradePoint ?? null;
  return {
    credits: course.credits,
    gradePoint,
    isGpaEligible: course.gpaEligible,
    isElective: course.isElective,
    isSelected: registered,
    hasResult: gradePoint !== null,
  };
}

export function programmeCurrentSemester(profileSemester: number | null, results: ReadonlyMap<string, CourseResult>): number {
  const gradedSemesters = [...results.values()].filter((result) => savedGrade(result) !== null).map((result) => result.semester);
  return Math.max(profileSemester ?? 1, ...gradedSemesters);
}
