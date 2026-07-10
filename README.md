# API REST de Factoraje Financiero (Capital X — Code Challenge)

API backend-only (sin UI) para originar operaciones de factoraje financiero: alta y
aprobación de clientes, originación de operaciones con validación estricta de facturas,
y un resumen agregado por cliente. Node.js + TypeScript + Express + SQLite.

## 1. Cómo correr el proyecto

Requisitos: Node.js 18+.

```bash
npm install
cp .env.example .env   # opcional, valores por defecto ya funcionan
npm run dev             # modo desarrollo (tsx watch)
npm run build && npm start   # build de producción
```

Variables de entorno (`.env`):

| Variable  | Default               | Descripción                                                                          |
| --------- | --------------------- | ------------------------------------------------------------------------------------ |
| `PORT`    | `3000`                | Puerto HTTP                                                                          |
| `DB_PATH` | `./data/factoraje.db` | Ruta del archivo SQLite (se crea automáticamente, junto con las tablas, al arrancar) |

## 2. Arquitectura

Arquitectura en capas con una regla de dependencia unidireccional:

```
routes -> controllers -> services -> repositories -> db.ts (better-sqlite3)
```

- **`routes/`**: mapea método+path a un controller, aplicando `validate(schema)` antes.
- **`controllers/`**: solo transporte HTTP — leen `req`, llaman a un service, responden
  `res.json(...)` con el código de estado correcto, y delegan errores a `next(error)`.
- **`services/`**: 100% de la lógica de negocio (reglas de aprobación, validación de
  facturas, cálculos financieros, RFC). No conocen Express ni SQL.
- **`repositories/`**: único lugar que importa `db` y ejecuta SQL. No contienen reglas de
  negocio, solo queries.
- **`middlewares/`**: `validate` (forma de entrada, Zod) y `errorHandler` (formato de
  salida de errores).
- **`errors.ts`** / **`types/`** / **`schemas/`**: transversales a todas las capas.

**Estilo funcional:** no hay clases en ninguna capa, incluyendo `errors.ts`. En vez de
subclasificar `Error` (`class NotFoundError extends AppError`), `errors.ts` expone
factories (`notFoundError`, `badRequestError`, `conflictError`, `validationError`) que
devuelven un `Error` nativo "enriquecido" vía `Object.assign` con `statusCode`/`details`,
más una marca (`Symbol`) que `isAppError()` usa para reconocerlos en el `errorHandler` sin
`instanceof` — el equivalente funcional de una jerarquía de excepciones tipadas. La
composición entre capas se resuelve con imports de módulos ES/TS directos (`services`
importa funciones de `repositories`, `repositories` importa `db` de `db.ts`), en vez de
inyección por constructor o por parámetro explícito en cada llamada — es la forma más
simple de lograrlo dado que este entregable no incluye una suite de tests que necesite
intercambiar dobles de prueba.

La única excepción a "todo por import directo" es intencional: `validateInvoices`
(`services/validators/invoice.validator.ts`) recibe la verificación de doble
financiamiento como una función (`isInvoiceAlreadyFinanced: (folio: string) => boolean`) en vez
de importar el repositorio directamente. Así el validador de reglas de negocio se
mantiene puro y no acoplado a SQLite, que es justo el tipo de función que más vale la
pena poder probar de forma aislada si más adelante se agregan tests.

## 3. Decisiones técnicas y su justificación

| Decisión              | Elección                                                                            | Por qué                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Driver SQLite         | `better-sqlite3`, síncrono, instancia única en `db.ts` (arranca junto con `app.ts`) | SQLite es embebido: no hay latencia de red que justifique una API asíncrona ni una capa de abstracción de conexión. El código de repositorios queda lineal y fácil de leer.                                                                                                                                                                                                                                  |
| Validación de esquema | Zod                                                                                 | Inference de tipos (`z.infer`), sintaxis declarativa, mensajes de error nativos. Solo valida _forma_; las reglas de negocio siempre viven en `services`.                                                                                                                                                                                                                                                     |
| Dinero                | Enteros en columnas `*_centavos`                                                    | Ver siguiente sección — es la decisión con más peso a defender.                                                                                                                                                                                                                                                                                                                                              |
| ORM                   | Ninguno, SQL crudo                                                                  | Requisito explícito del challenge y forma de demostrar dominio de SQL y control fino de transacciones (`db.transaction`).                                                                                                                                                                                                                                                                                    |
| Esquema               | Normalizado (`facturas` solo referencia `operaciones`, no duplica `cliente_id`)     | Esquema más limpio y defendible. Costo: la unicidad `(cliente_id, folio)` ya no se puede expresar como `UNIQUE` de tabla, así que la prevención de doble financiamiento vive enteramente en el service vía `JOIN` (ver `invoice.repository.ts#isFolioAlreadyFinanced`). Se acepta el trade-off porque better-sqlite3 es síncrono y de una sola conexión, lo que serializa las escrituras dentro del proceso. |
| Tests                 | No incluidos en este entregable                                                     | Decisión explícita de alcance; ver sección 5.                                                                                                                                                                                                                                                                                                                                                                |

