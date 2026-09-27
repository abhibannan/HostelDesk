import { Router } from "express";
import { z } from "zod";
import {
  db,
  firebaseAuth,
} from "../../config/firebase.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireHostelAccess } from "../../middleware/hostel-access.middleware.js";
import { writeAuditLog } from "../../utils/audit.js";

const router = Router();

/* ---------------------------------------------------------
   SCHEMAS
--------------------------------------------------------- */

const createRenterAccountSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().max(100).optional(),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(30),
  password: z.string().min(6).max(100),
  roomId: z.string().min(1),
  joiningDate: z.string().min(1),
  monthlyFee: z.number().nonnegative(),
  securityDeposit: z
    .number()
    .nonnegative()
    .optional(),
});

const renterSchema = z.object({
  userId: z.string().min(1),
  roomId: z.string().min(1),
  joiningDate: z.string().min(1),
  monthlyFee: z.number().nonnegative(),
  securityDeposit: z
    .number()
    .nonnegative()
    .optional(),
});

const updateRenterSchema = z.object({
  roomId: z.string().min(1).optional(),
  monthlyFee: z.number().nonnegative().optional(),
  securityDeposit: z
    .number()
    .nonnegative()
    .optional(),
  joiningDate: z.string().min(1).optional(),
  status: z
    .enum([
      "ACTIVE",
      "INACTIVE",
      "LEFT",
    ])
    .optional(),
});

/* ---------------------------------------------------------
   CREATE RENTER ACCOUNT
--------------------------------------------------------- */

router.post(
  "/:hostelId/renters/create-account",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    let createdFirebaseUid: string | null = null;
    let createdUserId: string | null = null;

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

      const parsed =
        createRenterAccountSchema.safeParse(
          req.body,
        );

      if (!parsed.success) {
        res.status(400).json({
          message: "Invalid renter data",
          errors: parsed.error.flatten(),
        });
        return;
      }

      const {
        firstName,
        lastName,
        email,
        phone,
        password,
        roomId,
        joiningDate,
        monthlyFee,
        securityDeposit,
      } = parsed.data;

      /* Verify hostel */

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

      /* Verify room */

      const roomRef = db
        .collection("rooms")
        .doc(roomId);

      const room = await roomRef.get();

      if (
        !room.exists ||
        room.data()?.hostelId !== hostelId
      ) {
        res.status(404).json({
          message: "Room not found",
        });
        return;
      }

      if (
        room.data()?.status !== "ACTIVE"
      ) {
        res.status(400).json({
          message: "Room is inactive",
        });
        return;
      }

      /* Prevent two active renters in the same room */

      const roomRenters = await db
        .collection("renters")
        .where("roomId", "==", roomId)
        .get();

      const roomAlreadyOccupied =
        roomRenters.docs.some((doc) => {
          const data = doc.data();

          return (
            data.hostelId === hostelId &&
            data.status === "ACTIVE"
          );
        });

      if (roomAlreadyOccupied) {
        res.status(409).json({
          message:
            "Room already has an active renter",
        });
        return;
      }

      /* Check Firebase account */

      try {
        await firebaseAuth.getUserByEmail(
          email,
        );

        res.status(409).json({
          message:
            "A Firebase account already exists for this email",
        });
        return;
      } catch (error: any) {
        if (
          error?.code !==
          "auth/user-not-found"
        ) {
          throw error;
        }
      }

      /* Create Firebase account */

      const firebaseUser =
        await firebaseAuth.createUser({
          email,
          password,
          displayName:
            `${firstName} ${lastName ?? ""}`.trim(),
        });

      createdFirebaseUid =
        firebaseUser.uid;

      /* Create Firestore user */

      const userRef = db
        .collection("users")
        .doc();

      createdUserId = userRef.id;

      const now =
        new Date().toISOString();

      const userProfile = {
        id: userRef.id,
        firebaseUid:
          firebaseUser.uid,
        firstName,
        lastName: lastName ?? "",
        email,
        phone,
        role: "RENTER",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      };

      /* Create renter */

      const renterRef = db
        .collection("renters")
        .doc();

      const renter = {
        id: renterRef.id,
        userId: userRef.id,
        hostelId,
        roomId,
        joiningDate,
        monthlyFee,
        securityDeposit:
          securityDeposit ?? 0,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      };

      const batch = db.batch();

      batch.set(
        userRef,
        userProfile,
      );

      batch.set(
        renterRef,
        renter,
      );

      await batch.commit();

      await writeAuditLog({
        actorId: req.authUser.id,
        action:
          "CREATE_RENTER_ACCOUNT",
        entityType: "RENTER",
        entityId: renterRef.id,
        metadata: {
          hostelId,
          userId: userRef.id,
          roomId,
          email,
        },
      });

      res.status(201).json({
        message:
          "Renter account created successfully",

        renter: {
          ...renter,

          user: {
            id: userRef.id,
            firstName,
            lastName: lastName ?? "",
            email,
            phone,
          },
        },
      });
    } catch (error) {
      if (createdUserId) {
        try {
          await db
            .collection("users")
            .doc(createdUserId)
            .delete();
        } catch (cleanupError) {
          console.error(
            "RENTER USER PROFILE CLEANUP ERROR:",
            cleanupError,
          );
        }
      }

      if (createdFirebaseUid) {
        try {
          await firebaseAuth.deleteUser(
            createdFirebaseUid,
          );
        } catch (cleanupError) {
          console.error(
            "FIREBASE RENTER ACCOUNT CLEANUP ERROR:",
            cleanupError,
          );
        }
      }

      next(error);
    }
  },
);

