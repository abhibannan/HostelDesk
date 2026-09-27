import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

import { env } from "./env.js";

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
        storageBucket: `${env.FIREBASE_PROJECT_ID}.appspot.com`,
      });

if (!app) {
  throw new Error("Firebase Admin app failed to initialize");
}

export const firebaseAuth = getAuth(app);

export const db = getFirestore(app);

export const storage = getStorage(app).bucket();