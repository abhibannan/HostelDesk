import type { NextFunction, Request, Response } from "express";
import { db } from "../config/firebase.js";

interface CacheEntry {
  granted: boolean;
  timestamp: number;
}

const accessCache = new Map<string, CacheEntry>();
const ACCESS_CACHE_TTL_MS = 30 * 1000; // 30 seconds TTL

export function invalidateHostelAccessCache(hostelId?: string, userId?: string) {
  if (hostelId || userId) {
    for (const key of accessCache.keys()) {
      if ((hostelId && key.includes(hostelId)) || (userId && key.includes(userId))) {
        accessCache.delete(key);
      }
    }
  } else {
    accessCache.clear();
  }
}

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

    const cacheKey = `${req.authUser.id}_${req.authUser.role}_${hostelId}`;
    const cached = accessCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ACCESS_CACHE_TTL_MS && cached.granted) {
      next();
      return;
    }

    // SUPER ADMIN & ADMIN
    // Full platform access to all hostels ("admin is only the superadmin")
    if (req.authUser.role === "SUPER_ADMIN" || req.authUser.role === "ADMIN") {
      const hostelSnapshot = await db
        .collection("hostels")
        .doc(hostelId)
        .get();

      if (!hostelSnapshot.exists) {
        res.status(404).json({ message: "Hostel not found" });
        return;
      }

      accessCache.set(cacheKey, { granted: true, timestamp: Date.now() });
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

      accessCache.set(cacheKey, { granted: true, timestamp: Date.now() });
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
        accessCache.set(cacheKey, { granted: true, timestamp: Date.now() });
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
        accessCache.set(cacheKey, { granted: true, timestamp: Date.now() });
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