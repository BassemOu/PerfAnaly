import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next-auth";
import { mockSession, DEV_BYPASS } from "@/lib/mock-session";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PERFORMANCE_RATING_LABELS,
  PERFORMANCE_RATING_COLORS,
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_COLORS,
} from "@/lib/constants";
import Link from "next/link";
import { ClipboardList, Trophy } from "lucide-react";

async function getReviews(role: string, userId: string) {
  try {
    const isAdmin = ["HR_ADMIN", "DIVISION_DEAN", "DEPARTMENT_CHAIR", "REVIEW_COMMITTEE", "PROVOST"].includes(role);
    if (isAdmin) {
      return prisma.performanceReview.findMany({
        include: { faculty: { include: { department: true } } },
        orderBy: { reviewDate: "desc" },
      });
    }
    const fp = await prisma.facultyProfile.findUnique({ where: { userId } });
    if (!fp) return [];
    return prisma.performanceReview.findMany({
      where: { facultyId: fp.id },
      include: { faculty: { include: { department: true } } },
      orderBy: { reviewDate: "desc" },
    });
  } catch {
    return [];
  }
}

function RatingBadge({ rating }: { rating: string | null }) {
  if (!rating) return <span className="text-gray-400 text-sm">—</span>;
  const color = PERFORMANCE_RATING_COLORS[rating] ?? "gray";
  const label = PERFORMANCE_RATING_LABELS[rating] ?? rating;
  const colorMap: Record<string, string> = {
    purple: "bg-purple-100 text-purple-700 border border-purple-200",
    green: "bg-green-100 text-green-700 border border-green-200",
    blue: "bg-blue-100 text-blue-700 border border-blue-200",
    red: "bg-red-100 text-red-700 border border-red-200",
    gray: "bg-gray-100 text-gray-600 border border-gray-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorMap[color] ?? colorMap.gray}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = REVIEW_STATUS_COLORS[status] ?? "gray";
  const label = REVIEW_STATUS_LABELS[status] ?? status;
  const colorMap: Record<string, string> = {
    gray: "bg-gray-100 text-gray-600",
    yellow: "bg-yellow-100 text-yellow-700",
    purple: "bg-purple-100 text-purple-700",
    indigo: "bg-indigo-100 text-indigo-700",
    orange: "bg-orange-100 text-orange-700",
    teal: "bg-teal-100 text-teal-700",
    green: "bg-green-100 text-green-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorMap[color] ?? colorMap.gray}`}>
      {label}
    </span>
  );
}

// ── Ranking helpers ───────────────────────────────────────────────────────────
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
  const t = rev.teachingRating ? (RATING_SCORE[rev.teachingRating] ?? null) : null;
  const s = rev.researchOfficeScore ?? (rev.scholarshipRating ? (RATING_SCORE[rev.scholarshipRating] ?? null) : null);
  const sv = rev.serviceRating ? (RATING_SCORE[rev.serviceRating] ?? null) : null;
  if (t === null && s === null && sv === null) return null;
  const wt = t  !== null ? 0.40 : 0;
  const ws = s  !== null ? 0.40 : 0;
  const wsv = sv !== null ? 0.20 : 0;
  const totalW = wt + ws + wsv;
  if (totalW === 0) return null;
  return ((t ?? 0) * 0.40 + (s ?? 0) * 0.40 + (sv ?? 0) * 0.20) / totalW;
}

