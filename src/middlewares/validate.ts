import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { badRequestError } from "../errors";

type Source = "body" | "params";

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
