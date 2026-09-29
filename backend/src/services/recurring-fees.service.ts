import { db } from "../config/firebase.js";
import { createNotification } from "../modules/notifications/notifications.server.js";
import { writeAuditLog } from "../utils/audit.js";

/**
 * Service to handle recurring monthly fees and automatic rent notifications
 * based on renter's recurring due date.
 */
export async function checkAndProcessRecurringFees(): Promise<{
  createdFees: number;
  notificationsSent: number;
  markedOverdue: number;
}> {
  let createdFees = 0;
  let notificationsSent = 0;
  let markedOverdue = 0;

  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1; // 1-12
    const currentMonthStr = `${currentYear}-${String(currentMonthNum).padStart(2, "0")}`;
    const currentDateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const currentDay = now.getDate();

    // Query all active renters
    const rentersSnapshot = await db
      .collection("renters")
      .where("status", "==", "ACTIVE")
      .get();

    if (rentersSnapshot.empty) {
      return { createdFees, notificationsSent, markedOverdue };
    }

    for (const renterDoc of rentersSnapshot.docs) {
      const renter = renterDoc.data();
      const renterId = renterDoc.id;
      const hostelId = renter.hostelId;
      const userId = renter.userId;
      const monthlyFee = Number(renter.monthlyFee || 0);

      if (!hostelId || !userId || monthlyFee <= 0) continue;

      // Determine recurring due day from dueDay or joiningDate
      let dueDay = 1;
      if (typeof renter.dueDay === "number" && renter.dueDay >= 1 && renter.dueDay <= 31) {
        dueDay = renter.dueDay;
      } else if (renter.joiningDate && typeof renter.joiningDate === "string") {
        const parts = renter.joiningDate.split("-");
        if (parts.length === 3 && parts[2]) {
          const parsed = parseInt(parts[2], 10);
          if (!isNaN(parsed) && parsed >= 1 && parsed <= 31) {
            dueDay = parsed;
          }
        }
      }

      // Calculate days in the current month to avoid invalid dates (e.g. Feb 30)
      const daysInCurrentMonth = new Date(currentYear, currentMonthNum, 0).getDate();
      const safeDay = Math.min(dueDay, daysInCurrentMonth);
      const feeDueDate = `${currentYear}-${String(currentMonthNum).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;

      // Check if fee already exists for this renter in the current month
      const existingFeeSnapshot = await db
        .collection("fees")
        .where("hostelId", "==", hostelId)
        .where("renterId", "==", renterId)
        .where("month", "==", currentMonthStr)
        .limit(1)
        .get();

      let currentFeeId: string | null = null;
      let feeStatus = "PENDING";
      let feeAmount = monthlyFee;

      if (existingFeeSnapshot.empty) {
        // Create the recurring fee record for this month
        const newFeeRef = db.collection("fees").doc();
        currentFeeId = newFeeRef.id;

        const feeData = {
          id: currentFeeId,
          hostelId,
          renterId,
          month: currentMonthStr,
          amount: monthlyFee,
          paidAmount: 0,
          dueDate: feeDueDate,
          description: `Recurring monthly fee for ${currentMonthStr}`,
          status: "PENDING",
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };

        await newFeeRef.set(feeData);
        createdFees++;

        await writeAuditLog({
          actorId: "SYSTEM_RECURRING_CRON",
          action: "CREATE_FEE",
          entityType: "FEE",
          entityId: currentFeeId,
          metadata: {
            hostelId,
            renterId,
            month: currentMonthStr,
            amount: monthlyFee,
            recurring: true,
          },
        });

        // Send automated notification: New Fee Generated / Due soon
        try {
          await createNotification({
            userId,
            type: "FEE_DUE",
            title: `Monthly Rent Due: ₹${monthlyFee}`,
            message: `Your recurring monthly rent fee of ₹${monthlyFee} for ${currentMonthStr} is due on ${feeDueDate}. Please pay before the due date.`,
            hostelId,
            entityType: "FEE",
            entityId: currentFeeId,
          });
          notificationsSent++;
        } catch (notifErr) {
          console.error(`Failed to send FEE_DUE notification to user ${userId}:`, notifErr);
        }
      } else {
        const feeDoc = existingFeeSnapshot.docs[0];
        if (!feeDoc) continue;
        currentFeeId = feeDoc.id;
        const feeData = feeDoc.data();
        feeStatus = feeData.status || "PENDING";
        feeAmount = Number(feeData.amount || monthlyFee) - Number(feeData.paidAmount || 0);

        // Check if fee is overdue
        if (
          (feeStatus === "PENDING" || feeStatus === "PARTIALLY_PAID") &&
          currentDateStr > (feeData.dueDate || feeDueDate)
        ) {
          if (feeStatus === "PENDING") {
            await feeDoc.ref.update({
              status: "OVERDUE",
              updatedAt: now.toISOString(),
            });
            markedOverdue++;
          }

          // Check if an overdue notification was already sent this month for this fee
          const existingNotifSnapshot = await db
            .collection("notifications")
            .where("userId", "==", userId)
            .where("type", "==", "FEE_OVERDUE")
            .where("entityId", "==", currentFeeId)
            .limit(1)
            .get();

          if (existingNotifSnapshot.empty) {
            try {
              await createNotification({
                userId,
                type: "FEE_OVERDUE",
                title: `Rent Payment Overdue: ₹${feeAmount}`,
                message: `Your rent fee of ₹${feeAmount} for ${currentMonthStr} was due on ${feeData.dueDate || feeDueDate}. Please make payment immediately to avoid penalties.`,
                hostelId,
                entityType: "FEE",
                entityId: currentFeeId,
              });
              notificationsSent++;
            } catch (notifErr) {
              console.error(`Failed to send FEE_OVERDUE notification to user ${userId}:`, notifErr);
            }
          }
        } else if (
          (feeStatus === "PENDING" || feeStatus === "PARTIALLY_PAID") &&
          // Within 3 days of due date
          Math.abs(currentDay - safeDay) <= 3
        ) {
          // Check if a reminder was already sent
          const existingNotifSnapshot = await db
            .collection("notifications")
            .where("userId", "==", userId)
            .where("type", "==", "FEE_DUE")
            .where("entityId", "==", currentFeeId)
            .limit(1)
            .get();

          if (existingNotifSnapshot.empty) {
            try {
              await createNotification({
                userId,
                type: "FEE_DUE",
                title: `Rent Due Reminder: ₹${feeAmount}`,
                message: `Reminder: Your monthly rent of ₹${feeAmount} is due on ${feeDueDate}.`,
                hostelId,
                entityType: "FEE",
                entityId: currentFeeId,
              });
              notificationsSent++;
            } catch (notifErr) {
              console.error(`Failed to send reminder notification to user ${userId}:`, notifErr);
            }
          }
        }
      }
    }

    console.log(
      `[Recurring Fees Processed] Created: ${createdFees}, Notifications: ${notificationsSent}, Marked Overdue: ${markedOverdue}`,
    );
  } catch (error) {
    console.error("Error in checkAndProcessRecurringFees:", error);
  }

  return { createdFees, notificationsSent, markedOverdue };
}

/**
 * Initializes the automated recurring fee runner
 */
export function startRecurringFeesCron() {
  // Run 10 seconds after server starts
  setTimeout(() => {
    void checkAndProcessRecurringFees();
  }, 10000);

  // Then run every 6 hours
  const INTERVAL_MS = 6 * 60 * 60 * 1000;
  setInterval(() => {
    void checkAndProcessRecurringFees();
  }, INTERVAL_MS);

  console.log("Recurring monthly fee & notification scheduler initialized.");
}
