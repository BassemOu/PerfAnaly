import { UserRole, AcademicRank } from "@prisma/client";

export const APP_NAME = "PerfAppraisal Academic";
export const APP_SHORT_NAME = "PAA";

export const ROLE_LABELS: Record<UserRole, string> = {
  FACULTY: "Faculty Member",
  DEPARTMENT_CHAIR: "Department Chair",
  DIVISION_DEAN: "Division Dean",
  HR_ADMIN: "HR Administrator",
  REVIEW_COMMITTEE: "Review Committee",
  PROVOST: "Provost's Office",
};

export const RANK_LABELS: Record<AcademicRank, string> = {
  INSTRUCTOR: "Instructor",
  ASSISTANT_PROFESSOR: "Assistant Professor",
  ASSOCIATE_PROFESSOR: "Associate Professor",
  PROFESSOR: "Professor",
  DISTINGUISHED_PROFESSOR: "Distinguished Professor",
  LECTURER: "Lecturer",
  SENIOR_LECTURER: "Senior Lecturer",
  ADJUNCT: "Adjunct",
};

export const RANK_ORDER: AcademicRank[] = [
  "INSTRUCTOR",
  "LECTURER",
  "SENIOR_LECTURER",
  "ADJUNCT",
  "ASSISTANT_PROFESSOR",
  "ASSOCIATE_PROFESSOR",
  "PROFESSOR",
  "DISTINGUISHED_PROFESSOR",
];

export const APPRAISAL_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SELF_ASSESSMENT_PENDING: "Self-Assessment Pending",
  SELF_ASSESSMENT_SUBMITTED: "Self-Assessment Submitted",
  CHAIR_REVIEW_PENDING: "Chair Review Pending",
  CHAIR_REVIEW_SUBMITTED: "Chair Review Submitted",
  DEAN_REVIEW_PENDING: "Dean Review Pending",
  DEAN_REVIEW_SUBMITTED: "Dean Review Submitted",
  COMMITTEE_REVIEW_PENDING: "Committee Review Pending",
  COMMITTEE_REVIEW_SUBMITTED: "Committee Review Submitted",
  PROVOST_REVIEW_PENDING: "Provost Review Pending",
  PROVOST_REVIEW_SUBMITTED: "Provost Review Submitted",
  HR_FINAL_REVIEW: "HR Final Review",
  COMPLETED: "Completed",
  REVISION_REQUESTED: "Revision Requested",
};

export const APPRAISAL_STATUS_COLORS: Record<string, string> = {
  DRAFT: "gray",
  SELF_ASSESSMENT_PENDING: "yellow",
  SELF_ASSESSMENT_SUBMITTED: "blue",
  CHAIR_REVIEW_PENDING: "purple",
  CHAIR_REVIEW_SUBMITTED: "purple",
  DEAN_REVIEW_PENDING: "indigo",
  DEAN_REVIEW_SUBMITTED: "indigo",
  COMMITTEE_REVIEW_PENDING: "orange",
  COMMITTEE_REVIEW_SUBMITTED: "orange",
  PROVOST_REVIEW_PENDING: "cyan",
  PROVOST_REVIEW_SUBMITTED: "cyan",
  HR_FINAL_REVIEW: "teal",
  COMPLETED: "green",
  REVISION_REQUESTED: "red",
};

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  EXPIRED: "Expired",
  PENDING_RENEWAL: "Pending Renewal",
  RENEWED: "Renewed",
  TERMINATED: "Terminated",
  ON_HOLD: "On Hold",
  DEFERRED: "Deferred",
};

export const RENEWAL_RECOMMENDATION_LABELS: Record<string, string> = {
  RENEW: "Renew",
  RENEW_WITH_CONDITIONS: "Renew with Conditions",
  DEFER: "Defer Decision",
  DO_NOT_RENEW: "Do Not Renew",
};

export const RENEWAL_RECOMMENDATION_COLORS: Record<string, string> = {
  RENEW: "green",
  RENEW_WITH_CONDITIONS: "yellow",
  DEFER: "orange",
  DO_NOT_RENEW: "red",
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PUBLICATION: "Publication",
  GRANT: "Grant / Funding",
  STUDENT_FEEDBACK: "Student Feedback",
  COMMITTEE_CERTIFICATE: "Committee Certificate",
  CERTIFICATION: "Certification / License",
  AWARD: "Award / Recognition",
  CONFERENCE_PAPER: "Conference Paper",
  COURSE_MATERIAL: "Course Material",
  COMMUNITY_SERVICE: "Community Service",
  OTHER: "Other",
};

