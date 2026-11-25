import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { supabase, isSupabaseConfigured } from '../supabase/supabase.client';
import { isProfileComplete } from './profile-completeness';

/**
 * Ensures the student completed first-login onboarding before using the app.
 * Bypassed when Supabase is not configured so the public UI still renders.
 */
export const onboardingGuard: CanActivateFn = async () => {
  if (!isSupabaseConfigured) {
    return true;
  }
  const router = inject(Router);
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    return router.createUrlTree(['/auth']);
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('department_id, curriculum_version_id')
    .eq('id', data.session.user.id)
    .maybeSingle();

  const complete = isProfileComplete({
    departmentId: profile?.department_id ?? null,
    curriculumVersionId: profile?.curriculum_version_id ?? null,
  });

  if (!complete) {
    return router.createUrlTree(['/onboarding']);
  }
  return true;
};
