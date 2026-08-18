# Skill: applicationUsecase → `layer_2_application/usecases/{usecase}.ts`

Generate the usecase: it decides WHAT happens (validations, state transitions, orchestration). It
imports the DOMAIN and the repository PORT type, resolves the concrete adapter via
`resolveRepository`, applies L4 rules inline, and only touches `ctx.data` for the single
`ctx.data.runInTransaction` wrapper. MDM master data is accessed only through `ctx.mdm`.
Export the function + its Input/Output
types (the controller imports these). Use `data.functionName`, `data.ports`, `data.rulesApplied`,
`data.steps` from the defs.

## Golden example (compiles)

```ts
/// <mls fileReference="_{project}_/l1/{module}/layer_2_application/usecases/createOrder.ts" enhancement="_blank"/>
import { AppError, type RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import type { IOrderRepository } from '/_{project}_/l1/{module}/layer_2_application/ports/orderRepository.js';
import type { Order, OrderItem, OrderType } from '/_{project}_/l1/{module}/layer_3_domain/entities/order.js';
import { orderRequiresItem, recomputeOrderTotal } from '/_{project}_/l1/{module}/layer_3_domain/entities/order.js';

export interface CreateOrderItemInput { menuItemId: string; quantity: number; unitPrice: number; observations?: string; }
export interface CreateOrderInput { dailyShiftId: string; orderType: OrderType; tableId?: string; customerName?: string; items: CreateOrderItemInput[]; }
export interface CreateOrderOutput { order: Order; }

export async function createOrder(ctx: RequestContext, input: CreateOrderInput): Promise<CreateOrderOutput> {
  const orders = resolveRepository<IOrderRepository>(ctx, 'Order');
  const now = ctx.clock.nowIso();

  const items: OrderItem[] = (input.items ?? []).map((it) => ({
    id: ctx.idGenerator.newId(), menuItemId: it.menuItemId, kitchenTicketId: null,
    quantity: it.quantity, unitPrice: it.unitPrice, totalPrice: it.unitPrice * it.quantity,
    observations: it.observations ?? null, status: 'new', createdAt: now, updatedAt: now,
  }));

  const order: Order = {
    orderId: ctx.idGenerator.newId(), dailyShiftId: input.dailyShiftId, tableId: input.tableId ?? null,
    kitchenTicketId: null, orderType: input.orderType, status: 'draft', totalAmount: recomputeOrderTotal(items),
    notes: null, customerName: input.customerName ?? null, customerPhone: null, numberOfGuests: null,
    closedAt: null, cancelledAt: null, cancellationReason: null, items, createdAt: now, updatedAt: now,
  };

  if (!orderRequiresItem(order)) {
    throw new AppError('VALIDATION_ERROR', 'orderRequiresItem: o pedido precisa de ao menos um item.', 400, { ruleId: 'orderRequiresItem' });
  }

  const saved = await orders.save(order);
  return { order: saved };
}
```

## Rules

- Generate ONE exported `async function` per entry in `data.functions` (a usecase may export SEVERAL),
  signature `(ctx: RequestContext, input: {inputTypeName}): Promise<{outputTypeName}>`.
- Build the `{inputTypeName}` interface from the function's EXPLICIT `data.functions[].input[]` fields
  (name + type, `?` when `required:false`) — do NOT invent fields. Export it (the controller imports it).
- Build the `{outputTypeName}` interface from `data.functions[].outputShape` when present — it is the
  CANONICAL wire shape declared by l4 and is AUTHORITATIVE: the interface MUST match it EXACTLY (same
  field names, same required-ness, same array/object nesting) and your implementation MUST return that
  shape. `outputShape` is `{ kind, fields[] }`; each field is `{ name, type, required, fieldRef?, item? }`.
  For a field with `type: 'array'` or `'object'` declare a named nested interface from its `item.fields`
  (e.g. `orders: DashboardOrder[]`, with `interface DashboardOrder { ... }`), one level deep. Fields with
  no `fieldRef` are computed/aggregate values you must produce in the body (e.g. `totalSales`,
  `topSellers`). Do NOT add, drop or rename output fields — the frontend contract copies this same shape,
  so any deviation re-creates the FE×BE drift. If `outputShape` is absent (legacy), fall back to building
  `{outputTypeName}` from the flat `output[]` fields. Export the output interface(s).
