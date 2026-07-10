import type { NextFunction, Request, Response } from "express";
import { approveClient, createClient } from "../services/client.service";
import { getClientSummary as getClientSummaryUseCase } from "../services/operation.service";
import type { CreateClientInput } from "../schemas/client.schema";

export function postClient(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const client = createClient(req.body as CreateClientInput);
    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
}

export function patchApproveClient(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const { id } = req.params as unknown as { id: number };
    const client = approveClient(id);
    res.status(200).json(client);
  } catch (error) {
    next(error);
  }
}

export function getClientSummary(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const { id } = req.params as unknown as { id: number };
    const summary = getClientSummaryUseCase(id);
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
}
