# API REST de Factoraje Financiero (Capital X — Code Challenge)

Esta es una API sin interfaz gráfica (solo backend) para manejar operaciones de
factoraje financiero: das de alta clientes, los apruebas, les originas operaciones a
partir de sus facturas, y puedes ver un resumen de sus operaciones.

## 0. Stack y herramientas usadas

- **Node.js + TypeScript** — el runtime y el tipado.
- **Express** — el framework HTTP, para definir las rutas y manejar requests/responses.
- **better-sqlite3** — el driver de SQLite. Es síncrono (sin promesas/callbacks), lo cual
  suena raro al inicio pero tiene sentido para este caso (lo explico más abajo, en la
  sección de decisiones técnicas).
- **Zod** — para validar que lo que llega en el body/params tenga la forma correcta
  antes de que le entre a la lógica de negocio.
- **Claude Code** — usé Claude Code para ayudarme
  a diseñar y construir este proyecto: la arquitectura, el esquema de la base de datos,
  los endpoints.

## 1. Cómo correr el proyecto

Necesitas Node.js 18 o más nuevo.

```bash
npm install
npm run dev
```

Con eso ya tienes el servidor corriendo en `http://localhost:3000`. La base de datos
SQLite se crea sola (junto con sus tablas) la primera vez que arranca.

Otros comandos que te pueden servir:

```bash
npm run build
npm start

cp .env.example .env
```

### Variables de entorno

| Variable  | Valor por defecto     | Para qué sirve                                 |
| --------- | --------------------- | ---------------------------------------------- |
| `PORT`    | `3000`                | El puerto donde escucha el servidor            |
| `DB_PATH` | `./data/factoraje.db` | Dónde se guarda el archivo de la base de datos |

Si quieres correr el server en otro puerto o guardar la base en otro lado, defines estas
variables en tu `.env` (o las exportas en tu terminal) y ya.

### Resetear la base de datos

Si quieres empezar de cero (borrar todos los clientes/operaciones que hayas creado
mientras pruebas), simplemente apaga el servidor y borra la carpeta de datos:

```bash
rm -rf data
```

La próxima vez que corras `npm run dev` se vuelve a crear vacía automáticamente.

## 2. Arquitectura (qué hay en cada carpeta)

El proyecto está organizado en capas, y cada carpeta tiene un trabajo bien específico.
La regla es que cada capa solo le habla a la de abajo, nunca al revés:

```
routes -> controllers -> services -> repositories -> db.ts
```

- **`routes/`** — aquí se definen las URLs (ej. `POST /clientes`) y qué controller le
  toca a cada una. También es donde le decimos a cada ruta qué schema de Zod debe
  cumplir el request antes de dejarlo pasar.
- **`controllers/`** — reciben el `req`/`res` de Express, llaman al service que
  corresponde, y regresan la respuesta con su statusCode correcto. No tienen ninguna
  lógica de negocio adentro, solo son el "puente" entre HTTP y el service.
- **`services/`** — aquí vive TODA la lógica de negocio: las reglas de
  aprobación, la validación de facturas, los cálculos financieros, la validación del
  RFC. Esta capa no sabe nada de Express ni de SQL.
- **`repositories/`** — el único lugar del proyecto que le habla directo a la base de
  datos. Aquí están las queries de SQL. No tienen reglas de negocio, solo saben
  guardar/leer datos.
- **`middlewares/`** — el `validate.ts` (valida la forma del request con Zod) y el
  `errorHandler.ts` (agarra cualquier error y arma la respuesta JSON de error).
- **`schemas/`** — los schemas de Zod que describen cómo debe verse el body/params de
  cada endpoint.
- **`types/`** — los tipos de TypeScript que se comparten entre capas (`Client`,
  `Operation`, etc).
- **`utils/`** — funciones que se reutilizan en varios lados: convertir
  pesos a centavos y viceversa (`money.ts`), y manejar fechas (`date.ts`).
- **`errors.ts`** — las "fábricas" de errores personalizados que usan los services
  para avisar que algo salió mal y su respectivo código http.
- **`db.ts`** — abre (o crea) el archivo de SQLite y define las tablas.
- **`app.ts`** — arma la app de Express (monta las rutas, los middlewares) y levanta el
  servidor.

<!-- Una cosa que decidí a propósito: **no hay clases en ningún lado**, ni siquiera en los
errores. Todo son funciones. La única parte rara es `errors.ts`, que simula "tipos de
error" sin usar clases (lo explico en la sección 4.4). -->

## 3. Los endpoints

### `POST /clientes` — dar de alta un cliente

Recibe en el body:

```json
{
  "razon_social": "Acme SA de CV",
  "rfc": "AAA900101XX1",
  "email": "contacto@acme.com"
}
```