### Precisión monetaria (la decisión a defender en la entrevista)

Se descartó `REAL` porque es de punto flotante binario (IEEE-754) y produce errores de
redondeo clásicos (`0.1 + 0.2 !== 0.3`), inaceptables para montos financieros. También se
descartó simular `DECIMAL` con `TEXT` + una librería de precisión arbitraria, por ser
over-engineering para el alcance de este challenge.

Se eligieron **enteros en centavos** (`INTEGER`, ej. `$1,234.56` → `123456`) porque:

1. SQLite tiene afinidad `INTEGER` nativa de 64 bits: cero ambigüedad de representación,
   sin necesidad de una librería externa.
2. Toda la aritmética de negocio (aforo 85%, comisión 1.5%) se hace con
   `Math.round(centavos * tasa)`, y el redondeo se aplica **una sola vez, en el centavo**
   — más estricto que redondear a 2 decimales sobre un flotante.
3. La conversión peso↔centavo está centralizada en `utils/money.ts`
   (`pesosToCents`/`centsToPesos`) y se invoca solo dentro de los `services`, nunca
   dentro de `repositories` (que trabajan 100% en centavos) ni se repite de forma
   dispersa — un único punto de conversión evita drift acumulado.

## 4. Suposiciones de negocio explícitas

- **"Vigente" en el resumen** se interpreta como: factura cuya `fecha_vencimiento` es
  hoy o futura (aún no vencida). Solo afecta el cálculo de `proxima_fecha_vencimiento`;
  `total_operaciones` y `monto_adelantado_acumulado` consideran _todas_ las operaciones
  del cliente, hayan vencido sus facturas o no.
- **Año pivote para RFC**: un RFC de Persona Moral codifica una fecha `AAMMDD` con año de
  2 dígitos, inherentemente ambiguo de siglo. Se asume `2000 + AA` únicamente para
  validar que el día exista en ese mes (incluye años bisiestos).
- **Homoclave sin dígito verificador real**: se valida el formato (3 caracteres
  alfanuméricos), no el algoritmo de verificación propietario del SAT — está fuera de
  alcance documentado.
- **Aprobar un cliente es idempotente**: aprobar un cliente que ya está `'aprobado'` no
  es un error, simplemente no cambia nada.
- Moneda única implícita (MXN), sin manejo de tipo de cambio.
- Sin autenticación/autorización, por alcance explícito del challenge.

## 5. Qué haría distinto en producción / con más tiempo

- **Suite de tests**: unit tests de `services`/`validators` con repositorios
  mockeados, más tests de integración de los 3 endpoints contra una SQLite en memoria
  (Vitest + Supertest). Se omitieron aquí por decisión explícita de alcance del
  challenge, no por dificultad técnica.
- Autenticación/autorización (hoy el `PATCH /clientes/:id/aprobar` es público).
- Migraciones versionadas con una herramienta dedicada en vez de `CREATE TABLE IF NOT
EXISTS` inline en `db.ts`.
- Logging estructurado y observabilidad (trazas, métricas).
- Paginación en cualquier listado que se agregue a futuro.
- Rate limiting e idempotency keys en `POST /operaciones` (para que un retry de red no
  duplique una operación).
- Manejo explícito de concurrencia (locks optimistas) si se pasara a un proceso
  multi-instancia o a Postgres.
- Migrar a Postgres si se necesita escalar horizontalmente o soportar múltiples
  conexiones concurrentes de escritura (SQLite es de un solo escritor).
- Dockerizar y agregar CI (lint + build + tests).

## 6. Alternativas consideradas y descartadas

- **ORM pesado (Prisma/TypeORM)**: descartado por requisito explícito del challenge y
  porque el objetivo es demostrar dominio de SQL crudo y control de transacciones.
- **`sqlite3` (driver asíncrono con callbacks/promesas)**: descartado frente a
  `better-sqlite3` porque, al ser SQLite embebido (sin I/O de red), el modelo async no
  aporta beneficio real y sí agrega complejidad (callbacks, `promisify`, manejo de
  errores asíncronos).
- **Denormalizar `cliente_id` en `facturas`**: se consideró para poder expresar la
  unicidad `(cliente_id, folio)` como `UNIQUE` de tabla. Se descartó en favor de un
  esquema normalizado + `JOIN`, más limpio de defender, aceptando que la unicidad se
  resuelve en la capa de servicio (ver sección 3).

## 7. Endpoints

| Método  | Ruta                    | Descripción                                        |
| ------- | ----------------------- | -------------------------------------------------- |
| `POST`  | `/clientes`             | Alta de cliente (`estatus: 'pendiente'`)           |
| `PATCH` | `/clientes/:id/aprobar` | Aprueba al cliente                                 |
| `POST`  | `/operaciones`          | Origina una operación de factoraje con 1+ facturas |
| `GET`   | `/clientes/:id/resumen` | Resumen agregado de operaciones del cliente        |

Todos los errores responden `{ "error": "mensaje" }`, y los de validación de facturas
además incluyen `{ "details": [{ "folio": "...", "motivo": "..." }] }`.
