/**
 * Production environment configuration.
 *
 * SECURITY: Only the Supabase project URL and the public (anon / publishable)
 * key belong in frontend code. NEVER place the Supabase `service_role` key or
 * any OpenRouter secret here.
 */
export const environment = {
  production: true,
  supabase: {
    url: 'https://uxdjjrkssorwklsxwppo.supabase.co',
    anonKey: 'sb_publishable_xe3kRlx8e-eA1AxKWTJ1kg__ilLwSF7',
  },
  ai: {
    edgeFunctionUrl: '/functions/v1/ai-assistant',
  },
};