import { Router } from "express";
import { z } from "zod";

import { db } from "../../config/firebase.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireHostelAccess } from "../../middleware/hostel-access.middleware.js";
import { requireRenterAccess } from "../../middleware/requireRenterAccess.js";
import { writeAuditLog } from "../../utils/audit.js";

const router = Router();

const createFeeSchema = z.object({
  renterId: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().positive(),
  dueDate: z.string().min(1),
  description: z.string().trim().max(500).optional(),
});

const updateFeeSchema = z.object({
  amount: z.number().positive().optional(),
  dueDate: z.string().min(1).optional(),
  description: z.string().trim().max(500).optional(),
  status: z
    .enum([
      "PENDING",
      "PARTIALLY_PAID",
      "PAID",
      "OVERDUE",
      "CANCELLED",
    ])
    .optional(),
});

const paymentSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum([
    "CASH",
    "UPI",
    "BANK_TRANSFER",
    "OTHER",
  ]),
  paymentDate: z.string().min(1),
  reference: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional(),
});

// Create fee
router.post(
  "/:hostelId/fees",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      if (
        req.authUser?.role !== "SUPER_ADMIN" &&
        req.authUser?.role !== "ADMIN"
      ) {
        res.status(403).json({ message: "Access denied" });
        return;
      }

      const hostelId = req.params.hostelId;

      if (typeof hostelId !== "string") {
        res.status(400).json({ message: "Invalid hostel ID" });
        return;
      }

      const parsed = createFeeSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          message: "Invalid fee data",
          errors: parsed.error.flatten(),
        });
        return;
      }

      const {
        renterId,
        month,
        amount,
        dueDate,
        description,
      } = parsed.data;

      const renterRef = db.collection("renters").doc(renterId);
      const renter = await renterRef.get();

      if (
        !renter.exists ||
        renter.data()?.hostelId !== hostelId
      ) {
        res.status(404).json({
          message: "Renter not found",
        });
        return;
      }

      if (renter.data()?.status !== "ACTIVE") {
        res.status(400).json({
          message: "Renter is not active",
        });
        return;
      }

      const existing = await db
        .collection("fees")
        .where("hostelId", "==", hostelId)
        .where("renterId", "==", renterId)
        .where("month", "==", month)
        .limit(1)
        .get();

      if (!existing.empty) {
        res.status(409).json({
          message: "Fee already exists for this month",
        });
        return;
      }

      const feeRef = db.collection("fees").doc();
      const now = new Date().toISOString();

      const fee = {
        id: feeRef.id,
        hostelId,
        renterId,
        month,
        amount,
        paidAmount: 0,
        dueDate,
        description: description ?? null,
        status: "PENDING",
        createdAt: now,
        updatedAt: now,
      };

      await feeRef.set(fee);

      await writeAuditLog({
        actorId: req.authUser.id,
        action: "CREATE_FEE",
        entityType: "FEE",
        entityId: feeRef.id,
        metadata: {
          hostelId,
          renterId,
          month,
          amount,
        },
      });

      res.status(201).json({
        message: "Fee created successfully",
        fee,
      });
    } catch (error) {
      next(error);
    }
  },
);

// List fees for hostel
router.get(
  "/:hostelId/fees",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      const hostelId = req.params.hostelId;

      if (typeof hostelId !== "string") {
        res.status(400).json({ message: "Invalid hostel ID" });
        return;
      }

      // Renters should not receive the complete hostel fee list.
      if (req.authUser?.role === "RENTER") {
        res.status(403).json({
          message: "Access denied",
        });
        return;
      }

      const snapshot = await db
        .collection("fees")
        .where("hostelId", "==", hostelId)
        .get();

      const fees = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.json({ fees });
    } catch (error) {
      next(error);
    }
  },
);

