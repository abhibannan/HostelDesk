import type { NextFunction, Request, Response } from "express";
import { recordSystemLog } from "../services/telemetry.service.js";

export function errorMiddleware(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error(error);

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  recordSystemLog({
    level: "ERROR",
    message: errorMessage || "Unhandled Internal Server Error",
    source: "EXPRESS_GLOBAL_HANDLER",
    route: req.originalUrl || req.url,
    method: req.method,
    statusCode: 500,
    stack: errorStack,
  });

  if (res.headersSent) return;

  res.status(500).json({
    message: "Internal server error",
  });
}

