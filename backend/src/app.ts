import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";

import { env } from "./config/env.js";
import apiRouter from "./routes/index.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

import { telemetryMiddleware } from "./services/telemetry.service.js";
import { maintenanceMiddleware } from "./middleware/maintenance.middleware.js";
import { generalApiLimiter, authRateLimiter } from "./middleware/rate-limit.middleware.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());
app.use(compression());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, native clients, curl)
      if (!origin) return callback(null, true);
      // Reflect origin so browsers accept credentials with any local or deployed port
      return callback(null, true);
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "20mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "20mb",
  }),
);

// Track legitimate API traffic telemetry
app.use(telemetryMiddleware);

// Rate limiting on API and Auth endpoints
app.use("/api/v1/auth", authRateLimiter);
app.use("/api/v1", generalApiLimiter);

// Protect platform during maintenance mode
app.use("/api/v1", maintenanceMiddleware);

app.use("/api/v1", apiRouter);

// Set up __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve frontend static files from the frontend/dist directory
const frontendPath = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendPath));

// 404 handler for API routes
app.use("/api", (req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
  });
});

// Catch-all route to serve the React app for any other non-API requests (for React Router)
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Global error handler
app.use(errorMiddleware);

export default app;