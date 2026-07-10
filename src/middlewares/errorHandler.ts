import type { NextFunction, Request, Response } from "express";
import { isAppError } from "../errors";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (isAppError(err)) {
    const { statusCode, message, details } = err;
    res.status(statusCode).json({
      error: message,
      ...(details !== undefined && { details }),
    });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
}
