"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import type { DeptData } from "./DepartmentStatsPanel";
import type { FacultyRawScore } from "./WeightedRankingPanel";

type RatingBar = { name: string; shortName: string; count: number; color: string };

// ── Custom tooltips ───────────────────────────────────────────────────────────
function BarTip({ active, payload }: { active?: boolean; payload?: { payload: RatingBar; value: number }[] }) {
  if (!active || !payload?.length) return null;
  const { name, value } = { name: payload[0].payload.name, value: payload[0].value };
  return (
    <div className="bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-200 font-semibold">{name}</p>
      <p className="text-indigo-300 font-bold text-sm mt-0.5">{value} faculty</p>
    </div>
  );
}

type MRP = { name: string; value: number; color: string; payload?: { subject: string } };
function MultiRadarTip({ active, payload }: { active?: boolean; payload?: MRP[] }) {
  if (!active || !payload?.length) return null;
  const subject = (payload[0] as MRP & { payload: { subject: string } }).payload?.subject ?? "";
  return (
    <div className="bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl min-w-[140px]">
      <p className="text-slate-200 font-semibold mb-1.5 truncate">{subject}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-3">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold text-slate-200">{p.value.toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}

const DIMS = [
  { key: "T",  name: "Teaching",     color: "#06b6d4" },
  { key: "S",  name: "Scholarship",  color: "#a855f7" },
  { key: "Sv", name: "Service",      color: "#22c55e" },
  { key: "C",  name: "Collegiality", color: "#f59e0b" },
] as const;

// ── Main component ────────────────────────────────────────────────────────────
export function DashboardCharts({
  ratingBars,
  rawScores,
  depts,
  selectedDeptId,
}: {
  ratingBars: RatingBar[];
  rawScores: FacultyRawScore[];
  depts: DeptData[];
  selectedDeptId?: string;
}) {
  type RadarRow = { subject: string; T: number; S: number; Sv: number; C: number };
  let radarData: RadarRow[];
  let radarTitle: string;

  if (selectedDeptId) {
    // Axes = faculty in selected dept, series = dimensions
    const faculty = rawScores.filter((f) => f.deptId === selectedDeptId);
    radarData = faculty.map((f) => ({
      subject: f.name.length > 20 ? f.name.slice(0, 20) + "\u2026" : f.name,
      T:  f.t  ?? 0,
      S:  f.s  ?? 0,
      Sv: f.sv ?? 0,
      C:  f.co ?? 0,
    }));
    const deptName = depts.find((d) => d.id === selectedDeptId)?.name ?? "";
    radarTitle = `Faculty Scores \u2014 ${deptName}`;
  } else {
    // Axes = dept names, series = dimensions
    radarData = depts
      .filter((d) => d.facultyCount > 0)
      .map((d) => ({
        subject: d.name.length > 22 ? d.name.slice(0, 22) + "\u2026" : d.name,
        T:  d.avgTeaching     ?? 0,
        S:  d.avgScholarship  ?? 0,
        Sv: d.avgService      ?? 0,
        C:  d.avgCollegiality ?? 0,
      }));
    radarTitle = "Performance by Department";
  }

  const outerR = radarData.length > 10 ? "50%" : "64%";
  const tickSize = radarData.length > 10 ? 8 : 10;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ── Bar chart: Overall Rating Distribution ── */}
      <div className="bg-[#161b22] border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <span className="w-1 h-4 bg-cyan-400 rounded-full flex-shrink-0" />
          <p className="text-sm font-semibold text-white">Overall Rating Distribution</p>
        </div>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={ratingBars} barCategoryGap="35%" margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <XAxis
              dataKey="shortName"
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<BarTip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="count" radius={[5, 5, 0, 0]}>
              {ratingBars.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-800">
          {ratingBars.map((b) => (
            <span key={b.name} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: b.color }} />
              {b.shortName}
              <strong className="text-slate-200 ml-0.5">{b.count}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* ── Multi-series radar: faculty-as-axes (or dept-as-axes) ── */}
      <div className="bg-[#161b22] border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-1 h-4 bg-purple-400 rounded-full flex-shrink-0" />
          <p className="text-sm font-semibold text-white truncate">{radarTitle}</p>
        </div>
        {radarData.length === 0 ? (
          <div className="flex items-center justify-center h-[220px] text-slate-600 text-sm">
            No scored data yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart cx="50%" cy="50%" outerRadius={outerR} data={radarData}>
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "#64748b", fontSize: tickSize }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: "#334155", fontSize: 8 }}
                tickCount={3}
              />
              {DIMS.map((d) => (
                <Radar
                  key={d.key}
                  name={d.name}
                  dataKey={d.key}
                  stroke={d.color}
                  fill={d.color}
                  fillOpacity={0.13}
                  strokeWidth={1.5}
                  dot={false}
                />
              ))}
              <Tooltip content={<MultiRadarTip />} />
            </RadarChart>
          </ResponsiveContainer>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 pt-2 border-t border-slate-800">
          {DIMS.map((d) => (
            <span key={d.key} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
              {d.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
