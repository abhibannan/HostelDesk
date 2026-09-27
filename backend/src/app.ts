import express from "express";
import cors from "cors";
import helmet from "helmet";

import { env } from "./config/env.js";
import apiRouter from "./routes/index.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: env.CORS_ORIGIN,
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