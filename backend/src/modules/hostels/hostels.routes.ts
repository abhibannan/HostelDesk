import { Router } from "express";
import { z } from "zod";
import { db } from "../../config/firebase.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireHostelAccess } from "../../middleware/hostel-access.middleware.js";
import { writeAuditLog } from "../../utils/audit.js";

const router = Router();

const hostelSchema = z.object({
  name: z.string().trim().min(2).max(150),
  type: z.string().trim().max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(20).optional(),
  contactPhone: z.string().trim().max(30).optional(),
  contactEmail: z.string().trim().email().max(255).optional(),
});

const updateHostelSchema = hostelSchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

router.post("/", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser?.role !== "SUPER_ADMIN") {
      res.status(403).json({
        message: "Only Super Admin can create hostels",
      });
      return;
    }

    const parsed = hostelSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid hostel data",
        errors: parsed.error.flatten(),
      });
      return;
    }

    const ref = db.collection("hostels").doc();
    const now = new Date().toISOString();

    const hostel = {
      id: ref.id,
      ownerId: req.authUser.id,
      ...parsed.data,
      status: "ACTIVE" as const,
      createdAt: now,
      updatedAt: now,
    };

    await ref.set(hostel);

    await writeAuditLog({
      actorId: req.authUser.id,
      action: "CREATE_HOSTEL",
      entityType: "HOSTEL",
      entityId: ref.id,
    });

    res.status(201).json({
      message: "Hostel created successfully",
      hostel,
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/",
  requireAuth,
  async (req, res, next) => {
    try {
      if (!req.authUser) {
        res.status(401).json({
          message: "StayNexa user profile required",
        });
        return;
      }

      if (req.authUser.role === "SUPER_ADMIN") {
        const snapshot = await db
          .collection("hostels")
          .where("ownerId", "==", req.authUser.id)
          .get();

        const hostels = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        res.json({ hostels });
        return;
      }

      if (req.authUser.role === "ADMIN") {
        const assignments = await db
          .collection("hostelAdmins")
          .where("adminId", "==", req.authUser.id)
          .get();

        const hostelIds = assignments.docs
          .map((doc) => String(doc.data().hostelId ?? doc.id))
          .filter(Boolean);

        if (hostelIds.length === 0) {
          res.json({ hostels: [] });
          return;
        }

        const hostelSnapshots = await Promise.all(
          hostelIds.map((hostelId) =>
            db.collection("hostels").doc(hostelId).get(),
          ),
        );

        const hostels = hostelSnapshots
          .filter((doc) => doc.exists)
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

        res.json({ hostels });
        return;
      }

      if (req.authUser.role === "RENTER") {
        const renterSnapshot = await db
          .collection("renters")
          .where("userId", "==", req.authUser.id)
          .where("status", "==", "ACTIVE")
          .limit(1)
          .get();

        if (renterSnapshot.empty) {
          res.json({ hostels: [] });
          return;
        }

        const renterDoc = renterSnapshot.docs[0];

        if (!renterDoc) {
          res.json({ hostels: [] });
          return;
        }

        const hostelId = renterDoc.data().hostelId;

        if (!hostelId) {
          res.json({ hostels: [] });
          return;
        }

        const hostelSnapshot = await db
          .collection("hostels")
          .doc(String(hostelId))
          .get();

        if (!hostelSnapshot.exists) {
          res.json({ hostels: [] });
          return;
        }

        res.json({
          hostels: [
            {
              id: hostelSnapshot.id,
              ...hostelSnapshot.data(),
            },
          ],
        });
        return;
      }

      res.status(403).json({
        message: "Invalid user role",
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/:hostelId",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      const hostelId = req.params.hostelId;

      if (typeof hostelId !== "string") {
        res.status(400).json({
          message: "Invalid hostel ID",
        });
        return;
      }

      const snapshot = await db
        .collection("hostels")
        .doc(hostelId)
        .get();

      if (!snapshot.exists) {
        res.status(404).json({
          message: "Hostel not found",
        });
        return;
      }

      res.json({
        hostel: {
          id: snapshot.id,
          ...snapshot.data(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/:hostelId",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      if (req.authUser?.role !== "SUPER_ADMIN") {
        res.status(403).json({
          message: "Only Super Admin can update hostels",
        });
        return;
      }

      const hostelId = req.params.hostelId;

      if (typeof hostelId !== "string") {
        res.status(400).json({
          message: "Invalid hostel ID",
        });
        return;
      }

      const parsed = updateHostelSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          message: "Invalid hostel data",
          errors: parsed.error.flatten(),
        });
        return;
      }

      const ref = db.collection("hostels").doc(hostelId);

      const existing = await ref.get();

      if (!existing.exists) {
        res.status(404).json({
          message: "Hostel not found",
        });
        return;
      }

      await ref.update({
        ...parsed.data,
        updatedAt: new Date().toISOString(),
      });

      const updated = await ref.get();

      await writeAuditLog({
        actorId: req.authUser.id,
        action: "UPDATE_HOSTEL",
        entityType: "HOSTEL",
        entityId: hostelId,
        metadata: parsed.data,
      });

      res.json({
        message: "Hostel updated successfully",
        hostel: {
          id: updated.id,
          ...updated.data(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:hostelId/admin",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      if (req.authUser?.role !== "SUPER_ADMIN") {
        res.status(403).json({
          message: "Only Super Admin can assign admins",
        });
        return;
      }

      const parsed = z
        .object({
          adminId: z.string().min(1),
        })
        .safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          message: "adminId is required",
        });
        return;
      }

      const hostelId = req.params.hostelId;

      if (typeof hostelId !== "string") {
        res.status(400).json({
          message: "Invalid hostel ID",
        });
        return;
      }

      const hostel = await db
        .collection("hostels")
        .doc(hostelId)
        .get();

      if (!hostel.exists) {
        res.status(404).json({
          message: "Hostel not found",
        });
        return;
      }

      const adminRef = db
        .collection("users")
        .doc(parsed.data.adminId);

      const admin = await adminRef.get();

      if (
        !admin.exists ||
        admin.data()?.role !== "ADMIN" ||
        admin.data()?.status !== "ACTIVE"
      ) {
        res.status(400).json({
          message: "Active Admin not found",
        });
        return;
      }

      const assignmentRef = db
        .collection("hostelAdmins")
        .doc(hostelId);

      const previous = await assignmentRef.get();

      if (
        previous.exists &&
        previous.data()?.adminId === parsed.data.adminId
      ) {
        res.status(409).json({
          message: "Admin is already assigned to this hostel",
        });
        return;
      }

      const now = new Date().toISOString();
      const batch = db.batch();

      if (previous.exists) {
        const previousHistoryId =
          previous.data()?.historyId as string | undefined;

        if (previousHistoryId) {
          batch.update(
            db
              .collection("hostelAdminHistory")
              .doc(previousHistoryId),
            {
              removedAt: now,
            },
          );
        }
      }

      const historyRef = db
        .collection("hostelAdminHistory")
        .doc();

      batch.set(historyRef, {
        id: historyRef.id,
        hostelId,
        adminId: parsed.data.adminId,
        assignedAt: now,
        removedAt: null,
      });

      batch.set(assignmentRef, {
        hostelId,
        adminId: parsed.data.adminId,
        assignedAt: now,
        updatedAt: now,
        historyId: historyRef.id,
      });

      await batch.commit();

      await writeAuditLog({
        actorId: req.authUser.id,
        action: "ASSIGN_HOSTEL_ADMIN",
        entityType: "HOSTEL",
        entityId: hostelId,
        metadata: {
          adminId: parsed.data.adminId,
        },
      });

      res.status(201).json({
        message: "Admin assigned successfully",
        assignment: {
          hostelId,
          adminId: parsed.data.adminId,
          assignedAt: now,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:hostelId/admin",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      if (req.authUser?.role !== "SUPER_ADMIN") {
        res.status(403).json({
          message: "Only Super Admin can remove admins",
        });
        return;
      }

      const hostelId = req.params.hostelId;

      if (typeof hostelId !== "string") {
        res.status(400).json({
          message: "Invalid hostel ID",
        });
        return;
      }

      const assignmentRef = db
        .collection("hostelAdmins")
        .doc(hostelId);

      const assignment = await assignmentRef.get();

      if (!assignment.exists) {
        res.status(404).json({
          message: "No Admin is assigned to this hostel",
        });
        return;
      }

      const now = new Date().toISOString();

      const historyId =
        assignment.data()?.historyId as string | undefined;

      const batch = db.batch();

      if (historyId) {
        batch.update(
          db
            .collection("hostelAdminHistory")
            .doc(historyId),
          {
            removedAt: now,
          },
        );
      }

      batch.delete(assignmentRef);

      await batch.commit();

      await writeAuditLog({
        actorId: req.authUser.id,
        action: "REMOVE_HOSTEL_ADMIN",
        entityType: "HOSTEL",
        entityId: hostelId,
      });

      res.json({
        message: "Admin removed successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/:hostelId/admin/history",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      const hostelId = req.params.hostelId;

      if (typeof hostelId !== "string") {
        res.status(400).json({
          message: "Invalid hostel ID",
        });
        return;
      }

      const snapshot = await db
        .collection("hostelAdminHistory")
        .where("hostelId", "==", hostelId)
        .get();

      type AdminHistory = {
        id: string;
        hostelId: string;
        adminId: string;
        assignedAt: string;
        removedAt: string | null;
      };

      const history: AdminHistory[] = snapshot.docs.map((doc) => {
        const data = doc.data();

        return {
          id: doc.id,
          hostelId: String(data.hostelId ?? ""),
          adminId: String(data.adminId ?? ""),
          assignedAt: String(data.assignedAt ?? ""),
          removedAt:
            data.removedAt === null || data.removedAt === undefined
              ? null
              : String(data.removedAt),
        };
      });

      history.sort((a, b) =>
        b.assignedAt.localeCompare(a.assignedAt),
      );

      res.json({
        history,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;