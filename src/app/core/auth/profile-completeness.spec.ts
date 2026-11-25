import { describe, expect, it } from 'vitest';
import { isProfileComplete } from './profile-completeness';
import { Profile } from '../../models';

function profile(partial: Partial<Profile>): Profile {
  return {
    id: 'u1',
    email: 'a@test.local',
    role: 'student',
    departmentId: null,
    curriculumVersionId: null,
    currentSemester: null,
    intakeYear: null,
    faculty: null,
    createdAt: '',
    ...partial,
  } as Profile;
}

describe('isProfileComplete', () => {
  it('false for null/undefined', () => {
    expect(isProfileComplete(null)).toBe(false);
    expect(isProfileComplete(undefined)).toBe(false);
  });

  it('false when a programme field is missing', () => {
    expect(isProfileComplete(profile({ departmentId: 'd', curriculumVersionId: null, currentSemester: 1 }))).toBe(false);
    expect(isProfileComplete(profile({ departmentId: null, curriculumVersionId: 'v', currentSemester: 1 }))).toBe(false);
  });

  it('does not require a saved current semester for a returning student', () => {
    expect(isProfileComplete(profile({ departmentId: 'd', curriculumVersionId: 'v' }))).toBe(true);
  });
});
