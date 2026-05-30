import axios from 'axios';

/**
 * Simple wrapper for Groq or Gemini API calls.
 */
export async function groqRequest<T>(prompt: string, model: string = 'llama-3.3-70b-versatile'): Promise<T> {
  const apiKey = process.env.GROQ_API_KEY || '';
  if (!apiKey) {
    throw new Error('API key is not set in environment or settings');
  }

  const isGemini = apiKey.startsWith('AIzaSy');
  const models = isGemini 
    ? ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'] 
    : [model, 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];

  let lastError: any = null;

  for (const currentModel of models) {
    let delay = 1500;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (isGemini) {
          const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`,
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