- The planned function IO was derived from the L4 v2 contract. Preserve that boundary: `accessPattern`
  decides list/get/lookup/commandInput; only inputs whose source is `userInput`, `selectedEntity` or
  `routeParam` are public required fields. Values whose source is `systemDefault`, `currentWorkspace`,
  `actorSession`, `businessContext` or `activeLifecycleInstance` are resolved server-side — they are NOT
  part of the public Input interface and are NOT required as user-entered params.
  - `businessContext.activeCompanyId` -> `ctx.sessionContext.activeCompanyId`
  - `businessContext.activeUnitId` -> `ctx.sessionContext.activeUnitId`
  - `activeLifecycleInstance` -> load the single OPEN/active instance of the lifecycle aggregate via its
    port (e.g. the one `Shift` with `status === 'open'`) and use its id; if none is open, honor the L4
    rule (empty result or the documented validation error) — never throw a "missing input" error for it.
  These context ids are resolved, not plain form fields. Apply a business-scope filter only on a field
  that exists in the model; never invent one (e.g. a `companyId` the entity does not declare) — record a
  modeling gap and skip the filter instead.
- Resolve every repository with `resolveRepository<I{Entity}Repository>(ctx, '{Entity}')`. NEVER import
  an adapter. Import record/union types and invariants from the domain entity.
