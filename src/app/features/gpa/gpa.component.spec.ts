import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { Course, CourseResult, Profile } from '../../models';
import { ElectiveService } from '../../services/elective.service';
import { LocalCurriculumService } from '../../services/local-curriculum.service';
import { ProfileService } from '../../services/profile.service';
import { StudentRecordsService } from '../../services/student-records.service';
import { GpaComponent } from './gpa.component';

describe('GPA grade entry', () => {
  it('keeps entered grades when saving or switching views and calculates weighted GPA', async () => {
    const first: Course = {
      id: 'first', code: 'IS1101', title: 'First course', credits: 3, semester: 1, year: 1,
      category: 'Core', prerequisites: [], hasPractical: false, gpaEligible: true, isElective: false,
    };
    const second: Course = { ...first, id: 'second', code: 'IS1102', credits: 1 };
    const third: Course = { ...first, id: 'third', code: 'IS1201', credits: 2, semester: 2 };
    const profile: Profile = {
      id: 'student', email: null, role: 'student', departmentId: 'IS', curriculumVersionId: 'official',
      currentSemester: 1, intakeYear: null, faculty: null, createdAt: '',
    };
    const saved: CourseResult = {
      id: 'saved-first', studentId: profile.id, courseId: first.id, courseCode: first.code,
      courseTitle: first.title, credits: first.credits, semester: first.semester, academicYear: 2025,
      marks: 65, letterGrade: 'B+', gradePoint: 3.3, countsTowardGpa: true, isPredicted: false,
    };
    const saveResult = vi.fn().mockResolvedValue({ ...saved, marks: null, letterGrade: 'A', gradePoint: 4 });
    TestBed.configureTestingModule({
      imports: [GpaComponent],
      providers: [
        { provide: ProfileService, useValue: { getMyProfile: async () => profile } },
        { provide: LocalCurriculumService, useValue: { departments: [] } },
        { provide: ElectiveService, useValue: { getSelections: async () => [] } },
        {
          provide: StudentRecordsService,
          useValue: {
            getRegisteredModules: async () => [first, second, third],
            getResults: async (_id: string, predicted: boolean) => predicted ? [] : [saved],
            saveResult,
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(GpaComponent);
    const component = fixture.componentInstance;
    await vi.waitFor(() => expect(component.busy()).toBe(false));
    expect(component.drafts().map((draft) => draft.letterGrade)).toEqual(['B+', '']);

    component.editGrade(component.drafts()[0], 'A');
    component.editGrade(component.drafts()[1], 'B');
    await component.save(component.drafts()[0]);
    expect(saveResult).toHaveBeenCalledWith(expect.objectContaining({
      courseId: first.id, id: saved.id, academicYear: 2025, letterGrade: 'A',
    }));
    expect(component.drafts().map((draft) => draft.letterGrade)).toEqual(['A', 'B']);

    component.selectCloudSemester(2);
    component.editGrade(component.drafts()[0], 'E');
    component.togglePredicted(true);
    expect(component.drafts()[0].letterGrade).toBe('');
    component.togglePredicted(false);
    expect(component.drafts()[0].letterGrade).toBe('E');
    component.selectCloudSemester(1);
    expect(component.drafts().map((draft) => draft.letterGrade)).toEqual(['A', 'B']);

    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('input[placeholder="Marks"]')).toBeNull();
    const calculate = [...page.querySelectorAll('button')].find((button) => button.textContent.includes('Calculate GPA'));
    expect(calculate).toBeDefined();
    calculate?.click();
    fixture.detectChanges();
    expect(component.cloudGpa()).toEqual({ semester: 3.75, total: 2.5 });
    expect(page.textContent).toContain('2.50');
  });
});
