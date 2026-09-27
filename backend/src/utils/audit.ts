import { FieldValue } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";

export interface AuditLogData {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function writeAuditLog(
  data: AuditLogData,
): Promise<void> {
  await db.collection("auditLogs").add({
    actorId: data.actorId ?? null,
    action: data.action,
    entityType: data.entityType,
    entityId: data.entityId ?? null,
    metadata: data.metadata ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });
}