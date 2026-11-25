import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it, vi } from 'vitest';
import { Course, CourseResult, Profile } from '../../models';
import { ProfileService } from '../../services/profile.service';
import { StudentRecordsService } from '../../services/student-records.service';
import { DashboardComponent } from './dashboard.component';

@Component({ template: '' })
class SignedOutPage {}

describe('Student dashboard', () => {
  it('saves a semester in one request and restores the credit-weighted GPA on return', async () => {
    const profile: Profile = {
      id: 'student', email: null, role: 'student', departmentId: 'is', curriculumVersionId: 'official',
      currentSemester: 2, intakeYear: null, faculty: null, createdAt: '',
    };
    const course: Course = {
      id: 'core-one', code: 'IS1101', title: 'First module', credits: 2, semester: 1, year: 1,
      category: 'Core', prerequisites: [], hasPractical: false, gpaEligible: true, isElective: false,
    };
    const courses: Course[] = [
      course,
      { ...course, id: 'failed', code: 'IS1201', title: 'Failed module', semester: 2, credits: 1 },
      { ...course, id: 'pending', code: 'IS1202', title: 'Pending module', semester: 2 },
      { ...course, id: 'non-gpa', code: 'IS1203', title: 'Non-GPA module', semester: 2, gpaEligible: false },
      { ...course, id: 'future', code: 'IS2101', title: 'Upcoming module', semester: 3 },
    ];
    function result(module: Course, letterGrade: string, gradePoint: number): CourseResult {
      return {
        id: module.id, studentId: profile.id, courseId: module.id, courseTitle: module.title,
        courseCode: module.code, credits: module.credits, semester: module.semester, academicYear: 2026,
        marks: null, letterGrade, gradePoint, countsTowardGpa: module.gpaEligible, isPredicted: false,
      };
    }
    let stored = [result(course, 'A', 4)];
    const saveSemesterGrades = vi.fn(async (_semester: number, grades: Record<string, string | null>) => {
      stored = [
        result(course, 'A', 4),
        result(courses[1], grades['failed']!, 0),
        result(courses[3], grades['non-gpa']!, 4),
      ];
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'dashboard', component: DashboardComponent },
          { path: 'auth', component: SignedOutPage },
        ]),
        {
          provide: ProfileService,
          useValue: {
            getMyProfile: async () => profile,
            getDepartments: async () => [{ id: 'is', code: 'IS', name: 'Information Systems' }],
          },
        },
        {
          provide: StudentRecordsService,
          useValue: {
            saveSemesterGrades,
            getProgrammeRecords: async () => ({
              courses, results: stored, electiveSelections: new Map(), academicYear: 2026,
            }),
          },
        },
      ],
    });
    const harness = await RouterTestingHarness.create();
    const dashboard = await harness.navigateByUrl('/dashboard?semester=2', DashboardComponent);
    await vi.waitFor(() => expect(dashboard.loading()).toBe(false));
    harness.detectChanges();
    const page = harness.routeNativeElement!;
    expect(page.textContent).toContain('Information Systems (IS)');
    expect(page.querySelectorAll('nav a')).toHaveLength(8);
    expect(dashboard.semesterGpa()).toBeNull();
    expect(dashboard.pending().map((row) => row.course.id)).toEqual(['failed', 'pending', 'non-gpa']);

    for (const [code, grade] of [['IS1201', 'E'], ['IS1203', 'A']]) {
      const input = page.querySelector<HTMLSelectElement>(`select[aria-label="Grade for ${code}"]`)!;
      input.value = grade;
      input.dispatchEvent(new Event('change'));
    }
    const button = [...page.querySelectorAll('button')].find((item) => item.textContent.includes('Calculate & Save GPA'))!;
    button.click();
    await vi.waitFor(() => expect(dashboard.success()).toContain('grades saved'));
    expect(saveSemesterGrades).toHaveBeenCalledExactlyOnceWith(2, { failed: 'E', 'non-gpa': 'A' });
    expect(dashboard.semesterGpa()).toBe(0);
    expect(dashboard.cumulativeGpa()).toBe(2.67);
    expect(dashboard.completed()).toBe(2);
    expect(dashboard.pending().map((row) => row.course.id)).toEqual(['pending']);

    await harness.navigateByUrl('/auth', SignedOutPage);
    const returning = await harness.navigateByUrl('/dashboard?semester=3', DashboardComponent);
    await vi.waitFor(() => expect(returning.loading()).toBe(false));
    expect(returning.cumulativeGpa()).toBe(2.67);
    expect(returning.pending()).toEqual([]);
    expect(returning.semesterStatus()).toBe('Upcoming');
  });
});
