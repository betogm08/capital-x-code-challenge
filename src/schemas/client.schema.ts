import { z } from "zod";

export const createClientSchema = z.object({
  razon_social: z.string().trim().min(1, "razon_social es requerido"),
  rfc: z.string().trim().min(1, "rfc es requerido"),
  email: z.string().trim().email("email inválido"),
});

export const clientIdParamsSchema = z.object({
  id: z.coerce.number().int().positive("id debe ser un entero positivo"),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
