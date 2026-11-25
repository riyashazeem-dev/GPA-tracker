import { Profile } from '../../models';

type OnboardingFields = Pick<Profile, 'departmentId' | 'curriculumVersionId'>;

/** Programme selection is complete once the department and curriculum are saved. */
export function isProfileComplete(profile: OnboardingFields | null | undefined): boolean {
  return !!profile?.departmentId && !!profile.curriculumVersionId;
}
