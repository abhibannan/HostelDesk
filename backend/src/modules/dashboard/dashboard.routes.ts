import { Router } from "express";
import { db } from "../../config/firebase.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const router = Router();

type DashboardStats = {
  hostelId?: string;

  totalRooms: number;
  activeRooms: number;
  availableRooms: number;
  occupiedRooms: number;

  activeRenters: number;

  totalFees: number;
  paidFees: number;
  outstandingFees: number;
  pendingFees: number;
  partiallyPaidFees: number;
  overdueFees: number;

  totalPayments: number;
  paidPayments: number;
  pendingPayments: number;

  totalRepairRequests: number;
  submittedRepairs: number;
  inProgressRepairs: number;
  resolvedRepairs: number;
  cancelledRepairs: number;
};

function emptyStats(
  hostelId?: string,
): DashboardStats {
  return {
    ...(hostelId ? { hostelId } : {}),

    totalRooms: 0,
    activeRooms: 0,
    availableRooms: 0,
    occupiedRooms: 0,

    activeRenters: 0,

    totalFees: 0,
    paidFees: 0,
    outstandingFees: 0,
    pendingFees: 0,
    partiallyPaidFees: 0,
    overdueFees: 0,

    totalPayments: 0,
    paidPayments: 0,
    pendingPayments: 0,

    totalRepairRequests: 0,
    submittedRepairs: 0,
    inProgressRepairs: 0,
    resolvedRepairs: 0,
    cancelledRepairs: 0,
  };
}

async function calculateDashboard(
  hostelId?: string,
): Promise<DashboardStats> {
  const stats = emptyStats(hostelId);

  let roomsQuery = db.collection("rooms");
  let rentersQuery = db.collection("renters");
  let feesQuery = db.collection("fees");
  let paymentsQuery = db.collection("payments");
  let repairsQuery = db.collection("repairs");

  if (hostelId) {
    roomsQuery = roomsQuery.where(
      "hostelId",
      "==",
      hostelId,
    ) as FirebaseFirestore.CollectionReference;

    rentersQuery = rentersQuery.where(
      "hostelId",
      "==",
      hostelId,
    ) as FirebaseFirestore.CollectionReference;

    feesQuery = feesQuery.where(
      "hostelId",
      "==",
      hostelId,
    ) as FirebaseFirestore.CollectionReference;

    paymentsQuery = paymentsQuery.where(
      "hostelId",
      "==",
      hostelId,
    ) as FirebaseFirestore.CollectionReference;

    repairsQuery = repairsQuery.where(
      "hostelId",
      "==",
      hostelId,
    ) as FirebaseFirestore.CollectionReference;
  }

  const [
    roomsSnapshot,
    rentersSnapshot,
    feesSnapshot,
    paymentsSnapshot,
    repairsSnapshot,
  ] = await Promise.all([
    roomsQuery.get(),
    rentersQuery.get(),
    feesQuery.get(),
    paymentsQuery.get(),
    repairsQuery.get(),
  ]);

  // -------------------------------------------------------
  // ROOMS
  // -------------------------------------------------------

  stats.totalRooms = roomsSnapshot.size;

  const roomIds = new Set<string>();
  const activeRoomIds = new Set<string>();

  roomsSnapshot.docs.forEach((doc) => {
    const data = doc.data();

    roomIds.add(doc.id);

    if (data.status === "ACTIVE") {
      stats.activeRooms += 1;
    }
  });

  // A room is occupied when at least one ACTIVE renter
  // is assigned to that room. Multiple renters in one room
  // still count as one occupied room.
  rentersSnapshot.docs.forEach((doc) => {
    const data = doc.data();

    if (data.status === "ACTIVE") {
      stats.activeRenters += 1;

      if (
        data.roomId &&
        roomIds.has(String(data.roomId))
      ) {
        activeRoomIds.add(
          String(data.roomId),
        );
      }
    }
  });

  stats.occupiedRooms =
    activeRoomIds.size;

  stats.availableRooms = Math.max(
    stats.totalRooms -
      stats.occupiedRooms,
    0,
  );

  // -------------------------------------------------------
  // FEES
  // -------------------------------------------------------

  feesSnapshot.docs.forEach((doc) => {
    const data = doc.data();

    const amount = Number(
      data.amount ?? 0,
    );

    const paidAmount = Number(
      data.paidAmount ?? 0,
    );

    stats.totalFees += amount;
    stats.paidFees += paidAmount;
    stats.outstandingFees += Math.max(
      amount - paidAmount,
      0,
    );

    const status = String(
      data.status ?? "",
    ).toUpperCase();

    if (status === "PENDING") {
      stats.pendingFees += 1;
    } else if (
      status === "PARTIALLY_PAID"
    ) {
      stats.partiallyPaidFees += 1;
    } else if (status === "OVERDUE") {
      stats.overdueFees += 1;
    }
  });

  // -------------------------------------------------------
  // PAYMENTS
  // -------------------------------------------------------

  paymentsSnapshot.docs.forEach((doc) => {
    const data = doc.data();

    const amount = Number(
      data.amount ?? 0,
    );

    const status = String(
      data.status ?? "",
    ).toUpperCase();

    stats.totalPayments += amount;

    if (status === "PAID") {
      stats.paidPayments += amount;
    } else if (status === "PENDING") {
      stats.pendingPayments += amount;
    }
  });

  // -------------------------------------------------------
  // REPAIRS
  // -------------------------------------------------------

  repairsSnapshot.docs.forEach((doc) => {
    const status = String(
      doc.data().status ?? "",
    ).toUpperCase();

    stats.totalRepairRequests += 1;

    if (status === "SUBMITTED") {
      stats.submittedRepairs += 1;
    } else if (status === "IN_PROGRESS") {
      stats.inProgressRepairs += 1;
    } else if (status === "RESOLVED") {
      stats.resolvedRepairs += 1;
    } else if (status === "CANCELLED") {
      stats.cancelledRepairs += 1;
    }
  });

  return stats;
}

