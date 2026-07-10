import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { badRequestError } from "../errors";

type Source = "body" | "params";

// Middleware que valida el body o los params de un request contra un schema de Zod
// antes de que le lleguen al controller. Si algo no cuadra, corta con un 400 y dice
// qué campo falló y por qué; si todo está bien, deja pasar el request con los datos
// ya convertidos (ej. un id que llegó como string en la URL, ya como number).
export function validate(schema: ZodSchema, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const { issues } = result.error;
      const details = issues.map(({ path, message }) => ({
        campo: path.join(".") || source,
        motivo: message,
      }));
      next(badRequestError("Datos de entrada inválidos", details));
      return;
    }

    const { data } = result;
    (req as unknown as Record<Source, unknown>)[source] = data;
    next();
  };
}
