import { Router } from "express";
import { z } from "zod";
import { db, firebaseAuth } from "../../config/firebase.js";
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
  assignedTo: z.string().trim().max(100).optional(),
  assignedRepairPersonId: z.string().trim().max(100).optional(),
});

const createRepairPersonSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().toLowerCase(),
  phone: z.string().trim().min(5).max(30),
  specialty: z.string().trim().min(2).max(100).optional().default("General Maintenance"),
  password: z.string().min(6).max(100).optional(),
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
        req.authUser?.role !== "ADMIN" &&
        req.authUser?.role !== "REPAIR_PERSON"
      ) {
        res.status(403).json({
          message:
            "Only Admin or Repair Personnel can update repair requests",
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

// Delete repair request
router.delete(
  "/:hostelId/repairs/:repairId",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      const hostelId = typeof req.params.hostelId === "string" ? req.params.hostelId : "";
      const repairId = typeof req.params.repairId === "string" ? req.params.repairId : "";

      if (!hostelId || !repairId) {
        res.status(400).json({ message: "Invalid ID parameters" });
        return;
      }

      const repairRef = db.collection("repairs").doc(repairId);
      const repairDoc = await repairRef.get();

      if (!repairDoc.exists || repairDoc.data()?.hostelId !== hostelId) {
        res.status(404).json({ message: "Repair request not found" });
        return;
      }

      const data = repairDoc.data();
      const isAdmin = req.authUser?.role === "ADMIN" || req.authUser?.role === "SUPER_ADMIN";

      if (!isAdmin) {
        // If renter, check ownership
        const renterSnap = await db
          .collection("renters")
          .where("userId", "==", req.authUser!.id)
          .where("hostelId", "==", hostelId)
          .limit(1)
          .get();
        const renterId = renterSnap.docs[0]?.id;
        if (!renterId || renterId !== data?.renterId) {
          res.status(403).json({ message: "Access denied" });
          return;
        }
      }

      await repairRef.delete();

      await writeAuditLog({
        actorId: req.authUser!.id,
        action: "DELETE_REPAIR_REQUEST",
        entityType: "REPAIR",
        entityId: repairId,
        metadata: { hostelId, title: data?.title },
      });

      res.json({ message: "Repair request deleted successfully", repairId });
    } catch (error) {
      next(error);
    }
  },
);

// List repair persons for hostel
router.get(
  "/:hostelId/repair-persons",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      const hostelId = req.params.hostelId;
      const snapshot = await db
        .collection("repairPersons")
        .where("hostelId", "==", hostelId)
        .get();

      const repairPersons = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.json({ repairPersons });
    } catch (error) {
      next(error);
    }
  },
);

