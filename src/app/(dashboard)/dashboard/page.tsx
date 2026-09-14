import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next-auth";
import { mockSession, DEV_BYPASS } from "@/lib/mock-session";
import { prisma } from "@/lib/db";
import {
  Users, ClipboardList, CheckCircle, Trophy, TrendingUp,
  BarChart3, AlertTriangle, ArrowRight,
} from "lucide-react";
import {
  PERFORMANCE_RATING_LABELS,
  PERFORMANCE_RATING_COLORS,
  REVIEW_STATUS_LABELS,
  RANK_LABELS,
} from "@/lib/constants";
import Link from "next/link";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { DeptFilterSelect } from "@/components/dashboard/DeptFilterSelect";
import { WeightedRankingPanel } from "@/components/dashboard/WeightedRankingPanel";
import type { FacultyRawScore } from "@/components/dashboard/WeightedRankingPanel";
import type { DeptData } from "@/components/dashboard/DepartmentStatsPanel";

// ── Scoring ────────────────────────────────────────────────────────────────
const RATING_SCORE: Record<string, number> = {
  OUTSTANDING: 95,
  EXCEEDS_EXPECTATIONS: 80,
  MEETS_EXPECTATIONS: 60,
  DOES_NOT_MEET_EXPECTATIONS: 30,
};

function computeCompositeScore(rev: {
  teachingRating: string | null;
  scholarshipRating: string | null;
  serviceRating: string | null;
  researchOfficeScore: number | null;
}): number | null {
  const t  = rev.teachingRating    ? (RATING_SCORE[rev.teachingRating]    ?? null) : null;
  const s  = rev.researchOfficeScore ?? (rev.scholarshipRating ? (RATING_SCORE[rev.scholarshipRating] ?? null) : null);
  const sv = rev.serviceRating     ? (RATING_SCORE[rev.serviceRating]     ?? null) : null;
  if (t === null && s === null && sv === null) return null;
  const wt = (t !== null ? 0.40 : 0) + (s !== null ? 0.40 : 0) + (sv !== null ? 0.20 : 0);
  if (wt === 0) return null;
  return ((t ?? 0) * 0.40 + (s ?? 0) * 0.40 + (sv ?? 0) * 0.20) / wt;
}

// ── Data fetching ──────────────────────────────────────────────────────────
const DEPT_SCORE: Record<string, number> = {
  OUTSTANDING: 95, EXCEEDS_EXPECTATIONS: 80, MEETS_EXPECTATIONS: 60, DOES_NOT_MEET_EXPECTATIONS: 30,
};

