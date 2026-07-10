import { Router } from "express";
import { validate } from "../middlewares/validate";
import {
  clientIdParamsSchema,
  createClientSchema,
} from "../schemas/client.schema";
import {
  getClientSummary,
  patchApproveClient,
  postClient,
} from "../controllers/client.controller";

export const clientsRouter = Router();

clientsRouter.post("/", validate(createClientSchema, "body"), postClient);
clientsRouter.patch(
  "/:id/aprobar",
  validate(clientIdParamsSchema, "params"),
  patchApproveClient,
);
clientsRouter.get(
  "/:id/resumen",
  validate(clientIdParamsSchema, "params"),
  getClientSummary,
);
