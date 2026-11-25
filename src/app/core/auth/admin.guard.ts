import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { supabase } from '../supabase/supabase.client';

/** Uses the same database authorization check as the admin-only RLS policies. */
export const adminGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    return router.createUrlTree(['/auth']);
  }
  const { data: isAdmin, error } = await supabase.rpc('is_admin');
  if (!error && isAdmin === true) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};