/* ---------------------------------------------------------
   CREATE RENTER
--------------------------------------------------------- */

router.post(
  "/:hostelId/renters",
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

      const parsed =
        renterSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          message: "Invalid renter data",
          errors: parsed.error.flatten(),
        });
        return;
      }

      const {
        userId,
        roomId,
        joiningDate,
        monthlyFee,
        securityDeposit,
      } = parsed.data;

      /* User */

      const userRef = db
        .collection("users")
        .doc(userId);

      const user = await userRef.get();

      if (!user.exists) {
        res.status(404).json({
          message: "User not found",
        });
        return;
      }

      if (
        user.data()?.role !== "RENTER"
      ) {
        res.status(400).json({
          message:
            "Selected user is not a Renter",
        });
        return;
      }

      if (
        user.data()?.status !== "ACTIVE"
      ) {
        res.status(400).json({
          message:
            "Renter user is not active",
        });
        return;
      }

      /* Room */

      const room = await db
        .collection("rooms")
        .doc(roomId)
        .get();

      if (
        !room.exists ||
        room.data()?.hostelId !== hostelId
      ) {
        res.status(404).json({
          message: "Room not found",
        });
        return;
      }

      if (
        room.data()?.status !== "ACTIVE"
      ) {
        res.status(400).json({
          message: "Room is inactive",
        });
        return;
      }

      /* Prevent two active renters in the same room */

      const roomRenters = await db
        .collection("renters")
        .where("roomId", "==", roomId)
        .get();

      const roomAlreadyOccupied =
        roomRenters.docs.some((doc) => {
          const data = doc.data();

          return (
            data.hostelId === hostelId &&
            data.status === "ACTIVE"
          );
        });

      if (roomAlreadyOccupied) {
        res.status(409).json({
          message:
            "Room already has an active renter",
        });
        return;
      }

      /* Prevent duplicate active assignment */

      const existingRenter = await db
        .collection("renters")
        .where(
          "userId",
          "==",
          userId,
        )
        .where(
          "status",
          "==",
          "ACTIVE",
        )
        .limit(1)
        .get();

      if (!existingRenter.empty) {
        res.status(409).json({
          message:
            "Renter already has an active assignment",
        });
        return;
      }

      const renterRef = db
        .collection("renters")
        .doc();

      const now =
        new Date().toISOString();

      const renter = {
        id: renterRef.id,
        userId,
        hostelId,
        roomId,
        joiningDate,
        monthlyFee,
        securityDeposit:
          securityDeposit ?? 0,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      };

      await renterRef.set(renter);

      await writeAuditLog({
        actorId: req.authUser.id,
        action: "CREATE_RENTER",
        entityType: "RENTER",
        entityId: renterRef.id,
        metadata: {
          hostelId,
          userId,
          roomId,
        },
      });

      res.status(201).json({
        message:
          "Renter created successfully",
        renter,
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ---------------------------------------------------------
   LIST RENTERS
--------------------------------------------------------- */

router.get(
  "/:hostelId/renters",
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
        .collection("renters")
        .where(
          "hostelId",
          "==",
          hostelId,
        )
        .get();

      const renters =
        await Promise.all(
          snapshot.docs.map(
            async (doc) => {
              const data =
                doc.data();

              const [
                user,
                room,
              ] = await Promise.all([
                db
                  .collection("users")
                  .doc(
                    String(
                      data.userId,
                    ),
                  )
                  .get(),

                db
                  .collection("rooms")
                  .doc(
                    String(
                      data.roomId,
                    ),
                  )
                  .get(),
              ]);

              return {
                id: doc.id,
                ...data,

                user: user.exists
                  ? {
                      id: user.id,
                      firstName:
                        user.data()
                          ?.firstName ??
                        "",
                      lastName:
                        user.data()
                          ?.lastName ??
                        "",
                      email:
                        user.data()
                          ?.email ??
                        "",
                      phone:
                        user.data()
                          ?.phone ??
                        "",
                    }
                  : null,

                room: room.exists
                  ? {
                      id: room.id,
                      roomNumber:
                        room.data()
                          ?.roomNumber ??
                        "",
                      floor:
                        room.data()
                          ?.floor ??
                        null,
                    }
                  : null,
              };
            },
          ),
        );

      renters.sort((a, b) => {
        const aName =
          `${a.user?.firstName ?? ""} ${a.user?.lastName ?? ""}`.trim();

        const bName =
          `${b.user?.firstName ?? ""} ${b.user?.lastName ?? ""}`.trim();

        return aName.localeCompare(
          bName,
        );
      });

      res.json({
        renters,
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ---------------------------------------------------------
   GET RENTER
--------------------------------------------------------- */

router.get(
  "/:hostelId/renters/:renterId",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      const hostelId =
        req.params.hostelId;

      const renterId =
        req.params.renterId;

      if (
        typeof hostelId !== "string" ||
        typeof renterId !== "string"
      ) {
        res.status(400).json({
          message: "Invalid ID",
        });
        return;
      }

      const renterRef = db
        .collection("renters")
        .doc(renterId);

      const renter =
        await renterRef.get();

      if (
        !renter.exists ||
        renter.data()?.hostelId !==
          hostelId
      ) {
        res.status(404).json({
          message:
            "Renter not found",
        });
        return;
      }

      const data =
        renter.data();

      const [
        user,
        room,
      ] = await Promise.all([
        db
          .collection("users")
          .doc(
            String(
              data?.userId,
            ),
          )
          .get(),

        db
          .collection("rooms")
          .doc(
            String(
              data?.roomId,
            ),
          )
          .get(),
      ]);

      res.json({
        renter: {
          id: renter.id,
          ...data,

          user: user.exists
            ? {
                id: user.id,
                firstName:
                  user.data()
                    ?.firstName ??
                  null,
                lastName:
                  user.data()
                    ?.lastName ??
                  null,
                email:
                  user.data()
                    ?.email ??
                  null,
                phone:
                  user.data()
                    ?.phone ??
                  null,
                profilePhotoUrl:
                  user.data()
                    ?.profilePhotoUrl ??
                  null,
              }
            : null,

          room: room.exists
            ? {
                id: room.id,
                roomNumber:
                  room.data()
                    ?.roomNumber ??
                  null,
                floor:
                  room.data()
                    ?.floor ??
                  null,
              }
            : null,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ---------------------------------------------------------
   UPDATE RENTER
--------------------------------------------------------- */

router.patch(
  "/:hostelId/renters/:renterId",
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

      const hostelId =
        req.params.hostelId;

      const renterId =
        req.params.renterId;

      if (
        typeof hostelId !== "string" ||
        typeof renterId !== "string"
      ) {
        res.status(400).json({
          message: "Invalid ID",
        });
        return;
      }

      const parsed =
        updateRenterSchema.safeParse(
          req.body,
        );

      if (!parsed.success) {
        res.status(400).json({
          message: "Invalid renter data",
          errors: parsed.error.flatten(),
        });
        return;
      }

      const renterRef = db
        .collection("renters")
        .doc(renterId);

      const renter =
        await renterRef.get();

      if (
        !renter.exists ||
        renter.data()?.hostelId !==
          hostelId
      ) {
        res.status(404).json({
          message:
            "Renter not found",
        });
        return;
      }

      /* If changing room, verify new room */

      if (parsed.data.roomId) {
        const newRoom =
          await db
            .collection("rooms")
            .doc(
              parsed.data.roomId,
            )
            .get();

        if (
          !newRoom.exists ||
          newRoom.data()
            ?.hostelId !==
            hostelId
        ) {
          res.status(404).json({
            message:
              "New room not found",
          });
          return;
        }

        if (
          newRoom.data()
            ?.status !==
          "ACTIVE"
        ) {
          res.status(400).json({
            message:
              "New room is inactive",
          });
          return;
        }
      }

      const now =
        new Date().toISOString();

      await renterRef.update({
        ...parsed.data,
        updatedAt: now,
      });

      const updated =
        await renterRef.get();

      await writeAuditLog({
        actorId:
          req.authUser.id,
        action:
          "UPDATE_RENTER",
        entityType:
          "RENTER",
        entityId:
          renterId,
        metadata:
          parsed.data,
      });

      res.json({
        message:
          "Renter updated successfully",

        renter: {
          id: updated.id,
          ...updated.data(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/* ---------------------------------------------------------
   MARK RENTER AS LEFT
--------------------------------------------------------- */

router.delete(
  "/:hostelId/renters/:renterId",
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

      const hostelId =
        req.params.hostelId;

      const renterId =
        req.params.renterId;

      if (
        typeof hostelId !== "string" ||
        typeof renterId !== "string"
      ) {
        res.status(400).json({
          message: "Invalid ID",
        });
        return;
      }

      const renterRef = db
        .collection("renters")
        .doc(renterId);

      const renter =
        await renterRef.get();

      if (
        !renter.exists ||
        renter.data()?.hostelId !==
          hostelId
      ) {
        res.status(404).json({
          message:
            "Renter not found",
        });
        return;
      }

      const now =
        new Date().toISOString();

      await renterRef.update({
        status: "LEFT",
        updatedAt: now,
      });

      await writeAuditLog({
        actorId:
          req.authUser.id,
        action:
          "RENTER_LEFT",
        entityType:
          "RENTER",
        entityId:
          renterId,
        metadata: {
          hostelId,
        },
      });

      res.json({
        message:
          "Renter marked as left successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;