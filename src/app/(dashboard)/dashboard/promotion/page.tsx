import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next-auth";
import { mockSession, DEV_BYPASS } from "@/lib/mock-session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PERFORMANCE_RATING_LABELS,
  PERFORMANCE_RATING_COLORS,
  RANK_LABELS,
} from "@/lib/constants";
import Link from "next/link";
import { TrendingUp, Users, CheckCircle, Clock, XCircle, ArrowRight, AlertTriangle } from "lucide-react";
import type { AcademicRank } from "@prisma/client";

// ── Promotion readiness score ─────────────────────────────────────────────
const RATING_SCORE: Record<string, number> = {
  OUTSTANDING:                95,
  EXCEEDS_EXPECTATIONS:       80,
  MEETS_EXPECTATIONS:         60,
  DOES_NOT_MEET_EXPECTATIONS: 30,
};

function compositeScore(
  teaching: string | null,
  scholarship: string | null,
  service: string | null,
): number | null {
  const t  = teaching    ? (RATING_SCORE[teaching]    ?? null) : null;
  const sc = scholarship ? (RATING_SCORE[scholarship] ?? null) : null;
  const sv = service     ? (RATING_SCORE[service]     ?? null) : null;
  if (t === null && sc === null && sv === null) return null;
  const tW  = t  ?? 0;
  const scW = sc ?? 0;
  const svW = sv ?? 0;
  const weightSum = (t !== null ? 0.4 : 0) + (sc !== null ? 0.4 : 0) + (sv !== null ? 0.2 : 0);
  if (weightSum === 0) return null;
  return (tW * (t  !== null ? 0.4 : 0) + scW * (sc !== null ? 0.4 : 0) + svW * (sv !== null ? 0.2 : 0)) / weightSum;
}

type ReadinessLevel = "ELIGIBLE" | "NEEDS_DEVELOPMENT" | "NOT_ELIGIBLE" | "NO_DATA";

function readinessFromScore(score: number | null): ReadinessLevel {
  if (score === null) return "NO_DATA";
  if (score >= 72)    return "ELIGIBLE";
  if (score >= 55)    return "NEEDS_DEVELOPMENT";
  return "NOT_ELIGIBLE";
}

// ── Next rank in the academic ladder ─────────────────────────────────────
const NEXT_RANK: Partial<Record<AcademicRank, AcademicRank>> = {
  INSTRUCTOR:          "ASSISTANT_PROFESSOR",
  LECTURER:            "SENIOR_LECTURER",
  SENIOR_LECTURER:     "ASSISTANT_PROFESSOR",
  ADJUNCT:             "ASSISTANT_PROFESSOR",
  ASSISTANT_PROFESSOR: "ASSOCIATE_PROFESSOR",
  ASSOCIATE_PROFESSOR: "PROFESSOR",
  PROFESSOR:           "DISTINGUISHED_PROFESSOR",
  // DISTINGUISHED_PROFESSOR → ceiling, no next rank
};

