# Skill: repositoryPort → `layer_2_application/ports/{entity}Repository.ts`

Generate the repository **PORT** interface for the aggregate. Typed purely in DOMAIN terms (import the
domain types; no rows, no SQL, no `ctx`). Methods do NOT take `ctx` — the adapter is bound to `ctx` at
construction. Provide read/finders + `save(aggregate)`. Use the methods from `data.methods` when
present; otherwise the standard set below.

## Golden example (compiles)

```ts
/// <mls fileReference="_{project}_/l1/{module}/layer_2_application/ports/orderRepository.ts" enhancement="_blank"/>
import type { Order, OrderStatus } from '/_{project}_/l1/{module}/layer_3_domain/entities/order.js';

export interface OrderListFilter {
  dailyShiftId?: string;
  status?: OrderStatus;
  tableId?: string;
  search?: string;
  sortBy?: 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface IOrderRepository {
  getById(orderId: string): Promise<Order>;       // throws NOT_FOUND
  findById(orderId: string): Promise<Order | null>;
  list(filter?: OrderListFilter): Promise<Order[]>;
  count(filter?: OrderListFilter): Promise<number>; // rows matching the filter, not the page length
  save(order: Order): Promise<Order>;             // upsert the whole aggregate
}
```

## Rules

- Interface name `I{Entity}Repository`; import the aggregate + needed unions from the domain entity.
- Before importing an identity alias such as `InvoiceId` or `OrderLineId`, verify that the domain
  `.d.ts` actually exports it. When it does not, declare the alias locally in the port as
  `export type {Name}Id = string`; never import a type merely because its name is plausible.
- `save` persists the whole aggregate (root + embedded members) — no per-child methods.
- A `{Entity}ListFilter` carries indexed/queryable fields (PK, FKs, status) **and** the optional
  list controls the l4 declared: `search` (ILIKE on the `title`/`name` column), `sortBy` (closed
  enum of sortable field ids from `inputs[].enumValues`), `sortOrder` (`'asc' | 'desc'`), `page`
  and `pageSize` (1-based; default 20 / cap 200 are applied in the adapter via `resolveListPage`).
  `count(filter)` returns how many rows match the filter, ignoring page/pageSize. No filtering by
  fields that live in `details` JSONB — those fields are columns when they are searchable or sortable.
- No platform imports, no `ctx`, no SQL types.
- When `data.requiredMethods` (or the plan item) lists `delete`, declare
  `delete(id: string): Promise<void>` on the interface. A delete* operation in the l4 is the
  contract; omitting `delete` makes the generated usecase 409 or invent the method by cast.
- Append-only EVENT ports (`data.appendOnly === true`): expose `append(record): Promise<{Event}>` plus
  read finders (e.g. `listByOwnerId(ownerId)`, `listByPeriod(from, to)`). NO `save`/`update`/`delete` and
  no mutation methods — an event, once recorded, is immutable. Event ports never receive `delete`
  even if a sibling aggregate does.
