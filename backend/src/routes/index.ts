import { Router } from "express";

import authRouter from "../modules/auth/auth.routes.js";
import hostelsRouter from "../modules/hostels/hostels.routes.js";
import payment_proofs_routes from "../modules/payment-proofs/payment-proofs.routes.js";
import roomsRouter from "../modules/rooms/rooms.routes.js";
import rentersRouter from "../modules/renters/renters.routes.js";
import feesRouter from "../modules/fees/fees.routes.js";
import repairsRouter from "../modules/repairs/repairs.routes.js";
import notificationsRouter from "../modules/notifications/notifications.routes.js";
import dashboardRouter from "../modules/dashboard/dashboard.routes.js";
import uploadsRouter from "../modules/uploads/uploads.routes.js";
import expensesRouter from "../modules/expenses/expenses.routes.js";
import auditLogsRouter from "../modules/audit-logs/audit-logs.routes.js";

import { getPlatformConfig } from "../services/telemetry.service.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "StayNexa API",
    database: "Firebase Firestore",
  });
});

router.get("/platform/status", (_req, res) => {
  const config = getPlatformConfig();
  res.json({
    maintenanceMode: config.maintenanceMode,
    maintenanceNotice: config.maintenanceNotice,
    alertBanner: config.alertBanner,
  });
});

router.use("/auth", authRouter);
router.use("/hostels", hostelsRouter);
router.use("/hostels", roomsRouter);
router.use("/hostels", rentersRouter);
router.use("/hostels", feesRouter);
router.use("/hostels", repairsRouter);
router.use("/notifications", notificationsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/uploads", uploadsRouter);
router.use("/hostels", payment_proofs_routes);
router.use("/hostels", expensesRouter);
router.use("/hostels", auditLogsRouter);

export default router;