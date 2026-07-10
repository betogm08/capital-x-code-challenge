import { Router } from "express";
import { validate } from "../middlewares/validate";
import { createOperationSchema } from "../schemas/operation.schema";
import { postOperation } from "../controllers/operation.controller";

export const operationsRouter = Router();

operationsRouter.post(
  "/",
  validate(createOperationSchema, "body"),
  postOperation,
);
