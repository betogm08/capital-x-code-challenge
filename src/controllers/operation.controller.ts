import type { NextFunction, Request, Response } from "express";
import { createOperation } from "../services/operation.service";
import type { CreateOperationInput } from "../schemas/operation.schema";

export function postOperation(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const operation = createOperation(req.body as CreateOperationInput);
    res.status(201).json(operation);
  } catch (error) {
    next(error);
  }
}
