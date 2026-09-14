import { NextRequest } from "next/server";
import { openai, AI_MODEL } from "@/lib/ai";

export const runtime = "nodejs";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

type ChatMessage = { role: string; content: string };

function ndjson(obj: unknown) {
  return JSON.stringify(obj) + "\n";
}

/** Re-emits an OpenAI stream in Ollama's NDJSON shape so the client parser is unchanged. */
function streamFromOpenAI(messages: ChatMessage[], model: string) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const completion = await openai.chat.completions.create({
          model,
          messages: messages as Parameters<
            typeof openai.chat.completions.create
          >[0]["messages"],
          stream: true,
        });

        for await (const part of completion) {
          const content = part.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(
              encoder.encode(ndjson({ message: { content }, done: false }))
            );
          }
        }
        controller.enqueue(
          encoder.encode(ndjson({ message: { content: "" }, done: true }))
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "OpenAI request failed";
        controller.enqueue(
          encoder.encode(ndjson({ message: { content: `\n\n⚠️ ${msg}` }, done: true }))
        );
      } finally {
        controller.close();
      }
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, model = "llama3.2" } = body as {
    messages: ChatMessage[];
    model?: string;
  };

  const streamHeaders = {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  };

  try {
    const ollamaRes = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: true }),
      signal: AbortSignal.timeout(5000),
    });

    if (ollamaRes.ok) {
      return new Response(ollamaRes.body, { headers: streamHeaders });
    }
  } catch {
    // Ollama unreachable — fall through to OpenAI.
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: `No AI provider available. Start Ollama at ${OLLAMA_BASE_URL} or set OPENAI_API_KEY.` },
      { status: 503 }
    );
  }

  // Ollama model names (e.g. "llama3.2:3b") are meaningless to OpenAI.
  const openaiModel =
    model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3")
      ? model
      : AI_MODEL;

  return new Response(streamFromOpenAI(messages, openaiModel), { headers: streamHeaders });
}
