"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot, Send, RefreshCw, User, Cpu, ChevronDown,
  BookOpen, Briefcase, Star, TrendingUp, TrendingDown, Minus,
  AlertTriangle, CheckCircle, XCircle, Clock,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
export type FacultyAIContext = {
  reviewId: string;
  name: string;
  dept: string;
  rank: string;
  teachingRating: string | null;
  scholarshipRating: string | null;
  serviceRating: string | null;
  collegialityRating: string | null;
  overallRating: string | null;
  overallScore: number | null;
  teachingScore: number | null;
  scholarshipScore: number | null;
  serviceScore: number | null;
  teachingGoal: string | null;
  teachingOutcome: string | null;
  scholarshipGoal: string | null;
  scholarshipOutcome: string | null;
  serviceGoal: string | null;
  serviceOutcome: string | null;
  aiSummary: string | null;
};

type Message = { role: "user" | "assistant" | "system"; content: string };

const RATING_SCORE: Record<string, number> = {
  OUTSTANDING: 95,
  EXCEEDS_EXPECTATIONS: 80,
  MEETS_EXPECTATIONS: 60,
  DOES_NOT_MEET_EXPECTATIONS: 30,
};

const RATING_LABEL: Record<string, string> = {
  OUTSTANDING: "Outstanding",
  EXCEEDS_EXPECTATIONS: "Exceeds Expectations",
  MEETS_EXPECTATIONS: "Meets Expectations",
  DOES_NOT_MEET_EXPECTATIONS: "Does Not Meet",
};

const RANK_LABEL: Record<string, string> = {
  ASSISTANT_PROFESSOR: "Asst. Prof",
  ASSOCIATE_PROFESSOR: "Assoc. Prof",
  PROFESSOR: "Professor",
  LECTURER: "Lecturer",
  ADJUNCT: "Adjunct",
};

function ratingColor(r: string | null) {
  if (!r) return "text-slate-600";
  if (r === "OUTSTANDING") return "text-purple-400";
  if (r === "EXCEEDS_EXPECTATIONS") return "text-green-400";
  if (r === "MEETS_EXPECTATIONS") return "text-blue-400";
  return "text-red-400";
}

// Short label maps to minimise token count in system prompt
const S_RATING: Record<string, string> = {
  OUTSTANDING: "Outstanding", EXCEEDS_EXPECTATIONS: "Exceeds",
  MEETS_EXPECTATIONS: "Meets", DOES_NOT_MEET_EXPECTATIONS: "DNM",
};

function buildSystemPrompt(faculty: FacultyAIContext[], selected: FacultyAIContext | null): string {
  const r = (v: string | null) => S_RATING[v ?? ""] ?? "—";
  const ctx = selected
    ? `You are an HR AI for Khalifa University. Answer concisely (3-5 sentences max).
FACULTY: ${selected.name} | ${selected.dept} | ${RANK_LABEL[selected.rank] ?? selected.rank}
Scores — T:${selected.teachingScore ?? "—"} S:${selected.scholarshipScore ?? "—"} Sv:${selected.serviceScore ?? "—"} | Overall:${selected.overallScore?.toFixed(0) ?? "—"} (${r(selected.overallRating)})
Goals/Outcomes — Teaching:"${selected.teachingGoal ?? "—"}"→"${selected.teachingOutcome ?? "—"}" | Scholarship:"${selected.scholarshipGoal ?? "—"}"→"${selected.scholarshipOutcome ?? "—"}" | Service:"${selected.serviceGoal ?? "—"}"→"${selected.serviceOutcome ?? "—"}"
Collegiality:${r(selected.collegialityRating)}${selected.aiSummary ? ` | Note:${selected.aiSummary.slice(0, 120)}` : ""}
PEERS: ${faculty.map((f) => `${f.name}(${f.overallScore?.toFixed(0) ?? "—"})`).join(", ")}`
    : `You are an HR AI for Khalifa University. Answer concisely (3-5 sentences max).
FACULTY DATA:
${faculty.map((f) => `${f.name}|${f.dept}|T:${f.teachingScore ?? "—"} S:${f.scholarshipScore ?? "—"} Sv:${f.serviceScore ?? "—"}|${r(f.overallRating)}(${f.overallScore?.toFixed(0) ?? "—"})`).join("\n")}`;

  return ctx;
}