// Add repair person for hostel
router.post(
  "/:hostelId/repair-persons",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      if (
        req.authUser?.role !== "SUPER_ADMIN" &&
        req.authUser?.role !== "ADMIN"
      ) {
        res.status(403).json({
          message: "Only Admin can add repair personnel",
        });
        return;
      }

      const hostelId = typeof req.params.hostelId === "string" ? req.params.hostelId : "";
      if (!hostelId) {
        res.status(400).json({ message: "Invalid hostel ID" });
        return;
      }
      const parsed = createRepairPersonSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          message: "Invalid repair person data",
          errors: parsed.error.flatten(),
        });
        return;
      }

      const { name, email, phone, specialty, password } = parsed.data;

      // 1. Get or create Firebase auth user
      let firebaseUser;
      try {
        try {
          firebaseUser = await firebaseAuth.getUserByEmail(email);
          if (password) {
            await firebaseAuth.updateUser(firebaseUser.uid, { password });
          }
        } catch (err: any) {
          if (err?.code === "auth/user-not-found") {
            firebaseUser = await firebaseAuth.createUser({
              email,
              password: password || "Repair@123",
              displayName: name,
            });
          } else {
            res.status(400).json({ message: err?.message || "Failed to verify user credentials" });
            return;
          }
        }
      } catch (err: any) {
        res.status(400).json({ message: err?.message || "Failed to setup user account" });
        return;
      }

      const now = new Date().toISOString();

      // 2. Ensure users collection doc exists
      const userRef = db.collection("users").doc(firebaseUser.uid);
      const userSnap = await userRef.get();

      if (userSnap.exists) {
        const uData = userSnap.data();
        const existingHostels: string[] = Array.isArray(uData?.hostelIds)
          ? (uData.hostelIds as string[])
          : [];
        if (!existingHostels.includes(hostelId)) {
          existingHostels.push(hostelId);
        }
        await userRef.update({
          hostelIds: existingHostels,
          phone: phone || uData?.phone,
          specialty: specialty || uData?.specialty,
          role: uData?.role === "SUPER_ADMIN" || uData?.role === "ADMIN" ? uData.role : "REPAIR_PERSON",
          updatedAt: now,
        });
      } else {
        await userRef.set({
          id: firebaseUser.uid,
          firebaseUid: firebaseUser.uid,
          email,
          firstName: name.split(" ")[0] || name,
          lastName: name.split(" ").slice(1).join(" ") || null,
          phone,
          profilePhotoUrl: null,
          role: "REPAIR_PERSON",
          status: "ACTIVE",
          hostelIds: [hostelId],
          specialty,
          createdAt: now,
          updatedAt: now,
        });
      }

      // 3. Upsert in repairPersons collection
      const rpExistingSnap = await db
        .collection("repairPersons")
        .where("hostelId", "==", hostelId)
        .where("email", "==", email)
        .limit(1)
        .get();

      let rpDocId = "";
      if (!rpExistingSnap.empty && rpExistingSnap.docs[0]) {
        rpDocId = rpExistingSnap.docs[0].id;
        await db.collection("repairPersons").doc(rpDocId).update({
          name,
          phone,
          specialty,
          userId: firebaseUser.uid,
          status: "ACTIVE",
          updatedAt: now,
        });
      } else {
        const rpRef = db.collection("repairPersons").doc();
        rpDocId = rpRef.id;
        await rpRef.set({
          id: rpDocId,
          hostelId,
          userId: firebaseUser.uid,
          name,
          email,
          phone,
          specialty,
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
        });
      }

      await writeAuditLog({
        actorId: req.authUser.id,
        action: "ADD_REPAIR_PERSON",
        entityType: "USER",
        entityId: firebaseUser.uid,
        metadata: {
          hostelId,
          email,
          phone,
          specialty,
        },
      });

      res.status(201).json({
        message: "Repair person added successfully",
        repairPerson: {
          id: rpDocId,
          hostelId,
          userId: firebaseUser.uid,
          name,
          email,
          phone,
          specialty,
          status: "ACTIVE",
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Delete repair person from hostel
router.delete(
  "/:hostelId/repair-persons/:personId",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      if (
        req.authUser?.role !== "SUPER_ADMIN" &&
        req.authUser?.role !== "ADMIN"
      ) {
        res.status(403).json({
          message: "Only Admin can remove repair personnel",
        });
        return;
      }

      const hostelId = typeof req.params.hostelId === "string" ? req.params.hostelId : "";
      const personId = typeof req.params.personId === "string" ? req.params.personId : "";
      if (!hostelId || !personId) {
        res.status(400).json({ message: "Invalid parameters" });
        return;
      }

      const rpRef = db.collection("repairPersons").doc(personId);
      const rpDoc = await rpRef.get();

      if (!rpDoc.exists || rpDoc.data()?.hostelId !== hostelId) {
        res.status(404).json({ message: "Repair person not found" });
        return;
      }

      await rpRef.delete();

      await writeAuditLog({
        actorId: req.authUser.id,
        action: "REMOVE_REPAIR_PERSON",
        entityType: "USER",
        entityId: personId,
        metadata: { hostelId },
      });

      res.json({ message: "Repair person removed successfully" });
    } catch (error) {
      next(error);
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// MAINTENANCE TASKS (Preventative Upkeep & Servicing)
// ─────────────────────────────────────────────────────────────────────────────

const createMaintenanceTaskSchema = z.object({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().min(2).max(100).optional().default("General Upkeep"),
  frequency: z.enum(["ONE_TIME", "WEEKLY", "MONTHLY", "QUARTERLY", "BIANNUAL", "ANNUAL"]).default("MONTHLY"),
  scheduledDate: z.string().min(1),
  assignedTo: z.string().trim().max(100).optional(),
  assignedPersonName: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const updateMaintenanceTaskSchema = z.object({
  title: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().min(2).max(100).optional(),
  frequency: z.enum(["ONE_TIME", "WEEKLY", "MONTHLY", "QUARTERLY", "BIANNUAL", "ANNUAL"]).optional(),
  scheduledDate: z.string().min(1).optional(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "SKIPPED"]).optional(),
  assignedTo: z.string().trim().max(100).optional(),
  assignedPersonName: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
});

// List maintenance tasks for hostel
router.get(
  "/:hostelId/maintenance-tasks",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      const hostelId = typeof req.params.hostelId === "string" ? req.params.hostelId : "";
      if (!hostelId) {
        res.status(400).json({ message: "Invalid hostel ID" });
        return;
      }

      const snap = await db
        .collection("maintenanceTasks")
        .where("hostelId", "==", hostelId)
        .get();

      const tasks = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      tasks.sort((a: any, b: any) =>
        String(a.scheduledDate || "").localeCompare(String(b.scheduledDate || "")),
      );

      res.json({ maintenanceTasks: tasks });
    } catch (error) {
      next(error);
    }
  },
);

// Create maintenance task
router.post(
  "/:hostelId/maintenance-tasks",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      if (
        req.authUser?.role !== "SUPER_ADMIN" &&
        req.authUser?.role !== "ADMIN"
      ) {
        res.status(403).json({ message: "Only administrators can schedule maintenance tasks" });
        return;
      }

      const hostelId = typeof req.params.hostelId === "string" ? req.params.hostelId : "";
      const parsed = createMaintenanceTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          message: "Invalid maintenance task data",
          errors: parsed.error.flatten(),
        });
        return;
      }

      const now = new Date().toISOString();
      const taskRef = db.collection("maintenanceTasks").doc();
      const taskData = {
        id: taskRef.id,
        hostelId,
        title: parsed.data.title,
        description: parsed.data.description || "",
        category: parsed.data.category || "General Upkeep",
        frequency: parsed.data.frequency || "MONTHLY",
        scheduledDate: parsed.data.scheduledDate,
        assignedTo: parsed.data.assignedTo || null,
        assignedPersonName: parsed.data.assignedPersonName || null,
        notes: parsed.data.notes || null,
        status: "SCHEDULED",
        createdAt: now,
        updatedAt: now,
      };

      await taskRef.set(taskData);

      await writeAuditLog({
        actorId: req.authUser.id,
        action: "CREATE_MAINTENANCE_TASK",
        entityType: "MAINTENANCE_TASK",
        entityId: taskRef.id,
        metadata: { hostelId, title: parsed.data.title },
      });

      res.status(201).json({
        message: "Maintenance task scheduled successfully",
        maintenanceTask: taskData,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Update maintenance task status or notes
router.patch(
  "/:hostelId/maintenance-tasks/:taskId",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      const hostelId = typeof req.params.hostelId === "string" ? req.params.hostelId : "";
      const taskId = typeof req.params.taskId === "string" ? req.params.taskId : "";
      if (!hostelId || !taskId) {
        res.status(400).json({ message: "Invalid parameters" });
        return;
      }

      const taskRef = db.collection("maintenanceTasks").doc(taskId);
      const taskDoc = await taskRef.get();
      if (!taskDoc.exists || taskDoc.data()?.hostelId !== hostelId) {
        res.status(404).json({ message: "Maintenance task not found" });
        return;
      }

      const parsed = updateMaintenanceTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          message: "Invalid update data",
          errors: parsed.error.flatten(),
        });
        return;
      }

      const updates: Record<string, unknown> = {
        ...parsed.data,
        updatedAt: new Date().toISOString(),
      };

      await taskRef.update(updates);

      res.json({
        message: "Maintenance task updated successfully",
        maintenanceTask: {
          id: taskId,
          ...taskDoc.data(),
          ...updates,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Delete maintenance task
router.delete(
  "/:hostelId/maintenance-tasks/:taskId",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      if (
        req.authUser?.role !== "SUPER_ADMIN" &&
        req.authUser?.role !== "ADMIN"
      ) {
        res.status(403).json({ message: "Only administrators can delete maintenance tasks" });
        return;
      }

      const hostelId = typeof req.params.hostelId === "string" ? req.params.hostelId : "";
      const taskId = typeof req.params.taskId === "string" ? req.params.taskId : "";
      const taskRef = db.collection("maintenanceTasks").doc(taskId);
      const taskDoc = await taskRef.get();
      if (!taskDoc.exists || taskDoc.data()?.hostelId !== hostelId) {
        res.status(404).json({ message: "Maintenance task not found" });
        return;
      }

      await taskRef.delete();
      res.json({ message: "Maintenance task removed" });
    } catch (error) {
      next(error);
    }
  },
);

export default router;