// ── Data fetcher ──────────────────────────────────────────────────────────
async function getPromotionData(role: string, userId: string) {
  try {
    const isAdmin = ["HR_ADMIN", "DIVISION_DEAN", "DEPARTMENT_CHAIR", "REVIEW_COMMITTEE", "PROVOST"].includes(role);

    let faculty;
    if (isAdmin) {
      faculty = await prisma.facultyProfile.findMany({
        include: {
          department: true,
          performanceReviews: {
            orderBy: { reviewDate: "desc" },
            take: 1,
          },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });
    } else {
      faculty = await prisma.facultyProfile.findMany({
        where: { userId },
        include: {
          department: true,
          performanceReviews: {
            orderBy: { reviewDate: "desc" },
            take: 1,
          },
        },
      });
    }
    return faculty;
  } catch {
    return [];
  }
}

// ── Sub-components ────────────────────────────────────────────────────────
function RatingBadge({ rating }: { rating: string | null | undefined }) {
  if (!rating) return <span className="text-gray-300 text-xs">—</span>;
  const colorKey = PERFORMANCE_RATING_COLORS[rating] ?? "gray";
  const label    = PERFORMANCE_RATING_LABELS[rating] ?? rating;
  const cls: Record<string, string> = {
    purple: "bg-purple-100 text-purple-700 border-purple-200",
    green:  "bg-green-100  text-green-700  border-green-200",
    blue:   "bg-blue-100   text-blue-700   border-blue-200",
    red:    "bg-red-100    text-red-700    border-red-200",
    gray:   "bg-gray-100   text-gray-600   border-gray-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls[colorKey] ?? cls.gray}`}>
      {label}
    </span>
  );
}

function ReadinessBadge({ level }: { level: ReadinessLevel }) {
  const config: Record<ReadinessLevel, { label: string; cls: string; icon: React.ReactNode }> = {
    ELIGIBLE:          { label: "Eligible",          cls: "bg-green-100 text-green-800 border-green-200",  icon: <CheckCircle className="h-3 w-3" /> },
    NEEDS_DEVELOPMENT: { label: "Needs Development", cls: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <Clock className="h-3 w-3" /> },
    NOT_ELIGIBLE:      { label: "Not Eligible",      cls: "bg-red-100 text-red-700 border-red-200",        icon: <XCircle className="h-3 w-3" /> },
    NO_DATA:           { label: "No Data",            cls: "bg-gray-100 text-gray-500 border-gray-200",    icon: null },
  };
  const { label, cls, icon } = config[level];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {icon}{label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default async function PromotionPage() {
  const session = DEV_BYPASS ? mockSession : await getServerSession(authOptions);
  const role    = session?.user?.role ?? "FACULTY";
  const userId  = session?.user?.id   ?? "";

  const faculty = await getPromotionData(role, userId);

  // Enrich with computed fields
  const rows = faculty.map((f) => {
    const rev      = f.performanceReviews[0] ?? null;
    const score    = rev ? compositeScore(rev.teachingRating, rev.scholarshipRating, rev.serviceRating) : null;
    const level    = readinessFromScore(score);
    const nextRank = NEXT_RANK[f.rank] ?? null;
    const collegiality         = rev?.collegialityRating ?? null;
    const collegiality_flagged = collegiality === "DOES_NOT_MEET_EXPECTATIONS";
    const yearsOfService       = Math.floor((Date.now() - new Date(f.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365));
    return { f, rev, score, level, nextRank, collegiality, collegiality_flagged, yearsOfService };
  });

  // Summary counts
  const counts = {
    eligible:    rows.filter((r) => r.level === "ELIGIBLE").length,
    needs:       rows.filter((r) => r.level === "NEEDS_DEVELOPMENT").length,
    notEligible: rows.filter((r) => r.level === "NOT_ELIGIBLE").length,
    noData:      rows.filter((r) => r.level === "NO_DATA").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-indigo-500" />
          Promotion Readiness
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Readiness is computed from the latest performance review — Teaching 40% · Scholarship 40% · Service 20%.
          Collegiality ★ is an unweighted competency indicator.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Eligible",          value: counts.eligible,    icon: CheckCircle, bg: "bg-green-50",  fg: "text-green-600" },
          { label: "Needs Development", value: counts.needs,       icon: Clock,       bg: "bg-yellow-50", fg: "text-yellow-600" },
          { label: "Not Eligible",      value: counts.notEligible, icon: XCircle,     bg: "bg-red-50",    fg: "text-red-500" },
          { label: "Total Faculty",     value: rows.length,        icon: Users,       bg: "bg-indigo-50", fg: "text-indigo-600" },
        ].map((card) => (
          <Card key={card.label} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.bg}`}>
                  <card.icon className={`w-6 h-6 ${card.fg}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Faculty table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            Faculty Promotion Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No faculty data available.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-500 w-48">Faculty</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Current → Target Rank</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Teaching</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Scholarship</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Service</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">
                        Collegiality ★
                        <span className="ml-1 text-xs font-normal text-gray-400">(unweighted)</span>
                      </th>
                      <th className="text-center px-4 py-3 font-medium text-gray-500">Score</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Readiness</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map(({ f, rev, score, level, nextRank, collegiality, collegiality_flagged, yearsOfService }) => (
                      <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <Link
                            href={rev ? `/dashboard/appraisal/${rev.id}` : `/dashboard/faculty/${f.id}`}
                            className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                          >
                            {f.firstName} {f.lastName}
                          </Link>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {f.department?.name} · {yearsOfService}y
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200 font-medium">
                              {RANK_LABELS[f.rank]}
                            </span>
                            {nextRank ? (
                              <>
                                <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-medium">
                                  {RANK_LABELS[nextRank]}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-400 italic">At ceiling</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <RatingBadge rating={rev?.teachingRating} />
                        </td>
                        <td className="px-4 py-3">
                          <RatingBadge rating={rev?.scholarshipRating} />
                        </td>
                        <td className="px-4 py-3">
                          <RatingBadge rating={rev?.serviceRating} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <RatingBadge rating={collegiality} />
                            {collegiality_flagged && (
                              <span title="Collegiality concern" className="flex">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" aria-label="Collegiality concern" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {score !== null ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-sm font-bold text-gray-800 tabular-nums">{score.toFixed(0)}</span>
                              <div className="w-16 bg-gray-100 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    score >= 72 ? "bg-green-500" : score >= 55 ? "bg-yellow-400" : "bg-red-400"
                                  }`}
                                  style={{ width: `${Math.min(score, 100)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <ReadinessBadge level={level} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="lg:hidden divide-y divide-gray-100">
                {rows.map(({ f, rev, score, level, nextRank, collegiality, collegiality_flagged, yearsOfService }) => (
                  <div key={f.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={rev ? `/dashboard/appraisal/${rev.id}` : `/dashboard/faculty/${f.id}`}
                          className="font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                        >
                          {f.firstName} {f.lastName}
                        </Link>
                        <p className="text-xs text-gray-400">{f.department?.name} · {yearsOfService}y</p>
                      </div>
                      <ReadinessBadge level={level} />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200 font-medium">
                        {RANK_LABELS[f.rank]}
                      </span>
                      {nextRank && (
                        <>
                          <ArrowRight className="h-3 w-3 text-gray-400" />
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-medium">
                            {RANK_LABELS[nextRank]}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <RatingBadge rating={rev?.teachingRating} />
                      <RatingBadge rating={rev?.scholarshipRating} />
                      <RatingBadge rating={rev?.serviceRating} />
                      {collegiality && (
                        <div className="flex items-center gap-1 pl-2 border-l border-gray-200">
                          <span className="text-xs text-gray-400">★</span>
                          <RatingBadge rating={collegiality} />
                          {collegiality_flagged && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                        </div>
                      )}
                    </div>
                    {score !== null && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${score >= 72 ? "bg-green-500" : score >= 55 ? "bg-yellow-400" : "bg-red-400"}`}
                            style={{ width: `${Math.min(score, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-700 tabular-nums w-8 text-right">
                          {score.toFixed(0)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <p className="text-xs text-gray-400 px-1">
        ★ Collegiality is a competency rated by the Chair — not weighted in the readiness score, but a{" "}
        <AlertTriangle className="inline h-3 w-3 text-amber-500" /> flag is shown when it does not meet expectations.
        Readiness thresholds: <strong className="text-green-600">Eligible ≥ 72</strong> ·{" "}
        <strong className="text-yellow-600">Needs Development 55–71</strong> ·{" "}
        <strong className="text-red-500">Not Eligible &lt; 55</strong>.
      </p>
    </div>
  );
}
