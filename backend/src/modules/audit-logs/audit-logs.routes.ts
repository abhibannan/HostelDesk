import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { requireHostelAccess } from "../../middleware/hostel-access.middleware.js";
import { db } from "../../config/firebase.js";
import { writeAuditLog } from "../../utils/audit.js";

const router = Router({ mergeParams: true });

// Get audit logs for a hostel
router.get(
  "/:hostelId/audit-logs",
  authMiddleware,
  requireHostelAccess,
  async (req, res) => {
    try {
      const hostelId = req.params.hostelId as string;
      const limitCount = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      // Query audit logs
      const snapshot = await db
        .collection("auditLogs")
        .limit(limitCount * 2)
        .get();

      const logs: any[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        const matchesHostel =
          d.metadata?.hostelId === hostelId ||
          d.entityId === hostelId ||
          !d.metadata?.hostelId; // Include general events if relevant

        if (matchesHostel) {
          logs.push({
            id: doc.id,
            action: d.action,
            entityType: d.entityType,
            entityId: d.entityId,
            actorId: d.actorId,
            metadata: d.metadata,
            createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt || new Date().toISOString(),
          });
        }
      });

      logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json({ logs: logs.slice(0, limitCount) });
    } catch (error) {
      console.error("[AuditLogRoute] Failed to fetch audit logs:", error);
      res.status(500).json({ message: "Failed to retrieve audit logs" });
    }
  }
);

// Manually log an action from client
router.post(
  "/:hostelId/audit-logs",
  authMiddleware,
  requireHostelAccess,
  async (req, res) => {
    try {
      const hostelId = req.params.hostelId as string;
      const { action, entityType = "APP", entityId, metadata } = req.body;

      if (!action) {
        return res.status(400).json({ message: "Action is required" });
      }

      await writeAuditLog({
        actorId: req.authUser?.id ?? null,
        action,
        entityType,
        entityId: entityId || hostelId,
        metadata: {
          hostelId,
          userEmail: req.authUser?.email,
          role: req.authUser?.role,
          ...metadata,
        },
      });

      res.status(201).json({ success: true });
    } catch (error) {
      console.error("[AuditLogRoute] Failed to write audit log:", error);
      res.status(500).json({ message: "Failed to record audit log" });
    }
  }
);

export default router;
