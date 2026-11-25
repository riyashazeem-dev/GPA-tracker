import { Injectable } from '@angular/core';
import { supabase } from '../core/supabase/supabase.client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Show the account chooser even when the browser already has a Google session. */
  async signInWithGoogle(redirectTo = `${window.location.origin}/auth/callback`): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, queryParams: { prompt: 'select_account' } },
    });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
  }
}
