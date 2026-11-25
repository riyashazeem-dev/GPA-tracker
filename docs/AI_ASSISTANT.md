# AI Academic Assistant (OpenRouter)

## Architecture
- Browser → `AiAssistantService` (builds **verified** context via the GPA/prediction
  engines) → Supabase Edge Function `ai-assistant` → OpenRouter.
- The OpenRouter API key lives **only** as an Edge Function secret. It is never in
  frontend code or the database.
- The AI receives engine-computed numbers and is instructed never to recalculate
  GPA/FGPA. It explains results and gives informational advice only.

## Setup
1. Apply migration `supabase/migrations/0018_ai_config.sql` (creates `ai_config`).
2. Set the Edge Function secret (server-side only):
   ```bash
   supabase secrets set OPENROUTER_API_KEY=sk-or-xxxx
   supabase secrets set APP_URL=https://your-app-domain
   ```
3. Deploy the function:
   ```bash
   supabase functions deploy ai-assistant
   ```

## Model configuration
- Admins set **Primary model** and **Fallback model** in Admin → AI model configuration
  (stored in `ai_config`). No frontend change needed to switch models.
- Defaults (free OpenRouter models):
  - Primary: `meta-llama/llama-3.3-70b-instruct:free`
  - Fallback: `google/gemini-2.0-flash-exp:free`
- On primary failure or rate limit, the function automatically tries the fallback.

## Security
- Function authenticates the caller via the Supabase JWT (`auth.getUser`).
- Only the caller's own verified context is sent; no other student's data is loaded.
- Reference data writes remain admin-only via RLS.

## Testing
- **Different free models**: change the primary model in Admin and ask a question;
  the reply returns the `model` used.
- **API failure simulation**: set an invalid primary model (e.g. `invalid/model`);
  the function falls back and returns the fallback reply. With both invalid, the UI
  shows a clear error.
- **Rate limit**: the function treats non-2xx from OpenRouter as failure and falls back.

## Notes
- AI output is labelled informational, not official academic advice.
- The assistant cannot modify results or curriculum.