Crea el cliente con `estatus: "pendiente"` y regresa el cliente completo (con su `id`)
con status `201`. Si el RFC no tiene el formato correcto responde `400`. Si el RFC ya
existe, responde `409` con un mensaje pensado para un usuario final.

### `PATCH /clientes/:id/aprobar` — aprobar un cliente

No recibe body, solo el `id` en la URL. Cambia el `estatus` del cliente a `"aprobado"` y
regresa el cliente actualizado. Si el `id` no existe, `404`.

### `POST /operaciones` — crear una operación de factoraje

Recibe en el body el `cliente_id` y un arreglo de facturas:

```json
{
  "cliente_id": 1,
  "facturas": [
    {
      "folio": "F1",
      "deudor": "Deudor SA",
      "monto": 1000,
      "fecha_emision": "2026-06-01",
      "fecha_vencimiento": "2026-09-01"
    }
  ]
}
```

Si el cliente no existe, `404`. Si el cliente no está aprobado, `400`. Si alguna factura
no cumple las reglas (monto mayor a 0, fechas válidas, plazo entre 15 y 120 días, que no
esté duplicada ni ya haya sido financiada antes), responde `400` con el detalle exacto de
qué falló en cada folio y no se guarda nada, ni siquiera las facturas que sí estaban
bien (todo o nada). Si todo pasa, regresa `201` con la operación creada y su desglose:
monto total, monto adelantado (85%), comisión (1.5%) y monto a depositar.

### `GET /clientes/:id/resumen` — resumen de un cliente

No recibe body. Regresa cuántas operaciones tiene el cliente, cuánto se le ha adelantado
en total, y la fecha de vencimiento más próxima entre sus facturas que todavía no vencen.
Si el cliente no tiene operaciones, regresa todo en cero y la fecha en `null`.
Si el cliente no existe, `404`.

## 4. Decisiones técnicas

### 4.1 El middleware `validate`

Este middleware (`middlewares/validate.ts`) es una función que arma otra función: le
pasas un schema de Zod y te regresa un middleware de Express listo para usar en la ruta.
Lo que hace es simple: agarra el `body` o los `params` del request, los pasa por el
schema de Zod, y si algo no cuadra (falta un campo, un tipo está mal), corta ahí mismo
con un `400` y le dice al que llamó exactamente qué campo falló y por qué. Si todo está
bien, deja pasar el request al controller, pero con los datos ya "limpios" (por ejemplo,
si el `id` venía como texto en la URL, aquí ya se convierte a número).

La ventaja de tenerlo como middleware, separado del controller, es que el controller ya
ni se preocupa por validar nada cuando el código llega ahí, ya sabe que los datos
tienen la forma correcta.

### 4.2 Por qué usé Zod

Zod deja describir "así se debe ver este objeto" con código normal de TypeScript, y él
solo se encarga de revisar que el dato que llegó cumpla eso. Lo elegí por dos razones:

1. Me ahorra escribir el tipo de TypeScript dos veces. Con `z.infer<typeof miSchema>`
   saco el tipo directo del schema, así que si cambio el schema, el tipo se actualiza
   solo.
2. Los mensajes de error que da ya vienen decentes de fábrica, y son fáciles de
   convertir al formato de error que uso en toda la API.

Ojo: Zod en este proyecto **solo valida forma y tipos** (que `monto` sea un número, que
`fecha_emision` sea texto). Las reglas de negocio de verdad (que el monto sea mayor a 0,
que la fecha esté en rango, etc.) las dejé para los `services`, porque ahí sí necesito
poder acumular varios errores a la vez y decir "esta factura específica falló por esta
razón específica", algo que Zod no está pensado para hacer bien en este caso.

### 4.3 Por qué SQLite

- **MySQL/Postgres de verdad**: es lo que usaría en un caso real, pero necesita tener un
  servidor de base de datos corriendo aparte, con su configuración, usuario, contraseña,
  etc. Para un challenge que se corre local y se revisa rápido, es fricción de más que no
  suma nada a lo que se está evaluando.
