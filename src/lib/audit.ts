import { prisma } from "./db";
import { Prisma } from "@prisma/client";

export async function createAuditLog(
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  options?: {
    oldValues?: Prisma.InputJsonValue;
    newValues?: Prisma.InputJsonValue;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        oldValues: options?.oldValues ?? Prisma.JsonNull,
        newValues: options?.newValues ?? Prisma.JsonNull,
        ipAddress: options?.ipAddress ?? null,
        userAgent: options?.userAgent ?? null,
      },
    });
  } catch {
    // Audit log failures should not break the main flow
    console.error("Audit log write failed", { userId, action, entity, entityId });
  }
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
  link?: string,
  metadata?: Prisma.InputJsonValue
) {
  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      link: link ?? null,
      metadata: metadata ?? Prisma.JsonNull,
    },
  });
}
