import type { InvoiceErrorDetail } from "../../errors";
import type { InvoiceInput } from "../../schemas/operation.schema";
import { daysBetween } from "../../utils/date";

const MIN_TERM_DAYS = 15;
const MAX_TERM_DAYS = 120;

// `isInvoiceAlreadyFinanced` is received as a function (instead of importing
// the repository) to keep this validator pure and decoupled from SQLite.
export function validateInvoices(
  invoices: InvoiceInput[],
  today: Date,
  isInvoiceAlreadyFinanced: (folio: string) => boolean,
): InvoiceErrorDetail[] {
  const errors: InvoiceErrorDetail[] = [];
  const seenFolios = new Set<string>();

  for (const { folio, monto, fecha_emision, fecha_vencimiento } of invoices) {
    const reasons: string[] = [];

    if (monto <= 0) {
      reasons.push("El monto debe ser mayor a 0.");
    }

    const issueDate = new Date(fecha_emision);
    const dueDate = new Date(fecha_vencimiento);

    if (Number.isNaN(issueDate.getTime())) {
      reasons.push("fecha_emision no es una fecha válida.");
    } else if (issueDate > today) {
      reasons.push("fecha_emision no puede ser una fecha futura.");
    }

    if (Number.isNaN(dueDate.getTime())) {
      reasons.push("fecha_vencimiento no es una fecha válida.");
    } else if (dueDate <= today) {
      reasons.push("fecha_vencimiento debe ser posterior a hoy.");
    } else {
      const term = daysBetween(today, dueDate);
      if (term < MIN_TERM_DAYS || term > MAX_TERM_DAYS) {
        reasons.push(
          `El plazo restante (${term} días) debe estar estrictamente entre ${MIN_TERM_DAYS} y ${MAX_TERM_DAYS} días.`,
        );
      }
    }

    if (seenFolios.has(folio)) {
      reasons.push("El folio está duplicado dentro de la misma operación.");
    }
    seenFolios.add(folio);

    if (isInvoiceAlreadyFinanced(folio)) {
      reasons.push(
        "Este folio ya fue financiado previamente para este cliente.",
      );
    }

    if (reasons.length > 0) {
      errors.push({ folio, motivo: reasons.join(" ") });
    }
  }

  return errors;
}
