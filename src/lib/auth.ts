import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { UserRole } from "@prisma/client";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: {
      facultyProfile: {
        include: {
          department: true,
          division: true,
        },
      },
    },
  });
}

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  FACULTY: [
    "profile:read",
    "profile:update:own",
    "appraisal:read:own",
    "appraisal:self-assess",
    "document:upload:own",
    "contract:read:own",
    "promotion:read:own",
    "notification:read:own",
  ],
  DEPARTMENT_CHAIR: [
    "profile:read",
    "profile:update:own",
    "profile:read:department",
    "appraisal:read:department",
    "appraisal:review:department",
    "appraisal:create",
    "appraisal:self-assess",
    "document:upload:own",
    "contract:read:department",
    "contract:recommend:department",
    "promotion:read:department",
    "report:read:department",
    "notification:read:own",
  ],
  DIVISION_DEAN: [
    "profile:read",
    "profile:read:division",
    "appraisal:read:division",
    "appraisal:review:division",
    "appraisal:create",
    "document:read:division",
    "contract:read:division",
    "contract:recommend:division",
    "promotion:read:division",
    "promotion:approve",
    "report:read:division",
    "notification:read:own",
  ],
  HR_ADMIN: [
    "profile:read:all",
    "profile:create",
    "profile:update:all",
    "appraisal:read:all",
    "appraisal:create",
    "appraisal:finalize",
    "document:read:all",
    "contract:read:all",
    "contract:create",
    "contract:update",
    "promotion:read:all",
    "promotion:approve",
    "report:read:all",
    "report:export",
    "admin:users",
    "admin:rubrics",
    "admin:settings",
    "notification:send",
    "audit:read",
  ],
  REVIEW_COMMITTEE: [
    "profile:read:all",
    "appraisal:read:all",
    "appraisal:review:committee",
    "document:read:all",
    "contract:read:all",
    "promotion:read:all",
    "promotion:review",
    "report:read:all",
    "notification:read:own",
  ],
  PROVOST: [
    "profile:read:all",
    "appraisal:read:all",
    "appraisal:review:provost",
    "appraisal:override",
    "appraisal:finalize",
    "document:read:all",
    "contract:read:all",
    "contract:recommend:all",
    "contract:override",
    "promotion:read:all",
    "promotion:approve",
    "promotion:override",
    "report:read:all",
    "report:export",
    "notification:send",
    "audit:read",
  ],
};

export function hasPermission(
  userRole: UserRole,
  permission: string
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] ?? [];
  return (
    permissions.includes(permission) ||
    permissions.some((p) => {
      const pattern = p.replace(":all", ":.+").replace(":own", ":.+");
      return new RegExp(`^${pattern}$`).test(permission);
    })
  );
}
