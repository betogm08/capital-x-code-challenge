export interface Operation {
  id: number;
  cliente_id: number;
  monto_total_centavos: number;
  monto_adelantado_centavos: number;
  comision_centavos: number;
  monto_a_depositar_centavos: number;
  created_at: string;
}

export interface ClientSummary {
  total_operaciones: number;
  monto_adelantado_acumulado: number;
  proxima_fecha_vencimiento: string | null;
}

export interface InvoiceWithBreakdown {
  folio: string;
  deudor: string;
  monto: number;
  fecha_emision: string;
  fecha_vencimiento: string;
}

export interface OperationWithBreakdown {
  id: number;
  cliente_id: number;
  monto_total: number;
  monto_adelantado: number;
  comision: number;
  monto_a_depositar: number;
  created_at: string;
  facturas: InvoiceWithBreakdown[];
}
