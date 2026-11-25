// Supabase Edge Function: ai-assistant
// Securely proxies OpenRouter. The API key is read from Edge Function secrets
// (OPENROUTER_API_KEY) and is NEVER exposed to the browser.
//
// The client sends a VERIFIED academic context computed by the app's GPA
// engine. This function must NOT recalculate GPA/FGPA; it only forwards the
// numbers to the model with a strict system prompt.
//
// Deploy:
//   supabase secrets set OPENROUTER_API_KEY=sk-or-...
//   supabase functions deploy ai-assistant

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const AI_RATE_LIMIT_PER_MIN = 10;

const SYSTEM_PROMPT = `You are an academic performance advisor for university students.
You will be given VERIFIED numerical results computed by the official GPA engine.
STRICT RULES:
- NEVER calculate, recompute, or invent GPA/FGPA/class values. Only explain the provided numbers.
- If required data is missing, say clearly that the information is unavailable.
- Do not claim to modify results or curriculum.
- Give concise, personalized, actionable study and improvement advice.
- Always note that AI suggestions are informational, not official academic advice.
- Use the provided context values verbatim when citing numbers.`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');

    if (!openRouterKey) {
      return json({ error: 'AI is not configured (missing OpenRouter key).' }, 500);
    }

    // 1) Authenticate the caller.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: 'Unauthorized.' }, 401);
    }

    // 2) Load model configuration (admin-configurable, with fallback).
    const admin = createClient(supabaseUrl, serviceKey);

    // 2a) Basic per-user rate limiting (per minute window).
    const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
    const { data: usage } = await admin
      .from('ai_usage')
      .select('count')
      .eq('user_id', userData.user.id)
      .eq('window_start', windowStart)
      .maybeSingle();
    const used = (usage?.count as number | undefined) ?? 0;
    if (used >= AI_RATE_LIMIT_PER_MIN) {
      return json({ error: 'Rate limit exceeded. Please try again shortly.' }, 429);
    }
    await admin
      .from('ai_usage')
      .upsert({ user_id: userData.user.id, window_start: windowStart, count: used + 1 });

    // 2b) Load model configuration (admin-configurable, with fallback).
    const { data: config } = await admin
      .from('ai_config')
      .select('model, fallback_model')
      .eq('id', 1)
      .maybeSingle();
    const primary = config?.model ?? 'meta-llama/llama-3.3-70b-instruct:free';
    const fallback = config?.fallback_model ?? 'google/gemini-2.0-flash-exp:free';

    // 3) Parse request.
    const body = await req.json().catch(() => ({}));
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    const context = body?.context ?? {};
    if (messages.length === 0) {
      return json({ error: 'No messages provided.' }, 400);
    }

    const contextBlock = `VERIFIED STUDENT CONTEXT (do not recalculate):\n${JSON.stringify(context, null, 2)}`;

    // 4) Call OpenRouter with primary, then fallback on failure/rate limit.
    const attempts = [primary, fallback];
    let lastError = 'Unknown error';
    for (const model of attempts) {
      const result = await callOpenRouter(openRouterKey, model, [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: contextBlock },
        ...messages,
      ]);
      if (result.ok) {
        return json({ reply: result.reply, model });
      }
      lastError = result.error;
    }

    return json({ error: `AI request failed: ${lastError}` }, 502);
  } catch (e) {
    return json({ error: `Unexpected error: ${(e as Error).message}` }, 500);
  }
});

async function callOpenRouter(
  key: string,
  model: string,
  messages: ChatMessage[],
): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('APP_URL') ?? 'https://localhost',
        'X-Title': 'Smart GPA Tracker',
      },
      body: JSON.stringify({ model, messages, temperature: 0.3 }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `${model} -> HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      return { ok: false, error: `${model} -> empty response` };
    }
    return { ok: true, reply };
  } catch (e) {
    return { ok: false, error: `${model} -> ${(e as Error).message}` };
  }
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}