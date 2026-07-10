import { findClientById } from "../repositories/client.repository";
import {
  isFolioAlreadyFinanced,
  type InvoiceToInsert,
} from "../repositories/invoice.repository";
import {
  fetchClientSummary,
  insertOperationWithInvoices,
} from "../repositories/operation.repository";
import { validateInvoices } from "./validators/invoice.validator";
import { badRequestError, notFoundError, validationError } from "../errors";
import { centsToPesos, pesosToCents } from "../utils/money";
import { todayUTC } from "../utils/date";
import type { CreateOperationInput } from "../schemas/operation.schema";
import type {
  ClientSummary,
  OperationWithBreakdown,
} from "../types/operation.types";

const ADVANCE_RATE = 0.85;
const FEE_RATE = 0.015;

export function createOperation(
  input: CreateOperationInput,
): OperationWithBreakdown {
  const { cliente_id, facturas } = input;

  const client = findClientById(cliente_id);
  if (!client) {
    throw notFoundError(`No se encontró un cliente con id ${cliente_id}.`);
  }
  if (client.estatus !== "aprobado") {
    throw badRequestError(
      "El cliente debe estar aprobado para originar operaciones.",
    );
  }

  const errors = validateInvoices(facturas, todayUTC(), (folio) =>
    isFolioAlreadyFinanced(cliente_id, folio),
  );
  if (errors.length > 0) {
    throw validationError(
      "Una o más facturas no pasaron las validaciones.",
      errors,
    );
  }

  const invoicesToInsert: InvoiceToInsert[] = facturas.map(
    ({ folio, deudor, monto, fecha_emision, fecha_vencimiento }) => ({
      folio,
      deudor,
      monto_centavos: pesosToCents(monto),
      fecha_emision,
      fecha_vencimiento,
    }),
  );

  const totalAmountCents = invoicesToInsert.reduce(
    (total, { monto_centavos }) => total + monto_centavos,
    0,
  );
  const advanceAmountCents = Math.round(totalAmountCents * ADVANCE_RATE);
  const feeAmountCents = Math.round(totalAmountCents * FEE_RATE);
  const depositAmountCents = advanceAmountCents - feeAmountCents;

  const operation = insertOperationWithInvoices(
    {
      cliente_id,
      monto_total_centavos: totalAmountCents,
      monto_adelantado_centavos: advanceAmountCents,
      comision_centavos: feeAmountCents,
      monto_a_depositar_centavos: depositAmountCents,
    },
    invoicesToInsert,
  );

  const {
    id,
    created_at,
    monto_total_centavos,
    monto_adelantado_centavos,
    comision_centavos,
    monto_a_depositar_centavos,
  } = operation;

  return {
    id,
    cliente_id,
    monto_total: centsToPesos(monto_total_centavos),
    monto_adelantado: centsToPesos(monto_adelantado_centavos),
    comision: centsToPesos(comision_centavos),
    monto_a_depositar: centsToPesos(monto_a_depositar_centavos),
    created_at,
    facturas: facturas.map(
      ({ folio, deudor, fecha_emision, fecha_vencimiento }, i) => ({
        folio,
        deudor,
        monto: centsToPesos(invoicesToInsert[i].monto_centavos),
        fecha_emision,
        fecha_vencimiento,
      }),
    ),
  };
}

export function getClientSummary(clientId: number): ClientSummary {
  const client = findClientById(clientId);
  if (!client) {
    throw notFoundError(`No se encontró un cliente con id ${clientId}.`);
  }

  const {
    total_operaciones,
    monto_adelantado_acumulado_centavos,
    proxima_fecha_vencimiento,
  } = fetchClientSummary(clientId);

  return {
    total_operaciones,
    monto_adelantado_acumulado: centsToPesos(
      monto_adelantado_acumulado_centavos,
    ),
    proxima_fecha_vencimiento,
  };
}
