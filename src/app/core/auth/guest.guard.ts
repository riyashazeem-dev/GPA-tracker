import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { supabase, isSupabaseConfigured } from '../supabase/supabase.client';

/**
 * Redirects authenticated users away from guest-only routes (login/register).
 */
export const guestGuard: CanActivateFn = async () => {
  if (!isSupabaseConfigured) {
    return true;
  }
  const router = inject(Router);
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.app_metadata['provider'] === 'google') {
    return router.createUrlTree(['/dashboard']);
  }
  return true;
};
