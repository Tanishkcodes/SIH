// Account-aware model routing with a bounded latency budget. A clinical model
// override never changes navigation. Cache only model metadata, never utterances.
let navigationModels: { key: string; expires: number; names: string[]; preferred?: string } | null = null;

export async function navigationGemini(key: string, prompt: string, schema: unknown) {
  const configured = Deno.env.get('GEMINI_NAVIGATION_MODEL') || 'gemini-3.1-flash-lite';
  const cached = navigationModels?.key === key && navigationModels.expires > Date.now() ? navigationModels : null;
  const attempted = new Set<string>();
  let names = cached?.names || [];
  let candidate = cached?.preferred || configured;
  let lastError = 'Gemini unavailable';
  const started = Date.now();
  for (let attempt = 0; attempt < 2; attempt++) {
    let discover = false;
    attempted.add(candidate);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidate)}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        signal: AbortSignal.timeout(Math.max(1, Math.min(8000, 16000 - (Date.now() - started)))),
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: {
          responseMimeType: 'application/json', responseJsonSchema: schema,
          temperature: 0.05, maxOutputTokens: 1800,
          ...(candidate.includes('2.5') ? { thinkingConfig: { thinkingBudget: 512 } }
            : candidate.startsWith('gemini-3') ? { thinkingConfig: { thinkingLevel: 'low' } } : {}),
        } }),
      });
      if (response.ok) {
        const body = await response.json();
        const raw = (body?.candidates?.[0]?.content?.parts || []).filter((part: any) => !part.thought && typeof part.text === 'string').map((part: any) => part.text).join('');
        const result = JSON.parse(raw);
        if (!result || typeof result.intent !== 'string' || !Number.isFinite(result.confidence)) throw Error('Invalid Gemini navigation result');
        navigationModels = { key, expires: Date.now() + 300000, names: [...new Set([...names, candidate])], preferred: candidate };
        return { ...result, provider: 'gemini', model: candidate };
      }
      lastError = `Gemini navigation HTTP ${response.status}`;
      if ([401, 403].includes(response.status)) break;
      discover = [400, 404].includes(response.status);
    } catch (error) { lastError = error instanceof Error ? error.message : 'Gemini connection failed'; }
    if (attempt === 1) break;
    // Timeouts/quota/5xx say nothing about model availability. Retry the same
    // model once, rather than falling back to an unrelated or retired model.
    if (!discover) continue;
    if (!names.some(name => !attempted.has(name))) {
      try {
        const list = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
          headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(2000),
        });
        if (list.ok) names = ((await list.json()).models || [])
          .filter((item: any) => item.supportedGenerationMethods?.includes('generateContent'))
          .map((item: any) => String(item.name).replace(/^models\//, ''))
          .filter((name: string) => /^gemini-/.test(name) && /flash/.test(name) && !/image|tts|audio|live|vision/.test(name))
          .sort((a: string, b: string) => Number(!a.includes('lite')) - Number(!b.includes('lite')) || a.localeCompare(b));
      } catch { /* one bounded documented-model retry remains */ }
    }
    candidate = names.find(name => !attempted.has(name)) || (configured === 'gemini-2.5-flash-lite' ? 'gemini-2.5-flash' : 'gemini-2.5-flash-lite');
    navigationModels = { key, expires: Date.now() + 300000, names };
  }
  throw new Error(lastError);
}

export async function navigationFallback(key: string, prompt: string, schema: unknown) {
  const model = Deno.env.get('NVIDIA_NAVIGATION_MODEL') || 'meta/llama-3.2-11b-vision-instruct';
  const deadline = Date.now() + 3500;
  const candidates = Array.from(new Set([
    model,
    'meta/llama-3.2-11b-vision-instruct',
    'mistralai/mistral-7b-instruct-v0.3',
    'nv-mistralai/mistral-nemo-12b-instruct'
  ]));
  let lastErr: any = null;
  for (const m of candidates) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    try {
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(remaining), body: JSON.stringify({ model: m, temperature: 0, max_tokens: 1000,
          messages: [{ role: 'system', content: `Return only JSON matching this schema: ${JSON.stringify(schema)}` }, { role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      });
      if (!response.ok) {
        if ([400, 404, 410].includes(response.status) && m !== candidates[candidates.length - 1]) continue;
        throw Error(`Navigation fallback HTTP ${response.status}`);
      }
      const raw = String((await response.json()).choices?.[0]?.message?.content || '');
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      const jsonStr = (firstBrace !== -1 && lastBrace > firstBrace) ? raw.slice(firstBrace, lastBrace + 1) : raw;
      const result = JSON.parse(jsonStr);
      if (!Number.isFinite(result?.confidence)) throw Error('Invalid fallback navigation result');
      return { ...result, provider: 'nvidia', model: m };
    } catch (err) {
      lastErr = err;
      if (m === model && candidates.length > 1) continue;
      break;
    }
  }
  throw lastErr || Error('Navigation fallback failed');
}