function TrendIcon({ r }: { r: string | null }) {
  const s = r ? (RATING_SCORE[r] ?? 50) : 50;
  if (s >= 80) return <TrendingUp className="h-3 w-3 text-green-400" />;
  if (s >= 60) return <Minus className="h-3 w-3 text-slate-500" />;
  return <TrendingDown className="h-3 w-3 text-red-400" />;
}

function RecIcon({ r }: { r: string | null }) {
  const s = r ? (RATING_SCORE[r] ?? 50) : 50;
  if (s >= 80) return <CheckCircle className="h-3 w-3 text-green-400" />;
  if (s >= 60) return <AlertTriangle className="h-3 w-3 text-amber-400" />;
  if (s > 0) return <XCircle className="h-3 w-3 text-red-400" />;
  return <Clock className="h-3 w-3 text-slate-600" />;
}

// Models ordered by speed (fastest first) — matched by prefix
const FAST_MODELS_PRIORITY = [
  "llama3.2:3b", "llama3.2:1b",
  "gemma3:4b", "gemma3:2b",
  "phi4-mini", "phi3:mini", "phi3.5:mini",
  "qwen2.5:3b", "qwen2.5:7b",
  "llama3.2", "mistral:7b",
  "qwen2.5:14b", "llama3.1:8b",
];

const MODEL_SPEED: Record<string, { label: string; color: string }> = {
  fast:   { label: "\u26a1 Fast",    color: "text-green-400" },
  medium: { label: "\u25ce Medium",  color: "text-amber-400" },
  slow:   { label: "\u{1F422} Slow", color: "text-red-400" },
};

function modelSpeedTier(m: string): keyof typeof MODEL_SPEED {
  const name = m.toLowerCase();
  // Extract param count heuristic
  const match = name.match(/(\d+\.?\d*)b/);
  const params = match ? parseFloat(match[1]) : 7;
  if (params <= 4) return "fast";
  if (params <= 9) return "medium";
  return "slow";
}

function pickBestModel(available: string[]): string {
  for (const preferred of FAST_MODELS_PRIORITY) {
    const found = available.find((m) => m === preferred || m.startsWith(preferred.split(":")[0] + ":"));
    if (found) return found;
  }
  return available[0];
}

const SUGGESTED: Record<"all" | "single", string[]> = {
  all: [
    "Which faculty are at risk of non-renewal?",
    "Compare teaching performance across departments",
    "Summarize scholarship trends this cycle",
    "Which faculty are ready for promotion?",
  ],
  single: [
    "Should this faculty member's contract be renewed?",
    "What are their main strengths and concerns?",
    "How do they compare to department peers?",
    "Suggest a development plan for next year",
  ],
};

