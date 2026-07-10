import { db } from "../db";
import type { Client } from "../types/client.types";

export function findClientByRfc(rfc: string): Client | undefined {
  return db.prepare("SELECT * FROM clientes WHERE rfc = ?").get(rfc) as
    | Client
    | undefined;
}

export function findClientById(id: number): Client | undefined {
  return db.prepare("SELECT * FROM clientes WHERE id = ?").get(id) as
    | Client
    | undefined;
}

export function insertClient({
  razon_social,
  rfc,
  email,
}: {
  razon_social: string;
  rfc: string;
  email: string;
}): Client {
  const { lastInsertRowid } = db
    .prepare("INSERT INTO clientes (razon_social, rfc, email) VALUES (?, ?, ?)")
    .run(razon_social, rfc, email);
  return findClientById(Number(lastInsertRowid))!;
}

export function approveClientById(id: number): Client {
  db.prepare("UPDATE clientes SET estatus = 'aprobado' WHERE id = ?").run(id);
  return findClientById(id)!;
}
