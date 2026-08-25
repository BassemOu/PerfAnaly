export type ApiResponse<T = unknown> = {
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type PaginationParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type DashboardStats = {
  totalFaculty: number;
  activeAppraisals: number;
  pendingRenewals: number;
  completedAppraisals: number;
  upcomingRenewals: number;
  criticalRiskContracts: number;
  averageScore: number;
  promotionCandidates: number;
};

export type AppraisalWithDetails = {
  id: string;
  period: string;
  academicYear: string;
  status: string;
  overallScore: number | null;
  weightedScore: number | null;
  aiConfidenceScore: number | null;
  needsHumanReview: boolean;
  aiGeneratedSummary: string | null;
  aiStrengths: string[];
  aiRisks: string[];
  aiImprovements: string[];
  dueDate: Date | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  faculty: {
    id: string;
    firstName: string;
    lastName: string;
    rank: string;
    employeeId: string;
    profileImageUrl: string | null;
  };
  rubric: {
    id: string;
    name: string;
  };
  chairReviewer: { id: string; email: string } | null;
  deanReviewer: { id: string; email: string } | null;
  _count?: {
    comments: number;
    documents: number;
  };
};

export type ContractWithFaculty = {
  id: string;
  contractNumber: string;
  startDate: Date;
  endDate: Date;
  status: string;
  position: string;
  riskLevel: string;
  recommendation: string | null;
  renewalDueDate: Date | null;
  faculty: {
    id: string;
    firstName: string;
    lastName: string;
    rank: string;
    employeeId: string;
    department: { name: string; code: string };
    division: { name: string };
  };
};

export type FacultyProfileSummary = {
  id: string;
  userId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  title: string | null;
  rank: string;
  employmentType: string;
  specialization: string[];
  profileImageUrl: string | null;
  department: { id: string; name: string; code: string };
  division: { id: string; name: string };
  _count?: {
    appraisals: number;
    publications: number;
    contracts: number;
  };
};

export type WorkflowStep = {
  id: string;
  actionType: string;
  performedBy: string;
  fromStatus: string | null;
  toStatus: string | null;
  comments: string | null;
  createdAt: Date;
  user: { email: string; facultyProfile?: { firstName: string; lastName: string } | null };
};

export type ScoreBreakdown = {
  categoryId: string;
  categoryName: string;
  weight: number;
  selfScore: number | null;
  reviewerScore: number | null;
  finalScore: number | null;
  kpis: {
    kpiId: string;
    kpiName: string;
    weight: number;
    selfScore: number | null;
    reviewerScore: number | null;
    finalScore: number | null;
  }[];
};

export type PerformanceChartData = {
  year: string;
  teaching: number;
  research: number;
  service: number;
  overall: number;
};

export type RenewalPipelineItem = {
  facultyId: string;
  facultyName: string;
  rank: string;
  department: string;
  contractEndDate: Date;
  daysUntilExpiry: number;
  riskLevel: string;
  recommendation: string | null;
  lastAppraisalScore: number | null;
};
