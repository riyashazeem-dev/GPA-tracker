/**
 * Development environment configuration.
 *
 * SECURITY: Only the Supabase project URL and the public (anon / publishable)
 * key belong in frontend code. NEVER place the Supabase `service_role` key or
 * any OpenRouter secret in this file — those must live only in server-side
 * functions (Supabase Edge Functions) and are accessed via environment secrets.
 */
export const environment = {
  production: false,
  supabase: {
    url: 'https://uxdjjrkssorwklsxwppo.supabase.co',
    anonKey: 'sb_publishable_xe3kRlx8e-eA1AxKWTJ1kg__ilLwSF7',
  },
  /**
   * OpenRouter is intentionally NOT configured in the frontend.
   * AI calls must be proxied through a Supabase Edge Function so the
   * OpenRouter API key is never exposed to the browser.
   */
  ai: {
    edgeFunctionUrl: '/functions/v1/ai-assistant',
  },
};