export default async function AppraisalPage() {
  const session = DEV_BYPASS ? mockSession : await getServerSession(authOptions);
  const role = session?.user?.role ?? "FACULTY";
  const userId = session?.user?.id ?? "";
  const isAdmin = ["HR_ADMIN", "DIVISION_DEAN", "DEPARTMENT_CHAIR", "REVIEW_COMMITTEE", "PROVOST"].includes(role);

  const reviews = await getReviews(role, userId);

  // Rank faculty by composite score (only reviews with ≥1 area rated)
  const rankedReviews = reviews
    .map((rev) => ({ rev, score: computeCompositeScore(rev) }))
    .filter((x): x is { rev: typeof x.rev; score: number } => x.score !== null)
    .sort((a, b) => b.score - a.score)
    .map((x, i) => ({ ...x, rank: i + 1 }));

  const counts = {
    total: reviews.length,
    completed: reviews.filter((r) => ["COMPLETED", "HR_COMPLETED"].includes(r.status)).length,
    inProgress: reviews.filter((r) => !["COMPLETED", "HR_COMPLETED", "DRAFT"].includes(r.status)).length,
    draft: reviews.filter((r) => r.status === "DRAFT").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">
            Annual faculty performance appraisal — Teaching & Advising 40% | Scholarship 40% (Research Office) | Service 20%
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: counts.total },
          { label: "Completed", value: counts.completed },
          { label: "In Progress", value: counts.inProgress },
          { label: "Draft", value: counts.draft },
        ].map((s) => (
          <Card key={s.label} className="shadow-sm">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Faculty Rankings (admin only) ── */}
      {isAdmin && rankedReviews.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Faculty Performance Ranking — {rankedReviews[0]?.rev.reviewYear ?? "2025"}
              <span className="ml-auto text-xs font-normal text-gray-400 hidden sm:block">
                Teaching & Advising 40% · Scholarship 40% · Service 20%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {rankedReviews.map(({ rev, score, rank }) => {
                const medalCls =
                  rank === 1 ? "bg-yellow-400 text-yellow-900" :
                  rank === 2 ? "bg-gray-300  text-gray-700"   :
                  rank === 3 ? "bg-orange-300 text-orange-900" :
                  "bg-gray-100 text-gray-500";
                return (
                  <div
                    key={rev.id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    {/* Rank badge */}
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${medalCls}`}>
                      {rank}
                    </span>

                    {/* Faculty info */}
                    <div className="w-44 flex-shrink-0 min-w-0">
                      <div className="font-medium text-gray-900 text-sm">
                        {rev.faculty.firstName} {rev.faculty.lastName}
                      </div>
                      <div className="text-xs text-gray-400">
                        {(rev.faculty as { department?: { name: string } }).department?.name ?? rev.faculty.rank}
                      </div>
                    </div>

                    {/* Score bar */}
                    <div className="flex-1 hidden sm:flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                        <div
                          className="bg-indigo-500 h-2.5 rounded-full transition-all"
                          style={{ width: `${Math.min(score, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-700 w-12 text-right tabular-nums">
                        {score.toFixed(1)}
                      </span>
                    </div>

                    {/* Area ratings */}
                    <div className="hidden lg:flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <RatingBadge rating={rev.teachingRating} />
                        <RatingBadge rating={rev.scholarshipRating} />
                        <RatingBadge rating={rev.serviceRating} />
                      </div>
                      {rev.collegialityRating && (
                        <div className="flex items-center gap-1 pl-2 border-l border-gray-200">
                          <span className="text-xs text-gray-400">★</span>
                          <RatingBadge rating={rev.collegialityRating} />
                        </div>
                      )}
                    </div>

                    {/* View link */}
                    <Link
                      href={`/dashboard/appraisal/${rev.id}`}
                      className="text-xs text-indigo-600 hover:underline flex-shrink-0"
                    >
                      View
                    </Link>
                  </div>
                );
              })}
            </div>
          </CardContent>
          <div className="px-4 py-2 bg-gray-50 border-t rounded-b-lg">
            <p className="text-xs text-gray-400">
              Composite score (0–100) = Teaching & Advising (40%) + Scholarship (40%) + Service (20%).
              Ratings map: Outstanding=95 · Exceeds Expectations=80 · Meets Expectations=60 · Does Not Meet=30.
              ★ Collegiality is a competency indicator — not weighted in the score.
            </p>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-indigo-600" />
            {isAdmin ? "All Faculty Reviews — 2025 Evaluation" : "My Performance Reviews"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {reviews.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No performance reviews found.</p>
              <p className="text-xs mt-1">Run the database seed to load example data.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Request No.</th>
                    <th className="px-4 py-3 text-left">Faculty</th>
                    {isAdmin && <th className="px-4 py-3 text-left">Department</th>}
                    <th className="px-4 py-3 text-center">Year</th>
                    <th className="px-4 py-3 text-center">Teaching & Advising (40%)</th>
                    <th className="px-4 py-3 text-center">Scholarship (40%)</th>
                    <th className="px-4 py-3 text-center">Service (20%)</th>
                    <th className="px-4 py-3 text-center">Collegiality ★</th>
                    <th className="px-4 py-3 text-center">Overall</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reviews.map((rev) => (
                    <tr key={rev.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 whitespace-nowrap">{rev.requestNo}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {rev.faculty.firstName} {rev.faculty.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{rev.faculty.title ?? rev.faculty.rank}</div>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-gray-600 text-xs">{(rev.faculty as { department?: { name: string } }).department?.name ?? "—"}</td>
                      )}
                      <td className="px-4 py-3 text-center text-gray-700">{rev.reviewYear}</td>
                      <td className="px-4 py-3 text-center"><RatingBadge rating={rev.teachingRating} /></td>
                      <td className="px-4 py-3 text-center">
                        {rev.researchOfficeScore !== null ? (
                          <span className="font-semibold text-indigo-700">{rev.researchOfficeScore}/100</span>
                        ) : (
                          <span className="text-orange-500 text-xs font-medium">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center"><RatingBadge rating={rev.serviceRating} /></td>
                      <td className="px-4 py-3 text-center">
                        <RatingBadge rating={rev.collegialityRating} />
                      </td>
                      <td className="px-4 py-3 text-center"><RatingBadge rating={rev.overallRating} /></td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={rev.status} /></td>
                      <td className="px-4 py-3 text-center">
                        <Button asChild variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-800">
                          <Link href={`/dashboard/appraisal/${rev.id}`}>View</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400">
        * Scholarship score is provided by the Research Office (0–100 scale) and carries 40% weight in the composite score.
        ★ Collegiality is a competency rated by the Chair but carries no weight in ranking calculations.
      </p>
    </div>
  );
}
