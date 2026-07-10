import { db } from "../db";
import type { Operation } from "../types/operation.types";
import { insertInvoices, type InvoiceToInsert } from "./invoice.repository";

export interface OperationToInsert {
  cliente_id: number;
  monto_total_centavos: number;
  monto_adelantado_centavos: number;
  comision_centavos: number;
  monto_a_depositar_centavos: number;
}

export interface ClientSummaryCents {
  total_operaciones: number;
  monto_adelantado_acumulado_centavos: number;
  proxima_fecha_vencimiento: string | null;
}

function insertOperation({
  cliente_id,
  monto_total_centavos,
  monto_adelantado_centavos,
  comision_centavos,
  monto_a_depositar_centavos,
}: OperationToInsert): Operation {
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO operaciones (cliente_id, monto_total_centavos, monto_adelantado_centavos, comision_centavos, monto_a_depositar_centavos)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      cliente_id,
      monto_total_centavos,
      monto_adelantado_centavos,
      comision_centavos,
      monto_a_depositar_centavos,
    );
  return db
    .prepare("SELECT * FROM operaciones WHERE id = ?")
    .get(lastInsertRowid) as Operation;
}

// Atomic transaction: if insertInvoices fails (e.g. constraint violation),
// better-sqlite3 also rolls back the operation insert.
export function insertOperationWithInvoices(
  operation: OperationToInsert,
  invoices: InvoiceToInsert[],
): Operation {
  const run = db.transaction(() => {
    const createdOperation = insertOperation(operation);
    insertInvoices(createdOperation.id, invoices);
    return createdOperation;
  });
  return run();
}

export function fetchClientSummary(clientId: number): ClientSummaryCents {
  return db
    .prepare(
      `SELECT
         COUNT(o.id) AS total_operaciones,
         COALESCE(SUM(o.monto_adelantado_centavos), 0) AS monto_adelantado_acumulado_centavos,
         MIN(fv.proxima_fecha_vencimiento) AS proxima_fecha_vencimiento
       FROM clientes c
       LEFT JOIN operaciones o ON o.cliente_id = c.id
       LEFT JOIN (
         SELECT operacion_id, MIN(fecha_vencimiento) AS proxima_fecha_vencimiento
         FROM facturas
         WHERE fecha_vencimiento >= date('now')
         GROUP BY operacion_id
       ) fv ON fv.operacion_id = o.id
       WHERE c.id = ?
       GROUP BY c.id`,
    )
    .get(clientId) as ClientSummaryCents;
}
