export const runtime = "nodejs";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

const OPENAI_MODELS = [
  process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  "gpt-4o",
  "gpt-4o-mini",
];

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
    // Ollama unreachable — fall through to OpenAI.
  }

  if (process.env.OPENAI_API_KEY) {
    return Response.json({
      models: [...new Set(OPENAI_MODELS)],
      provider: "openai",
    });
  }

  return Response.json({ models: [], provider: null });
}