- **Guardar todo en memoria** (un array o un objeto de JavaScript haciendo de "base de
  datos"): la descarté porque no se parece en nada a un caso real.
- **SQLite**: es un punto intermedio. Es un archivo, cero
  configuración, no necesitas instalar ni levantar nada, pero sigue siendo una base de
  datos SQL real, con sus queries, sus `JOIN`, sus constraints (`UNIQUE`, `CHECK`,
  `FOREIGN KEY`), y sus transacciones. Se comporta muchísimo más parecido a como sería
  en producción que guardar cosas en memoria.

### 4.4 Los errores "factory" (`errors.ts`)

Hice funciones que arman el error: `notFoundError(mensaje)`, `badRequestError(mensaje)`,
`conflictError(mensaje)` y `validationError(mensaje, detalles)`. Cada una agarra un
`Error` normal de JavaScript y le "pega" encima un `statusCode` (404, 400, 409...) y a
veces un `details` extra (por ejemplo, la lista de qué factura falló y por qué).

Entonces en cualquier service, cuando algo sale mal, simplemente hago:

```ts
throw notFoundError(`No se encontró un cliente con id ${id}.`);
```

Y al final, el `errorHandler` (el middleware que atrapa todos los errores) revisa si ese
error es error de la misma API, y si es así, arma la respuesta JSON con el código y el mensaje
correctos. Si es un error que no esperaba (algo que de verdad se rompió), responde `500`
genérico, para no filtrar detalles internos al que hizo el request.

### 4.5 `isFolioAlreadyFinanced` (evitar el doble financiamiento)

Esta función vive en `repositories/invoice.repository.ts` y resuelve una regla
importante: un mismo folio de factura, para el mismo cliente, no se puede financiar dos
veces. La query es:

```sql
SELECT COUNT(*) AS total
FROM facturas f
JOIN operaciones o ON o.id = f.operacion_id
WHERE o.cliente_id = ? AND f.folio = ?
```

Como la tabla `facturas` no guarda directamente el `cliente_id` (está normalizada, solo
apunta a `operaciones`), para saber "¿esta factura ya es de este cliente?" hay que hacer
un `JOIN` con `operaciones`, que sí tiene el `cliente_id`. Si el `COUNT` da más de 0,
quiere decir que ese folio ya se usó antes para ese cliente, así que la función regresa
`true` y la operación nueva se rechaza.

Esta función no se usa directo, se la paso como si fuera un parámetro a
`validateInvoices` (el validador de facturas), en vez de que el validador la importe él
mismo. La idea es que el validador de reglas de negocio no tenga que saber nada de SQL,
solo recibe una función que le responde sí/no.

### 4.6 `fetchClientSummary` (el resumen del cliente)

Esta función vive en `repositories/operation.repository.ts` y arma en una sola query
todo lo que necesita el endpoint de resumen: cuántas operaciones tiene el cliente, cuánto
se le ha adelantado en total, y su próxima fecha de vencimiento.

La primera versión que hice tenía un bug que encontré probando la API a mano: si una
operación tenía 2 facturas, el `JOIN` directo entre `operaciones` y `facturas` generaba 2
filas para esa misma operación (una por cada factura), y entonces el `COUNT` y el `SUM`
la contaban doble. La solución fue armar primero una subquery que agrupa las facturas
por operación (`GROUP BY operacion_id`) y saca de ahí solo su fecha de vencimiento más
próxima, y ya después unir esa subquery (que da como máximo una fila por operación) con
`operaciones`. Así el `COUNT`/`SUM` de operaciones queda correcto, sin duplicados.

También uso `LEFT JOIN` en vez de `JOIN` normal a propósito: si un cliente todavía no
tiene ninguna operación, con `JOIN` normal esa fila desaparecería por completo de los
resultados. Con `LEFT JOIN`, el cliente sigue apareciendo con sus números en `0` (o
`null` en la fecha), que es justo lo que pide el endpoint quejarse, que un cliente sin
operaciones no truene, solo regrese ceros.

### 4.7 Por qué los montos se guardan en centavos

Si guardas dinero como un número decimal normal (`1000.55`), tarde o temprano te
encuentras con errores de redondeo raros de JavaScript, tipo que `0.1 + 0.2` no da
exactamente `0.3`, es un tema conocido de cómo las computadoras representan los
decimales por dentro (punto flotante). Como consecuencia podrías terminar
con centavos de diferencia que no cuadran.

La solución que usé es guardar todo como **enteros, en centavos** (`$1,000.55` se guarda
como `100055`). Al ser un número entero, no hay ningún error de redondeo posible al
guardarlo o sumarlo. La única vez que aparece una operación con decimales es al calcular
el 85% (adelanto) o el 1.5% (comisión), y ahí redondeo con `Math.round` inmediatamente,
una sola vez, al centavo más cercano. La conversión de pesos a centavos (y de regreso) está en un solo
lugar (`utils/money.ts`) para no repetir esa lógica en cada archivo.

## 7. Qué haría diferente si esto fuera para producción

- Test cases con Jest o cualquier otra herramienta de testing.
- Autenticación/autorización — ahora mismo cualquiera puede aprobar un cliente.
- Un sistema de migraciones de verdad, en vez del `CREATE TABLE IF NOT EXISTS` que corre
  solo al arrancar.
- Logs estructurados y algo de monitoreo (para saber qué está pasando en producción).
- Paginación si algún día se agrega un endpoint que liste varias cosas.
- Límite de requests (rate limiting) y algo para que reintentar un `POST /operaciones`
  por un error de red no cree la operación dos veces.
- Pasarme a un proveedor de base de datos mas robusto como PostgreSQL.
