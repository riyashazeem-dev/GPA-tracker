import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it, vi } from 'vitest';
import { isProfileComplete } from '../../core/auth/profile-completeness';
import { Profile } from '../../models';
import { ProfileService } from '../../services/profile.service';
import { OnboardingComponent } from './onboarding.component';

@Component({ template: 'Dashboard' })
class DashboardDestination {}

describe('Programme onboarding', () => {
  it('shows only the three programmes and saves the official curriculum automatically', async () => {
    const profile: Profile = {
      id: 'new-student', email: null, role: 'student', departmentId: null, curriculumVersionId: null,
      currentSemester: null, intakeYear: null, faculty: null, createdAt: '',
    };
    const saveOnboarding = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'onboarding', component: OnboardingComponent },
          { path: 'dashboard', component: DashboardDestination },
        ]),
        {
          provide: ProfileService,
          useValue: {
            getMyProfile: async () => profile,
            needsOnboarding: (student: Profile) => !isProfileComplete(student),
            getDepartments: async () => [
              { id: 'ds', code: 'DS', name: 'Data Science' },
              { id: 'se', code: 'SE', name: 'Software Engineering' },
              { id: 'is', code: 'IS', name: 'Information Systems' },
              { id: 'other', code: 'OTHER', name: 'Other programme' },
            ],
            getCurriculumVersions: async () => [
              { id: 'old', departmentId: 'se', version: 'legacy' },
              { id: 'se-official', departmentId: 'se', version: 'official' },
            ],
            saveOnboarding,
          },
        },
      ],
    });
    const harness = await RouterTestingHarness.create();
    const screen = await harness.navigateByUrl('/onboarding', OnboardingComponent);
    await vi.waitFor(() => expect(screen.loading()).toBe(false));
    harness.detectChanges();
    const choices = [...harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')];
    expect(choices.map((choice) => choice.textContent.trim())).toEqual([
      'Information Systems (IS)', 'Software Engineering (SE)', 'Data Science (DS)',
    ]);
    choices[1].click();
    await screen.save();
    expect(saveOnboarding).toHaveBeenCalledExactlyOnceWith({
      departmentId: 'se', curriculumVersionId: 'se-official', currentSemester: 1,
    });
    expect(harness.routeNativeElement?.textContent).toContain('Dashboard');
  });
});
