import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import { requireAuth } from "../../middleware/auth.middleware.js";
import { storage, db } from "../../config/firebase.js";

const router = Router();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(
        new Error(
          "Only JPG, PNG, and WebP images are allowed",
        ),
      );
      return;
    }

    callback(null, true);
  },
});

router.post(
  "/",
  requireAuth,
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.authUser) {
        res.status(401).json({
          message: "StayNexa user profile required",
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          message: "No file uploaded",
        });
        return;
      }

      const extension =
        path.extname(req.file.originalname).toLowerCase() ||
        ".jpg";

      const fileId = randomUUID();

      const storagePath =
        `uploads/${req.authUser.id}/${fileId}${extension}`;

      const file = storage.file(storagePath);

      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
          metadata: {
            uploadedBy: req.authUser.id,
            originalName: req.file.originalname,
          },
        },
      });

      const uploadRecord = {
        id: fileId,
        userId: req.authUser.id,
        storagePath,
        originalName: req.file.originalname,
        contentType: req.file.mimetype,
        size: req.file.size,
        createdAt: FieldValue.serverTimestamp(),
      };

      await db
        .collection("uploads")
        .doc(fileId)
        .set(uploadRecord);

      res.status(201).json({
        message: "File uploaded successfully",
        file: {
          id: fileId,
          storagePath,
          originalName: req.file.originalname,
          contentType: req.file.mimetype,
          size: req.file.size,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;