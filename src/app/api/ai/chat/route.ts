import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, model = "llama3.2" } = body as {
    messages: Array<{ role: string; content: string }>;
    model?: string;
  };

  try {
    const ollamaRes = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: true }),
    });

    if (!ollamaRes.ok) {
      const err = await ollamaRes.text();
      return Response.json({ error: `Ollama error: ${err}` }, { status: 502 });
    }

    // Forward the raw NDJSON stream from Ollama to the browser
    return new Response(ollamaRes.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return Response.json(
      { error: "Cannot connect to Ollama. Make sure it is running on localhost:11434 (`ollama serve`)." },
      { status: 503 }
    );
  }
}
