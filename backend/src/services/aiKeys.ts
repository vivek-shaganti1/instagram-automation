import { prisma } from "../db";
// Groq keys are the only ones with a stable prefix. Gemini keys have changed
// format (AIza… → AQ.…), so "not Groq" means Gemini.
export const isGroqKey = (key: string) => key.startsWith("gsk_");

// Settings saved from the dashboard win over env vars. Keys are routed by
// what they are, not by which field they were pasted into, because the old
// UI only had one "Gemini" field and people stored Groq keys there.
export async function getAiKeys(): Promise<{ groqKey: string; geminiKey: string; textKey: string }> {
  const rows = await prisma.settings.findMany({
    where: { key: { in: ["groq_api_key", "google_ai_api_key"] } },
  });
  const db = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const candidates = [db.groq_api_key, db.google_ai_api_key, process.env.GROQ_API_KEY, process.env.GOOGLE_AI_API_KEY]
    .map((k) => (k || "").trim())
    .filter(Boolean);

  const groqKey = candidates.find(isGroqKey) || "";
  const geminiKey = candidates.find((k) => !isGroqKey(k)) || "";
  return { groqKey, geminiKey, textKey: groqKey || geminiKey };
}
