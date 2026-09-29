import { FieldValue } from "firebase-admin/firestore";
import { firebaseAuth, db } from "../../config/firebase.js";

export type NotificationType =
  | "FEE_DUE"
  | "FEE_OVERDUE"
  | "PAYMENT_RECORDED"
  | "REPAIR_CREATED"
  | "REPAIR_UPDATED"
  | "SYSTEM"
  | "ANNOUNCEMENT";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  hostelId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}

export async function createNotification(
  input: CreateNotificationInput,
) {
  const userSnapshot = await db
    .collection("users")
    .doc(input.userId)
    .get();

  if (!userSnapshot.exists) {
    throw new Error("Notification user not found");
  }

  const notificationRef = db
    .collection("notifications")
    .doc();

  const notification = {
    id: notificationRef.id,
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    hostelId: input.hostelId ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    read: false,
    readAt: null,
    createdAt: FieldValue.serverTimestamp(),
  };

  await notificationRef.set(notification);

 return {
  ...notification,
};
}