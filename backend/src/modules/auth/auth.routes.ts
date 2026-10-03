import { Router } from "express";
import { z } from "zod";
import { firebaseAuth, db } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { writeAuditLog } from "../../utils/audit.js";
import { sendPasswordEmail } from "../../utils/mailer.js";

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

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  guardianName: z.string().trim().max(100).optional(),
  guardianPhone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(20).optional(),
  emergencyContactName: z.string().trim().max(100).optional(),
  emergencyContactPhone: z.string().trim().max(30).optional(),
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid profile data",
        errors: parsed.error.flatten(),
      });
      return;
    }

    const data = parsed.data;
    const now = new Date().toISOString();

    const userUpdates: Record<string, any> = {
      ...(data.firstName !== undefined && { firstName: data.firstName }),
      ...(data.lastName !== undefined && { lastName: data.lastName.trim() || null }),
      ...(data.phone !== undefined && { phone: data.phone.trim() || null }),
      ...(data.guardianName !== undefined && { guardianName: data.guardianName.trim() || null }),
      ...(data.guardianPhone !== undefined && { guardianPhone: data.guardianPhone.trim() || null }),
      ...(data.address !== undefined && { address: data.address.trim() || null }),
      ...(data.city !== undefined && { city: data.city.trim() || null }),
      ...(data.state !== undefined && { state: data.state.trim() || null }),
      ...(data.pincode !== undefined && { pincode: data.pincode.trim() || null }),
      ...(data.emergencyContactName !== undefined && { emergencyContactName: data.emergencyContactName.trim() || null }),
      ...(data.emergencyContactPhone !== undefined && { emergencyContactPhone: data.emergencyContactPhone.trim() || null }),
      updatedAt: now,
    };

    await db.collection("users").doc(req.authUser!.id).update(userUpdates);

    // If this user is a renter, also sync their renter doc
    const renterDocs = await db
      .collection("renters")
      .where("userId", "==", req.authUser!.id)
      .get();

    if (!renterDocs.empty) {
      const renterUpdates: Record<string, any> = {
        updatedAt: now,
        ...(data.guardianName !== undefined && { guardianName: data.guardianName.trim() || "" }),
        ...(data.guardianPhone !== undefined && { guardianPhone: data.guardianPhone.trim() || "" }),
      };
      await Promise.all(
        renterDocs.docs.map((doc) => doc.ref.update(renterUpdates)),
      );
    }

    const updated = await db.collection("users").doc(req.authUser!.id).get();

    res.json({
      message: "Profile updated successfully",
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

const changePasswordSchema = z.object({
  password: z.string().min(6).max(128),
});

router.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Password must be at least 6 characters long",
        errors: parsed.error.flatten(),
      });
      return;
    }

    const firebaseUid = req.authUser!.firebaseUid;
    if (!firebaseUid) {
      res.status(400).json({ message: "Invalid user account" });
      return;
    }

    await firebaseAuth.updateUser(firebaseUid, {
      password: parsed.data.password,
    });

    await writeAuditLog({
      actorId: req.authUser!.id,
      action: "CHANGE_PASSWORD",
      entityType: "USER",
      entityId: req.authUser!.id,
    });

    res.json({
      message: "Password updated successfully. You can now use this password to sign in.",
    });
  } catch (error) {
    next(error);
  }
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "A valid email is required" });
      return;
    }

    const email = parsed.data.email.toLowerCase().trim();
    let userRecord: import("firebase-admin/auth").UserRecord | null = null;
    let displayName = "Resident";

    try {
      userRecord = await firebaseAuth.getUserByEmail(email);
      if (userRecord?.displayName) displayName = userRecord.displayName;
    } catch {
      // Check Firestore renters collection if not in Auth directly
      const renterSnap = await db.collection("renters").where("email", "==", email).limit(1).get();
      const firstDoc = renterSnap.docs[0];
      if (firstDoc) {
        const rData = firstDoc.data();
        displayName = rData.name || rData.fullName || "Resident";
        if (rData.userId) {
          try {
            userRecord = await firebaseAuth.getUser(rData.userId);
          } catch {}
        }
      }
    }

    if (!userRecord) {
      // Return 200 to prevent user enumeration
      res.json({
        message: "If your email is registered, your new password has been sent to your inbox.",
      });
      return;
    }

    // Generate secure temporary password: Nexa@ + 6 alphanumeric
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let randomPart = "";
    for (let i = 0; i < 6; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const newPassword = `Nexa@${randomPart}`;

    // Update password in Firebase Auth
    await firebaseAuth.updateUser(userRecord.uid, {
      password: newPassword,
    });

    // Send email to renter with new password
    await sendPasswordEmail(email, newPassword, displayName);

    await writeAuditLog({
      actorId: userRecord.uid,
      action: "RESET_PASSWORD",
      entityType: "USER",
      entityId: userRecord.uid,
    });

    res.json({
      message: "A new password has been sent to your registered email address.",
    });
  } catch (error) {
    next(error);
  }
});