async function getDashboardData(userId: string, role: string, deptId?: string) {
  const isAdmin = ["HR_ADMIN", "DIVISION_DEAN", "DEPARTMENT_CHAIR", "REVIEW_COMMITTEE", "PROVOST"].includes(role);
  const deptWhere = deptId ? { faculty: { departmentId: deptId } } : {};
  try {
    const [totalFaculty, activeReviews, completedReviews, allReviews, workflowReviews] = await Promise.all([
      isAdmin ? prisma.facultyProfile.count({ where: deptId ? { departmentId: deptId } : {} }) : 0,
      prisma.performanceReview.count({ where: { ...deptWhere, status: { notIn: ["COMPLETED", "HR_COMPLETED", "DRAFT"] } } }),
      prisma.performanceReview.count({ where: { ...deptWhere, status: { in: ["COMPLETED", "HR_COMPLETED"] } } }),
      prisma.performanceReview.findMany({
        where: { OR: [{ teachingRating: { not: null } }, { scholarshipRating: { not: null } }, { serviceRating: { not: null } }] },
        include: { faculty: { include: { department: true } } },
      }),
      prisma.performanceReview.findMany({
        where: { ...deptWhere, status: { notIn: ["COMPLETED", "HR_COMPLETED", "DRAFT"] } },
        include: { faculty: { select: { firstName: true, lastName: true, rank: true } } },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
    ]);

    // JS-filter for KPI stats so rawScores can stay unfiltered for client-side ranking
    type FacultyWithDept = { department?: { id: string; name: string } };
    const statsReviews = deptId
      ? allReviews.filter((r) => (r.faculty as unknown as FacultyWithDept).department?.id === deptId)
      : allReviews;

    const ranked = statsReviews
      .map((rev) => ({ rev, score: computeCompositeScore(rev) }))
      .filter((x): x is { rev: typeof x.rev; score: number } => x.score !== null)
      .sort((a, b) => b.score - a.score)
      .map((x, i) => ({ ...x, rank: i + 1 }));

    const highPerformers      = statsReviews.filter((r) => r.overallRating === "OUTSTANDING" || r.overallRating === "EXCEEDS_EXPECTATIONS").length;
    const promotionEligible   = ranked.filter((x) => x.score >= 72).length;
    const avgScore            = ranked.length ? ranked.reduce((a, b) => a + b.score, 0) / ranked.length : null;
    const collegialityFlags   = statsReviews.filter((r) => r.collegialityRating === "DOES_NOT_MEET_EXPECTATIONS").length;
    const ratingCounts = {
      EXCEEDS_EXPECTATIONS:       statsReviews.filter((r) => r.overallRating === "EXCEEDS_EXPECTATIONS").length,
      MEETS_EXPECTATIONS:         statsReviews.filter((r) => r.overallRating === "MEETS_EXPECTATIONS").length,
      DOES_NOT_MEET_EXPECTATIONS: statsReviews.filter((r) => r.overallRating === "DOES_NOT_MEET_EXPECTATIONS").length,
    };

    const rawScores: FacultyRawScore[] = allReviews.map((rev) => ({
      reviewId: rev.id,
      name: `${rev.faculty.firstName} ${rev.faculty.lastName}`,
      dept:   (rev.faculty as unknown as FacultyWithDept).department?.name ?? rev.faculty.rank,
      deptId: (rev.faculty as unknown as FacultyWithDept).department?.id   ?? "",
      t:  rev.teachingRating    ? (RATING_SCORE[rev.teachingRating]    ?? null) : null,
      s:  rev.researchOfficeScore ?? (rev.scholarshipRating ? (RATING_SCORE[rev.scholarshipRating] ?? null) : null),
      sv: rev.serviceRating     ? (RATING_SCORE[rev.serviceRating]     ?? null) : null,
      co: rev.collegialityRating ? (RATING_SCORE[rev.collegialityRating] ?? null) : null,
      overallRating: rev.overallRating,
      collegialityRating: rev.collegialityRating,
    }));

    return {
      stats: { totalFaculty, activeReviews, completedReviews, highPerformers, promotionEligible, avgScore, collegialityFlags, ratingCounts },
      rawScores, workflowReviews,
      allReviewsForDept: allReviews as unknown as AllReview[],
    };
  } catch (e) {
    console.error("[getDashboardData] error:", e);
    return {
      stats: { totalFaculty: 0, activeReviews: 0, completedReviews: 0, highPerformers: 0, promotionEligible: 0, avgScore: null, collegialityFlags: 0, ratingCounts: { EXCEEDS_EXPECTATIONS: 0, MEETS_EXPECTATIONS: 0, DOES_NOT_MEET_EXPECTATIONS: 0 } },
      rawScores: [], workflowReviews: [], allReviewsForDept: [],
    };
  }
}

// ── getDeptData: computed from allReviews — no extra DB round-trip ──────────
type AllReview = {
  teachingRating: string | null;
  scholarshipRating: string | null;
  serviceRating: string | null;
  collegialityRating: string | null;
  faculty: {
    firstName: string;
    lastName: string;
    department?: { id: string; name: string; code: string } | null;
  };
};

function computeDeptDataFromReviews(allReviews: AllReview[]): DeptData[] {
  const avg = (arr: (number | null)[]) => {
    const v = arr.filter((x): x is number => x !== null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };

  type DRow = { name: string; t: number|null; sc: number|null; sv: number|null; co: number|null; score: number|null;
    teaching: string|null; scholarship: string|null; service: string|null; collegiality: string|null };
  const deptMap = new Map<string, { id: string; name: string; code: string; rows: DRow[] }>();
  const seenFaculty = new Set<string>();

  for (const rev of allReviews) {
    const dept = rev.faculty.department;
    if (!dept) continue;
    const facultyKey = `${rev.faculty.firstName}_${rev.faculty.lastName}_${dept.id}`;
    if (seenFaculty.has(facultyKey)) continue; // keep only first (latest) review per faculty
    seenFaculty.add(facultyKey);

    if (!deptMap.has(dept.id)) deptMap.set(dept.id, { id: dept.id, name: dept.name, code: dept.code, rows: [] });

    const t  = rev.teachingRating    ? (DEPT_SCORE[rev.teachingRating]    ?? null) : null;
    const sc = rev.scholarshipRating ? (DEPT_SCORE[rev.scholarshipRating] ?? null) : null;
    const sv = rev.serviceRating     ? (DEPT_SCORE[rev.serviceRating]     ?? null) : null;
    const co = rev.collegialityRating? (DEPT_SCORE[rev.collegialityRating] ?? null) : null;
    const wt = (t !== null ? 0.4 : 0) + (sc !== null ? 0.4 : 0) + (sv !== null ? 0.2 : 0);
    const score = wt > 0
      ? ((t ?? 0) * (t !== null ? 0.4 : 0) + (sc ?? 0) * (sc !== null ? 0.4 : 0) + (sv ?? 0) * (sv !== null ? 0.2 : 0)) / wt
      : null;
    deptMap.get(dept.id)!.rows.push({
      name: `${rev.faculty.firstName} ${rev.faculty.lastName}`,
      t, sc, sv, co, score,
      teaching: rev.teachingRating, scholarship: rev.scholarshipRating,
      service: rev.serviceRating,   collegiality: rev.collegialityRating,
    });
  }

  return Array.from(deptMap.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ id, name, code, rows }) => {
      const scored = rows.filter((r) => r.score !== null);
      return {
        id, name, code,
        facultyCount:       rows.length,
        avgScore:           avg(rows.map((r) => r.score)),
        avgTeaching:        avg(rows.map((r) => r.t)),
        avgScholarship:     avg(rows.map((r) => r.sc)),
        avgService:         avg(rows.map((r) => r.sv)),
        avgCollegiality:    avg(rows.map((r) => r.co)),
        eligible:           scored.filter((r) => (r.score ?? 0) >= 72).length,
        needsDev:           scored.filter((r) => (r.score ?? 0) >= 55 && (r.score ?? 0) < 72).length,
        notEligible:        scored.filter((r) => (r.score ?? 0) < 55).length,
        collegiality_flags: rows.filter((r) => r.collegiality === "DOES_NOT_MEET_EXPECTATIONS").length,
        heatmap: rows.map(({ name, teaching, scholarship, service, collegiality, score }) => ({
          name, teaching, scholarship, service, collegiality, score,
        })),
      };
    });
}

function DarkRatingBadge({ rating }: { rating: string | null | undefined }) {
  if (!rating) return <span className="text-slate-600 text-xs">—</span>;
  const colorKey = PERFORMANCE_RATING_COLORS[rating] ?? "gray";
  const label    = PERFORMANCE_RATING_LABELS[rating] ?? rating;
  const cls: Record<string, string> = {
    purple: "bg-purple-900/60 text-purple-300 border-purple-700",
    green:  "bg-emerald-900/60 text-emerald-400 border-emerald-700",
    blue:   "bg-blue-900/60   text-blue-400   border-blue-700",
    red:    "bg-red-900/60    text-red-400    border-red-700",
    gray:   "bg-slate-800     text-slate-400  border-slate-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls[colorKey] ?? cls.gray}`}>
      {label}
    </span>
  );
}

function KPICard({ label, value, sub, accent, href }: {
  label: string; value: string | number; sub: string; accent: string; href?: string;
}) {
  const inner = (
    <div className={`bg-[#161b22] border border-slate-800 border-l-4 ${accent} rounded-lg p-4 h-full hover:border-slate-700 transition-colors`}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">{label}</p>
      <p className="text-3xl font-bold text-white tabular-nums leading-none">{value}</p>
      <p className="text-xs text-slate-600 mt-2 leading-snug">{sub}</p>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

// ── Page ───────────────────────────────────────────────────────────────────
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>;
}) {
  const { dept: selectedDeptId = "" } = await searchParams;
  const session = DEV_BYPASS ? mockSession : await getServerSession(authOptions);
  const role    = session?.user?.role ?? "FACULTY";
  const userId  = session?.user?.id   ?? "";
  const isAdmin = ["HR_ADMIN", "DIVISION_DEAN", "DEPARTMENT_CHAIR", "REVIEW_COMMITTEE", "PROVOST"].includes(role);

  const { stats, rawScores, workflowReviews, allReviewsForDept } = await getDashboardData(userId, role, selectedDeptId || undefined);

  // Compute dept data from already-loaded reviews — no extra DB call
  const depts = computeDeptDataFromReviews(allReviewsForDept);

  // Compute aggregate radar data for "All Departments" view
  const nullAvg = (arr: (number | null)[]) => {
    const v = arr.filter((x): x is number => x !== null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const aggregateDept: DeptData | null = depts.length > 0 ? {
    id: "all", name: "All Departments", code: "ALL",
    facultyCount:       depts.reduce((s, d) => s + d.facultyCount, 0),
    avgScore:           nullAvg(depts.map((d) => d.avgScore)),
    avgTeaching:        nullAvg(depts.map((d) => d.avgTeaching)),
    avgScholarship:     nullAvg(depts.map((d) => d.avgScholarship)),
    avgService:         nullAvg(depts.map((d) => d.avgService)),
    avgCollegiality:    nullAvg(depts.map((d) => d.avgCollegiality)),
    eligible:           depts.reduce((s, d) => s + d.eligible, 0),
    needsDev:           depts.reduce((s, d) => s + d.needsDev, 0),
    notEligible:        depts.reduce((s, d) => s + d.notEligible, 0),
    collegiality_flags: depts.reduce((s, d) => s + d.collegiality_flags, 0),
    heatmap: [],
  } : null;
  const selectedDept = selectedDeptId
    ? (depts.find((d) => d.id === selectedDeptId) ?? aggregateDept)
    : aggregateDept;

  const ratingBars = [
    { name: "Exceeds Expectations",        shortName: "Exceeds",       count: stats.ratingCounts.EXCEEDS_EXPECTATIONS,       color: "#22c55e" },
    { name: "Meets Expectations",          shortName: "Meets",         count: stats.ratingCounts.MEETS_EXPECTATIONS,         color: "#3b82f6" },
    { name: "Does Not Meet Expectations",  shortName: "Does Not Meet", count: stats.ratingCounts.DOES_NOT_MEET_EXPECTATIONS, color: "#ef4444" },
  ];

  return (
    <div className="space-y-5 text-slate-100">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Faculty Performance Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {stats.totalFaculty} faculty · {depts.length} departments surveyed · AY 2025–26
          </p>
          {depts.length > 0 && (
            <div className="mt-3">
              <DeptFilterSelect
                departments={depts.map((d) => ({ id: d.id, name: d.name }))}
                selectedId={selectedDeptId}
              />
            </div>
          )}
        </div>
        {["HR_ADMIN", "DEPARTMENT_CHAIR", "PROVOST"].includes(role) && (
          <Link
            href="/dashboard/appraisal"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors flex-shrink-0"
          >
            <ClipboardList className="h-4 w-4" />
            View Appraisals
          </Link>
        )}
      </div>

      {/* KPI row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard label="Total Faculty"      value={stats.totalFaculty}    sub="across all departments"   accent="border-l-cyan-400"   href={isAdmin ? "/dashboard/faculty" : undefined} />
        <KPICard label="Active Reviews"     value={stats.activeReviews}   sub="currently in workflow"   accent="border-l-blue-400"   href="/dashboard/appraisal" />
        <KPICard label="Completed Reviews"  value={stats.completedReviews} sub="this appraisal cycle"   accent="border-l-green-400"  href="/dashboard/appraisal" />
        <KPICard label="High Performers"    value={stats.highPerformers}  sub="exceeds expectations"    accent="border-l-yellow-400" href="/dashboard/appraisal" />
        <KPICard label="Promotion Eligible" value={stats.promotionEligible} sub="score >= 72 threshold" accent="border-l-purple-400" href="/dashboard/promotion" />
      </div>

      {/* KPI row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard label="Avg Composite Score"  value={stats.avgScore !== null ? stats.avgScore.toFixed(1) : "--"} sub="Teaching 40% Scholarship 40% Service 20%" accent="border-l-teal-400" />
        <KPICard label="Exceeds Exp."         value={stats.ratingCounts.EXCEEDS_EXPECTATIONS}       sub="faculty with EE overall"  accent="border-l-emerald-400" href="/dashboard/appraisal" />
        <KPICard label="Meets Exp."           value={stats.ratingCounts.MEETS_EXPECTATIONS}         sub="faculty with ME overall"  accent="border-l-sky-400"     href="/dashboard/appraisal" />
        <KPICard label="Does Not Meet"        value={stats.ratingCounts.DOES_NOT_MEET_EXPECTATIONS} sub="faculty with DNM overall" accent="border-l-red-400"     href="/dashboard/appraisal" />
        <KPICard label="Coll. Flags"          value={stats.collegialityFlags}                       sub="collegiality DNM flagged" accent="border-l-amber-400"   href="/dashboard/promotion" />
      </div>

      {/* Alert banner */}
      {stats.collegialityFlags > 0 && (
        <div className="bg-amber-900/20 border border-amber-800/40 rounded-lg px-5 py-3 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            <strong className="text-amber-200">{stats.collegialityFlags} faculty member{stats.collegialityFlags > 1 ? "s" : ""}</strong>
            {" "}flagged for Collegiality concern (Does Not Meet Expectations) -- see{" "}
            <Link href="/dashboard/promotion" className="underline text-amber-200 hover:text-white transition-colors">
              Promotion Readiness
            </Link>
            {" "}for full details. Collegiality is not weighted in composite score.
          </p>
        </div>
      )}

      {/* Charts: Bar + Radar */}
      <DashboardCharts ratingBars={ratingBars} rawScores={rawScores} depts={depts} selectedDeptId={selectedDeptId} />

      {/* Bottom row: Ranking + In Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Faculty Ranking — weight-tunable client component, filters by dept client-side */}
        <div className="lg:col-span-2">
          <WeightedRankingPanel rawScores={rawScores} selectedDeptId={selectedDeptId} />
        </div>

        {/* In Workflow + Quick Nav */}
        <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-400 rounded-full" />
              <h2 className="text-sm font-semibold text-white">In Workflow</h2>
            </div>
            <Link href="/dashboard/appraisal" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex-1">
            {workflowReviews.length === 0 ? (
              <div className="py-8 text-center">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 text-slate-700" />
                <p className="text-sm text-slate-500">No reviews in progress.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {workflowReviews.map((r) => (
                  <Link
                    key={r.id}
                    href={`/dashboard/appraisal/${r.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{r.faculty.firstName} {r.faculty.lastName}</p>
                      <p className="text-xs text-slate-500">{RANK_LABELS[r.faculty.rank as keyof typeof RANK_LABELS]} · {r.reviewYear}</p>
                    </div>
                    <span className="text-xs bg-blue-900/50 text-blue-300 border border-blue-800 px-2 py-0.5 rounded ml-2 flex-shrink-0">
                      {REVIEW_STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-800 p-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Faculty",     icon: Users,       href: "/dashboard/faculty",      color: "text-cyan-400" },
                { label: "Promotions",  icon: TrendingUp,  href: "/dashboard/promotion",    color: "text-purple-400" },
                { label: "Scholarship", icon: BarChart3,   href: "/dashboard/research",     color: "text-green-400" },
                { label: "AI Chat",     icon: CheckCircle, href: "/dashboard/ai-assistant", color: "text-indigo-400" },
              ].map((a) => (
                <Link key={a.label} href={a.href} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/60 transition-colors">
                  <a.icon className={`h-3.5 w-3.5 ${a.color}`} />
                  <span className="text-xs text-slate-400">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
