import { z } from "zod";
import { AcademicRank, EmploymentType, UserRole } from "@prisma/client";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
  role: z.nativeEnum(UserRole),
});

export const facultyProfileSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  middleName: z.string().max(100).optional(),
  title: z.string().max(50).optional(),
  rank: z.nativeEnum(AcademicRank),
  departmentId: z.string().cuid("Invalid department"),
  divisionId: z.string().cuid("Invalid division"),
  specialization: z.array(z.string()).min(1, "At least one specialization"),
  employmentType: z.nativeEnum(EmploymentType),
  hireDate: z.string().datetime(),
  tenureDate: z.string().datetime().optional(),
  bio: z.string().max(2000).optional(),
  officeLocation: z.string().max(200).optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, "Invalid phone number")
    .optional(),
  orcidId: z.string().max(50).optional(),
});

export const appraisalCreateSchema = z.object({
  facultyId: z.string().cuid(),
  rubricId: z.string().cuid(),
  contractId: z.string().cuid().optional(),
  period: z.enum([
    "ANNUAL",
    "SEMESTER_FALL",
    "SEMESTER_SPRING",
    "SEMESTER_SUMMER",
    "MID_YEAR",
  ]),
  academicYear: z
    .string()
    .regex(/^\d{4}-\d{4}$/, "Format: 2024-2025"),
  dueDate: z.string().datetime().optional(),
});

export const appraisalScoreSchema = z.object({
  categoryId: z.string().cuid(),
  selfScore: z.number().min(0).max(100).optional(),
  reviewerScore: z.number().min(0).max(100).optional(),
  selfComments: z.string().max(2000).optional(),
  reviewerComments: z.string().max(2000).optional(),
});

export const selfAssessmentSchema = z.object({
  selfAssessmentNarrative: z.string().min(50, "Narrative must be at least 50 characters").max(5000),
  scores: z.array(appraisalScoreSchema),
});

export const contractSchema = z.object({
  facultyId: z.string().cuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  position: z.string().min(1).max(200),
  salary: z.number().positive().optional(),
  terms: z.string().max(5000).optional(),
  notes: z.string().max(2000).optional(),
});

export const rubricSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  version: z.string().default("1.0"),
  applicableTo: z.array(z.nativeEnum(AcademicRank)),
  categories: z.array(
    z.object({
      name: z.string().min(1).max(200),
      description: z.string().max(500).optional(),
      weight: z.number().min(0).max(100),
      order: z.number().int().min(0),
      kpis: z.array(
        z.object({
          name: z.string().min(1).max(200),
          description: z.string().max(500).optional(),
          weight: z.number().min(0).max(100),
          maxScore: z.number().min(1).max(100),
          evidenceRequired: z.boolean().default(false),
          order: z.number().int().min(0),
        })
      ),
    })
  ),
});

export const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(2000),
  isInternal: z.boolean().default(false),
  parentId: z.string().cuid().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type FacultyProfileInput = z.infer<typeof facultyProfileSchema>;
export type AppraisalCreateInput = z.infer<typeof appraisalCreateSchema>;
export type ContractInput = z.infer<typeof contractSchema>;
export type RubricInput = z.infer<typeof rubricSchema>;