// ── Main component ─────────────────────────────────────────────────────────────
export function OllamaChatPanel({ faculty }: { faculty: FacultyAIContext[] }) {
  const [selected, setSelected] = useState<FacultyAIContext | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState("llama3.2:3b");
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);
  const [provider, setProvider] = useState<"ollama" | "openai" | null>(null);
  const [warming, setWarming] = useState(false);
  const [showModelDrop, setShowModelDrop] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load available models from whichever provider is reachable, then pre-warm
  useEffect(() => {
    fetch("/api/ai/models")
      .then((r) => r.json())
      .then((d: { models: string[]; provider: "ollama" | "openai" | null }) => {
        setProvider(d.provider);
        if (d.models.length > 0) {
          const best = d.provider === "openai" ? d.models[0] : pickBestModel(d.models);
          setModels(d.models);
          setModel(best);
          setOllamaOk(true);
          // Only local models benefit from pre-loading weights into RAM.
          if (d.provider === "ollama") {
            setWarming(true);
            fetch("/api/ai/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ model: best, messages: [{ role: "user", content: "hi" }], stream: false }),
            }).finally(() => setWarming(false));
          }
        } else {
          setOllamaOk(false);
        }
      })
      .catch(() => setOllamaOk(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const resetChat = useCallback(() => {
    setMessages([]);
  }, []);

  useEffect(() => {
    resetChat();
  }, [selected, resetChat]);

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || streaming) return;

    const systemMsg: Message = {
      role: "system",
      content: buildSystemPrompt(faculty, selected),
    };

    const userMsg: Message = { role: "user", content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [systemMsg, ...newMessages],
          stream: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: `⚠️ ${err.error ?? "Error connecting to the AI service."}` },
        ]);
        setStreaming(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line) as {
              message?: { content: string };
              done?: boolean;
            };
            if (chunk.message?.content) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: last.content + chunk.message!.content },
                ];
              });
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "⚠️ Cannot reach the AI service. Check that Ollama is running or that OPENAI_API_KEY is set." },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  const suggestionSet = selected ? SUGGESTED.single : SUGGESTED.all;

  return (
    <div className="flex gap-0 h-[calc(100vh-8rem)] min-h-[600px]">
      {/* ── Left: Faculty list ─────────────────────────────────────────── */}
      <div className="w-64 flex-shrink-0 border-r border-slate-800 flex flex-col bg-[#0d1117]">
        <div className="px-3 py-3 border-b border-slate-800">
          <button
            onClick={() => { setSelected(null); }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              !selected ? "bg-indigo-900/40 text-indigo-300 border border-indigo-800" : "text-slate-400 hover:bg-slate-800/60"
            }`}
          >
            All Faculty ({faculty.length})
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {faculty.map((f) => (
            <button
              key={f.reviewId}
              onClick={() => setSelected(f)}
              className={`w-full text-left px-3 py-2.5 transition-colors border-b border-slate-800/50 last:border-0 ${
                selected?.reviewId === f.reviewId
                  ? "bg-slate-800 border-l-2 border-l-indigo-500"
                  : "hover:bg-slate-800/40"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-medium text-slate-200 leading-snug">{f.name}</p>
                <RecIcon r={f.overallRating} />
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <TrendIcon r={f.overallRating} />
                <p className="text-[10px] text-slate-600 truncate">{f.dept}</p>
              </div>
              <div className="flex gap-1 mt-1">
                {[f.teachingRating, f.scholarshipRating, f.serviceRating].map((r, i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      background: r === "OUTSTANDING" ? "#a855f7"
                        : r === "EXCEEDS_EXPECTATIONS" ? "#22c55e"
                        : r === "MEETS_EXPECTATIONS" ? "#3b82f6"
                        : r ? "#ef4444" : "#334155",
                    }}
                  />
                ))}
                {f.overallScore !== null && (
                  <span className="text-[10px] text-slate-500 ml-auto tabular-nums">{f.overallScore.toFixed(0)}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: Chat panel ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-[#0d1117]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-[#161b22]">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-400" />
            <div>
              <p className="text-sm font-semibold text-white">
                {selected ? selected.name : "All Faculty"}
              </p>
              <p className="text-xs text-slate-500">
                {selected ? `${RANK_LABEL[selected.rank] ?? selected.rank} · ${selected.dept}` : `${faculty.length} faculty in context`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* AI provider status */}
            <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
              warming          ? "bg-amber-900/40 text-amber-400 border border-amber-800"
              : ollamaOk === true  ? "bg-green-900/40 text-green-400 border border-green-800"
              : ollamaOk === false ? "bg-red-900/40 text-red-400 border border-red-800"
              : "bg-slate-800 text-slate-500"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${warming ? "bg-amber-400 animate-pulse" : ollamaOk === true ? "bg-green-400" : ollamaOk === false ? "bg-red-400" : "bg-slate-500"}`} />
              {warming
                ? "Warming up…"
                : ollamaOk === true
                  ? provider === "openai" ? "OpenAI connected" : "Ollama connected"
                  : ollamaOk === false ? "AI offline" : "Checking…"}
            </span>

            {/* Model picker */}
            <div className="relative">
              <button
                onClick={() => setShowModelDrop((v) => !v)}
                className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
              >
                <Cpu className="h-3.5 w-3.5 text-slate-500" />
                {model}
                <ChevronDown className="h-3 w-3 text-slate-500" />
              </button>
              {showModelDrop && models.length > 0 && (
                <div className="absolute right-0 top-full mt-1 bg-[#1e293b] border border-slate-700 rounded-lg shadow-xl z-20 min-w-[240px] flex flex-col" style={{ maxHeight: "min(420px, 80vh)" }}>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600 flex-shrink-0">
                    Available models ({models.length})
                  </p>
                  <div className="overflow-y-auto flex-1">
                    {[...models]
                      .sort((a, b) => {
                        const ai = FAST_MODELS_PRIORITY.findIndex((p) => a.startsWith(p.split(":")[0]));
                        const bi = FAST_MODELS_PRIORITY.findIndex((p) => b.startsWith(p.split(":")[0]));
                        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
                      })
                      .map((m) => {
                        const tier = modelSpeedTier(m);
                        const speed = MODEL_SPEED[tier];
                        return (
                          <button
                            key={m}
                            onClick={() => {
                            setModel(m);
                            setShowModelDrop(false);
                            // Pre-warm the newly selected model
                            setWarming(true);
                            fetch("/api/ai/chat", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ model: m, messages: [{ role: "user", content: "hi" }], stream: false }),
                            }).finally(() => setWarming(false));
                          }}
                            className={`w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors flex items-center justify-between gap-2 ${m === model ? "bg-slate-800" : ""}`}
                          >
                            <span className={`text-xs truncate ${m === model ? "text-indigo-300 font-semibold" : "text-slate-300"}`}>{m}</span>
                            <span className={`text-[10px] font-medium flex-shrink-0 ${speed.color}`}>{speed.label}</span>
                          </button>
                        );
                      })}
                  </div>
                  <div className="px-3 py-2 border-t border-slate-700 text-[10px] text-slate-600 flex-shrink-0 rounded-b-lg">
                    {provider === "openai"
                      ? "Cloud models · billed to your OpenAI account"
                      : <>Pull faster: <code className="text-slate-500">ollama pull llama3.2:3b</code></>}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={resetChat}
              title="Clear chat"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Selected faculty scores strip */}
        {selected && (
          <div className="flex gap-4 px-5 py-2.5 border-b border-slate-800 bg-[#161b22]/60">
            {[
              { icon: BookOpen, label: "Teaching", r: selected.teachingRating },
              { icon: Star, label: "Scholarship", r: selected.scholarshipRating },
              { icon: Briefcase, label: "Service", r: selected.serviceRating },
              { icon: TrendingUp, label: "Overall", r: selected.overallRating },
            ].map(({ icon: Icon, label, r }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-slate-600" />
                <span className="text-xs text-slate-500">{label}:</span>
                <span className={`text-xs font-semibold ${ratingColor(r)}`}>
                  {RATING_LABEL[r ?? ""] ?? "—"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-900/40 border border-indigo-800 flex items-center justify-center">
                <Bot className="h-8 w-8 text-indigo-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-lg">Faculty Performance AI</p>
                <p className="text-slate-500 text-sm mt-1">
                  {selected
                    ? `Ask anything about ${selected.name.split(" ").pop()}'s performance`
                    : "Ask about faculty performance, trends, or contract recommendations"}
                </p>
                {ollamaOk === false && (
                  <div className="mt-3 bg-red-950/40 border border-red-900 rounded-lg px-4 py-3 text-xs text-red-300 max-w-sm mx-auto">
                    <p className="font-semibold mb-1">No AI provider available</p>
                    <p>Start a local model with <code className="bg-red-900/40 px-1 rounded">ollama serve</code>, or set an <code className="bg-red-900/40 px-1 rounded">OPENAI_API_KEY</code>.</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                {suggestionSet.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    disabled={streaming || ollamaOk === false}
                    className="text-left text-xs bg-slate-800/60 hover:bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "user" ? "bg-indigo-700" : "bg-slate-800 border border-slate-700"
              }`}>
                {msg.role === "user" ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-indigo-400" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-indigo-700 text-white rounded-tr-sm"
                  : "bg-[#161b22] border border-slate-800 text-slate-200 rounded-tl-sm"
              }`}>
                {msg.content || (streaming && i === messages.length - 1 ? (
                  <span className="flex gap-1 items-center text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                ) : "")}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-slate-800 bg-[#161b22]">
          {messages.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {suggestionSet.slice(0, 2).map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  disabled={streaming}
                  className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full px-3 py-1 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder={ollamaOk === false ? "AI offline — no provider configured" : "Ask about faculty performance…"}
              rows={1}
              disabled={streaming || ollamaOk === false}
              className="flex-1 resize-none bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-700 disabled:opacity-50 min-h-[42px] max-h-[120px]"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || streaming || ollamaOk === false}
              className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white flex items-center justify-center flex-shrink-0 transition-colors"
            >
              {streaming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-700 mt-2 text-center">
            {provider === "openai"
              ? "Powered by OpenAI · Faculty data is sent to OpenAI"
              : "Powered by Ollama · Running locally"} · Context: {faculty.length} faculty
          </p>
        </div>
      </div>
    </div>
  );
}
