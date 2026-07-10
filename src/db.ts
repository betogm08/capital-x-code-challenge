import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const { DB_PATH: dbPath = "./data/factoraje.db" } = process.env;
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    razon_social  TEXT NOT NULL,
    rfc           TEXT NOT NULL UNIQUE,
    email         TEXT NOT NULL,
    estatus       TEXT NOT NULL CHECK (estatus IN ('pendiente','aprobado')) DEFAULT 'pendiente',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS operaciones (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id                  INTEGER NOT NULL REFERENCES clientes(id),
    monto_total_centavos        INTEGER NOT NULL CHECK (monto_total_centavos > 0),
    monto_adelantado_centavos   INTEGER NOT NULL,
    comision_centavos           INTEGER NOT NULL,
    monto_a_depositar_centavos  INTEGER NOT NULL,
    created_at                  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS facturas (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    operacion_id       INTEGER NOT NULL REFERENCES operaciones(id),
    folio              TEXT NOT NULL,
    deudor             TEXT NOT NULL,
    monto_centavos     INTEGER NOT NULL CHECK (monto_centavos > 0),
    fecha_emision      TEXT NOT NULL,
    fecha_vencimiento  TEXT NOT NULL
  );
`);
