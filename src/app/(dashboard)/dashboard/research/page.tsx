"use client";

import React, { useState } from "react";
import {
  Microscope,
  BookOpen,
  Quote,
  DollarSign,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  AlertTriangle,
  Upload,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VenueQuality = "Q1" | "Q2" | "Q3" | "Q4" | "Unranked";
type Trend = "up" | "stable" | "down";

interface Publication {
  title: string;
  venue: string;
  quality: VenueQuality;
  year: number;
  citations: number;
}

interface Grant {
  title: string;
  funder: string;
  amountUSD: number;
  startYear: number;
  endYear: number;
  status: "Active" | "Completed" | "Pending";
}

interface ResearchRecord {
  facultyId: string;
  name: string;
  rank: string;
  department: string;
  hIndex: number;
  totalCitations: number;
  publications5yr: Publication[];
  activeGrants: Grant[];
  phdStudents: number;
  patents: number;
  lastUpdated: string;
  dataSource: "Research Office" | "Self-Reported" | "Pending";
  trend: Trend;
}

interface RankBenchmark {
  rank: string;
  minPubs5yr: number;
  minQ1Q2Pct: number;
  minHIndex: number;
  minGrantUSD: number;
  minPhdStudents: number;
}

// ---------------------------------------------------------------------------
// Benchmark thresholds (KU Research Office standards)
// ---------------------------------------------------------------------------

const BENCHMARKS: RankBenchmark[] = [
  { rank: "Instructor",              minPubs5yr: 2,  minQ1Q2Pct: 30, minHIndex: 3,  minGrantUSD: 25_000,   minPhdStudents: 0 },
  { rank: "Lecturer",                minPubs5yr: 2,  minQ1Q2Pct: 30, minHIndex: 3,  minGrantUSD: 25_000,   minPhdStudents: 0 },
  { rank: "Senior Lecturer",         minPubs5yr: 3,  minQ1Q2Pct: 40, minHIndex: 5,  minGrantUSD: 50_000,   minPhdStudents: 1 },
  { rank: "Adjunct",                 minPubs5yr: 1,  minQ1Q2Pct: 20, minHIndex: 2,  minGrantUSD: 0,        minPhdStudents: 0 },
  { rank: "Assistant Professor",     minPubs5yr: 4,  minQ1Q2Pct: 50, minHIndex: 6,  minGrantUSD: 100_000,  minPhdStudents: 1 },
  { rank: "Associate Professor",     minPubs5yr: 7,  minQ1Q2Pct: 60, minHIndex: 12, minGrantUSD: 250_000,  minPhdStudents: 2 },
  { rank: "Professor",               minPubs5yr: 10, minQ1Q2Pct: 70, minHIndex: 18, minGrantUSD: 500_000,  minPhdStudents: 3 },
  { rank: "Distinguished Professor", minPubs5yr: 15, minQ1Q2Pct: 75, minHIndex: 25, minGrantUSD: 750_000,  minPhdStudents: 4 },
];

// ---------------------------------------------------------------------------
// Mock faculty research data (Research Office verified)
// ---------------------------------------------------------------------------

const MOCK_DATA: ResearchRecord[] = [
  {
    facultyId: "F001",
    name: "Dr. Aisha Al-Mansouri",
    rank: "Professor",
    department: "Computer Science",
    hIndex: 22,
    totalCitations: 1840,
    publications5yr: [
      { title: "Deep RL for Autonomous Systems", venue: "IEEE TPAMI",         quality: "Q1", year: 2024, citations: 87 },
      { title: "Federated Edge Computing",        venue: "Nature Electronics",  quality: "Q1", year: 2023, citations: 124 },
      { title: "Adversarial Robustness Survey",    venue: "ACM Computing Surv.", quality: "Q1", year: 2023, citations: 56 },
      { title: "Privacy-Preserving ML",            venue: "IEEE S&P",           quality: "Q1", year: 2022, citations: 73 },
      { title: "Graph Neural Network Pruning",     venue: "ICML",               quality: "Q1", year: 2022, citations: 45 },
      { title: "Explainable AI in Healthcare",     venue: "JAMIA",              quality: "Q2", year: 2021, citations: 39 },
      { title: "Quantum ML - Foundations",         venue: "Quantum Science",    quality: "Q2", year: 2021, citations: 31 },
      { title: "Secure Aggregation Protocols",     venue: "USENIX Security",    quality: "Q1", year: 2020, citations: 28 },
    ],
    activeGrants: [
      { title: "Federated AI for Smart Cities",     funder: "UAE Research Foundation", amountUSD: 620_000, startYear: 2023, endYear: 2026, status: "Active" },
      { title: "Quantum-Safe Cryptography",          funder: "ADEK",                    amountUSD: 185_000, startYear: 2024, endYear: 2026, status: "Active" },
    ],
    phdStudents: 4,
    patents: 2,
    lastUpdated: "2026-04-15",
    dataSource: "Research Office",
    trend: "up",
  },
  {
    facultyId: "F002",
    name: "Dr. Omar Khalil",
    rank: "Associate Professor",
    department: "Electrical Engineering",
    hIndex: 14,
    totalCitations: 790,
    publications5yr: [
      { title: "Microwave Metamaterial Arrays",    venue: "IEEE TAP",        quality: "Q1", year: 2024, citations: 42 },
      { title: "5G MIMO Antenna Design",           venue: "IEEE TMTT",       quality: "Q1", year: 2023, citations: 37 },
      { title: "Reconfigurable Intelligent Surfaces", venue: "IEEE Access", quality: "Q2", year: 2023, citations: 29 },
      { title: "Compact Wearable Antennas",        venue: "Sensors",         quality: "Q2", year: 2022, citations: 18 },
      { title: "Low-Power IoT RF Design",          venue: "Electronics",      quality: "Q3", year: 2022, citations: 12 },
    ],
    activeGrants: [
      { title: "6G Physical Layer Research",        funder: "Etisalat R&D",    amountUSD: 270_000, startYear: 2024, endYear: 2026, status: "Active" },
    ],
    phdStudents: 2,
    patents: 1,
    lastUpdated: "2026-03-28",
    dataSource: "Research Office",
    trend: "stable",
  },
  {
    facultyId: "F003",
    name: "Dr. Priya Sharma",
    rank: "Assistant Professor",
    department: "Biomedical Engineering",
    hIndex: 8,
    totalCitations: 340,
    publications5yr: [
      { title: "Biosensor Microfluidics",          venue: "Lab on a Chip",   quality: "Q1", year: 2024, citations: 33 },
      { title: "Drug Delivery Nanoparticles",       venue: "Biomaterials",    quality: "Q1", year: 2023, citations: 28 },
      { title: "Wearable ECG Monitoring",          venue: "IEEE JBHI",       quality: "Q2", year: 2022, citations: 21 },
      { title: "Cancer Biomarker Detection",       venue: "Biosensors",      quality: "Q2", year: 2021, citations: 15 },
    ],
    activeGrants: [
      { title: "Point-of-Care Diagnostics",         funder: "DOH Abu Dhabi",   amountUSD: 115_000, startYear: 2024, endYear: 2026, status: "Active" },
    ],
    phdStudents: 1,
    patents: 0,
    lastUpdated: "2026-04-02",
    dataSource: "Research Office",
    trend: "up",
  },
  {
    facultyId: "F004",
    name: "Dr. Marcus Webb",
    rank: "Professor",
    department: "Mechanical Engineering",
    hIndex: 15,
    totalCitations: 1120,
    publications5yr: [
      { title: "Turbulent Flow Modelling",           venue: "J. Fluid Mech.",  quality: "Q1", year: 2024, citations: 44 },
      { title: "Additive Manufacturing Defects",    venue: "Addit. Manuf.",   quality: "Q1", year: 2023, citations: 36 },
      { title: "Composite Fatigue Analysis",        venue: "Compos. Sci. Tech.", quality: "Q1", year: 2022, citations: 27 },
      { title: "Thermal Barrier Coatings",          venue: "Surf. Coat. Tech.", quality: "Q2", year: 2022, citations: 19 },
      { title: "Gas Turbine Blade Cooling",         venue: "ASME J. Turbomach", quality: "Q2", year: 2021, citations: 23 },
      { title: "Hydrogen Combustion Dynamics",      venue: "Combust. Flame",   quality: "Q1", year: 2021, citations: 18 },
    ],
    activeGrants: [
      { title: "Advanced Turbine Materials",         funder: "ADNOC R&D",       amountUSD: 480_000, startYear: 2023, endYear: 2025, status: "Active" },
    ],
    phdStudents: 3,
    patents: 1,
    lastUpdated: "2026-04-10",
    dataSource: "Research Office",
    trend: "down",
  },
  {
    facultyId: "F005",
    name: "Dr. Fatima Al-Zaabi",
    rank: "Assistant Professor",
    department: "Mathematics",
    hIndex: 5,
    totalCitations: 190,
    publications5yr: [
      { title: "Stochastic PDEs and Applications", venue: "SIAM J. Math. Anal.", quality: "Q1", year: 2024, citations: 12 },
      { title: "Numerical Methods for FPDEs",      venue: "J. Comput. Appl. Math.", quality: "Q2", year: 2023, citations: 9 },
    ],
    activeGrants: [],
    phdStudents: 0,
    patents: 0,
    lastUpdated: "2026-02-14",
    dataSource: "Self-Reported",
    trend: "stable",
  },
  {
    facultyId: "F006",
    name: "Dr. James Okafor",
    rank: "Associate Professor",
    department: "Chemical Engineering",
    hIndex: 11,
    totalCitations: 620,
    publications5yr: [
      { title: "Catalytic CO2 Conversion",         venue: "ACS Catalysis",    quality: "Q1", year: 2024, citations: 38 },
      { title: "Membrane Separation Processes",    venue: "J. Membr. Sci.",   quality: "Q1", year: 2023, citations: 29 },
      { title: "Process Intensification Review",  venue: "Chem. Eng. J.",    quality: "Q1", year: 2023, citations: 21 },
      { title: "Zeolite Synthesis Optimisation",  venue: "Micropor. Mesopor.", quality: "Q2", year: 2022, citations: 16 },
      { title: "Green Solvent Selection",          venue: "Green Chem.",      quality: "Q1", year: 2022, citations: 14 },
      { title: "Heat Integration Modelling",       venue: "Energy",           quality: "Q2", year: 2021, citations: 11 },
    ],
    activeGrants: [
      { title: "Carbon Capture & Utilisation",      funder: "ADNOC Decarbonisation", amountUSD: 310_000, startYear: 2023, endYear: 2026, status: "Active" },
      { title: "Green Hydrogen Production",          funder: "IRENA",                 amountUSD: 95_000,  startYear: 2024, endYear: 2025, status: "Active" },
    ],
    phdStudents: 2,
    patents: 1,
    lastUpdated: "2026-04-20",
    dataSource: "Research Office",
    trend: "up",
  },
  {
    facultyId: "F007",
    name: "Dr. Ling Zhang",
    rank: "Senior Lecturer",
    department: "Computer Science",
    hIndex: 4,
    totalCitations: 145,
    publications5yr: [
      { title: "Active Learning for NLP",          venue: "ACL Findings",     quality: "Q1", year: 2023, citations: 18 },
      { title: "Low-Resource MT Techniques",       venue: "EMNLP",            quality: "Q1", year: 2022, citations: 11 },
    ],
    activeGrants: [
      { title: "Arabic NLP Corpus Development",     funder: "TRA UAE",         amountUSD: 55_000, startYear: 2024, endYear: 2025, status: "Active" },
    ],
    phdStudents: 1,
    patents: 0,
    lastUpdated: "2026-03-05",
    dataSource: "Research Office",
    trend: "stable",
  },
  {
    facultyId: "F008",
    name: "Dr. Rania Hassan",
    rank: "Associate Professor",
    department: "Civil Engineering",
    hIndex: 9,
    totalCitations: 480,
    publications5yr: [
      { title: "Smart Infrastructure Sensing",     venue: "Smart Mater. Struct.", quality: "Q1", year: 2024, citations: 27 },
      { title: "Seismic Resilience Assessment",    venue: "Earthq. Eng. Struct.", quality: "Q1", year: 2023, citations: 22 },
      { title: "Corrosion in Coastal Structures",  venue: "Constr. Build. Mater.", quality: "Q2", year: 2022, citations: 18 },
      { title: "BIM and Sustainable Design",       venue: "Autom. Constr.",      quality: "Q2", year: 2022, citations: 14 },
    ],
    activeGrants: [],
    phdStudents: 1,
    patents: 0,
    lastUpdated: "2026-01-30",
    dataSource: "Self-Reported",
    trend: "down",
  },
];

// ---------------------------------------------------------------------------
// Scoring engine
// ---------------------------------------------------------------------------

function getBenchmark(rank: string): RankBenchmark {
  return (
    BENCHMARKS.find((b) => b.rank === rank) ??
    BENCHMARKS.find((b) => b.rank === "Assistant Professor")!
  );
}

function scoreResearch(r: ResearchRecord) {
  const b = getBenchmark(r.rank);
  const totalFunding = r.activeGrants.reduce((s, g) => s + (g.status === "Active" ? g.amountUSD : 0), 0);
  const q1q2Count = r.publications5yr.filter((p) => p.quality === "Q1" || p.quality === "Q2").length;
  const q1q2Pct = r.publications5yr.length > 0 ? (q1q2Count / r.publications5yr.length) * 100 : 0;

  const pubScore = Math.min(100, (r.publications5yr.length / Math.max(1, b.minPubs5yr)) * 100);
  const qualityBonus = q1q2Pct >= b.minQ1Q2Pct ? 5 : -5;
  const pubFinal = Math.min(100, Math.max(0, pubScore + qualityBonus));

  const citScore = b.minHIndex > 0 ? Math.min(100, (r.hIndex / b.minHIndex) * 100) : 100;

  const grantScore = b.minGrantUSD > 0 ? Math.min(100, (totalFunding / b.minGrantUSD) * 100) : 100;

  const composite = pubFinal * 0.40 + citScore * 0.35 + grantScore * 0.25;

  return {
    pubScore: Math.round(pubFinal),
    citScore: Math.round(citScore),
    grantScore: Math.round(grantScore),
    composite: Math.round(composite * 10) / 10,
    totalFunding,
    q1q2Pct: Math.round(q1q2Pct),
    meetsPublications: r.publications5yr.length >= b.minPubs5yr,
    meetsCitations: r.hIndex >= b.minHIndex,
    meetsGrants: totalFunding >= b.minGrantUSD,
    meetsPhdStudents: r.phdStudents >= b.minPhdStudents,
  };
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function scoreColor(v: number): string {
  if (v >= 80) return "text-emerald-600";
  if (v >= 60) return "text-amber-500";
  return "text-red-500";
}

function scoreBg(v: number): string {
  if (v >= 80) return "bg-emerald-50 border-emerald-200";
  if (v >= 60) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function qualityBadge(q: VenueQuality) {
  const map: Record<VenueQuality, string> = {
    Q1: "bg-emerald-100 text-emerald-800 border-emerald-200",
    Q2: "bg-blue-100 text-blue-800 border-blue-200",
    Q3: "bg-amber-100 text-amber-800 border-amber-200",
    Q4: "bg-gray-100 text-gray-700 border-gray-200",
    Unranked: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return map[q];
}

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === "up")     return <TrendingUp   className="h-4 w-4 text-emerald-500" />;
  if (trend === "down")   return <TrendingDown  className="h-4 w-4 text-red-500" />;
  return                         <Minus         className="h-4 w-4 text-gray-400" />;
}

function formatUSD(amt: number) {
  if (amt >= 1_000_000) return `$${(amt / 1_000_000).toFixed(2)}M`;
  if (amt >= 1_000)     return `$${(amt / 1_000).toFixed(0)}K`;
  return `$${amt}`;
}

function sourceBadge(src: ResearchRecord["dataSource"]) {
  if (src === "Research Office") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (src === "Self-Reported")   return "bg-amber-100  text-amber-800  border-amber-200";
  return                                "bg-gray-100   text-gray-600   border-gray-200";
}

// ---------------------------------------------------------------------------
// Empty input form state
// ---------------------------------------------------------------------------

const EMPTY_FORM = {
  facultyId: "",
  hIndex: "",
  totalCitations: "",
  pubs5yr: "",
  q1q2Count: "",
  grantUSD: "",
  phdStudents: "",
  patents: "",
  notes: "",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ResearchPage() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [sortField, setSortField] = useState<"composite" | "hIndex" | "pubs" | "grants">("composite");

  const sorted = [...MOCK_DATA].sort((a, b) => {
    const sa = scoreResearch(a);
    const sb = scoreResearch(b);
    if (sortField === "composite") return sb.composite - sa.composite;
    if (sortField === "hIndex")    return b.hIndex - a.hIndex;
    if (sortField === "pubs")      return b.publications5yr.length - a.publications5yr.length;
    return sb.totalFunding - sa.totalFunding;
  });

  const allScores = MOCK_DATA.map((r) => scoreResearch(r));
  const avgComposite = Math.round(allScores.reduce((s, x) => s + x.composite, 0) / allScores.length * 10) / 10;
  const avgHIndex    = Math.round(MOCK_DATA.reduce((s, r) => s + r.hIndex, 0) / MOCK_DATA.length * 10) / 10;
  const totalGrants  = allScores.reduce((s, x) => s + x.totalFunding, 0);
  const totalPubs    = MOCK_DATA.reduce((s, r) => s + r.publications5yr.length, 0);

  function handleFormChange(k: keyof typeof EMPTY_FORM, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
    setForm(EMPTY_FORM);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Microscope className="h-7 w-7 text-[#1464C8]" />
            Research Performance
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Metrics, benchmarks and scoring - verified data from the Research Office
          </p>
        </div>
        <span className="text-xs text-gray-400 mt-1">Cycle 2025-2026 | Last sync: 20 Apr 2026</span>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Avg Research Score</p>
                <p className={cn("text-3xl font-bold mt-1", scoreColor(avgComposite))}>{avgComposite}</p>
                <p className="text-xs text-gray-400 mt-0.5">out of 100</p>
              </div>
              <BarChart className="h-9 w-9 text-[#1464C8] opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Publications (5yr)</p>
                <p className="text-3xl font-bold text-[#1464C8] mt-1">{totalPubs}</p>
                <p className="text-xs text-gray-400 mt-0.5">across {MOCK_DATA.length} faculty</p>
              </div>
              <BookOpen className="h-9 w-9 text-[#1464C8] opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Active Grant Funding</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{formatUSD(totalGrants)}</p>
                <p className="text-xs text-gray-400 mt-0.5">combined portfolio</p>
              </div>
              <DollarSign className="h-9 w-9 text-emerald-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Average H-Index</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">{avgHIndex}</p>
                <p className="text-xs text-gray-400 mt-0.5">citation impact</p>
              </div>
              <Quote className="h-9 w-9 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="scores">
        <TabsList className="grid w-full grid-cols-3 max-w-xl">
          <TabsTrigger value="scores">Faculty Scores</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="input">Research Office Input</TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------------- */}
        {/* TAB 1 - Faculty Scores                                           */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="scores" className="mt-4 space-y-3">
          {/* Sort controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Sort by:</span>
            {(["composite", "hIndex", "pubs", "grants"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setSortField(f)}
                className={cn(
                  "text-xs px-3 py-1 rounded-full border font-medium transition-colors",
                  sortField === f
                    ? "bg-[#1464C8] text-white border-[#1464C8]"
                    : "text-gray-500 border-gray-200 hover:border-[#1464C8] hover:text-[#1464C8]"
                )}
              >
                {f === "composite" ? "Research Score" : f === "hIndex" ? "H-Index" : f === "pubs" ? "Publications" : "Grant Funding"}
              </button>
            ))}
          </div>

          {/* Score table */}
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <div className="col-span-3">Faculty</div>
              <div className="col-span-2">Rank / Dept</div>
              <div className="col-span-1 text-center">Pubs</div>
              <div className="col-span-1 text-center">H-Index</div>
              <div className="col-span-1 text-center">Grants</div>
              <div className="col-span-2 text-center">Research Score</div>
              <div className="col-span-1 text-center">Trend</div>
              <div className="col-span-1 text-center">Source</div>
            </div>

            {sorted.map((r) => {
              const s = scoreResearch(r);
              const isOpen = expandedRow === r.facultyId;

              return (
                <div key={r.facultyId}>
                  {/* Main row */}
                  <button
                    className="grid grid-cols-12 gap-2 px-4 py-3 w-full text-left hover:bg-gray-50 transition-colors items-center"
                    onClick={() => setExpandedRow(isOpen ? null : r.facultyId)}
                  >
                    <div className="col-span-3">
                      <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                      <p className="text-xs text-gray-400">Updated {r.lastUpdated}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-700 font-medium">{r.rank}</p>
                      <p className="text-xs text-gray-400">{r.department}</p>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className={cn("text-sm font-bold", s.meetsPublications ? "text-emerald-600" : "text-red-500")}>
                        {r.publications5yr.length}
                      </span>
                      <p className="text-xs text-gray-400">{s.q1q2Pct}% Q1/Q2</p>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className={cn("text-sm font-bold", s.meetsCitations ? "text-emerald-600" : "text-red-500")}>
                        {r.hIndex}
                      </span>
                      <p className="text-xs text-gray-400">{r.totalCitations.toLocaleString()} cites</p>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className={cn("text-sm font-bold", s.meetsGrants ? "text-emerald-600" : "text-amber-500")}>
                        {formatUSD(s.totalFunding)}
                      </span>
                      <p className="text-xs text-gray-400">{r.activeGrants.filter(g => g.status === "Active").length} active</p>
                    </div>
                    <div className="col-span-2 flex flex-col items-center gap-1">
                      <span className={cn("text-lg font-extrabold tabular-nums", scoreColor(s.composite))}>
                        {s.composite}
                      </span>
                      <Progress value={s.composite} className="h-1.5 w-20" />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <TrendIcon trend={r.trend} />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium", sourceBadge(r.dataSource))}>
                        {r.dataSource === "Research Office" ? "RO" : r.dataSource === "Self-Reported" ? "SR" : "?"}
                      </span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="px-4 pb-5 pt-1 bg-gray-50 border-t border-gray-100 space-y-4">
                      {/* Score breakdown */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "Publications Score (40%)", value: s.pubScore,   detail: `${r.publications5yr.length} pubs, ${s.q1q2Pct}% Q1/Q2` },
                          { label: "Citations Score (35%)",    value: s.citScore,   detail: `H-Index ${r.hIndex} | ${r.totalCitations.toLocaleString()} total` },
                          { label: "Grants Score (25%)",       value: s.grantScore, detail: formatUSD(s.totalFunding) + " active funding" },
                        ].map((item) => (
                          <div key={item.label} className={cn("rounded-lg border p-3", scoreBg(item.value))}>
                            <p className="text-xs text-gray-500 font-medium">{item.label}</p>
                            <p className={cn("text-2xl font-bold mt-1", scoreColor(item.value))}>{item.value}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
                          </div>
                        ))}
                      </div>

                      {/* Publications list */}
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Publications (5-year window)</p>
                        <div className="space-y-1">
                          {r.publications5yr.map((p, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                              <span className={cn("shrink-0 mt-0.5 text-[10px] px-1.5 py-0.5 rounded border font-bold", qualityBadge(p.quality))}>
                                {p.quality}
                              </span>
                              <span className="flex-1">{p.title} <span className="text-gray-400">— {p.venue}, {p.year}</span></span>
                              <span className="shrink-0 text-gray-400">{p.citations} cites</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Grants list */}
                      {r.activeGrants.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Active Grants</p>
                          <div className="space-y-1">
                            {r.activeGrants.map((g, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                                <span className="flex-1">{g.title} <span className="text-gray-400">— {g.funder}</span></span>
                                <span className="font-semibold text-emerald-700">{formatUSD(g.amountUSD)}</span>
                                <span className="text-gray-400">{g.startYear}-{g.endYear}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* KPIs */}
                      <div className="flex gap-4 flex-wrap text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-3.5 w-3.5 text-purple-500" />
                          PhD Students: <strong>{r.phdStudents}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
                          Patents: <strong>{r.patents}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          Data source: <strong>{r.dataSource}</strong>
                        </span>
                      </div>

                      {/* Benchmark compliance */}
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Benchmark Compliance</p>
                        <div className="flex gap-3 flex-wrap">
                          {[
                            { label: "Publications", met: s.meetsPublications },
                            { label: "H-Index",       met: s.meetsCitations },
                            { label: "Grant Funding", met: s.meetsGrants },
                            { label: "PhD Students",  met: s.meetsPhdStudents },
                          ].map((item) => (
                            <span
                              key={item.label}
                              className={cn(
                                "flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium",
                                item.met
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-red-50 text-red-600 border-red-200"
                              )}
                            >
                              {item.met
                                ? <CheckCircle className="h-3 w-3" />
                                : <AlertTriangle className="h-3 w-3" />}
                              {item.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedRow(null)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-1"
                      >
                        <ChevronUp className="h-3.5 w-3.5" /> Collapse
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-xs text-gray-400 flex-wrap pt-1">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> RO - Research Office verified</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> SR - Self-reported (pending verification)</span>
            <span className="flex items-center gap-1"><Info className="h-3 w-3" /> Click a row to expand score breakdown</span>
          </div>
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        {/* TAB 2 - Benchmarks                                               */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="benchmarks" className="mt-4">
          {/* Scoring formula card */}
          <Card className="mb-4 border-[#1464C8]/20 bg-[#EEF6FF]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-[#1464C8] flex items-center gap-2">
                <Info className="h-4 w-4" /> Research Score Formula
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                <div className="rounded-lg bg-white border border-blue-100 p-3">
                  <p className="font-bold text-[#1464C8] text-base">40%</p>
                  <p className="font-semibold text-gray-700 mt-0.5">Publications Score</p>
                  <p className="text-xs text-gray-500 mt-1">
                    (Actual publications / Rank benchmark) x 100.
                    Adjusted +5 if Q1/Q2 ratio meets benchmark; -5 if below.
                    Capped at 100.
                  </p>
                </div>
                <div className="rounded-lg bg-white border border-blue-100 p-3">
                  <p className="font-bold text-purple-600 text-base">35%</p>
                  <p className="font-semibold text-gray-700 mt-0.5">Citations Score</p>
                  <p className="text-xs text-gray-500 mt-1">
                    (H-Index / Rank benchmark H-Index) x 100.
                    Reflects scholarly impact and citation accumulation.
                    Capped at 100.
                  </p>
                </div>
                <div className="rounded-lg bg-white border border-blue-100 p-3">
                  <p className="font-bold text-emerald-600 text-base">25%</p>
                  <p className="font-semibold text-gray-700 mt-0.5">Grants Score</p>
                  <p className="text-xs text-gray-500 mt-1">
                    (Active funding total / Rank benchmark) x 100.
                    Reflects research external funding track record.
                    Capped at 100.
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 font-medium">
                Final Research Score = Publications(0.40) + Citations(0.35) + Grants(0.25)
              </p>
            </CardContent>
          </Card>

          {/* Benchmarks table */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-44">Rank</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Min Pubs (5yr)</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Min Q1/Q2 %</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Min H-Index</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Min Grant Funding</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Min PhD Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {BENCHMARKS.map((b, i) => (
                  <tr key={b.rank} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                    <td className="px-4 py-3 font-medium text-gray-800">{b.rank}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{b.minPubs5yr}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{b.minQ1Q2Pct}%</td>
                    <td className="px-3 py-3 text-center text-gray-700">{b.minHIndex}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{b.minGrantUSD > 0 ? formatUSD(b.minGrantUSD) : "—"}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{b.minPhdStudents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Benchmarks are set by the Research Office in alignment with KU Academic Performance Policy. Reviewed annually each September.
          </p>
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        {/* TAB 3 - Research Office Input                                    */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="input" className="mt-4">
          {submitted && (
            <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-lg px-4 py-3 text-sm mb-4">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Research metrics submitted successfully. Record will appear in the Faculty Scores tab after verification.
            </div>
          )}

          {/* Info banner */}
          <div className="flex items-start gap-3 border border-blue-200 bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-800 mb-5">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Research Office Data Entry</p>
              <p className="text-xs mt-0.5">
                Data entered here is marked as "Research Office" verified and carries full weight in the appraisal scoring.
                Self-reported data is accepted but flagged for follow-up verification.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="facultyId" className="text-xs font-semibold text-gray-600">Faculty Member</Label>
                <select
                  id="facultyId"
                  value={form.facultyId}
                  onChange={(e) => handleFormChange("facultyId", e.target.value)}
                  required
                  className="mt-1.5 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1464C8] bg-white"
                >
                  <option value="">Select faculty member...</option>
                  {MOCK_DATA.map((r) => (
                    <option key={r.facultyId} value={r.facultyId}>{r.name} - {r.rank}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="hIndex" className="text-xs font-semibold text-gray-600">H-Index</Label>
                <Input
                  id="hIndex"
                  type="number"
                  min={0}
                  placeholder="e.g. 14"
                  value={form.hIndex}
                  onChange={(e) => handleFormChange("hIndex", e.target.value)}
                  required
                  className="mt-1.5 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="totalCitations" className="text-xs font-semibold text-gray-600">Total Citations</Label>
                <Input
                  id="totalCitations"
                  type="number"
                  min={0}
                  placeholder="e.g. 780"
                  value={form.totalCitations}
                  onChange={(e) => handleFormChange("totalCitations", e.target.value)}
                  required
                  className="mt-1.5 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="pubs5yr" className="text-xs font-semibold text-gray-600">Publications (5-year window)</Label>
                <Input
                  id="pubs5yr"
                  type="number"
                  min={0}
                  placeholder="e.g. 6"
                  value={form.pubs5yr}
                  onChange={(e) => handleFormChange("pubs5yr", e.target.value)}
                  required
                  className="mt-1.5 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="q1q2Count" className="text-xs font-semibold text-gray-600">Q1/Q2 Publications Count</Label>
                <Input
                  id="q1q2Count"
                  type="number"
                  min={0}
                  placeholder="e.g. 4"
                  value={form.q1q2Count}
                  onChange={(e) => handleFormChange("q1q2Count", e.target.value)}
                  required
                  className="mt-1.5 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="grantUSD" className="text-xs font-semibold text-gray-600">Active Grant Funding (USD)</Label>
                <Input
                  id="grantUSD"
                  type="number"
                  min={0}
                  placeholder="e.g. 250000"
                  value={form.grantUSD}
                  onChange={(e) => handleFormChange("grantUSD", e.target.value)}
                  required
                  className="mt-1.5 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="phdStudents" className="text-xs font-semibold text-gray-600">PhD Students Supervised</Label>
                <Input
                  id="phdStudents"
                  type="number"
                  min={0}
                  placeholder="e.g. 2"
                  value={form.phdStudents}
                  onChange={(e) => handleFormChange("phdStudents", e.target.value)}
                  required
                  className="mt-1.5 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="patents" className="text-xs font-semibold text-gray-600">Patents Filed / Granted</Label>
                <Input
                  id="patents"
                  type="number"
                  min={0}
                  placeholder="e.g. 1"
                  value={form.patents}
                  onChange={(e) => handleFormChange("patents", e.target.value)}
                  required
                  className="mt-1.5 text-sm"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="notes" className="text-xs font-semibold text-gray-600">Research Office Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
                <textarea
                  id="notes"
                  placeholder="Any caveats, data source references, or verification notes..."
                  value={form.notes}
                  onChange={(e) => handleFormChange("notes", e.target.value)}
                  rows={3}
                  className="mt-1.5 w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1464C8] resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button
                type="submit"
                className="bg-[#1464C8] hover:bg-[#1155a8] text-white flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Submit Metrics to Research Office
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm(EMPTY_FORM)}
                className="text-gray-600"
              >
                Clear
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Inline BarChart icon used in stat card (from lucide)
function BarChart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
