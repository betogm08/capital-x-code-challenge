export interface InvoiceErrorDetail {
  folio: string;
  motivo: string;
}

export interface AppError extends Error {
  statusCode: number;
  details?: unknown;
}

// Marks errors created by the factories in this file, so the errorHandler
// can recognize them without `instanceof` (which would require classes).
const APP_ERROR_MARKER = Symbol("appError");

type InternalAppError = AppError & { [APP_ERROR_MARKER]: true };

function createAppError(
  statusCode: number,
  message: string,
  details?: unknown,
): AppError {
  return Object.assign(new Error(message), {
    statusCode,
    details,
    [APP_ERROR_MARKER]: true as const,
  });
}

export function isAppError(error: unknown): error is AppError {
  if (typeof error !== "object" || error === null) return false;
  const { [APP_ERROR_MARKER]: marker } = error as Partial<InternalAppError>;
  return marker === true;
}

export function notFoundError(message: string): AppError {
  return createAppError(404, message);
}

export function badRequestError(message: string, details?: unknown): AppError {
  return createAppError(400, message, details);
}

export function conflictError(message: string): AppError {
  return createAppError(409, message);
}

export function validationError(
  message: string,
  details: InvoiceErrorDetail[],
): AppError {
  return createAppError(400, message, details);
}
