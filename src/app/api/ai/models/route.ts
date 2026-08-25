export const runtime = "nodejs";

export async function GET() {
  try {
    const res = await fetch("http://localhost:11434/api/tags", { cache: "no-store" });
    if (!res.ok) return Response.json({ models: [] });
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    const models = (data.models ?? []).map((m) => m.name);
    return Response.json({ models });
  } catch {
    return Response.json({ models: [] });
  }
}