export const DEFAULT_KPI_CATEGORIES = [
  {
    name: "Teaching Effectiveness",
    weight: 40,
    kpis: [
      { name: "Course Delivery Quality", weight: 25, maxScore: 5 },
      { name: "Student Outcomes", weight: 25, maxScore: 5 },
      { name: "Curriculum Development", weight: 20, maxScore: 5 },
      { name: "Student Advising", weight: 15, maxScore: 5 },
      { name: "Teaching Innovation", weight: 15, maxScore: 5 },
    ],
  },
  {
    name: "Research & Scholarship",
    weight: 30,
    kpis: [
      { name: "Publications (Peer-Reviewed)", weight: 35, maxScore: 5 },
      { name: "Research Grants", weight: 25, maxScore: 5 },
      { name: "Conference Presentations", weight: 20, maxScore: 5 },
      { name: "Citations & Impact", weight: 20, maxScore: 5 },
    ],
  },
  {
    name: "Service & Community Engagement",
    weight: 20,
    kpis: [
      { name: "Institutional Committees", weight: 30, maxScore: 5 },
      { name: "Professional Service", weight: 25, maxScore: 5 },
      { name: "Community Outreach", weight: 25, maxScore: 5 },
      { name: "Student Organizations", weight: 20, maxScore: 5 },
    ],
  },
  {
    name: "Professional Development",
    weight: 10,
    kpis: [
      { name: "Training & Certifications", weight: 40, maxScore: 5 },
      { name: "Professional Memberships", weight: 30, maxScore: 5 },
      { name: "Leadership Development", weight: 30, maxScore: 5 },
    ],
  },
];

// ── Performance Review (matches KU Sample Performance Form 2025) ─────────────
export const PERFORMANCE_RATING_LABELS: Record<string, string> = {
  OUTSTANDING: "Outstanding",
  EXCEEDS_EXPECTATIONS: "Exceeds Expectations",
  MEETS_EXPECTATIONS: "Meets Expectations",
  DOES_NOT_MEET_EXPECTATIONS: "Does Not Meet Expectations",
};

export const PERFORMANCE_RATING_COLORS: Record<string, string> = {
  OUTSTANDING: "purple",
  EXCEEDS_EXPECTATIONS: "green",
  MEETS_EXPECTATIONS: "blue",
  DOES_NOT_MEET_EXPECTATIONS: "red",
};

// Workflow stages matching the KU form:
// Faculty Endorsement → Chair Review → Chair Approval → Dean Approval → Coordinator/HR → Manager → Complete
export const REVIEW_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  FACULTY_SUBMITTED: "Faculty Endorsed",
  CHAIR_REVIEW: "Chair Review",
  DEAN_APPROVED: "Dean Approved",
  MANAGER_PENDING: "HR / Coordinator Pending",
  HR_COMPLETED: "Manager Pending",
  COMPLETED: "Completed",
};

export const REVIEW_STATUS_COLORS: Record<string, string> = {
  DRAFT: "gray",
  FACULTY_SUBMITTED: "yellow",
  CHAIR_REVIEW: "purple",
  DEAN_APPROVED: "indigo",
  MANAGER_PENDING: "orange",
  HR_COMPLETED: "teal",
  COMPLETED: "green",
};

export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const MAX_FILE_SIZE_BYTES =
  (parseInt(process.env.MAX_FILE_SIZE_MB ?? "10") || 10) * 1024 * 1024;

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
};

export const RENEWAL_ALERT_DAYS = {
  CRITICAL: 30,
  WARNING: 60,
  NOTICE: 90,
};

export const WORKFLOW_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SELF_ASSESSMENT_PENDING"],
  SELF_ASSESSMENT_PENDING: ["SELF_ASSESSMENT_SUBMITTED", "REVISION_REQUESTED"],
  SELF_ASSESSMENT_SUBMITTED: ["CHAIR_REVIEW_PENDING", "REVISION_REQUESTED"],
  CHAIR_REVIEW_PENDING: ["CHAIR_REVIEW_SUBMITTED", "REVISION_REQUESTED"],
  CHAIR_REVIEW_SUBMITTED: ["DEAN_REVIEW_PENDING", "REVISION_REQUESTED"],
  DEAN_REVIEW_PENDING: ["DEAN_REVIEW_SUBMITTED", "REVISION_REQUESTED"],
  DEAN_REVIEW_SUBMITTED: ["COMMITTEE_REVIEW_PENDING", "PROVOST_REVIEW_PENDING"],
  COMMITTEE_REVIEW_PENDING: ["COMMITTEE_REVIEW_SUBMITTED", "REVISION_REQUESTED"],
  COMMITTEE_REVIEW_SUBMITTED: ["PROVOST_REVIEW_PENDING"],
  PROVOST_REVIEW_PENDING: ["PROVOST_REVIEW_SUBMITTED", "REVISION_REQUESTED"],
  PROVOST_REVIEW_SUBMITTED: ["HR_FINAL_REVIEW", "COMPLETED"],
  HR_FINAL_REVIEW: ["COMPLETED", "REVISION_REQUESTED"],
  REVISION_REQUESTED: ["SELF_ASSESSMENT_PENDING", "CHAIR_REVIEW_PENDING"],
  COMPLETED: [],
};
