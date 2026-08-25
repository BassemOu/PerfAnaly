"use client";

import { useState } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, TrendingUp, Users, AlertTriangle, CheckCircle } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
export type FacultyHeatmapRow = {
  name: string;
  teaching: string | null;
  scholarship: string | null;
  service: string | null;
  collegiality: string | null;
  score: number | null;
};

export type DeptData = {
  id: string;
  name: string;
  code: string;
  facultyCount: number;
  avgScore: number | null;
  avgTeaching: number | null;
  avgScholarship: number | null;
  avgService: number | null;
  avgCollegiality: number | null;
  eligible: number;
  needsDev: number;
  notEligible: number;
  collegiality_flags: number;
  heatmap: FacultyHeatmapRow[];
};

// ── Rating cell for heatmap ───────────────────────────────────────────────────
const HEATMAP_COLORS: Record<string, string> = {
  EXCEEDS_EXPECTATIONS:       "bg-green-100  text-green-800  border-green-200",
  MEETS_EXPECTATIONS:         "bg-blue-100   text-blue-800   border-blue-200",
  DOES_NOT_MEET_EXPECTATIONS: "bg-red-100    text-red-700    border-red-200",
};
const HEATMAP_SHORT: Record<string, string> = {
  EXCEEDS_EXPECTATIONS:       "EE",
  MEETS_EXPECTATIONS:         "ME",
  DOES_NOT_MEET_EXPECTATIONS: "DNM",
};
const HEATMAP_LONG: Record<string, string> = {
  EXCEEDS_EXPECTATIONS:       "Exceeds Expectations",
  MEETS_EXPECTATIONS:         "Meets Expectations",
  DOES_NOT_MEET_EXPECTATIONS: "Does Not Meet",
};

function HeatCell({ rating, flag }: { rating: string | null; flag?: boolean }) {
  if (!rating) {
    return (
      <div className="h-8 w-full rounded border border-gray-100 bg-gray-50 flex items-center justify-center">
        <span className="text-gray-300 text-xs">—</span>
      </div>
    );
  }
  const cls   = HEATMAP_COLORS[rating] ?? "bg-gray-100 text-gray-500 border-gray-200";
  const short = HEATMAP_SHORT[rating] ?? rating.slice(0, 3);
  const long  = HEATMAP_LONG[rating]  ?? rating;
  return (
    <div
      title={long}
      className={`h-8 w-full rounded border flex items-center justify-center gap-0.5 ${cls}`}
    >
      <span className="text-xs font-semibold">{short}</span>
      {flag && <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />}
    </div>
  );
}

