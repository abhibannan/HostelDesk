import { Router } from "express";
import { z } from "zod";
import { db } from "../../config/firebase.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const router = Router();

const createNotificationSchema = z.object({
  userId: z.string().min(1),
  type: z.enum([
    "FEE_DUE",
    "FEE_OVERDUE",
    "PAYMENT_RECORDED",
    "REPAIR_CREATED",
    "REPAIR_UPDATED",
    "SYSTEM",
  ]),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(1000),
  hostelId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

// Create notification
router.post(
  "/",
  requireAuth,
  async (req, res, next) => {
    try {
      if (
        req.authUser?.role !== "SUPER_ADMIN" &&
        req.authUser?.role !== "ADMIN"
      ) {
        res.status(403).json({
          message: "Only Admin can create notifications",
        });
        return;
      }

      const parsed =
        createNotificationSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          message: "Invalid notification data",
          errors: parsed.error.flatten(),
        });
        return;
      }

      const user = await db
        .collection("users")
        .doc(parsed.data.userId)
        .get();

      if (!user.exists) {
        res.status(404).json({
          message: "User not found",
        });
        return;
      }

      const notificationRef = db
        .collection("notifications")
        .doc();

      const now = new Date().toISOString();

      const notification = {
        id: notificationRef.id,
        userId: parsed.data.userId,
        type: parsed.data.type,
        title: parsed.data.title,
        message: parsed.data.message,
        hostelId: parsed.data.hostelId ?? null,
        entityType:
          parsed.data.entityType ?? null,
        entityId: parsed.data.entityId ?? null,
        read: false,
        createdAt: now,
        readAt: null,
      };

      await notificationRef.set(notification);

      res.status(201).json({
        message: "Notification created successfully",
        notification,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Get current user's notifications
router.get(
  "/me",
  requireAuth,
  async (req, res, next) => {
    try {
      const snapshot = await db
        .collection("notifications")
        .where(
          "userId",
          "==",
          req.authUser!.id,
        )
        .get();

      type NotificationItem = {
        id: string;
        userId: string;
        type: string;
        title: string;
        message: string;
        hostelId: string | null;
        entityType: string | null;
        entityId: string | null;
        read: boolean;
        createdAt: string;
        readAt: string | null;
      };

      const notifications: NotificationItem[] =
        snapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            userId: String(data.userId ?? ""),
            type: String(data.type ?? ""),
            title: String(data.title ?? ""),
            message: String(data.message ?? ""),
            hostelId:
              data.hostelId == null
                ? null
                : String(data.hostelId),
            entityType:
              data.entityType == null
                ? null
                : String(data.entityType),
            entityId:
              data.entityId == null
                ? null
                : String(data.entityId),
            read: Boolean(data.read),
            createdAt: String(
              data.createdAt ?? "",
            ),
            readAt:
              data.readAt == null
                ? null
                : String(data.readAt),
          };
        });

      notifications.sort((a, b) =>
        b.createdAt.localeCompare(
          a.createdAt,
        ),
      );

      res.json({ notifications });
    } catch (error) {
      next(error);
    }
  },
);

// Get unread count
router.get(
  "/me/unread-count",
  requireAuth,
  async (req, res, next) => {
    try {
      const snapshot = await db
        .collection("notifications")
        .where(
          "userId",
          "==",
          req.authUser!.id,
        )
        .where("read", "==", false)
        .get();

      res.json({
        unreadCount: snapshot.size,
      });
    } catch (error) {
      next(error);
    }
  },
);

// Mark notification as read
router.patch(
  "/:notificationId/read",
  requireAuth,
  async (req, res, next) => {
    try {
      const notificationId =
        req.params.notificationId;

      if (
        typeof notificationId !== "string"
      ) {
        res.status(400).json({
          message: "Invalid notification ID",
        });
        return;
      }

      const notificationRef = db
        .collection("notifications")
        .doc(notificationId);

      const notification =
        await notificationRef.get();

      if (!notification.exists) {
        res.status(404).json({
          message: "Notification not found",
        });
        return;
      }

      if (
        notification.data()?.userId !==
        req.authUser!.id
      ) {
        res.status(403).json({
          message: "Access denied",
        });
        return;
      }

      const now = new Date().toISOString();

      await notificationRef.update({
        read: true,
        readAt: now,
      });

      res.json({
        message:
          "Notification marked as read",
      });
    } catch (error) {
      next(error);
    }
  },
);

// Mark all notifications as read
router.patch(
  "/me/read-all",
  requireAuth,
  async (req, res, next) => {
    try {
      const snapshot = await db
        .collection("notifications")
        .where(
          "userId",
          "==",
          req.authUser!.id,
        )
        .where("read", "==", false)
        .get();

      if (snapshot.empty) {
        res.json({
          message:
            "No unread notifications",
        });
        return;
      }

      const batch = db.batch();
      const now = new Date().toISOString();

      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          read: true,
          readAt: now,
        });
      });

      await batch.commit();

      res.json({
        message:
          "All notifications marked as read",
        count: snapshot.size,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;