import { AI_BASE_URL } from "@/lib/ai";

export const runtime = "nodejs";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

/** Ask an OpenAI-compatible provider what models it serves. */
async function listCloudModels(): Promise<string[]> {
  const fallback = process.env.OPENAI_MODEL ? [process.env.OPENAI_MODEL] : [];
  try {
    const res = await fetch(`${AI_BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return fallback;

    const data = (await res.json()) as { data?: Array<{ id: string }> };
    const ids = (data.data ?? [])
      .map((m) => m.id)
      .filter((id) => !/embed|whisper|tts|dall-e|guard|orpheus|speech/i.test(id));
    if (ids.length === 0) return fallback;

    // Keep the configured default first so it stays pre-selected in the UI.
    const preferred = process.env.OPENAI_MODEL;
    ids.sort();
    return preferred && ids.includes(preferred)
      ? [preferred, ...ids.filter((id) => id !== preferred)]
      : ids;
  } catch {
    return fallback;
  }
}

export async function GET() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const models = (data.models ?? []).map((m) => m.name);
      if (models.length > 0) return Response.json({ models, provider: "ollama" });
    }
  } catch {
    // Ollama unreachable — fall through to the cloud provider.
  }

  if (process.env.OPENAI_API_KEY) {
    const models = await listCloudModels();
    if (models.length > 0) return Response.json({ models, provider: "openai" });
  }

  return Response.json({ models: [], provider: null });
}
