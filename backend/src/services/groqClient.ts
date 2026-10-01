import axios from 'axios';

/**
 * Simple wrapper for Groq or Gemini API calls.
 */
// Groq retires model IDs regularly (llama-3.x and mixtral are gone), so the
// preferred list below is only a hint: we ask /models what the key can use
// and keep the ones that exist, in preference order, then any other chat model.
const GROQ_PREFERRED = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
const GROQ_NON_CHAT = /whisper|orpheus|prompt-guard|safeguard|tts|embed/i;
let groqModelCache: { at: number; models: string[] } | null = null;

async function resolveGroqModels(apiKey: string, requested?: string): Promise<string[]> {
  if (!groqModelCache || Date.now() - groqModelCache.at > 60 * 60 * 1000) {
    try {
      const res = await axios.get('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 10000,
      });
      const ids: string[] = (res.data?.data || [])
        .filter((m: any) => m.active !== false && !GROQ_NON_CHAT.test(m.id))
        .map((m: any) => m.id);
      groqModelCache = { at: Date.now(), models: ids };
    } catch (e: any) {
      console.warn(`[API Warning] Could not list Groq models (${e.message}); using preferred list.`);
      groqModelCache = { at: Date.now(), models: [] };
    }
  }
  const available = groqModelCache.models;
  const wanted = [requested, ...GROQ_PREFERRED].filter((m): m is string => !!m);
  if (available.length === 0) return Array.from(new Set(wanted));
  const ordered = wanted.filter((m) => available.includes(m));
  for (const m of available) if (!ordered.includes(m)) ordered.push(m);
  return ordered;
}

export async function groqRequest<T>(prompt: string, model?: string): Promise<T> {
  const apiKey = process.env.GROQ_API_KEY || '';
  if (!apiKey) {
    throw new Error('API key is not set in environment or settings');
  }

  const isGemini = !apiKey.startsWith('gsk_');
  const models = isGemini 
    ? ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'] 
    : await resolveGroqModels(apiKey, model);

  let lastError: any = null;

  for (const currentModel of models) {
    let delay = 1500;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (isGemini) {
          const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent`,
            {
              contents: [{
                parts: [{
                  text: prompt
                }]
              }],
              generationConfig: {
                responseMimeType: "application/json"
              }
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
              },
              timeout: 25000,
            }
          );
          const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          return JSON.parse(text.trim()) as T;
        } else {
          const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
              model: currentModel,
              messages: [{ role: 'user', content: `${prompt}\n\nReturn ONLY the JSON structure. Do not include markdown code block syntax.` }],
              response_format: { type: 'json_object' },
              temperature: 0.85,
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: 25000,
            }
          );
          const text = response.data?.choices?.[0]?.message?.content || '';
          return JSON.parse(text.trim()) as T;
        }
      } catch (e: any) {
        lastError = e;
        const status = e.response?.status;
        console.warn(`[API Warning] Model ${currentModel} failed on attempt ${attempt + 1}. Status: ${status || e.message}. Retrying in ${delay}ms...`);
        // If it's a JSON parse error, do not retry - the API succeeded but format was malformed. Try next model.
        if (e instanceof SyntaxError) {
          break;
        }
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
  }

  throw new Error(`All API provider models failed. Last error: ${lastError?.message || 'Unknown API failure'}`);
}
