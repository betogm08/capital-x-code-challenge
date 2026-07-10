import type { NextFunction, Request, Response } from "express";
import { isAppError } from "../errors";

// Middleware de errores de Express: se registra al final de app.ts y atrapa
// cualquier error que se mande con next(error) desde un controller. Si es un
// error "de los nuestros" (creado con las factories de errors.ts), responde con
// su statusCode y mensaje reales; si es cualquier otro error inesperado, responde
// 500 genérico para no filtrar detalles internos al que hizo el request.
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
