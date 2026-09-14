import OpenAI from "openai";

const globalForOpenAI = globalThis as unknown as {
  openai: OpenAI | undefined;
};

/** Any OpenAI-compatible endpoint (Groq, OpenRouter, Together, Gemini, local vLLM…). */
export const AI_BASE_URL =
  process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

export const openai =
  globalForOpenAI.openai ??
  new OpenAI({
    // Placeholder keeps construction from throwing at import when unset; callers guard on the real env var.
    apiKey: process.env.OPENAI_API_KEY ?? "not-configured",
    baseURL: AI_BASE_URL,
  });

if (process.env.NODE_ENV !== "production") globalForOpenAI.openai = openai;

export const AI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";

export interface AIEvaluationResult {
  summary: string;
  strengths: string[];
  risks: string[];
  improvements: string[];
  confidenceScore: number;
  needsHumanReview: boolean;
  narrative?: string;
}

export interface RenewalRecommendationResult {
  recommendation: "RENEW" | "RENEW_WITH_CONDITIONS" | "DEFER" | "DO_NOT_RENEW";
  justification: string;
  conditions?: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidenceScore: number;
  needsHumanReview: boolean;
  supportingEvidence: string[];
}

export interface PromotionReadinessResult {
  readinessScore: number;
  gaps: string[];
  actionPlan: string[];
  estimatedTimelineMonths: number;
  confidenceScore: number;
  narrative: string;
}

// ─── Faculty Achievement Summarizer ───────────────────────────────────────────
export async function summarizeFacultyAchievements(
  facultyData: Record<string, unknown>
): Promise<AIEvaluationResult> {
  const prompt = `You are an academic performance evaluation assistant for a higher education institution. 
Analyze the following faculty data and provide a structured evaluation.

Faculty Data:
${JSON.stringify(facultyData, null, 2)}

Respond ONLY with a valid JSON object in this exact format:
{
  "summary": "2-3 sentence overall summary of achievements",
  "strengths": ["strength1", "strength2", "strength3"],
  "risks": ["risk1", "risk2"],
  "improvements": ["area1", "area2", "area3"],
  "confidenceScore": 0.85,
  "needsHumanReview": false,
  "narrative": "A 3-4 paragraph professional appraisal narrative"
}

Rules:
- Be specific and evidence-based
- If data is insufficient, flag needsHumanReview as true and lower confidenceScore
- The narrative should be suitable for an official appraisal document
- Highlight missing evidence areas in improvements`;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("AI returned empty response");

  return JSON.parse(content) as AIEvaluationResult;
}

// ─── Contract Renewal Recommender ─────────────────────────────────────────────
export async function generateRenewalRecommendation(
  facultyData: Record<string, unknown>,
  appraisalData: Record<string, unknown>,
  policyRules: Record<string, unknown>
): Promise<RenewalRecommendationResult> {
  const prompt = `You are a contract renewal evaluation expert for a higher education institution.
Based on faculty performance data, appraisal results, and institutional policy rules, generate a contract renewal recommendation.

Faculty Profile:
${JSON.stringify(facultyData, null, 2)}

Appraisal Data:
${JSON.stringify(appraisalData, null, 2)}

Policy Rules:
${JSON.stringify(policyRules, null, 2)}

Respond ONLY with a valid JSON object:
{
  "recommendation": "RENEW" | "RENEW_WITH_CONDITIONS" | "DEFER" | "DO_NOT_RENEW",
  "justification": "Detailed justification paragraph",
  "conditions": ["condition if RENEW_WITH_CONDITIONS"],
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidenceScore": 0.0-1.0,
  "needsHumanReview": true/false,
  "supportingEvidence": ["evidence item 1", "evidence item 2"]
}

Always set needsHumanReview to true if confidenceScore < 0.75 or if the recommendation is DEFER or DO_NOT_RENEW.
Base your recommendation strictly on the provided data and policy rules.`;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("AI returned empty response");

  return JSON.parse(content) as RenewalRecommendationResult;
}

// ─── Promotion Readiness Assessor ─────────────────────────────────────────────
export async function assessPromotionReadiness(
  facultyData: Record<string, unknown>,
  targetRank: string,
  promotionCriteria: Record<string, unknown>
): Promise<PromotionReadinessResult> {
  const prompt = `You are an academic promotion readiness expert.
Assess whether this faculty member is ready for promotion to ${targetRank}.

Faculty Profile and History:
${JSON.stringify(facultyData, null, 2)}

Promotion Criteria for ${targetRank}:
${JSON.stringify(promotionCriteria, null, 2)}

Respond ONLY with a valid JSON object:
{
  "readinessScore": 0-100,
  "gaps": ["gap1", "gap2"],
  "actionPlan": ["action1", "action2", "action3"],
  "estimatedTimelineMonths": 12,
  "confidenceScore": 0.0-1.0,
  "narrative": "3-4 paragraph professional assessment narrative"
}`;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("AI returned empty response");

  return JSON.parse(content) as PromotionReadinessResult;
}

// ─── Appraisal Narrative Generator ────────────────────────────────────────────
export async function generateAppraisalNarrative(
  role: "chair" | "dean" | "committee",
  facultyData: Record<string, unknown>,
  scores: Record<string, unknown>
): Promise<string> {
  const prompt = `You are assisting a ${role} in writing a formal performance appraisal narrative for a faculty member.
Generate a professional, fair, and evidence-based narrative.

Faculty Data:
${JSON.stringify(facultyData, null, 2)}

Performance Scores Summary:
${JSON.stringify(scores, null, 2)}

Write a 3-4 paragraph formal appraisal narrative suitable for an official HR document.
The narrative should:
1. Open with overall assessment
2. Address teaching, research, and service dimensions
3. Note strengths and areas for improvement
4. Close with a professional recommendation statement

Respond with the narrative text only (no JSON wrapper).`;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  });

  return response.choices[0].message.content ?? "";
}

// ─── Performance Trend Analyzer ───────────────────────────────────────────────
export async function analyzePerformanceTrends(
  yearlyData: Record<string, unknown>[]
): Promise<{ trends: string[]; insights: string[]; summary: string }> {
  const prompt = `Analyze multi-year faculty performance data and identify trends.

Performance History (oldest to newest):
${JSON.stringify(yearlyData, null, 2)}

Respond ONLY with valid JSON:
{
  "trends": ["trend observation 1", "trend observation 2"],
  "insights": ["insight 1", "insight 2"],
  "summary": "2-3 sentence summary of overall trajectory"
}`;

  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("AI returned empty response");

  return JSON.parse(content);
}
