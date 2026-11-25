import { afterEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../core/supabase/supabase.client';
import { AuthService } from './auth.service';

describe('Google account switching', () => {
  afterEach(() => vi.restoreAllMocks());

  it('opens the Google account chooser and signs out only the current app session', async () => {
    const signIn = vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValue({
      data: { provider: 'google', url: 'https://accounts.google.com/' },
      error: null,
    });
    const signOut = vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null });
    const auth = new AuthService();
    const callback = 'https://gpa.example/auth/callback';

    await auth.signInWithGoogle(callback);
    await auth.signOut();

    expect(signIn).toHaveBeenCalledExactlyOnceWith({
      provider: 'google',
      options: { redirectTo: callback, queryParams: { prompt: 'select_account' } },
    });
    expect(signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
  });
});
