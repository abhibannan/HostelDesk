import { Router } from "express";
import { z } from "zod";
import { db } from "../../config/firebase.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireHostelAccess } from "../../middleware/hostel-access.middleware.js";
import { writeAuditLog } from "../../utils/audit.js";

const router = Router();

const createRepairSchema = z.object({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().min(2).max(2000),
  priority: z
    .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
    .optional(),
  roomId: z.string().min(1).optional(),
  bedId: z.string().min(1).optional(),
});

const updateRepairSchema = z.object({
  title: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().min(2).max(2000).optional(),
  priority: z
    .enum(["LOW", "MEDIUM", "HIGH", "URGENT"])
    .optional(),
  status: z
    .enum([
      "SUBMITTED",
      "IN_PROGRESS",
      "RESOLVED",
      "CANCELLED",
    ])
    .optional(),
  adminNotes: z.string().trim().max(2000).optional(),
});

// Create repair request
router.post(
  "/:hostelId/repairs",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      if (
        req.authUser?.role !== "RENTER" &&
        req.authUser?.role !== "ADMIN" &&
        req.authUser?.role !== "SUPER_ADMIN"
      ) {
        res.status(403).json({ message: "Access denied" });
        return;
      }

      const hostelId = req.params.hostelId;

      if (typeof hostelId !== "string") {
        res.status(400).json({
          message: "Invalid hostel ID",
        });
        return;
      }

      const parsed = createRepairSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          message: "Invalid repair request data",
          errors: parsed.error.flatten(),
        });
        return;
      }

      let renterId: string | null = null;

      if (req.authUser.role === "RENTER") {
        const renterSnapshot = await db
          .collection("renters")
          .where("userId", "==", req.authUser.id)
          .where("hostelId", "==", hostelId)
          .where("status", "==", "ACTIVE")
          .limit(1)
          .get();

        const renterDoc = renterSnapshot.docs[0];

        if (!renterDoc) {
          res.status(403).json({
            message:
              "You are not an active renter in this hostel",
          });
          return;
        }

        renterId = renterDoc.id;
      } else if (req.body.renterId) {
        renterId = String(req.body.renterId);

        const renter = await db
          .collection("renters")
          .doc(renterId)
          .get();

        if (
          !renter.exists ||
          renter.data()?.hostelId !== hostelId
        ) {
          res.status(404).json({
            message: "Renter not found",
          });
          return;
        }
      }

      if (!renterId) {
        res.status(400).json({
          message: "Renter is required",
        });
        return;
      }

      const renter = await db
        .collection("renters")
        .doc(renterId)
        .get();

      if (!renter.exists) {
        res.status(404).json({
          message: "Renter not found",
        });
        return;
      }

      const renterData = renter.data();

      const roomId =
        parsed.data.roomId ??
        (renterData?.roomId
          ? String(renterData.roomId)
          : null);

      const bedId =
        parsed.data.bedId ??
        (renterData?.bedId
          ? String(renterData.bedId)
          : null);

      const repairRef = db
        .collection("repairs")
        .doc();

      const now = new Date().toISOString();

      const repair = {
        id: repairRef.id,
        hostelId,
        renterId,
        roomId,
        bedId,
        title: parsed.data.title,
        description: parsed.data.description,
        priority: parsed.data.priority ?? "MEDIUM",
        status: "SUBMITTED",
        adminNotes: null,
        createdAt: now,
        updatedAt: now,
        resolvedAt: null,
      };

      await repairRef.set(repair);

      await writeAuditLog({
        actorId: req.authUser.id,
        action: "CREATE_REPAIR_REQUEST",
        entityType: "REPAIR",
        entityId: repairRef.id,
        metadata: {
          hostelId,
          renterId,
          roomId,
          bedId,
          priority: repair.priority,
        },
      });

      res.status(201).json({
        message: "Repair request created successfully",
        repair,
      });
    } catch (error) {
      next(error);
    }
  },
);

