import { Router } from "express";
import { z } from "zod";
import { db } from "../../config/firebase.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireHostelAccess } from "../../middleware/hostel-access.middleware.js";
import { writeAuditLog } from "../../utils/audit.js";

const router = Router();

const roomSchema = z.object({
  roomNumber: z.string().trim().min(1).max(50),
  floor: z.string().trim().max(50).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

const updateRoomSchema = roomSchema.partial();

// Create room
router.post(
  "/:hostelId/rooms",
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

      const parsed = roomSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          message: "Invalid room data",
          errors: parsed.error.flatten(),
        });
        return;
      }

      const hostelRef = db.collection("hostels").doc(hostelId);
      const hostel = await hostelRef.get();

      if (!hostel.exists) {
        res.status(404).json({ message: "Hostel not found" });
        return;
      }

      const existing = await db
        .collection("rooms")
        .where("hostelId", "==", hostelId)
        .where("roomNumber", "==", parsed.data.roomNumber)
        .limit(1)
        .get();

      if (!existing.empty) {
        res.status(409).json({
          message: "Room number already exists in this hostel",
        });
        return;
      }

      const roomRef = db.collection("rooms").doc();
      const now = new Date().toISOString();

      const room = {
        id: roomRef.id,
        hostelId,
        roomNumber: parsed.data.roomNumber,
        floor: parsed.data.floor ?? null,
        status: parsed.data.status ?? "ACTIVE",
        createdAt: now,
        updatedAt: now,
      };

      await roomRef.set(room);

      await writeAuditLog({
        actorId: req.authUser.id,
        action: "CREATE_ROOM",
        entityType: "ROOM",
        entityId: roomRef.id,
        metadata: {
          hostelId,
          roomNumber: parsed.data.roomNumber,
        },
      });

      res.status(201).json({
        message: "Room created successfully",
        room,
      });
    } catch (error) {
      next(error);
    }
  },
);

// List rooms
router.get(
  "/:hostelId/rooms",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      const hostelId = req.params.hostelId;

      if (typeof hostelId !== "string") {
        res.status(400).json({ message: "Invalid hostel ID" });
        return;
      }

      const snapshot = await db
        .collection("rooms")
        .where("hostelId", "==", hostelId)
        .get();

      const rooms = snapshot.docs
  .map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      hostelId: String(data.hostelId ?? hostelId),
      roomNumber: String(data.roomNumber ?? ""),
      floor: data.floor ?? null,
      status: data.status ?? "ACTIVE",
      createdAt: data.createdAt ?? null,
      updatedAt: data.updatedAt ?? null,
    };
  })
  .sort((a, b) =>
    a.roomNumber.localeCompare(b.roomNumber),
  );

      res.json({ rooms });
    } catch (error) {
      next(error);
    }
  },
);

// Get one room
router.get(
  "/:hostelId/rooms/:roomId",
  requireAuth,
  requireHostelAccess,
  async (req, res, next) => {
    try {
      const hostelId = req.params.hostelId;
      const roomId = req.params.roomId;

      if (
        typeof hostelId !== "string" ||
        typeof roomId !== "string"
      ) {
        res.status(400).json({ message: "Invalid ID" });
        return;
      }

      const roomRef = db.collection("rooms").doc(roomId);
      const room = await roomRef.get();

      if (!room.exists) {
        res.status(404).json({ message: "Room not found" });
        return;
      }

      const data = room.data();

      if (data?.hostelId !== hostelId) {
        res.status(404).json({ message: "Room not found" });
        return;
      }

      res.json({
        room: {
          id: room.id,
          ...data,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Update room
router.patch(
  "/:hostelId/rooms/:roomId",
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
      const roomId = req.params.roomId;

      if (
        typeof hostelId !== "string" ||
        typeof roomId !== "string"
      ) {
        res.status(400).json({ message: "Invalid ID" });
        return;
      }

      const parsed = updateRoomSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          message: "Invalid room data",
          errors: parsed.error.flatten(),
        });
        return;
      }

      const roomRef = db.collection("rooms").doc(roomId);
      const room = await roomRef.get();

      if (!room.exists || room.data()?.hostelId !== hostelId) {
        res.status(404).json({ message: "Room not found" });
        return;
      }

      if (parsed.data.roomNumber) {
        const duplicate = await db
          .collection("rooms")
          .where("hostelId", "==", hostelId)
          .where("roomNumber", "==", parsed.data.roomNumber)
          .limit(2)
          .get();

        const duplicateExists = duplicate.docs.some(
          (doc) => doc.id !== roomId,
        );

        if (duplicateExists) {
          res.status(409).json({
            message: "Room number already exists in this hostel",
          });
          return;
        }
      }

      await roomRef.update({
        ...parsed.data,
        updatedAt: new Date().toISOString(),
      });

      const updated = await roomRef.get();

      await writeAuditLog({
        actorId: req.authUser.id,
        action: "UPDATE_ROOM",
        entityType: "ROOM",
        entityId: roomId,
        metadata: parsed.data,
      });

      res.json({
        message: "Room updated successfully",
        room: {
          id: updated.id,
          ...updated.data(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Delete room
router.delete(
  "/:hostelId/rooms/:roomId",
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
      const roomId = req.params.roomId;

      if (
        typeof hostelId !== "string" ||
        typeof roomId !== "string"
      ) {
        res.status(400).json({ message: "Invalid ID" });
        return;
      }

      const roomRef = db.collection("rooms").doc(roomId);
      const room = await roomRef.get();

      if (!room.exists || room.data()?.hostelId !== hostelId) {
        res.status(404).json({ message: "Room not found" });
        return;
      }

      const activeRenters = await db
        .collection("renters")
        .where("hostelId", "==", hostelId)
        .where("roomId", "==", roomId)
        .where("status", "==", "ACTIVE")
        .limit(1)
        .get();

      if (!activeRenters.empty) {
        res.status(409).json({
          message: "Cannot delete a room with an active renter",
        });
        return;
      }

      await roomRef.delete();

      await writeAuditLog({
        actorId: req.authUser.id,
        action: "DELETE_ROOM",
        entityType: "ROOM",
        entityId: roomId,
        metadata: { hostelId },
      });

      res.json({
        message: "Room deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
