import { Router } from "express";
import { clientsRouter } from "./client.routes";
import { operationsRouter } from "./operation.routes";

export const router = Router();

router.use("/clientes", clientsRouter);
router.use("/operaciones", operationsRouter);
