"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Trophy, ArrowRight, Info } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
export type FacultyRawScore = {
  reviewId: string;
  name: string;
  dept: string;
  deptId: string;    // department UUID for client-side filtering
  t: number | null;    // teaching     0-100
  s: number | null;    // scholarship  0-100
  sv: number | null;   // service      0-100
  co: number | null;   // collegiality 0-100
  overallRating: string | null;
  collegialityRating: string | null;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const RATING_LABELS: Record<string, string> = {
  OUTSTANDING:                "Outstanding",
  EXCEEDS_EXPECTATIONS:       "Exceeds Expectations",
  MEETS_EXPECTATIONS:         "Meets Expectations",
  DOES_NOT_MEET_EXPECTATIONS: "Does Not Meet",
};

const RATING_CLS: Record<string, string> = {
  OUTSTANDING:                "bg-purple-900/60 text-purple-300 border-purple-700",
  EXCEEDS_EXPECTATIONS:       "bg-emerald-900/60 text-emerald-400 border-emerald-700",
  MEETS_EXPECTATIONS:         "bg-blue-900/60 text-blue-400 border-blue-700",
  DOES_NOT_MEET_EXPECTATIONS: "bg-red-900/60 text-red-400 border-red-700",
};

const DIM_COLORS = ["#06b6d4", "#a855f7", "#22c55e", "#f59e0b"] as const;

// ── Weight math ───────────────────────────────────────────────────────────────
// Adjust weights so the sum always stays at 100.
// When one weight changes, others scale proportionally.
function redistribute(
  w: [number, number, number, number],
  changedIdx: number,
  rawVal: number,
): [number, number, number, number] {
  const clamped = Math.max(0, Math.min(100, Math.round(rawVal)));
  const next = [...w] as [number, number, number, number];
  next[changedIdx] = clamped;

  const others = ([0, 1, 2, 3] as const).filter((i) => i !== changedIdx);
  const remaining = 100 - clamped;
  const othersSum = others.reduce<number>((s, i) => s + w[i], 0);

  if (remaining <= 0) {
    others.forEach((i) => (next[i] = 0));
    return next;
  }
  if (othersSum === 0) {
    const each = Math.floor(remaining / others.length);
    let leftover = remaining - each * others.length;
    others.forEach((i) => { next[i] = each + (leftover-- > 0 ? 1 : 0); });
  } else {
    let distributed = 0;
    const last = others[others.length - 1];
    others.slice(0, -1).forEach((i) => {
      const v = Math.round((w[i] / othersSum) * remaining);
      next[i] = v;
      distributed += v;
    });
    next[last] = Math.max(0, remaining - distributed);
  }
  return next;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function WeightedRankingPanel({
  rawScores,
  selectedDeptId = "",
}: {
  rawScores: FacultyRawScore[];
  selectedDeptId?: string;
}) {
  // weights: [teaching, scholarship, service, collegiality]
  const [weights, setWeights] = useState<[number, number, number, number]>([40, 40, 20, 0]);
  const [colEnabled, setColEnabled] = useState(false);

  const [wT, wS, wSv, wC] = weights;

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleSlider(idx: number, val: number) {
    setWeights(redistribute(weights, idx, val));
  }

  function toggleCollegiality(on: boolean) {
    setColEnabled(on);
    if (on) {
      // Add collegiality at 10%, deduct from others proportionally
      setWeights(redistribute(weights, 3, 10));
    } else {
      // Remove collegiality entirely, redistribute its weight
      const w: [number, number, number, number] = [...weights];
      w[3] = 0;
      const totalOther = w[0] + w[1] + w[2];
      if (totalOther === 0) {
        setWeights([40, 40, 20, 0]);
      } else {
        const scale = 100 / totalOther;
        const t2  = Math.round(w[0] * scale);
        const s2  = Math.round(w[1] * scale);
        const sv2 = 100 - t2 - s2;
        setWeights([t2, s2, Math.max(0, sv2), 0]);
      }
    }
  }

  // ── Computed ranking ───────────────────────────────────────────────────────
  const ranked = useMemo(() => {
    // Filter by selected department client-side — instant, no server round-trip
    const scope = selectedDeptId
      ? rawScores.filter((f) => f.deptId === selectedDeptId)
      : rawScores;

    return scope
      .map((f) => {
        const items = [
          { v: f.t,  w: wT  },
          { v: f.s,  w: wS  },
          { v: f.sv, w: wSv },
          ...(colEnabled ? [{ v: f.co, w: wC }] : []),
        ].filter((x): x is { v: number; w: number } => x.v !== null && x.w > 0);

        if (items.length === 0) return null;
        const totalW = items.reduce((s, x) => s + x.w, 0);
        const score  = totalW > 0 ? items.reduce((s, x) => s + x.v * x.w, 0) / totalW : null;
        return score !== null ? { f, score } : null;
      })
      .filter((x): x is { f: FacultyRawScore; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .map((x, i) => ({ ...x, rank: i + 1 }));
  }, [rawScores, selectedDeptId, wT, wS, wSv, wC, colEnabled]);

  // ── Slider rows ────────────────────────────────────────────────────────────
  const dims = [
    { label: "Teaching",    idx: 0 as const, w: wT,  color: DIM_COLORS[0] },
    { label: "Scholarship", idx: 1 as const, w: wS,  color: DIM_COLORS[1] },
    { label: "Service",     idx: 2 as const, w: wSv, color: DIM_COLORS[2] },
    ...(colEnabled
      ? [{ label: "Collegiality", idx: 3 as const, w: wC, color: DIM_COLORS[3] }]
      : []),
  ];

  const weightSummary = `Teaching ${wT}% · Scholarship ${wS}% · Service ${wSv}%${colEnabled ? ` · Collegiality ${wC}%` : ""}`;
  const facultyCount = ranked.length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden">

      {/* Card header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 bg-yellow-400 rounded-full" />
            <h2 className="text-sm font-semibold text-white">Faculty Performance Ranking</h2>
            <span className="text-xs text-slate-600 font-normal">{facultyCount} faculty</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 pl-3">{weightSummary}</p>
        </div>
        <Link
          href="/dashboard/appraisal"
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Weight tuner */}
      <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/40">
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Score Weights
          </span>
          <span className="text-[10px] text-slate-600">· drag sliders to adjust · always sums to 100%</span>

          {/* Collegiality toggle */}
          <button
            onClick={() => toggleCollegiality(!colEnabled)}
            className={`ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
              colEnabled
                ? "bg-amber-900/40 border-amber-700 text-amber-300 hover:bg-amber-900/60"
                : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
            }`}
          >
            <span className="text-amber-400">★</span>
            Collegiality&nbsp;
            <span className="font-semibold">{colEnabled ? `${wC}%` : "off"}</span>
          </button>
        </div>

        <div className={`grid gap-y-2 gap-x-4 ${dims.length === 4 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"}`}>
          {dims.map((d) => (
            <div key={d.label} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: d.color }}
              />
              <span className="text-xs text-slate-400 w-[5.5rem] flex-shrink-0">{d.label}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={d.w}
                onChange={(e) => handleSlider(d.idx, Number(e.target.value))}
                className="flex-1 cursor-pointer"
                style={{ accentColor: d.color, height: "4px" }}
              />
              <span className="text-xs font-bold text-slate-300 w-8 text-right tabular-nums">
                {d.w}%
              </span>
            </div>
          ))}
        </div>

        {colEnabled && (
          <p className="text-[10px] text-slate-600 mt-2 flex items-center gap-1">
            <Info className="h-3 w-3 flex-shrink-0" />
            Collegiality weight is deducted proportionally from Teaching, Scholarship &amp; Service.
            It does not affect the Overall Rating field.
          </p>
        )}
      </div>

      {/* Ranking list — all faculty, scrollable */}
      {ranked.length === 0 ? (
        <div className="py-12 text-center">
          <Trophy className="h-8 w-8 mx-auto mb-2 text-slate-700" />
          <p className="text-sm text-slate-500">No rated reviews yet.</p>
        </div>
      ) : (
        <div className="overflow-y-auto" style={{ maxHeight: "560px" }}>
          {ranked.map(({ f, score, rank }) => {
            const medalCls =
              rank === 1 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-700" :
              rank === 2 ? "bg-slate-600/40  text-slate-300 border border-slate-600"   :
              rank === 3 ? "bg-orange-500/20 text-orange-400 border border-orange-700" :
                           "bg-slate-800     text-slate-500 border border-slate-700";
            const ratingCls = f.overallRating
              ? (RATING_CLS[f.overallRating] ?? "bg-slate-800 text-slate-400 border-slate-700")
              : null;

            // Per-dimension scores for tooltip row
            const dimScores = [
              f.t  !== null ? `T:${f.t}`   : null,
              f.s  !== null ? `S:${f.s}`   : null,
              f.sv !== null ? `Sv:${f.sv}` : null,
              colEnabled && f.co !== null ? `C:${f.co}` : null,
            ].filter(Boolean).join("  ");

            return (
              <Link
                key={f.reviewId}
                href={`/dashboard/appraisal/${f.reviewId}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/60 transition-colors border-b border-slate-800/50 last:border-0"
              >
                {/* Rank badge */}
                <span
                  className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${medalCls}`}
                >
                  {rank}
                </span>

                {/* Name + dept / dim scores */}
                <div className="w-52 flex-shrink-0 min-w-0">
                  <p className="text-sm font-medium text-slate-200 leading-snug">{f.name}</p>
                  {dimScores ? (
                    <p className="text-[10px] text-slate-600 font-mono mt-0.5 leading-none">{dimScores}</p>
                  ) : (
                    <p className="text-xs text-slate-600 truncate">{f.dept}</p>
                  )}
                </div>

                {/* Score bar */}
                <div className="flex-1 hidden sm:flex items-center gap-2">
                  <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(score, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-300 w-10 text-right tabular-nums">
                    {score.toFixed(0)}
                  </span>
                </div>

                {/* Rating badge + collegiality */}
                <div className="flex-shrink-0 flex items-center gap-1.5">
                  {ratingCls && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${ratingCls}`}>
                      {RATING_LABELS[f.overallRating!] ?? f.overallRating}
                    </span>
                  )}
                  {f.collegialityRating && (
                    <span title="Collegiality rated" className="text-yellow-500 text-xs">★</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