// ---------------------------------------------------------
// ADMIN / SUPER ADMIN DASHBOARD
// ---------------------------------------------------------

router.get(
  "/",
  requireAuth,
  async (req, res, next) => {
    try {
      const role = req.authUser?.role;

      if (
        role !== "SUPER_ADMIN" &&
        role !== "ADMIN"
      ) {
        res.status(403).json({
          message: "Access denied",
        });
        return;
      }

      // ---------------------------------------------------
      // SUPER ADMIN
      // ---------------------------------------------------

      if (role === "SUPER_ADMIN") {
        const hostelsSnapshot = await db
          .collection("hostels")
          .where(
            "ownerId",
            "==",
            req.authUser!.id,
          )
          .get();

        const hostelIds =
          hostelsSnapshot.docs.map(
            (doc) => doc.id,
          );

        const hostelStats =
          await Promise.all(
            hostelIds.map((hostelId) =>
              calculateDashboard(
                hostelId,
              ),
            ),
          );

        const overall = emptyStats();

        hostelStats.forEach((stats) => {
          overall.totalRooms +=
            stats.totalRooms;
          overall.activeRooms +=
            stats.activeRooms;
          overall.availableRooms +=
            stats.availableRooms;
          overall.occupiedRooms +=
            stats.occupiedRooms;

          overall.activeRenters +=
            stats.activeRenters;

          overall.totalFees +=
            stats.totalFees;
          overall.paidFees +=
            stats.paidFees;
          overall.outstandingFees +=
            stats.outstandingFees;
          overall.pendingFees +=
            stats.pendingFees;
          overall.partiallyPaidFees +=
            stats.partiallyPaidFees;
          overall.overdueFees +=
            stats.overdueFees;

          overall.totalPayments +=
            stats.totalPayments;
          overall.paidPayments +=
            stats.paidPayments;
          overall.pendingPayments +=
            stats.pendingPayments;

          overall.totalRepairRequests +=
            stats.totalRepairRequests;
          overall.submittedRepairs +=
            stats.submittedRepairs;
          overall.inProgressRepairs +=
            stats.inProgressRepairs;
          overall.resolvedRepairs +=
            stats.resolvedRepairs;
          overall.cancelledRepairs +=
            stats.cancelledRepairs;
        });

        res.json({
          dashboard: {
            ...overall,
            hostelCount:
              hostelIds.length,
            hostels: hostelStats,
          },
        });

        return;
      }

      // ---------------------------------------------------
      // ADMIN
      // ---------------------------------------------------

      const assignments = await db
        .collection("hostelAdmins")
        .where(
          "adminId",
          "==",
          req.authUser!.id,
        )
        .get();

      const hostelIds =
        assignments.docs.map(
          (doc) => doc.id,
        );

      const hostelStats =
        await Promise.all(
          hostelIds.map((hostelId) =>
            calculateDashboard(
              hostelId,
            ),
          ),
        );

      const overall = emptyStats();

      hostelStats.forEach((stats) => {
        overall.totalRooms +=
          stats.totalRooms;
        overall.activeRooms +=
          stats.activeRooms;
        overall.availableRooms +=
          stats.availableRooms;
        overall.occupiedRooms +=
          stats.occupiedRooms;

        overall.activeRenters +=
          stats.activeRenters;

        overall.totalFees +=
          stats.totalFees;
        overall.paidFees +=
          stats.paidFees;
        overall.outstandingFees +=
          stats.outstandingFees;
        overall.pendingFees +=
          stats.pendingFees;
        overall.partiallyPaidFees +=
          stats.partiallyPaidFees;
        overall.overdueFees +=
          stats.overdueFees;

        overall.totalPayments +=
          stats.totalPayments;
        overall.paidPayments +=
          stats.paidPayments;
        overall.pendingPayments +=
          stats.pendingPayments;

        overall.totalRepairRequests +=
          stats.totalRepairRequests;
        overall.submittedRepairs +=
          stats.submittedRepairs;
        overall.inProgressRepairs +=
          stats.inProgressRepairs;
        overall.resolvedRepairs +=
          stats.resolvedRepairs;
        overall.cancelledRepairs +=
          stats.cancelledRepairs;
      });

      res.json({
        dashboard: {
          ...overall,
          hostelCount:
            hostelIds.length,
          hostels: hostelStats,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// ---------------------------------------------------------
// DASHBOARD FOR ONE HOSTEL
// ---------------------------------------------------------

router.get(
  "/:hostelId",
  requireAuth,
  async (req, res, next) => {
    try {
      if (
        req.authUser?.role !==
          "SUPER_ADMIN" &&
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

      if (
        req.authUser?.role ===
          "SUPER_ADMIN" &&
        hostel.data()?.ownerId !==
          req.authUser.id
      ) {
        res.status(403).json({
          message: "Access denied",
        });
        return;
      }

      if (
        req.authUser?.role === "ADMIN"
      ) {
        const assignment = await db
          .collection("hostelAdmins")
          .doc(hostelId)
          .get();

        if (
          !assignment.exists ||
          assignment.data()?.adminId !==
            req.authUser.id
        ) {
          res.status(403).json({
            message: "Access denied",
          });
          return;
        }
      }

      const dashboard =
        await calculateDashboard(
          hostelId,
        );

      res.json({
        dashboard,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