// List repair requests for hostel
router.get(
  "/:hostelId/repairs",
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
        .collection("repairs")
        .where("hostelId", "==", hostelId)
        .get();

      const repairs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.json({ repairs });
    } catch (error) {
      next(error);
    }
  },
);

// List repair requests for current renter
router.get(
  "/:hostelId/my-repairs",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      if (req.authUser?.role !== "RENTER") {
        res.status(403).json({
          message: "Only renters can use this endpoint",
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

      const renterSnapshot = await db
        .collection("renters")
        .where("userId", "==", req.authUser.id)
        .where("hostelId", "==", hostelId)
        .limit(1)
        .get();

      const renterDoc = renterSnapshot.docs[0];

      if (!renterDoc) {
        res.status(403).json({
          message: "Renter profile not found",
        });
        return;
      }

      const renterId = renterDoc.id;

      const snapshot = await db
        .collection("repairs")
        .where("hostelId", "==", hostelId)
        .where("renterId", "==", renterId)
        .get();

      const repairs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.json({ repairs });
    } catch (error) {
      next(error);
    }
  },
);

// Get one repair
router.get(
  "/:hostelId/repairs/:repairId",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      const hostelId = req.params.hostelId;
      const repairId = req.params.repairId;

      if (
        typeof hostelId !== "string" ||
        typeof repairId !== "string"
      ) {
        res.status(400).json({
          message: "Invalid ID",
        });
        return;
      }

      const repair = await db
        .collection("repairs")
        .doc(repairId)
        .get();

      if (
        !repair.exists ||
        repair.data()?.hostelId !== hostelId
      ) {
        res.status(404).json({
          message: "Repair request not found",
        });
        return;
      }

      const data = repair.data();

      if (req.authUser?.role === "RENTER") {
        const renter = await db
          .collection("renters")
          .doc(String(data?.renterId))
          .get();

        if (
          !renter.exists ||
          renter.data()?.userId !== req.authUser.id
        ) {
          res.status(403).json({
            message: "Access denied",
          });
          return;
        }
      }

      res.json({
        repair: {
          id: repair.id,
          ...data,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Update repair
router.patch(
  "/:hostelId/repairs/:repairId",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      if (
        req.authUser?.role !== "SUPER_ADMIN" &&
        req.authUser?.role !== "ADMIN"
      ) {
        res.status(403).json({
          message:
            "Only Admin can update repair requests",
        });
        return;
      }

      const hostelId = req.params.hostelId;
      const repairId = req.params.repairId;

      if (
        typeof hostelId !== "string" ||
        typeof repairId !== "string"
      ) {
        res.status(400).json({
          message: "Invalid ID",
        });
        return;
      }

      const parsed = updateRepairSchema.safeParse(
        req.body,
      );

      if (!parsed.success) {
        res.status(400).json({
          message: "Invalid repair data",
          errors: parsed.error.flatten(),
        });
        return;
      }

      const repairRef = db
        .collection("repairs")
        .doc(repairId);

      const repair = await repairRef.get();

      if (
        !repair.exists ||
        repair.data()?.hostelId !== hostelId
      ) {
        res.status(404).json({
          message: "Repair request not found",
        });
        return;
      }

      const updateData: Record<string, unknown> = {
        ...parsed.data,
        updatedAt: new Date().toISOString(),
      };

      if (parsed.data.status === "RESOLVED") {
        updateData.resolvedAt =
          new Date().toISOString();
      }

      await repairRef.update(updateData);

      const updated = await repairRef.get();

      await writeAuditLog({
        actorId: req.authUser.id,
        action: "UPDATE_REPAIR_REQUEST",
        entityType: "REPAIR",
        entityId: repairId,
        metadata: parsed.data,
      });

      res.json({
        message:
          "Repair request updated successfully",
        repair: {
          id: updated.id,
          ...updated.data(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;