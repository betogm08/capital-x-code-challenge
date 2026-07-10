import {
  approveClientById,
  findClientById,
  findClientByRfc,
  insertClient,
} from "../repositories/client.repository";
import { normalizeAndValidateRfc } from "./validators/rfc.validator";
import { conflictError, notFoundError } from "../errors";
import type { Client } from "../types/client.types";
import type { CreateClientInput } from "../schemas/client.schema";

const DUPLICATE_RFC_MESSAGE =
  "Esta empresa ya se encuentra registrada en nuestra plataforma. Si crees que se trata de un error o " +
  "deseas recuperar el acceso, por favor contacta a soporte en soporte@capitalx.com.";

function isUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const { code } = error as { code?: string };
  return code === "SQLITE_CONSTRAINT_UNIQUE";
}

export function createClient(input: CreateClientInput): Client {
  const { razon_social, rfc: rawRfc, email } = input;
  const rfc = normalizeAndValidateRfc(rawRfc);

  if (findClientByRfc(rfc)) {
    throw conflictError(DUPLICATE_RFC_MESSAGE);
  }

  try {
    return insertClient({ razon_social, rfc, email });
  } catch (error) {
    // Red de seguridad ante condiciones de carrera entre el check y el insert.
    if (isUniqueConstraintError(error)) {
      throw conflictError(DUPLICATE_RFC_MESSAGE);
    }
    throw error;
  }
}

export function getClientById(id: number): Client {
  const client = findClientById(id);
  if (!client) {
    throw notFoundError(`No se encontró un cliente con id ${id}.`);
  }
  return client;
}

export function approveClient(id: number): Client {
  getClientById(id);
  return approveClientById(id);
}
