import { Router } from "express";
import { z } from "zod";
import { db } from "../../config/firebase.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireHostelAccess } from "../../middleware/hostel-access.middleware.js";
import { writeAuditLog } from "../../utils/audit.js";

const router = Router();

const submitPaymentProofSchema = z.object({
  renterId: z.string().min(1),
  feeId: z.string().min(1),
  amount: z.number().positive(),
  paymentDate: z.string().min(1),
  proofUrl: z.string().url(),
  reference: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional(),
});

const reviewPaymentProofSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().max(500).optional(),
});

/*
 * The actual payment happens outside StayNexa.
 * This endpoint only submits a screenshot/payment-proof record.
 * The fee is NOT marked paid here.
 */
router.post(
  "/:hostelId/payment-proofs",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      if (req.authUser?.role !== "RENTER") {
        res.status(403).json({
          message: "Only renters can submit payment proof",
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

      const parsed = submitPaymentProofSchema.safeParse(
        req.body,
      );

      if (!parsed.success) {
        res.status(400).json({
          message: "Invalid payment proof data",
          errors: parsed.error.flatten(),
        });
        return;
      }

      const {
        renterId,
        feeId,
        amount,
        paymentDate,
        proofUrl,
        reference,
        notes,
      } = parsed.data;

      const renterRef = db
        .collection("renters")
        .doc(renterId);

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

      if (renter.data()?.userId !== req.authUser.id) {
        res.status(403).json({
          message: "Access denied",
        });
        return;
      }

      const feeRef = db
        .collection("fees")
        .doc(feeId);

      const fee = await feeRef.get();

      if (
        !fee.exists ||
        fee.data()?.hostelId !== hostelId ||
        fee.data()?.renterId !== renterId
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
          message:
            "Cannot submit proof for a cancelled fee",
        });
        return;
      }

      const paidAmount = Number(
        feeData.paidAmount ?? 0,
      );

      const feeAmount = Number(
        feeData.amount ?? 0,
      );

      const remaining = feeAmount - paidAmount;

      if (remaining <= 0) {
        res.status(400).json({
          message: "This fee is already fully paid",
        });
        return;
      }

      if (amount > remaining) {
        res.status(400).json({
          message:
            "Payment proof amount exceeds the remaining fee",
          remainingAmount: remaining,
        });
        return;
      }

      // Prevent multiple pending proofs for the same fee.
      const existingSnapshot = await db
        .collection("payments")
        .where("hostelId", "==", hostelId)
        .where("feeId", "==", feeId)
        .get();

      const hasPendingProof = existingSnapshot.docs.some(
        (doc) => {
          const data = doc.data();
          return (
            data.renterId === renterId &&
            String(data.status || "").toUpperCase() ===
              "SUBMITTED"
          );
        },
      );

      if (hasPendingProof) {
        res.status(409).json({
          message:
            "A payment proof is already waiting for admin review",
        });
        return;
      }

      const paymentRef = db
        .collection("payments")
        .doc();

      const now = new Date().toISOString();

      const payment = {
        id: paymentRef.id,
        hostelId,
        renterId,
        feeId,
        amount,
        paymentDate,
        proofUrl,
        reference: reference ?? null,
        notes: notes ?? null,
        status: "SUBMITTED",
        submittedBy: req.authUser.id,
        submittedAt: now,
        reviewedBy: null,
        reviewedAt: null,
        reviewNote: null,
        createdAt: now,
      };

      await paymentRef.set(payment);

      await writeAuditLog({
        actorId: req.authUser.id,
        action: "SUBMIT_PAYMENT_PROOF",
        entityType: "PAYMENT",
        entityId: paymentRef.id,
        metadata: {
          hostelId,
          renterId,
          feeId,
          amount,
        },
      });

      res.status(201).json({
        message: "Payment proof submitted successfully",
        payment,
      });
    } catch (error) {
      next(error);
    }
  },
);

