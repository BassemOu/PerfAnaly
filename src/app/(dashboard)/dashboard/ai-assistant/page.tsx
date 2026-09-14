import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/next-auth";
import { mockSession, DEV_BYPASS } from "@/lib/mock-session";
import { prisma } from "@/lib/db";
import { OllamaChatPanel } from "@/components/dashboard/OllamaChatPanel";
import type { FacultyAIContext } from "@/components/dashboard/OllamaChatPanel";
import { Bot } from "lucide-react";

const RATING_SCORE: Record<string, number> = {
  OUTSTANDING: 95,
  EXCEEDS_EXPECTATIONS: 80,
  MEETS_EXPECTATIONS: 60,
  DOES_NOT_MEET_EXPECTATIONS: 30,
};

function compositeScore(
  t: string | null,
  s: string | null,
  sv: string | null,
  tW: number,
  sW: number,
  svW: number
): number | null {
  const ts = t ? (RATING_SCORE[t] ?? null) : null;
  const ss = s ? (RATING_SCORE[s] ?? null) : null;
  const svs = sv ? (RATING_SCORE[sv] ?? null) : null;
  const total = (ts !== null ? 1 : 0) + (ss !== null ? 1 : 0) + (svs !== null ? 1 : 0);
  if (total === 0) return null;
  const totalW = (ts !== null ? tW : 0) + (ss !== null ? sW : 0) + (svs !== null ? svW : 0);
  if (totalW === 0) return null;
  const score =
    ((ts ?? 0) * (ts !== null ? tW : 0) +
      (ss ?? 0) * (ss !== null ? sW : 0) +
      (svs ?? 0) * (svs !== null ? svW : 0)) /
    totalW;
  return Math.round(score * 10) / 10;
}

async function getFacultyAIData(): Promise<FacultyAIContext[]> {
  try {
    const reviews = await prisma.performanceReview.findMany({
      where: {
        OR: [
          { teachingRating: { not: null } },
          { scholarshipRating: { not: null } },
          { serviceRating: { not: null } },
        ],
      },
      include: {
        faculty: { include: { department: true } },
      },
      orderBy: { reviewDate: "desc" },
    });

    return reviews.map((rev) => {
      const f = rev.faculty;
      const tW = rev.teachingWeight ?? 40;
      const sW = rev.scholarshipWeight ?? 40;
      const svW = rev.serviceWeight ?? 20;
      const calc = compositeScore(
        rev.teachingRating,
        rev.scholarshipRating,
        rev.serviceRating,
        tW,
        sW,
        svW
      );
      return {
        reviewId: rev.id,
        name: `${f.firstName} ${f.lastName}`,
        dept: (f as unknown as { department?: { name: string } }).department?.name ?? "—",
        rank: f.rank,
        teachingRating: rev.teachingRating,
        scholarshipRating: rev.scholarshipRating,
        serviceRating: rev.serviceRating,
        collegialityRating: rev.collegialityRating,
        overallRating: rev.overallRating,
        overallScore: rev.overallWeightedScore ?? calc,
        teachingScore: rev.teachingRating ? (RATING_SCORE[rev.teachingRating] ?? null) : null,
        scholarshipScore: rev.scholarshipRating ? (RATING_SCORE[rev.scholarshipRating] ?? null) : null,
        serviceScore: rev.serviceRating ? (RATING_SCORE[rev.serviceRating] ?? null) : null,
        teachingGoal: rev.teachingGoal,
        teachingOutcome: rev.teachingOutcome,
        scholarshipGoal: rev.scholarshipGoal,
        scholarshipOutcome: rev.scholarshipOutcome,
        serviceGoal: rev.serviceGoal,
        serviceOutcome: rev.serviceOutcome,
        aiSummary: rev.aiSummary,
      } as FacultyAIContext;
    });
  } catch {
    return [];
  }
}

export default async function AIAssistantPage() {
  const session = DEV_BYPASS ? mockSession : await getServerSession(authOptions);
  void session;

  const faculty = await getFacultyAIData();

  return (
    <div className="flex flex-col h-full -mt-6 -mx-6">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#161b22]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-900/60 border border-indigo-800 flex items-center justify-center">
            <Bot className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Faculty Performance AI</h1>
            <p className="text-xs text-slate-500">
              AI-powered analysis · {faculty.length} reviewed faculty in context
            </p>
          </div>
        </div>
        <div className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-3 py-1.5 rounded-lg">
          Local LLM when available · cloud fallback
        </div>
      </div>

      {/* Chat UI */}
      <OllamaChatPanel faculty={faculty} />
    </div>
  );
}
