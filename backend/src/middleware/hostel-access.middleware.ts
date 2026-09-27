import type { NextFunction, Request, Response } from "express";
import { db } from "../config/firebase.js";

export async function requireHostelAccess(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.authUser) {
      res.status(401).json({ message: "StayNexa user profile required" });
      return;
    }

    const hostelId = req.params.hostelId;

    if (typeof hostelId !== "string" || !hostelId.trim()) {
      res.status(400).json({ message: "Invalid hostel ID" });
      return;
    }

    // SUPER ADMIN
    // Can access only hostels they own.
    if (req.authUser.role === "SUPER_ADMIN") {
      const hostelSnapshot = await db
        .collection("hostels")
        .doc(hostelId)
        .get();

      if (!hostelSnapshot.exists) {
        res.status(404).json({ message: "Hostel not found" });
        return;
      }

      const hostelData = hostelSnapshot.data();

      if (hostelData?.ownerId !== req.authUser.id) {
        res.status(403).json({
          message: "You do not have access to this hostel",
        });
        return;
      }

      next();
      return;
    }

    // ADMIN
    // Can access only hostels currently assigned to them.
    if (req.authUser.role === "ADMIN") {
      const assignmentSnapshot = await db
        .collection("hostelAdmins")
        .doc(hostelId)
        .get();

      if (!assignmentSnapshot.exists) {
        res.status(403).json({
          message: "You do not have access to this hostel",
        });
        return;
      }

      const assignmentData = assignmentSnapshot.data();

      if (assignmentData?.adminId !== req.authUser.id) {
        res.status(403).json({
          message: "You do not have access to this hostel",
        });
        return;
      }

      next();
      return;
    }

    // RENTER
    // Can access only their currently active hostel.
    if (req.authUser.role === "RENTER") {
      const renterSnapshot = await db
        .collection("renters")
        .where("userId", "==", req.authUser.id)
        .where("hostelId", "==", hostelId)
        .where("status", "==", "ACTIVE")
        .limit(1)
        .get();

      if (renterSnapshot.empty) {
        res.status(403).json({
          message: "You do not have access to this hostel",
        });
        return;
      }

      next();
      return;
    }

    res.status(403).json({
      message: "Invalid user role",
    });
  } catch (error) {
    next(error);
  }
}