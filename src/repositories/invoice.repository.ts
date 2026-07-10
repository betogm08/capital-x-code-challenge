import { db } from "../db";

export interface InvoiceToInsert {
  folio: string;
  deudor: string;
  monto_centavos: number;
  fecha_emision: string;
  fecha_vencimiento: string;
}

export function isFolioAlreadyFinanced(
  clientId: number,
  folio: string,
): boolean {
  const { total } = db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM facturas f
       JOIN operaciones o ON o.id = f.operacion_id
       WHERE o.cliente_id = ? AND f.folio = ?`,
    )
    .get(clientId, folio) as { total: number };
  return total > 0;
}

export function insertInvoices(
  operationId: number,
  invoices: InvoiceToInsert[],
): void {
  const insert = db.prepare(
    `INSERT INTO facturas (operacion_id, folio, deudor, monto_centavos, fecha_emision, fecha_vencimiento)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  for (const {
    folio,
    deudor,
    monto_centavos,
    fecha_emision,
    fecha_vencimiento,
  } of invoices) {
    insert.run(
      operationId,
      folio,
      deudor,
      monto_centavos,
      fecha_emision,
      fecha_vencimiento,
    );
  }
}
