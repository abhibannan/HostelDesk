import { db } from "../config/firebase.js";

export interface AuditLogEntry {
  id?: string;
  hostelId: string;
  userId?: string;
  userEmail?: string;
  role?: string;
  action: string;
  targetName?: string;
  details?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export async function logAuditEvent(entry: Omit<AuditLogEntry, "createdAt">): Promise<void> {
  try {
    const docData: AuditLogEntry = {
      ...entry,
      createdAt: new Date().toISOString(),
    };
    await db.collection("auditLogs").add(docData);
  } catch (error) {
    console.error("[AuditLogService] Failed to record audit entry:", error);
  }
}

export async function getAuditLogsForHostel(hostelId: string, limitCount = 50): Promise<AuditLogEntry[]> {
  try {
    const query = db
      .collection("auditLogs")
      .where("metadata.hostelId", "==", hostelId)
      .limit(limitCount);

    const snapshot = await query.get();
    const logs: AuditLogEntry[] = [];

    snapshot.forEach((doc: any) => {
      const data = doc.data() as Omit<AuditLogEntry, "id">;
      logs.push({
        id: doc.id,
        ...data,
      });
    });

    logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return logs;
  } catch (error) {
    console.error("[AuditLogService] Failed to fetch audit logs:", error);
    return [];
  }
}
