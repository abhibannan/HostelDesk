import { Router } from "express";
import { z } from "zod";
import { firebaseAuth, db } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { writeAuditLog } from "../../utils/audit.js";

const router = Router();

const profileSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().max(100).optional(),
});

router.post("/bootstrap", requireAuth, async (req, res, next) => {
  try {
    const firebaseUser = req.firebaseUser;
    if (!firebaseUser?.email) {
      res.status(400).json({ message: "Firebase account must have an email" });
      return;
    }

    const email = firebaseUser.email.toLowerCase();

    if (email !== env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
      res.status(403).json({ message: "This account is not authorized for bootstrap" });
      return;
    }

    const existingSuperAdmin = await db
      .collection("users")
      .where("role", "==", "SUPER_ADMIN")
      .limit(20)
      .get();

    if (existingSuperAdmin.docs.some((item) => item.data().status === "ACTIVE")) {
      res.status(409).json({ message: "Super Admin already exists" });
      return;
    }

    const existingUser = await db.collection("users").doc(firebaseUser.uid).get();
    if (existingUser.exists) {
      res.status(409).json({ message: "User already exists" });
      return;
    }

    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid profile data",
        errors: parsed.error.flatten(),
      });
      return;
    }

    const now = new Date().toISOString();
    const user = {
      id: firebaseUser.uid,
      firebaseUid: firebaseUser.uid,
      email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName?.trim() || null,
      phone: firebaseUser.phone_number ?? null,
      profilePhotoUrl: firebaseUser.picture ?? null,
      role: "SUPER_ADMIN" as const,
      status: "ACTIVE" as const,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("users").doc(firebaseUser.uid).set(user);
    await writeAuditLog({
      actorId: firebaseUser.uid,
      action: "BOOTSTRAP_SUPER_ADMIN",
      entityType: "USER",
      entityId: firebaseUser.uid,
    });

    res.status(201).json({
      message: "Super Admin created successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  res.status(200).json({ user: req.authUser });
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const parsed = profileSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid profile data",
        errors: parsed.error.flatten(),
      });
      return;
    }

    const updates = {
      ...(parsed.data.firstName !== undefined && { firstName: parsed.data.firstName }),
      ...(parsed.data.lastName !== undefined && {
        lastName: parsed.data.lastName.trim() || null,
      }),
      updatedAt: new Date().toISOString(),
    };

    await db.collection("users").doc(req.authUser!.id).update(updates);
    const updated = await db.collection("users").doc(req.authUser!.id).get();

    res.json({
      user: { id: updated.id, ...updated.data() },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/admins", requireAuth, async (req, res, next) => {
  try {
    if (req.authUser?.role !== "SUPER_ADMIN") {
      res.status(403).json({ message: "Only Super Admin can create admins" });
      return;
    }

    const schema = profileSchema.extend({
      email: z.string().email(),
      password: z.string().min(8).max(128),
      phone: z.string().max(30).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid admin data",
        errors: parsed.error.flatten(),
      });
      return;
    }

    const firebaseUser = await firebaseAuth.createUser({
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      displayName: `${parsed.data.firstName} ${parsed.data.lastName ?? ""}`.trim(),
      ...(parsed.data.phone ? { phoneNumber: parsed.data.phone } : {}),
    });

    const now = new Date().toISOString();
    const user = {
      id: firebaseUser.uid,
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email!,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName?.trim() || null,
      phone: parsed.data.phone ?? null,
      profilePhotoUrl: null,
      role: "ADMIN" as const,
      status: "ACTIVE" as const,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("users").doc(firebaseUser.uid).set(user);
    await writeAuditLog({
      actorId: req.authUser.id,
      action: "CREATE_ADMIN",
      entityType: "USER",
      entityId: firebaseUser.uid,
    });

    res.status(201).json({
      message: "Admin created successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
