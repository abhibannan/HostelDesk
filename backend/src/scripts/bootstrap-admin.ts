import { FieldValue } from "firebase-admin/firestore";
import { firebaseAuth, db } from "../config/firebase.js";
import { env } from "../config/env.js";

async function bootstrapAdmin() {
  const email = env.BOOTSTRAP_ADMIN_EMAIL;

  if (!email) {
    throw new Error("BOOTSTRAP_ADMIN_EMAIL is missing from .env");
  }

  const normalizedEmail = email.trim().toLowerCase();

  let firebaseUser;

  try {
    firebaseUser = await firebaseAuth.getUserByEmail(normalizedEmail);
    console.log("Firebase user already exists:", firebaseUser.uid);
  } catch (error: any) {
    if (error?.code !== "auth/user-not-found") {
      throw error;
    }

    throw new Error(
      `Firebase user not found for ${normalizedEmail}. Create this user first in Firebase Authentication.`,
    );
  }

  const existingSnapshot = await db
    .collection("users")
    .where("firebaseUid", "==", firebaseUser.uid)
    .limit(1)
    .get();

  if (!existingSnapshot.empty) {
    const existingDoc = existingSnapshot.docs[0];

    if (!existingDoc) {
      throw new Error("Existing user document could not be read.");
    }

    await existingDoc.ref.update({
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log("Super Admin profile already existed and was updated.");
    console.log("Firestore user ID:", existingDoc.id);
    return;
  }

  const userRef = db.collection("users").doc();

  await userRef.set({
    firebaseUid: firebaseUser.uid,
    email: normalizedEmail,
    firstName: "Super",
    lastName: "Admin",
    phone: null,
    profilePhotoUrl: null,
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log("Super Admin created successfully.");
  console.log("Firestore user ID:", userRef.id);
  console.log("Firebase UID:", firebaseUser.uid);
  console.log("Email:", normalizedEmail);
}

bootstrapAdmin().catch((error) => {
  console.error("BOOTSTRAP ADMIN ERROR:", error);
  process.exit(1);
});