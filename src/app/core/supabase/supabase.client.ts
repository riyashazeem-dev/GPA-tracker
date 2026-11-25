import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

/**
 * Single shared Supabase client for the application.
 *
 * SECURITY: Uses only the public anon/publishable key from the environment.
 * The service_role key must never be used in the browser.
 *
 * BACKEND INDEPENDENCE: when Supabase is not configured (placeholder values),
 * the app still boots and renders its public interface. `isSupabaseConfigured`
 * lets guards bypass auth and lets the UI show a helpful configuration message
 * instead of blocking the whole frontend.
 */
const configuredUrl = environment.supabase?.url ?? '';
const configuredKey = environment.supabase?.anonKey ?? '';

export const isSupabaseConfigured =
  /^https?:\/\/.+/i.test(configuredUrl) &&
  !configuredUrl.includes('YOUR-PROJECT') &&
  !configuredKey.includes('YOUR-SUPABASE');

// Valid fallbacks so createClient never throws on missing configuration.
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'public-anon-key';

export const supabase = createClient(
  isSupabaseConfigured ? configuredUrl : fallbackUrl,
  isSupabaseConfigured ? configuredKey : fallbackKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: 'smart-gpa-tracker-auth',
    },
  },
);
