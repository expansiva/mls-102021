# Skill: repositoryAdapter → `layer_1_external/adapters/persistence/{entity}RepositoryAdapter.ts`

Generate the repository ADAPTER implementing the port. This is the ONLY file allowed to use
`ctx.data.moduleData` for local module tables. It maps the domain aggregate <-> table row: indexed
fields become columns; everything else + embedded child collections are serialized into the `details`
JSONB column. Export a factory `create{Entity}RepositoryAdapter(ctx): I{Entity}Repository`. MDM reads
go through `ctx.mdm` (never `ctx.data.mdm*` and never a local table).

## Golden example (compiles)

```ts
/// <mls fileReference="_{project}_/l1/{module}/layer_1_external/adapters/persistence/orderRepositoryAdapter.ts" enhancement="_blank"/>
import { AppError, type RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import type { IOrderRepository, OrderListFilter } from '/_{project}_/l1/{module}/layer_2_application/ports/orderRepository.js';
import type { Order, OrderItem } from '/_{project}_/l1/{module}/layer_3_domain/entities/order.js';

interface OrderRow {
  order_id: string; daily_shift_id: string; table_id: string | null; kitchen_ticket_id: string | null;
  order_type: string; status: string; created_at: string;
  details: Record<string, unknown> | string | null;
}
interface OrderDetails {
  totalAmount: number; notes: string | null; customerName: string | null; customerPhone: string | null;
  numberOfGuests: number | null; closedAt: string | null; cancelledAt: string | null;
  cancellationReason: string | null; updatedAt: string; items: OrderItem[];
}

function toRow(order: Order): OrderRow {
  const details: OrderDetails = {
    totalAmount: order.totalAmount, notes: order.notes, customerName: order.customerName,
    customerPhone: order.customerPhone, numberOfGuests: order.numberOfGuests, closedAt: order.closedAt,
    cancelledAt: order.cancelledAt, cancellationReason: order.cancellationReason, updatedAt: order.updatedAt,
    items: order.items,
  };
  return {
    order_id: order.orderId, daily_shift_id: order.dailyShiftId, table_id: order.tableId,
    kitchen_ticket_id: order.kitchenTicketId, order_type: order.orderType, status: order.status,
    created_at: order.createdAt, details: JSON.stringify(details),
  };
}
// Defaults for EVERY details field, so a row whose `details` is NULL/empty/partial still yields a
// complete domain object. Row-derived values (e.g. updatedAt) come from the row.
function detailsDefaults(row: OrderRow): OrderDetails {
  return {
    totalAmount: 0, notes: null, customerName: null, customerPhone: null, numberOfGuests: null,
    closedAt: null, cancelledAt: null, cancellationReason: null, updatedAt: row.created_at, items: [],
  };
}
function parseDetails(row: OrderRow): OrderDetails {
  // pg returns JSONB as an object. JSON.parse(object) becomes JSON.parse("[object Object]") and
  // throws; a mute catch then yields empty defaults (every field blank on read). Accept both shapes.
  let parsed: Partial<OrderDetails> = {};
  try {
    const raw = typeof row.details === 'string' ? JSON.parse(row.details) : (row.details ?? {});
    parsed = (raw ?? {}) as Partial<OrderDetails>;
  } catch (error) {
    console.warn(`[parseDetails] order ${row.order_id}: details is not JSON`, error);
    parsed = {};
  }
  return { ...detailsDefaults(row), ...parsed };   // merge over the defaults, field by field
}
function toDomain(row: OrderRow): Order {
  const d = parseDetails(row);
  return {
    orderId: row.order_id, dailyShiftId: row.daily_shift_id, tableId: row.table_id,
    kitchenTicketId: row.kitchen_ticket_id, orderType: row.order_type as Order['orderType'],
    status: row.status as Order['status'], totalAmount: d.totalAmount, notes: d.notes,
    customerName: d.customerName, customerPhone: d.customerPhone, numberOfGuests: d.numberOfGuests,
    closedAt: d.closedAt, cancelledAt: d.cancelledAt, cancellationReason: d.cancellationReason,
    items: d.items ?? [], createdAt: row.created_at, updatedAt: d.updatedAt,
  };
}

export function createOrderRepositoryAdapter(ctx: RequestContext): IOrderRepository {
  const getTable = () => ctx.data.moduleData.getTable<OrderRow>('order'); // = TableDefinition.tableName, verbatim
  return {
    async getById(orderId) {
      const row = await (await getTable()).findOne({ where: { order_id: orderId } });
      if (!row) throw new AppError('NOT_FOUND', `Order ${orderId} not found`, 404, { orderId });
      return toDomain(row);
    },
    async findById(orderId) {
      const row = await (await getTable()).findOne({ where: { order_id: orderId } });
      return row ? toDomain(row) : null;
    },
    async list(filter?: OrderListFilter) {
      const where: Partial<OrderRow> = {};
      if (filter?.dailyShiftId) where.daily_shift_id = filter.dailyShiftId;
      if (filter?.status) where.status = filter.status;
      if (filter?.tableId) where.table_id = filter.tableId;
      const rows = await (await getTable()).findMany({ where, orderBy: { field: 'created_at', direction: 'desc' } });
      return rows.map(toDomain);
    },
    async save(order) {
      const repo = await getTable();
      const existing = await repo.findOne({ where: { order_id: order.orderId } });
      if (existing) await repo.update({ where: { order_id: order.orderId }, patch: toRow(order) });
      else await repo.insert({ record: toRow(order) });
      return order;
    },
  };
}
```