// Get renter fees
router.get(
  "/:hostelId/renters/:renterId/fees",
  requireAuth,
  requireHostelAccess,
  requireRenterAccess,
  async (req, res, next) => {
    try {
      const hostelId = req.params.hostelId;
      const renterId = req.params.renterId;

      if (
        typeof hostelId !== "string" ||
        typeof renterId !== "string"
      ) {
        res.status(400).json({ message: "Invalid ID" });
        return;
      }

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

      const snapshot = await db
        .collection("fees")
        .where("hostelId", "==", hostelId)
        .where("renterId", "==", renterId)
        .get();

      const fees = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.json({ fees });
    } catch (error) {
      next(error);
    }
  },
);

// Update fee
router.patch(
  "/:hostelId/fees/:feeId",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      if (
        req.authUser?.role !== "SUPER_ADMIN" &&
        req.authUser?.role !== "ADMIN"
      ) {
        res.status(403).json({ message: "Access denied" });
        return;
      }

      const hostelId = req.params.hostelId;
      const feeId = req.params.feeId;

      if (
        typeof hostelId !== "string" ||
        typeof feeId !== "string"
      ) {
        res.status(400).json({ message: "Invalid ID" });
        return;
      }

      const parsed = updateFeeSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          message: "Invalid fee data",
          errors: parsed.error.flatten(),
        });
        return;
      }

      const feeRef = db.collection("fees").doc(feeId);
      const fee = await feeRef.get();

      if (
        !fee.exists ||
        fee.data()?.hostelId !== hostelId
      ) {
        res.status(404).json({
          message: "Fee not found",
        });
        return;
      }

      const current = fee.data();

      if (
        parsed.data.amount !== undefined &&
        parsed.data.amount <
          Number(current?.paidAmount ?? 0)
      ) {
        res.status(400).json({
          message: "Fee amount cannot be lower than paid amount",
        });
        return;
      }

      await feeRef.update({
        ...parsed.data,
        updatedAt: new Date().toISOString(),
      });

      const updated = await feeRef.get();

      await writeAuditLog({
        actorId: req.authUser.id,
        action: "UPDATE_FEE",
        entityType: "FEE",
        entityId: feeId,
        metadata: parsed.data,
      });

      res.json({
        message: "Fee updated successfully",
        fee: {
          id: updated.id,
          ...updated.data(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Record payment
router.post(
  "/:hostelId/fees/:feeId/payments",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      if (
        req.authUser?.role !== "SUPER_ADMIN" &&
        req.authUser?.role !== "ADMIN"
      ) {
        res.status(403).json({ message: "Access denied" });
        return;
      }

      const hostelId = req.params.hostelId;
      const feeId = req.params.feeId;

      if (
        typeof hostelId !== "string" ||
        typeof feeId !== "string"
      ) {
        res.status(400).json({ message: "Invalid ID" });
        return;
      }

      const parsed = paymentSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          message: "Invalid payment data",
          errors: parsed.error.flatten(),
        });
        return;
      }

      const feeRef = db.collection("fees").doc(feeId);
      const fee = await feeRef.get();

      if (
        !fee.exists ||
        fee.data()?.hostelId !== hostelId
      ) {
        res.status(404).json({
          message: "Fee not found",
        });
        return;
      }

      const feeData = fee.data();

      if (!feeData) {
        res.status(404).json({
          message: "Fee data not found",
        });
        return;
      }

      if (feeData.status === "CANCELLED") {
        res.status(400).json({
          message: "Cannot pay a cancelled fee",
        });
        return;
      }

      const renterId = String(feeData.renterId ?? "");

      if (!renterId) {
        res.status(400).json({
          message: "Fee is missing renter information",
        });
        return;
      }

      const currentPaid = Number(
        feeData.paidAmount ?? 0,
      );

      const feeAmount = Number(
        feeData.amount ?? 0,
      );

      const paymentAmount = parsed.data.amount;
      const remaining = feeAmount - currentPaid;

      if (paymentAmount > remaining) {
        res.status(400).json({
          message: "Payment amount exceeds remaining fee",
          remainingAmount: remaining,
        });
        return;
      }

      const newPaidAmount =
        currentPaid + paymentAmount;

      let status:
        | "PENDING"
        | "PARTIALLY_PAID"
        | "PAID"
        | "OVERDUE";

      if (newPaidAmount >= feeAmount) {
        status = "PAID";
      } else if (newPaidAmount > 0) {
        status = "PARTIALLY_PAID";
      } else {
        status = "PENDING";
      }

      const paymentRef =
        db.collection("payments").doc();

      const now = new Date().toISOString();

      const payment = {
        id: paymentRef.id,
        hostelId,
        renterId,
        feeId,
        amount: paymentAmount,
        paymentMethod:
          parsed.data.paymentMethod,
        paymentDate:
          parsed.data.paymentDate,
        reference:
          parsed.data.reference ?? null,
        notes:
          parsed.data.notes ?? null,
        recordedBy: req.authUser.id,
        createdAt: now,
      };

      const batch = db.batch();

      batch.set(paymentRef, payment);

      batch.update(feeRef, {
        paidAmount: newPaidAmount,
        status,
        updatedAt: now,
      });

      await batch.commit();

      await writeAuditLog({
        actorId: req.authUser.id,
        action: "RECORD_PAYMENT",
        entityType: "PAYMENT",
        entityId: paymentRef.id,
        metadata: {
          hostelId,
          feeId,
          renterId,
          amount: paymentAmount,
          paymentMethod:
            parsed.data.paymentMethod,
        },
      });

      res.status(201).json({
        message: "Payment recorded successfully",
        payment,
        fee: {
          id: feeId,
          amount: feeAmount,
          paidAmount: newPaidAmount,
          remainingAmount:
            feeAmount - newPaidAmount,
          status,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Payment history for fee
router.get(
  "/:hostelId/fees/:feeId/payments",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      const hostelId = req.params.hostelId;
      const feeId = req.params.feeId;

      if (
        typeof hostelId !== "string" ||
        typeof feeId !== "string"
      ) {
        res.status(400).json({ message: "Invalid ID" });
        return;
      }

      const fee = await db
        .collection("fees")
        .doc(feeId)
        .get();

      if (
        !fee.exists ||
        fee.data()?.hostelId !== hostelId
      ) {
        res.status(404).json({
          message: "Fee not found",
        });
        return;
      }

      const feeData = fee.data();

      if (!feeData) {
        res.status(404).json({
          message: "Fee data not found",
        });
        return;
      }

      // Renter can only view payment history for their own fee.
      if (req.authUser?.role === "RENTER") {
        const renterId = String(
          feeData.renterId ?? "",
        );

        if (!renterId) {
          res.status(404).json({
            message: "Fee renter information not found",
          });
          return;
        }

        const renter = await db
          .collection("renters")
          .doc(renterId)
          .get();

        if (
          !renter.exists ||
          renter.data()?.userId !== req.authUser.id ||
          renter.data()?.hostelId !== hostelId
        ) {
          res.status(403).json({
            message: "Access denied",
          });
          return;
        }
      }

      const snapshot = await db
        .collection("payments")
        .where("hostelId", "==", hostelId)
        .where("feeId", "==", feeId)
        .get();

      const payments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.json({ payments });
    } catch (error) {
      next(error);
    }
  },
);

// All payments for hostel
router.get(
  "/:hostelId/payments",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      if (
        req.authUser?.role !== "SUPER_ADMIN" &&
        req.authUser?.role !== "ADMIN"
      ) {
        res.status(403).json({
          message: "Access denied",
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

      const snapshot = await db
        .collection("payments")
        .where("hostelId", "==", hostelId)
        .get();

      const payments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      res.json({ payments });
    } catch (error) {
      next(error);
    }
  },
);

export default router;