/*
 * Admin review of an uploaded payment proof.
 * APPROVED updates the fee's paidAmount/status.
 * REJECTED leaves the fee unchanged.
 */
router.patch(
  "/:hostelId/payments/:paymentId/status",
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
      const paymentId = req.params.paymentId;

      if (
        typeof hostelId !== "string" ||
        typeof paymentId !== "string"
      ) {
        res.status(400).json({
          message: "Invalid ID",
        });
        return;
      }

      const parsed = reviewPaymentProofSchema.safeParse(
        req.body,
      );

      if (!parsed.success) {
        res.status(400).json({
          message: "Invalid payment review data",
          errors: parsed.error.flatten(),
        });
        return;
      }

      const paymentRef = db
        .collection("payments")
        .doc(paymentId);

      const paymentSnapshot =
        await paymentRef.get();

      if (
        !paymentSnapshot.exists ||
        paymentSnapshot.data()?.hostelId !== hostelId
      ) {
        res.status(404).json({
          message: "Payment proof not found",
        });
        return;
      }

      const paymentData =
        paymentSnapshot.data();

      if (!paymentData) {
        res.status(404).json({
          message: "Payment proof data not found",
        });
        return;
      }

      const currentStatus = String(
        paymentData.status || "",
      ).toUpperCase();

      if (currentStatus !== "SUBMITTED") {
        res.status(409).json({
          message:
            "This payment proof has already been reviewed",
        });
        return;
      }

      const now = new Date().toISOString();
      const newStatus = parsed.data.status;

      const batch = db.batch();

      if (newStatus === "APPROVED") {
        const feeId = String(
          paymentData.feeId ?? "",
        );

        if (!feeId) {
          res.status(400).json({
            message:
              "Payment proof is missing fee information",
          });
          return;
        }

        const feeRef = db
          .collection("fees")
          .doc(feeId);

        const feeSnapshot =
          await feeRef.get();

        if (
          !feeSnapshot.exists ||
          feeSnapshot.data()?.hostelId !== hostelId
        ) {
          res.status(404).json({
            message: "Fee not found",
          });
          return;
        }

        const feeData =
          feeSnapshot.data();

        const currentPaid = Number(
          feeData?.paidAmount ?? 0,
        );

        const feeAmount = Number(
          feeData?.amount ?? 0,
        );

        const paymentAmount = Number(
          paymentData.amount ?? 0,
        );

        const remaining =
          feeAmount - currentPaid;

        if (paymentAmount > remaining) {
          res.status(400).json({
            message:
              "Payment proof amount exceeds the remaining fee",
            remainingAmount: remaining,
          });
          return;
        }

        const newPaidAmount =
          currentPaid + paymentAmount;

        let feeStatus:
          | "PENDING"
          | "PARTIALLY_PAID"
          | "PAID";

        if (newPaidAmount >= feeAmount) {
          feeStatus = "PAID";
        } else if (newPaidAmount > 0) {
          feeStatus = "PARTIALLY_PAID";
        } else {
          feeStatus = "PENDING";
        }

        batch.update(feeRef, {
          paidAmount: newPaidAmount,
          status: feeStatus,
          updatedAt: now,
        });
      }

      batch.update(paymentRef, {
        status: newStatus,
        reviewedBy: req.authUser.id,
        reviewedAt: now,
        reviewNote:
          parsed.data.reviewNote ?? null,
        updatedAt: now,
      });

      await batch.commit();

      await writeAuditLog({
        actorId: req.authUser.id,
        action: "REVIEW_PAYMENT_PROOF",
        entityType: "PAYMENT",
        entityId: paymentId,
        metadata: {
          hostelId,
          status: newStatus,
          reviewNote:
            parsed.data.reviewNote ?? null,
        },
      });

      const updatedPayment =
        await paymentRef.get();

      res.json({
        message:
          newStatus === "APPROVED"
            ? "Payment proof approved"
            : "Payment proof rejected",
        payment: {
          id: updatedPayment.id,
          ...updatedPayment.data(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