// ── Custom tooltip for radar ──────────────────────────────────────────────────
function RadarTooltip({ active, payload }: { active?: boolean; payload?: { payload: { subject: string; value: number } }[] }) {
  if (!active || !payload?.length) return null;
  const { subject, value } = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800">{subject}</p>
      <p className="text-indigo-600 font-bold text-sm">{value.toFixed(0)}</p>
      <p className="text-gray-400">out of 100</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function DepartmentStatsPanel({ departments }: { departments: DeptData[] }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!departments.length) return null;

  const dept = departments[selectedIdx];

  const radarData = [
    { subject: "Teaching",     value: dept.avgTeaching    ?? 0, fullMark: 100 },
    { subject: "Scholarship",  value: dept.avgScholarship ?? 0, fullMark: 100 },
    { subject: "Service",      value: dept.avgService     ?? 0, fullMark: 100 },
    { subject: "Collegiality ★", value: dept.avgCollegiality ?? 0, fullMark: 100 },
  ];

  const scoreColor =
    (dept.avgScore ?? 0) >= 72 ? "text-green-600" :
    (dept.avgScore ?? 0) >= 55 ? "text-yellow-600" :
    "text-red-500";

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-500" />
            Department Analytics
          </CardTitle>

          {/* Department selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="dept-select" className="text-xs text-gray-500 font-medium whitespace-nowrap">
              Department:
            </label>
            <select
              id="dept-select"
              value={selectedIdx}
              onChange={(e) => setSelectedIdx(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer shadow-sm"
            >
              {departments.map((d, i) => (
                <option key={d.id} value={i}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: Radar chart + metrics */}
          <div className="space-y-4">
            {/* Radar */}
            <div className="bg-slate-900 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-medium mb-2 uppercase tracking-wide">
                Performance Dimensions
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: "#475569", fontSize: 9 }}
                    tickCount={4}
                  />
                  <Radar
                    name={dept.name}
                    dataKey="value"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.25}
                    strokeWidth={2}
                    dot={{ fill: "#818cf8", r: 4 }}
                  />
                  <Tooltip content={<RadarTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-indigo-500 opacity-70 inline-block" />
                  <span className="text-xs text-slate-400">{dept.name}</span>
                </div>
              </div>
              <p className="text-center text-xs text-slate-500 mt-1.5">
                ★ Collegiality shown for reference — not weighted in composite score
              </p>
            </div>

            {/* Metric pills */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-medium text-indigo-600">Faculty</span>
                </div>
                <p className="text-2xl font-bold text-indigo-700">{dept.facultyCount}</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-slate-500" />
                  <span className="text-xs font-medium text-slate-600">Avg Score</span>
                </div>
                <p className={`text-2xl font-bold ${scoreColor}`}>
                  {dept.avgScore !== null ? dept.avgScore.toFixed(0) : "—"}
                </p>
              </div>

              <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-medium text-green-600">Eligible</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{dept.eligible}</p>
                <p className="text-xs text-green-500 mt-0.5">for promotion</p>
              </div>

              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium text-amber-600">Coll. Flags</span>
                </div>
                <p className="text-2xl font-bold text-amber-700">{dept.collegiality_flags}</p>
                <p className="text-xs text-amber-500 mt-0.5">unweighted</p>
              </div>
            </div>

            {/* Readiness bar */}
            {(dept.eligible + dept.needsDev + dept.notEligible) > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500">Promotion Readiness Split</p>
                <div className="flex rounded-full overflow-hidden h-3 gap-0.5">
                  {dept.eligible > 0 && (
                    <div
                      title={`Eligible: ${dept.eligible}`}
                      className="bg-green-400 h-full"
                      style={{ flex: dept.eligible }}
                    />
                  )}
                  {dept.needsDev > 0 && (
                    <div
                      title={`Needs Development: ${dept.needsDev}`}
                      className="bg-yellow-400 h-full"
                      style={{ flex: dept.needsDev }}
                    />
                  )}
                  {dept.notEligible > 0 && (
                    <div
                      title={`Not Eligible: ${dept.notEligible}`}
                      className="bg-red-400 h-full"
                      style={{ flex: dept.notEligible }}
                    />
                  )}
                </div>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Eligible ({dept.eligible})</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />Needs Dev. ({dept.needsDev})</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Not Eligible ({dept.notEligible})</span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Faculty heatmap */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Faculty Performance Heatmap</p>

            {dept.heatmap.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No performance data for this department.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left py-2 pr-3 font-medium text-gray-500 w-32">Faculty</th>
                      <th className="text-center py-2 px-1 font-medium text-gray-500 w-16">Teaching</th>
                      <th className="text-center py-2 px-1 font-medium text-gray-500 w-20">Scholarship</th>
                      <th className="text-center py-2 px-1 font-medium text-gray-500 w-16">Service</th>
                      <th className="text-center py-2 px-1 font-medium text-gray-500 w-20">
                        Coll. ★
                      </th>
                      <th className="text-right py-2 pl-2 font-medium text-gray-500 w-12">Score</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-1">
                    {dept.heatmap.map((row, i) => (
                      <tr key={i} className="group">
                        <td className="pr-3 py-1">
                          <span
                            className="text-gray-800 font-medium truncate block max-w-[7rem] group-hover:text-indigo-600 transition-colors"
                            title={row.name}
                          >
                            {row.name}
                          </span>
                        </td>
                        <td className="px-1 py-1">
                          <HeatCell rating={row.teaching} />
                        </td>
                        <td className="px-1 py-1">
                          <HeatCell rating={row.scholarship} />
                        </td>
                        <td className="px-1 py-1">
                          <HeatCell rating={row.service} />
                        </td>
                        <td className="px-1 py-1">
                          <HeatCell
                            rating={row.collegiality}
                            flag={row.collegiality === "DOES_NOT_MEET_EXPECTATIONS"}
                          />
                        </td>
                        <td className="pl-2 py-1 text-right">
                          {row.score !== null ? (
                            <span
                              className={`font-bold tabular-nums ${
                                row.score >= 72 ? "text-green-600" :
                                row.score >= 55 ? "text-yellow-600" :
                                "text-red-500"
                              }`}
                            >
                              {row.score.toFixed(0)}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Heatmap legend */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-3">
                  {[
                    { label: "EE — Exceeds",        cls: "bg-green-100 border-green-200 text-green-700" },
                    { label: "ME — Meets",           cls: "bg-blue-100 border-blue-200 text-blue-700" },
                    { label: "DNM — Does Not Meet",  cls: "bg-red-100 border-red-200 text-red-700" },
                  ].map((item) => (
                    <span key={item.label} className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${item.cls}`}>
                      {item.label}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                    <AlertTriangle className="h-3 w-3" /> Collegiality flag
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
