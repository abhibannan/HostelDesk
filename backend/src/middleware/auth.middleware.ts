import type { NextFunction, Request, Response } from "express";

import { firebaseAuth, db } from "../config/firebase.js";
import type { AuthUser } from "../types/auth.js";

interface CachedAuth {
  firebaseUser: any;
  authUser: AuthUser;
  cachedAt: number;
}

const authCache = new Map<string, CachedAuth>();
const AUTH_CACHE_TTL_MS = 45 * 1000; // 45 seconds TTL
const MAX_AUTH_CACHE_SIZE = 1000;

export function invalidateAuthCache(userId?: string) {
  if (userId) {
    for (const [token, entry] of authCache.entries()) {
      if (entry.authUser.id === userId || entry.firebaseUser.uid === userId) {
        authCache.delete(token);
      }
    }
  } else {
    authCache.clear();
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({
      message: "Missing Authorization header",
    });
    return;
  }

  const token = authorization.substring(7).trim();

  if (!token) {
    res.status(401).json({
      message: "Missing Firebase ID token",
    });
    return;
  }

  // Fast path: in-memory cached authentication
  const cached = authCache.get(token);
  if (cached && Date.now() - cached.cachedAt < AUTH_CACHE_TTL_MS) {
    req.firebaseUser = cached.firebaseUser;
    req.authUser = cached.authUser;
    next();
    return;
  }

  // Step 1: Verify Firebase token
  let firebaseUser;

  try {
    firebaseUser = await firebaseAuth.verifyIdToken(token);
    req.firebaseUser = firebaseUser;
  } catch (error) {
    console.error("FIREBASE TOKEN VERIFICATION ERROR:", error);

    res.status(401).json({
      message: "Invalid or expired Firebase ID token",
    });
    return;
  }

  // Step 2: Find StayNexa user profile
  try {
    let userDocument = null;
    const snapshot = await db
      .collection("users")
      .where("firebaseUid", "==", firebaseUser.uid)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      userDocument = snapshot.docs[0];
    } else if (firebaseUser.email) {
      // Fallback by email (e.g. created by admin, now logging in with Google)
      const emailSnapshot = await db
        .collection("users")
        .where("email", "==", firebaseUser.email.toLowerCase())
        .limit(1)
        .get();

      if (!emailSnapshot.empty && emailSnapshot.docs[0]) {
        userDocument = emailSnapshot.docs[0];
        // Auto-link the new Firebase UID
        await userDocument.ref.update({
          firebaseUid: firebaseUser.uid,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (!userDocument) {
      console.error(
        "STAYNEXA USER PROFILE NOT FOUND FOR FIREBASE UID / EMAIL:",
        firebaseUser.uid,
        firebaseUser.email,
      );

      res.status(404).json({
        message: "StayNexa user profile not found. Please contact your hostel admin.",
      });
      return;
    }

    const authUser = {
      id: userDocument.id,
      ...(userDocument.data() as Omit<AuthUser, "id">),
    } as AuthUser;

    if (authUser.status !== "ACTIVE") {
      res.status(403).json({
        message: "User account is disabled",
      });
      return;
    }

    req.authUser = authUser;

    // Cache the verified auth
    if (authCache.size >= MAX_AUTH_CACHE_SIZE) {
      const firstKey = authCache.keys().next().value;
      if (firstKey) authCache.delete(firstKey);
    }
    authCache.set(token, {
      firebaseUser,
      authUser,
      cachedAt: Date.now(),
    });

    next();
  } catch (error) {
    console.error("STAYNEXA USER LOOKUP ERROR:", error);

    res.status(500).json({
      message: "Unable to load StayNexa user profile",
    });
  }
}