## Rules

- Define a `{Entity}Row` (snake_case columns matching the TableDefinition) and a `{Entity}Details`
  (the JSONB payload: non-indexed fields + embedded collections). `toRow`/`toDomain`/`parseDetails`
  convert between them; `details` is `JSON.stringify` on write. On read, `pg` already gives an
  **object** for JSONB (`details: Record<string, unknown> | string | null`). Never
  `JSON.parse(row.details)`: that throws on an object, a mute `catch` empties every field, and the
  app shows ids with blank names. Parse with
  `typeof row.details === 'string' ? JSON.parse(row.details) : (row.details ?? {})`. A real parse
  failure `console.warn`s table/id before falling back to defaults.
- **`parseDetails` MUST merge over complete defaults — never cast the parse result.** A stored row can
  have `details` NULL, `'{}'` or missing keys (older rows, seeds, partial writes), and
  `JSON.parse('{}')` does NOT throw — so defaulting only inside `catch` silently produces `undefined`
  in fields the interface types as required, and `as {Entity}Details` makes the compiler accept the
  lie. That is how a read turns into a runtime `Cannot read properties of undefined` (e.g.
  `metric.toFixed(2)`). Required shape:
  1. a `detailsDefaults(row)` (or module-level const) covering EVERY `{Entity}Details` field —
     `0` for numbers, `[]` for collections, `null` for nullable, row values for row-derived ones;
  2. `let parsed: Partial<{Entity}Details> = {}` filled inside `try`, reset in `catch`;
  3. `return { ...detailsDefaults(row), ...parsed }`.
  Applies to every adapter with a `details` column, including append-only event adapters.
- The factory closes over `ctx`; methods take NO `ctx`. `getTable<{Entity}Row>('{table_name}')` where
  `{table_name}` is EXACTLY the `tableName` declared in the entity's TableDefinition (see the
  `<entity>.d.ts` in dependsFiles). NEVER pluralize, translate or invent it — an unknown name fails
  only at runtime with PERSISTENCE_TABLE_NOT_FOUND. The defs `tableRef` is a hint; `tableName` wins.
- `orderBy` is always `{ field: '<column>', direction: 'asc'|'desc' }`. `getById` throws `NOT_FOUND`.
- **Never let a persistence-driver error escape untranslated.** A lookup by an id the driver rejects
  (e.g. a value that is not a valid key for the column type) throws from the driver, and an untranslated
  throw becomes `INTERNAL_ERROR` (500) exposing the driver message to the client. In a lookup by id,
  translate a driver *input/format* rejection into `AppError('NOT_FOUND', …, 404, { <idField> })` — the
  caller asked for something that cannot exist. Do NOT blanket-catch every error into `NOT_FOUND`:
  connection/timeout failures must keep propagating, otherwise an outage reads as "not found".
- MDM-backed reads: resolve via `ctx.mdm.collection.listByType/getMany/hydrateMany/relatedOfMany` or
  `ctx.mdm.entity.get`; never a local table and never raw `ctx.data.mdmDocument`,
  `ctx.data.mdmEntityIndex` or `ctx.data.mdmRelationship`.
  Prospect/pre-qualified lead workflows use `ctx.mdm.prospect.create/get/listByType/update/promoteToEntity`,
  never raw `ctx.data.mdmProspectIndex` or `ctx.data.mdmProspectRelationship`.
  - For module-specific MDM attributes, list by canonical module type such as
    `ctx.mdm.collection.listByType({ type: 'cafeFlow.MenuItem' })`, or bulk load by ids with
    `ctx.mdm.collection.getMany({ mdmIds })`, then inspect `entity.details.<module>`.
  - Never call `ctx.mdm.entity.get` inside a loop. Collect ids and use `getMany`/`hydrateMany` once.
  - For MDM relationships, use `ctx.mdm.collection.relatedOfMany({ mdmIds, type? })` for reads and
    `ctx.mdm.entity.link/unlink` for writes owned by MDM usecases.
  - Do not import raw MDM row types or write filters over invented index fields such as `entityId`,
    `entityType`, `productId`, `warehouseId`, `source_entity_id` or `target_entity_id`.
- Multi-table writes (e.g. + event/metric) wrap in `ctx.data.runInTransaction(async (tx) => { ... })`.
- Append-only EVENT adapters (`data.appendOnlyEvent === true`): implement the event port over its table —
  `append(record)` does a single `insert({ record: toRow(record) })` (NEVER `update`/`delete`), and the
  read finders use `findMany` with the owner FK and `orderBy` the timestamp. Same `{Event}Row`/`toRow`/
  `toDomain` mapping (non-indexed fields in `details`).
