import type { NextFunction, Request, Response } from "express";

import { firebaseAuth, db } from "../config/firebase.js";
import type { AuthUser } from "../types/auth.js";

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
    const snapshot = await db
      .collection("users")
      .where("firebaseUid", "==", firebaseUser.uid)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.error(
        "STAYNEXA USER PROFILE NOT FOUND FOR FIREBASE UID:",
        firebaseUser.uid,
      );

      res.status(404).json({
        message: "StayNexa user profile not found",
      });
      return;
    }

    const userDocument = snapshot.docs[0];

    if (!userDocument) {
      res.status(404).json({
        message: "StayNexa user profile not found",
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

    next();
  } catch (error) {
    console.error("STAYNEXA USER LOOKUP ERROR:", error);

    res.status(500).json({
      message: "Unable to load StayNexa user profile",
    });
  }
}