// Resolve email from email OR mobile number
router.post("/login-lookup", async (req, res, next) => {
  try {
    const { identifier } = req.body;
    if (!identifier || typeof identifier !== "string") {
      res.status(400).json({ message: "Identifier is required" });
      return;
    }
    const clean = identifier.trim();

    // 1. Try finding by email
    if (clean.includes("@")) {
      const emailSnap = await db
        .collection("users")
        .where("email", "==", clean.toLowerCase())
        .limit(1)
        .get();
      if (!emailSnap.empty && emailSnap.docs[0]) {
        const u = emailSnap.docs[0].data();
        res.json({
          found: true,
          email: u.email,
          phone: u.phone,
          role: u.role,
        });
        return;
      }
    }

    // 2. Try finding by phone number
    const digitsOnly = clean.replace(/\D/g, "");
    const candidatePhones = Array.from(new Set([
      clean,
      digitsOnly,
      digitsOnly.length >= 10 ? `+91${digitsOnly.slice(-10)}` : "",
      digitsOnly.length >= 10 ? digitsOnly.slice(-10) : "",
    ])).filter(Boolean);

    for (const p of candidatePhones) {
      const phoneSnap = await db
        .collection("users")
        .where("phone", "==", p)
        .limit(1)
        .get();
      if (!phoneSnap.empty && phoneSnap.docs[0]) {
        const u = phoneSnap.docs[0].data();
        res.json({
          found: true,
          email: u.email,
          phone: u.phone,
          role: u.role,
        });
        return;
      }
    }

    // 3. Also check repairPersons collection
    for (const p of candidatePhones) {
      const rpSnap = await db
        .collection("repairPersons")
        .where("phone", "==", p)
        .limit(1)
        .get();
      if (!rpSnap.empty && rpSnap.docs[0]) {
        const rp = rpSnap.docs[0].data();
        res.json({
          found: true,
          email: rp.email,
          phone: rp.phone,
          role: "REPAIR_PERSON",
        });
        return;
      }
    }

    res.status(404).json({ message: "No account found with this email or mobile number" });
  } catch (error) {
    next(error);
  }
});

// Repair login helper with Firebase custom token
router.post("/repair-login", async (req, res, next) => {
  try {
    const { identifier } = req.body;
    if (!identifier || typeof identifier !== "string") {
      res.status(400).json({ message: "Email or mobile number is required" });
      return;
    }
    const clean = identifier.trim();
    let email = clean.toLowerCase();

    if (!clean.includes("@")) {
      const digitsOnly = clean.replace(/\D/g, "");
      const candidatePhones = Array.from(new Set([
        clean,
        digitsOnly,
        digitsOnly.length >= 10 ? `+91${digitsOnly.slice(-10)}` : "",
        digitsOnly.length >= 10 ? digitsOnly.slice(-10) : "",
      ])).filter(Boolean);

      let found = false;
      for (const p of candidatePhones) {
        const snap = await db
          .collection("users")
          .where("phone", "==", p)
          .limit(1)
          .get();
        if (!snap.empty && snap.docs[0]) {
          email = String(snap.docs[0].data().email || "");
          found = true;
          break;
        }
      }

      if (!found) {
        for (const p of candidatePhones) {
          const snap = await db
            .collection("repairPersons")
            .where("phone", "==", p)
            .limit(1)
            .get();
          if (!snap.empty && snap.docs[0]) {
            email = String(snap.docs[0].data().email || "");
            found = true;
            break;
          }
        }
      }

      if (!found) {
        res.status(404).json({ message: "No repair account found with this mobile number" });
        return;
      }
    }

    const userDocSnap = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    const userDoc = userDocSnap.docs[0];
    if (!userDoc || !userDoc.exists) {
      res.status(404).json({ message: "User account not found" });
      return;
    }

    const userData = userDoc.data();
    const customToken = await firebaseAuth.createCustomToken(userDoc.id);

    res.json({
      message: "Lookup successful",
      email,
      customToken,
      user: {
        id: userDoc.id,
        ...userData,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
