import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { supabase, isSupabaseConfigured } from '../supabase/supabase.client';

/**
 * Blocks navigation to protected routes when there is no active session.
 * When Supabase is not configured, the public interface is allowed through so
 * the app remains usable (with a configuration banner) without a backend.
 */
export const authGuard: CanActivateFn = async () => {
  if (!isSupabaseConfigured) {
    return true;
  }
  const router = inject(Router);
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.app_metadata['provider'] === 'google') {
    return true;
  }
  return router.createUrlTree(['/auth'], { queryParams: { returnUrl: '/' } });
};
