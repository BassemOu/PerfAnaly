import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  PERFORMANCE_RATING_LABELS,
  PERFORMANCE_RATING_COLORS,
  REVIEW_STATUS_LABELS,
  RANK_LABELS,
} from "@/lib/constants";
import { formatDate, getInitials } from "@/lib/utils";
import {
  ArrowLeft,
  Building,
  Calendar,
  Mail,
  Phone,
  MapPin,
  BookOpen,
  ExternalLink,
  ClipboardList,
} from "lucide-react";

async function getFaculty(id: string) {
  try {
    return await prisma.facultyProfile.findUnique({
      where: { id },
      include: {
        department: true,
        division: true,
        user: { select: { email: true } },
        publications: { orderBy: { year: "desc" }, take: 25 },
        performanceReviews: { orderBy: { reviewYear: "desc" } },
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
    green: "bg-green-900/40 text-green-300 border border-green-700",
    blue: "bg-blue-900/40 text-blue-300 border border-blue-700",
    red: "bg-red-900/40 text-red-300 border border-red-700",
    purple: "bg-purple-900/40 text-purple-300 border border-purple-700",
    gray: "bg-slate-800 text-slate-400 border border-slate-600",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorMap[color] ?? colorMap.gray}`}>
      {label}
    </span>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm text-slate-300 break-words">{value}</p>
      </div>
    </div>
  );
}

export default async function FacultyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const faculty = await getFaculty(id);

  if (!faculty) notFound();

  const fullName = [faculty.title, faculty.firstName, faculty.lastName]
    .filter(Boolean)
    .join(" ");

  const externalLinks = [
    { label: "ORCID", url: faculty.orcidId ? `https://orcid.org/${faculty.orcidId}` : null },
    { label: "Google Scholar", url: faculty.googleScholarUrl },
    { label: "LinkedIn", url: faculty.linkedinUrl },
  ].filter((l): l is { label: string; url: string } => Boolean(l.url));

  const citations = faculty.publications.reduce(
    (sum, p) => sum + (p.citationCount ?? 0),
    0
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Button asChild variant="ghost" size="sm">
        <Link href="/dashboard/faculty">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Faculty
        </Link>
      </Button>

      {/* Profile header */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#161b22]">
        <div className="bg-indigo-700 text-white px-6 py-5 flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-white/30">
            <AvatarImage src={faculty.profileImageUrl ?? ""} />
            <AvatarFallback className="bg-indigo-900 text-white text-lg">
              {getInitials(faculty.firstName, faculty.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{fullName}</h1>
            <p className="text-sm opacity-90">{RANK_LABELS[faculty.rank] ?? faculty.rank}</p>
            <p className="text-xs opacity-75 mt-0.5">
              {faculty.employeeId} · {faculty.employmentType}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
          <MetaRow icon={Building} label="Department" value={faculty.department.name} />
          <MetaRow icon={Building} label="Division" value={faculty.division.name} />
          <MetaRow icon={Mail} label="Email" value={faculty.user.email} />
          <MetaRow icon={Calendar} label="Hire Date" value={formatDate(faculty.hireDate)} />
          <MetaRow
            icon={Calendar}
            label="Tenure Date"
            value={faculty.tenureDate ? formatDate(faculty.tenureDate) : null}
          />
          <MetaRow icon={MapPin} label="Office" value={faculty.officeLocation} />
          <MetaRow icon={Phone} label="Phone" value={faculty.phone} />
        </div>

        {externalLinks.length > 0 && (
          <div className="flex flex-wrap gap-2 px-6 pb-6">
            {externalLinks.map((l) => (
              <a
                key={l.label}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
              >
                {l.label}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Specialization */}
      {faculty.specialization.length > 0 && (
        <Card className="bg-[#161b22] border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-200 text-base">Specialization</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {faculty.specialization.map((s) => (
              <span
                key={s}
                className="px-2.5 py-1 rounded-full text-xs bg-slate-800 text-slate-300 border border-slate-700"
              >
                {s}
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Bio */}
      {faculty.bio && (
        <Card className="bg-[#161b22] border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-200 text-base">Biography</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{faculty.bio}</p>
          </CardContent>
        </Card>
      )}

      {/* Performance reviews */}
      <Card className="bg-[#161b22] border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-slate-500" />
            Performance Reviews ({faculty.performanceReviews.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {faculty.performanceReviews.length === 0 ? (
            <p className="text-sm text-slate-500">No performance reviews on record.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                    <th className="pb-2 pr-4 font-medium">Year</th>
                    <th className="pb-2 pr-4 font-medium">Request No.</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Overall</th>
                    <th className="pb-2 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {faculty.performanceReviews.map((r) => (
                    <tr key={r.id} className="border-b border-slate-800 last:border-0">
                      <td className="py-2.5 pr-4 text-slate-300">{r.reviewYear}</td>
                      <td className="py-2.5 pr-4">
                        <Link
                          href={`/dashboard/appraisal/${r.id}`}
                          className="text-indigo-400 hover:text-indigo-300 hover:underline"
                        >
                          {r.requestNo}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-400">
                        {REVIEW_STATUS_LABELS[r.status] ?? r.status}
                      </td>
                      <td className="py-2.5 pr-4">
                        <RatingBadge rating={r.overallRating} />
                      </td>
                      <td className="py-2.5 text-slate-300">
                        {r.overallWeightedScore != null
                          ? r.overallWeightedScore.toFixed(1)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publications */}
      <Card className="bg-[#161b22] border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-200 text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-slate-500" />
            Publications ({faculty.publications.length})
            {citations > 0 && (
              <span className="text-xs font-normal text-slate-500">
                · {citations} citations
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {faculty.publications.length === 0 ? (
            <p className="text-sm text-slate-500">No publications on record.</p>
          ) : (
            <ul className="space-y-3">
              {faculty.publications.map((p) => (
                <li key={p.id} className="border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm text-slate-200">{p.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {[p.journal ?? p.publisher, p.year, p.publicationType]
                      .filter(Boolean)
                      .join(" · ")}
                    {p.citationCount != null && ` · ${p.citationCount} citations`}
                  </p>
                  {p.indexedIn.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {p.indexedIn.map((idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700"
                        >
                          {idx}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
