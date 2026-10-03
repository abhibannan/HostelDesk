import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import { env } from "./config/env.js";
import apiRouter from "./routes/index.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());
app.use(compression());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, native clients, curl)
      if (!origin) return callback(null, true);
      if (env.CORS_ORIGIN === "*") return callback(null, true);
      const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  }),
);

app.use("/api/v1", apiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
  });
});

// Global error handler
app.use(errorMiddleware);

export default app;