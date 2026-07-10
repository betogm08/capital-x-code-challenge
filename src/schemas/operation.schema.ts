import { z } from "zod";

// Only the shape/type of each field is validated here. Business rules
// (monto > 0, date ranges, term, duplicates) live in the service and are
// reported with the per-folio detail the endpoint requires.
const invoiceInputSchema = z.object({
  folio: z.string().trim().min(1, "folio es requerido"),
  deudor: z.string().trim().min(1, "deudor es requerido"),
  monto: z.number({ invalid_type_error: "monto debe ser un número" }),
  fecha_emision: z.string().trim().min(1, "fecha_emision es requerida"),
  fecha_vencimiento: z.string().trim().min(1, "fecha_vencimiento es requerida"),
});

export const createOperationSchema = z.object({
  cliente_id: z.coerce
    .number()
    .int()
    .positive("cliente_id debe ser un entero positivo"),
  facturas: z
    .array(invoiceInputSchema)
    .min(1, "se requiere al menos una factura"),
});

export type CreateOperationInput = z.infer<typeof createOperationSchema>;
export type InvoiceInput = z.infer<typeof invoiceInputSchema>;
