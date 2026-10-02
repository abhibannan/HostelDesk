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
    // Full platform access to all hostels
    if (req.authUser.role === "SUPER_ADMIN") {
      const hostelSnapshot = await db
        .collection("hostels")
        .doc(hostelId)
        .get();

      if (!hostelSnapshot.exists) {
        res.status(404).json({ message: "Hostel not found" });
        return;
      }

      next();
      return;
    }

    // ADMIN
    // Can access hostels they own or are assigned to
    if (req.authUser.role === "ADMIN") {
      const hostelSnapshot = await db
        .collection("hostels")
        .doc(hostelId)
        .get();

      if (!hostelSnapshot.exists) {
        res.status(404).json({ message: "Hostel not found" });
        return;
      }

      const hostelData = hostelSnapshot.data();

      // Check if admin is the owner
      if (hostelData?.ownerId === req.authUser.id) {
        next();
        return;
      }

      // Check hostelAdmins doc where doc ID is hostelId
      const assignmentSnapshot = await db
        .collection("hostelAdmins")
        .doc(hostelId)
        .get();

      if (assignmentSnapshot.exists && assignmentSnapshot.data()?.adminId === req.authUser.id) {
        next();
        return;
      }

      // Check hostelAdmins collection query
      const assignmentQuery = await db
        .collection("hostelAdmins")
        .where("hostelId", "==", hostelId)
        .where("adminId", "==", req.authUser.id)
        .limit(1)
        .get();

      if (!assignmentQuery.empty) {
        next();
        return;
      }

      res.status(403).json({
        message: "You do not have access to this hostel",
      });
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

    // REPAIR_PERSON
    // Can access hostels they are assigned to
    if (req.authUser.role === "REPAIR_PERSON") {
      const userHostelIds = Array.isArray(req.authUser.hostelIds)
        ? req.authUser.hostelIds
        : [];

      if (userHostelIds.includes(hostelId)) {
        next();
        return;
      }

      const repairPersonSnapshot = await db
        .collection("repairPersons")
        .where("hostelId", "==", hostelId)
        .where("userId", "==", req.authUser.id)
        .limit(1)
        .get();

      if (!repairPersonSnapshot.empty) {
        next();
        return;
      }

      res.status(403).json({
        message: "You do not have access to this hostel",
      });
      return;
    }

    res.status(403).json({
      message: "Invalid user role",
    });
  } catch (error) {
    next(error);
  }
}