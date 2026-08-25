import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next-auth";
import { mockSession, DEV_BYPASS } from "@/lib/mock-session";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PERFORMANCE_RATING_LABELS,
  PERFORMANCE_RATING_COLORS,
  REVIEW_STATUS_LABELS,
  RANK_LABELS,
} from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Building, User, Calendar, BookOpen, Briefcase, Star, TrendingUp } from "lucide-react";

async function getReview(id: string) {
  try {
    return prisma.performanceReview.findUnique({
      where: { id },
      include: {
        faculty: { include: { department: true, division: true } },
        approvals: { orderBy: { actedAt: "asc" } },
      },
    });
  } catch {
    return null;
  }
}

function RatingBadge({ rating }: { rating: string | null | undefined }) {
  if (!rating) return <span className="text-slate-600">—</span>;
  const color = PERFORMANCE_RATING_COLORS[rating] ?? "gray";
  const label = PERFORMANCE_RATING_LABELS[rating] ?? rating;
  const colorMap: Record<string, string> = {
    green:  "bg-green-900/40 text-green-300 border border-green-700",
    blue:   "bg-blue-900/40  text-blue-300  border border-blue-700",
    red:    "bg-red-900/40   text-red-300   border border-red-700",
    purple: "bg-purple-900/40 text-purple-300 border border-purple-700",
    gray:   "bg-slate-800    text-slate-400  border border-slate-600",
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${colorMap[color] ?? colorMap.gray}`}>
      {label}
    </span>
  );
}

function SectionRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <tr className="border-b border-slate-800 last:border-0">
      <td className="py-2 pr-4 w-40 text-xs font-medium text-slate-500 align-top">{label}</td>
      <td className="py-2 text-sm text-slate-300 whitespace-pre-wrap">{value}</td>
    </tr>
  );
}

export default async function AppraisalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = DEV_BYPASS ? mockSession : await getServerSession(authOptions);
  const review = await getReview(id);

  if (!review) notFound();

  const { faculty } = review;
  const statusLabel = REVIEW_STATUS_LABELS[review.status] ?? review.status;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/appraisal">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>
        </Button>
      </div>

      {/* ── Cover header matching the PDF form ── */}
      <div className="border border-slate-800 rounded-xl overflow-hidden shadow-sm bg-[#161b22]">
        {/* Title bar */}
        <div className="bg-indigo-700 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-75">Khalifa University · E-Services</p>
            <h1 className="text-xl font-bold mt-0.5">Faculty Performance Review</h1>
          </div>
          <div className="text-right text-sm">
            <p className="opacity-75 text-xs">Request No.</p>
            <p className="font-mono font-bold">{review.requestNo}</p>
          </div>
        </div>

        {/* Identity grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-b border-slate-800 text-sm">
          {[
            { label: "Date", value: formatDate(review.reviewDate) },
            { label: "Submission Date", value: review.submissionDate ? formatDate(review.submissionDate) : "—" },
            { label: "Employee Name", value: `${faculty.firstName} ${faculty.lastName}` },
            { label: "Employee ID", value: faculty.employeeId },
            { label: "Position", value: faculty.title ?? RANK_LABELS[faculty.rank as keyof typeof RANK_LABELS] },
            { label: "Department", value: faculty.department?.name ?? "—" },
            { label: "Manager Name", value: review.managerName ?? "—" },
            { label: "ADERP Employee ID", value: review.managerEmpId ?? "—" },
            { label: "Date of Join", value: formatDate(faculty.hireDate) },
            { label: "Review Period", value: String(review.reviewYear) },
            { label: "Status", value: statusLabel },
          ].map((f) => (
            <div key={f.label} className="px-4 py-3 border-r border-b border-slate-800 last:border-r-0">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{f.label}</p>
              <p className="font-medium text-slate-200 mt-0.5">{f.value}</p>
            </div>
          ))}
        </div>

        {/* Summary table */}
        <div className="px-6 py-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Summary</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-600 uppercase">
                <th className="text-left pb-2">Area</th>
                <th className="text-center pb-2">Weight</th>
                <th className="text-center pb-2">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr>
                <td className="py-2 font-medium text-slate-200">Teaching and Advising</td>
                <td className="py-2 text-center">{review.teachingWeight}</td>
                <td className="py-2 text-center"><RatingBadge rating={review.teachingRating} /></td>
              </tr>
              <tr>
                <td className="py-2 font-medium">
                  Scholarship / Research
                  <span className="ml-2 text-xs text-indigo-400 font-normal">(Research Office Input)</span>
                </td>
                <td className="py-2 text-center">{review.scholarshipWeight}</td>
                <td className="py-2 text-center">
                  {review.researchOfficeScore !== null ? (
                    <span className="font-bold text-indigo-300">{review.researchOfficeScore}/100</span>
                  ) : (
                    <span className="text-orange-500 text-xs">Pending</span>
                  )}
                  <span className="ml-2"><RatingBadge rating={review.scholarshipRating} /></span>
                </td>
              </tr>
              <tr>
                <td className="py-2 font-medium text-slate-200">Service</td>
                <td className="py-2 text-center">{review.serviceWeight}</td>
                <td className="py-2 text-center"><RatingBadge rating={review.serviceRating} /></td>
              </tr>
              <tr>
                <td className="py-2 font-medium text-slate-200">Collegiality</td>
                <td className="py-2 text-center text-slate-600">—</td>
                <td className="py-2 text-center"><RatingBadge rating={review.collegialityRating} /></td>
              </tr>
              <tr className="border-t-2 border-slate-600 font-bold">
                <td className="py-2 text-slate-200">Overall</td>
                <td className="py-2 text-center text-slate-500 font-normal text-xs">
                  {review.overallWeightedScore !== null ? `${review.overallWeightedScore?.toFixed(1)}` : ""}
                </td>
                <td className="py-2 text-center"><RatingBadge rating={review.overallRating} /></td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-slate-600 mt-2">
            Note: Overall score is calculated once research score is received and all areas are rated.
          </p>
        </div>
      </div>

      {/* ── Teaching & Advising ── */}
      <SectionCard
        title="Teaching and Advising"
        icon={<BookOpen className="h-4 w-4" />}
        weight={review.teachingWeight}
        rating={review.teachingRating}
        color="blue"
      >
        <GoalBlock
          goal={review.teachingGoal}
          target={review.teachingTarget}
          outcome={review.teachingOutcome}
          facultyComment={review.teachingFacultyComment}
          chairComment={review.teachingChairComment}
        />
        <div className="mt-4 pt-4 border-t border-slate-800">
          <p className="text-xs font-semibold text-slate-500 mb-1">Overall Weight & Narrative (Chair)</p>
          <p className="text-xs text-slate-500">Teaching Weight: <strong>{review.teachingWeight}</strong></p>
          {review.teachingChairNarrative && (
            <p className="text-sm text-slate-300 mt-1 italic">{review.teachingChairNarrative}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-slate-500">Teaching & Advising Rate (Chair):</span>
            <RatingBadge rating={review.teachingRating} />
          </div>
        </div>
      </SectionCard>

      {/* ── Scholarship / Research ── */}
      <SectionCard
        title="Scholarship"
        icon={<BookOpen className="h-4 w-4" />}
        weight={review.scholarshipWeight}
        rating={review.scholarshipRating}
        color="indigo"
        badge={
          <span className="text-xs bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800">
            Score input from Research Office
          </span>
        }
      >
        {/* Research Office input box */}
        <div className="bg-indigo-950/40 border border-indigo-900 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wide">Research Office Score</p>
              <p className="text-xs text-indigo-400 mt-0.5">Provided externally — not editable by faculty or chair</p>
            </div>
            <div className="text-right">
              {review.researchOfficeScore !== null ? (
                <p className="text-3xl font-bold text-indigo-300">{review.researchOfficeScore}<span className="text-lg font-normal text-indigo-500">/100</span></p>
              ) : (
                <p className="text-orange-500 font-semibold">Pending</p>
              )}
            </div>
          </div>
          {review.researchOfficeNotes && (
            <p className="text-xs text-indigo-400 mt-2 border-t border-indigo-900 pt-2">{review.researchOfficeNotes}</p>
          )}
        </div>

        <GoalBlock
          goal={review.scholarshipGoal}
          target={review.scholarshipTarget}
          outcome={review.scholarshipOutcome}
          facultyComment={review.scholarshipFacultyComment}
          chairComment={review.scholarshipChairComment}
        />
        <div className="mt-4 pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-500">Scholarship Weight: <strong>{review.scholarshipWeight}</strong></p>
          {review.scholarshipChairNarrative && (
            <p className="text-sm text-slate-300 mt-1 italic">{review.scholarshipChairNarrative}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-slate-500">Scholarship Rate (Chair):</span>
            <RatingBadge rating={review.scholarshipRating} />
          </div>
        </div>
      </SectionCard>

      {/* ── Service ── */}
      <SectionCard
        title="Service"
        icon={<Briefcase className="h-4 w-4" />}
        weight={review.serviceWeight}
        rating={review.serviceRating}
        color="green"
      >
        <GoalBlock
          goal={review.serviceGoal}
          target={review.serviceTarget}
          outcome={review.serviceOutcome}
          facultyComment={review.serviceFacultyComment}
          chairComment={review.serviceChairComment}
        />
        <div className="mt-4 pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-500">Service Weight: <strong>{review.serviceWeight}</strong></p>
          {review.serviceChairNarrative && (
            <p className="text-sm text-slate-300 mt-1 italic">{review.serviceChairNarrative}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-slate-500">Service Rate (Chair):</span>
            <RatingBadge rating={review.serviceRating} />
          </div>
        </div>
      </SectionCard>

      {/* ── Competencies / Collegiality ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            Competencies — Collegiality
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 text-sm space-y-2">
          <p className="text-xs text-slate-500">
            Develops and maintains cooperative relationships among colleagues and supports the University broadly and is self-accountable for commitments in a timely manner.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Competency Rate (Chair):</span>
            <RatingBadge rating={review.collegialityRating} />
          </div>
          {review.collegialityChairComment && (
            <p className="text-sm text-slate-300"><strong>Chair Comment:</strong> {review.collegialityChairComment}</p>
          )}
          {review.collegialityFacultyComment && (
            <p className="text-sm text-slate-300"><strong>Faculty Comment:</strong> {review.collegialityFacultyComment}</p>
          )}
        </CardContent>
      </Card>

      {/* ── Development Opportunities ── */}
      {review.developmentComments && review.developmentComments.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-semibold text-slate-300">Development Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="list-disc list-inside space-y-1">
              {(review.developmentComments as string[]).map((c: string, i: number) => (
                <li key={i} className="text-sm text-slate-300">{c}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── Upcoming Goals ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-400" />
            Goals for Upcoming Period — {review.reviewYear + 1}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {[
            { area: "Teaching and Advising", goal: review.nextTeachingGoal, target: review.nextTeachingTarget, weight: 40 },
            { area: "Scholarship / Research", goal: review.nextScholarshipGoal, target: review.nextScholarshipTarget, weight: 40 },
            { area: "Service", goal: review.nextServiceGoal, target: review.nextServiceTarget, weight: 20 },
          ].map(({ area, goal, target, weight }) => (
            <div key={area} className="border border-slate-800 rounded-lg p-3 bg-slate-800/30">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-semibold text-slate-300">{area}</p>
                <span className="text-xs text-slate-600">Weight: {weight}%</span>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {goal && <SectionRow label="Goal:" value={goal} />}
                  {target && target !== goal && <SectionRow label="Target:" value={target} />}
                </tbody>
              </table>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Approval History ── */}
      {review.approvals && review.approvals.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-semibold text-slate-300">Approval History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/40 border-b border-slate-800 text-xs text-slate-600 uppercase">
                  <th className="px-4 py-2 text-left">Activity</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Outcome</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Comments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(review.approvals as { id: string; activity: string; actorName: string; outcome: string; comments: string | null; actedAt: Date }[]).map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40">
                    <td className="px-4 py-2 font-medium text-slate-200">{a.activity}</td>
                    <td className="px-4 py-2 text-slate-400">{a.actorName}</td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        a.outcome === "Approve" || a.outcome === "Agree" || a.outcome === "HRMS Updated"
                          ? "bg-green-900/40 text-green-300"
                          : a.outcome === "Pending"
                          ? "bg-yellow-900/40 text-yellow-300"
                          : "bg-slate-800 text-slate-400"
                      }`}>
                        {a.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">{formatDate(a.actedAt)}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{a.comments ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Helper sub-components ──────────────────────────────────────────────────

function SectionCard({
  title, icon, weight, rating, color, badge, children,
}: {
  title: string;
  icon: React.ReactNode;
  weight: number;
  rating: string | null;
  color: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const headerColors: Record<string, string> = {
    blue:   "bg-blue-950/40 border-blue-900",
    indigo: "bg-indigo-950/40 border-indigo-900",
    green:  "bg-green-950/40 border-green-900",
  };
  return (
    <Card className="shadow-sm">
      <CardHeader className={`pb-3 border-b ${headerColors[color] ?? ""}`}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            {icon} {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {badge}
            <span className="text-xs text-slate-500">Weight: {weight}%</span>
            <RatingBadge rating={rating} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

function GoalBlock({
  goal, target, outcome, facultyComment, chairComment,
}: {
  goal?: string | null;
  target?: string | null;
  outcome?: string | null;
  facultyComment?: string | null;
  chairComment?: string | null;
}) {
  return (
    <div className="space-y-2">
      <table className="w-full text-sm">
        <tbody>
          {goal && <SectionRow label="Goal:" value={goal} />}
          {target && target !== goal && <SectionRow label="Target:" value={target} />}
          {outcome && <SectionRow label="Outcome:" value={outcome} />}
          {facultyComment && <SectionRow label="Faculty Comment:" value={facultyComment} />}
          {chairComment && <SectionRow label="Chair Comment:" value={chairComment} />}
        </tbody>
      </table>
    </div>
  );
}