- Apply `rulesApplied` inline in this usecase file. L4 rules are authoritative prose/ids, not generated
  modules: NEVER import from `layer_3_domain/rules/*`, NEVER invent `{ruleId}Rules`/`comboRule` modules,
  and NEVER add a rule import that is not present in `dependsFiles`. Prefer existing domain invariants
  from imported domain entities; otherwise write a small local helper in this usecase file and include
  the `ruleId` in the thrown `AppError('VALIDATION_ERROR'|'CONFLICT', …)` details.
  HARD REQUIREMENT (deterministic gate): EVERY id in `rulesApplied` must appear VERBATIM somewhere in
  this file, or the output is rejected. A blocking rule is covered by the `AppError` details above; a
  NON-blocking rule (side-effect, filter, computed behavior — e.g. a cancellation that restores
  availability) must carry a `// rule: <ruleId>` comment on the exact line(s) that enforce it.
  A third kind exists and is the one most often mishandled: an **ASSUMPTION / SCOPE rule** — a premise or
  phase limitation rather than something the data can violate (a connected-experience assumption, "not
  supported in this phase", "single-currency for now"). It is satisfied ONLY by a `// rule: <ruleId>`
  comment where the premise is relevant — **NEVER by an `AppError`**.
  THE TEST, applied before writing anything: name the concrete input field or stored state of THIS
  operation that would violate the rule. If you can name it, enforce it (blocking or non-blocking). If you
  cannot — and note you may only have the rule ID, not its prose — do NOT invent a check to satisfy the
  gate: emit the comment. **When in doubt, comment.** An id that reads as a premise (`…Assumption`,
  `…Assumed`, `…OnlyPhase`, `…NotSupported`) is a strong signal, but the fallback above governs.
  Why this matters more than it looks: fabricating a validation to satisfy the gate produces a 400 that
  every caller hits, so the route can never return data and can never be tested. Observed in a generated
  query: it rejected all callers with `VALIDATION_ERROR` naming an assumption rule, which also blocked
  every later test on that page.
  Finally, never label an EXISTING guard with an assumption ruleId: a missing authenticated actor, an
  absent session or a permission gap is not an assumption violation. Use the rule that actually governs it
  (or state the plain reason) — a wrong ruleId on a real guard hides why the request was rejected.
- Lifecycle: read current state, check the domain transition (e.g. `canTransition*`), then `save`.
- Multi-aggregate writes go inside one `ctx.data.runInTransaction(async (tx) => { ... })`. Do not use
  raw MDM primitives from `ctx.data` or `tx`; use `ctx.mdm` for MDM so document, index and
  `relationshipRefs` stay consistent.
- Ids via `ctx.idGenerator.newId()`, timestamps via `ctx.clock.nowIso()`.

## Child-entity operations (embedded members)

An operation may target a CHILD entity that is embedded in a parent aggregate (it lives in the parent's
collection, stored in `details` JSONB — e.g. `OrderItem` inside `Order`). There is **no child
repository**. The defs gives you the parent in `data.ports` / `data.functions[].ports`. Pattern:

1. resolve the PARENT port (`resolveRepository<I{Parent}Repository>(ctx, '{Parent}')`);
2. load the parent aggregate (the input carries the parent id, e.g. `orderId`, plus the child id);
3. find and mutate the child inside the parent's collection;
4. `save(parent)`.

Never call a method like `findByOrderItemId` on the parent port and never import a child port — those do
not exist. If you need the parent id to locate the child, it is part of the function input.

## MDM references (master data, accessed by id)

Entities listed in `data.mdmRefs` are MDM master data (people, companies, vehicles, menus, categories,
tables). They live in the shared 102034 MDM store, NOT in this module: there is **no local port, entity
or table** for them, and you must NEVER `resolveRepository` one. A transaction references them **by id
only** — the id comes in the function input (e.g. `tableId`, `menuCategoryId`).

Read a master-data record by id via the MDM facade:

```ts
const entity = await ctx.mdm.entity.get({ mdmId: input.tableId });
if (!entity) throw new AppError('NOT_FOUND', `MDM record not found: ${input.tableId}`, 404, { mdmId: input.tableId });
const table = entity.details; // the master-data payload
```

`ctx.mdm.entity.get`/`ctx.mdm.collection.getMany` return `MdmEntityReadResult`:
`{ mdmId, version, document, index, details, related() }`.

- `document` is `MdmDocumentRecord = { mdmId, version, details }` — it has **NO**
  `createdAt`/`updatedAt`. Reading `entity.document.createdAt` is a TS2339 compile error; never
  infer temporal metadata on `document`.
- Timestamps live on the INDEX: `entity.index.createdAt` / `entity.index.updatedAt`
  (`MdmEntityIndexRecord`). Module-owned dates may also live under `entity.details.<moduleId>`.

For bulk reads use `ctx.mdm.collection.getMany({ mdmIds })`. For module lists use
`ctx.mdm.collection.listByType({ type: '<module>.<Entity>' })`; this reads the promoted
`details.moduleTypes` index. For relationship hydration use `ctx.mdm.collection.relatedOfMany(...)`
and `ctx.mdm.collection.hydrateMany(...)`. Often just storing/passing the id is enough - only fetch the
record when you actually need its fields. Do not import any `/_{project}_/.../ports/{mdm}Repository` -
it does not exist.

### Type pitfalls that fail the compile (the in-loop compiler now checks cross-project types too)

- **`entity.related(key)` takes a typed `CompactRelationshipRefKey`** — NEVER invent a key or force one
  with a literal cast (`entity.related(key as 'o')` / `entity.relatedIds(rel as 'OffersProduct')` are
  rejected). To get a linked id, read a DECLARED field off the record (e.g.
  `entity.details.<moduleId>.menuCategoryId`), not a guessed relationship key.
- **Append-only EVENT entities have NO `updatedAt`** — they carry only `createdAt` (plus their own
  declared timestamps such as `occurredAt`/`voidedAt`). Setting `updatedAt` on an event object literal is
  a compile error (TS2353). Only mutable **core** aggregates have `updatedAt`.
- **A port method typed `Promise<T | null>` really can return null** — assign it to a `T | null` variable
  and null-check (or throw `NOT_FOUND`) before use. Never assign a nullable result to a non-null variable
  or pass it where a non-null `T` is required (TS2322/TS2345).

Plural-first rule: never call `ctx.mdm.entity.get` inside a `for`/`while`/`map`/`forEach` loop. Collect
the ids first, call `ctx.mdm.collection.getMany({ mdmIds })` or `hydrateMany`, then join the results in
memory.

### Writing a module-owned MDM record (cadastral data only)

When `data.kind === 'mdm'` and the operation creates/updates the record, write through the MDM facade.
Never write `mdmDocument.put` directly: the facade is what keeps the document, index and
`relationshipRefs` consistent. The stored `details` is an MDM detail payload with required base fields;
place the module-owned columns under the module namespace key (for example `cafeFlow`) and include the
canonical module type in `moduleTypes`. If a field is module-specific but belongs to the master-data
record, store it under `details.<moduleId>`; if it is a relation to another MDM record, use
`ctx.mdm.entity.link/unlink` instead of storing a raw related id in JSON.

```ts
const person = await ctx.mdm.entity.create({
  details: {
    subtype: 'Person',
    name: input.name,
    status: 'Active',
    moduleTypes: ['people.Profile'],
    tags: ['people'],
    people: {
      birthDate: input.birthDate,
      preferredName: input.preferredName ?? null,
    },
  },
});

await ctx.mdm.entity.link({
  fromId: person.mdmId,
  toId: input.managerMdmId,
  type: 'ReportsTo',
  metadata: {
    sourceModule: 'people',
    note: input.relationshipNote ?? null,
  },
});
```

When `data.mdmWrites` names the entity, it carries the three things the code cannot guess: `mdmType`
(the canonical `<moduleId>.<Entity>` that must go in `moduleTypes`, or `ctx.mdm.collection.listByType`
will never see the record), `subtype` (the 102034 closed union) and `idField` — the module-side field
that CARRIES the returned `mdmId`. Store `created.mdmId` in that field; never mint a separate local id
for a master-data record.

For update, load the entity, preserve fields you do not change, and pass the optimistic version.
For create use `ctx.mdm.entity.create`. For update use `ctx.mdm.entity.update`. For cadastral
deactivation prefer `ctx.mdm.entity.inactivate`; use physical `ctx.mdm.entity.delete` only when the
operation truly removes a standalone record. For MDM links use
`ctx.mdm.entity.link({ fromId, toId, type })` and `ctx.mdm.entity.unlink({ relationshipId })`.
If no existing `RelationshipType` expresses the domain relation, record a modeling gap instead of
inventing a free-text type in generated code.
For prospect/pre-qualified lead flows use the explicit prospect facade:
`ctx.mdm.prospect.create`, `ctx.mdm.prospect.get`, `ctx.mdm.prospect.listByType`,
`ctx.mdm.prospect.update` and `ctx.mdm.prospect.promoteToEntity`; do not model prospects through
`ctx.mdm.entity`.

Relationship decision guide:

| Situation | MDM relationship |
| --- | --- |
| Ownership/possession | `Owns` |
| Physical/logical location | `LocatedAt` |
| Organization hierarchy | `SubsidiaryOf`, `BelongsToGroup`, `PartOfUnit` |
| Supplier/customer relation | `SupplierOf`, `CustomerOf` |
| Product/service offered | `OffersProduct`, `OffersService` |
| Contact channel/person | `HasContact` |

If none of these expresses the domain, keep the ids and record a modeling gap instead of inventing a
free-text relationship type silently.

Embedded decision guide: use embedded only for small child data that has no global identity, no
independent lifecycle, no cross-aggregate references, no own audit/reporting need and no relationship of
its own. If it needs identity, links, attachments, search or history, model it as MDM-owned or
module-owned instead of embedding it to simplify code.

Forbidden in generated module code: `ctx.data.mdmDocument`, `ctx.data.mdmEntityIndex`,
`ctx.data.mdmRelationship`, `tx.mdmDocument`, `tx.mdmEntityIndex`, `tx.mdmRelationship` and local MDM
repositories.

NEVER store operational/transactional state (occupancy, movement, balances, `'occupied'`/`'available'`)
in an MDM record — that is NOT cadastral data and belongs to a local `core` entity with its own table.
The MDM `status` is always one of the four cadastral `MdmStatus` values.

## Emitting events (append-only history)

`data.eventWrites` lists events this usecase MUST record whenever the matching transition happens, so the
history survives a restart instead of living only in memory. For each entry:

- **persisted** (`purpose` telemetry/audit): its port is already in `data.ports`. Resolve it
  (`resolveRepository<I{Event}Repository>(ctx, '{Event}')`), build the event record (new id via
  `ctx.idGenerator.newId()`, owner id, the new status/values, timestamp via `ctx.clock.nowIso()`) and
  `append(record)` it **inside the same `ctx.data.runInTransaction` as the aggregate write** — so the
  state change and its event commit together. Never `update`/`delete` an event.
- **reaction** (not persisted, `port` is null): there is no table — publish the trigger on the platform
  queue (`ctx.data.pgQueue.publish({ topic, payload })`) instead of a port; do not store local history.

Do NOT declare an event object and leave it unused: if `eventWrites` lists it, it must actually be
appended/enqueued on the transition.

## `steps` are guidance, not a contract

`data.steps` (and `data.functions[].steps`) are hints about intent. The CONTRACT you must satisfy is
`functions[].input` / `output` / `ports`. Do not invent repository methods or fields to satisfy a step
literally — implement the step using the declared input/output and the imported port + domain.
