# Skill: httpController → `layer_1_external/adapters/http/controllers/{name}.ts`

Generate the BFF handler(s) — driving HTTP adapter. **L4 is the source of truth**: generate exactly
one `BffHandler` per entry in `data.handlers` (each has `command`, `usecaseRef`, `kind` and usually
`inputTypeName`); import the usecase FUNCTION named EXACTLY by `usecaseRef` (it was read from the
generated usecase, so the export is guaranteed to exist — never invent a different name) and its input
type by `inputTypeName` when present (otherwise `{Capitalize(command)}Input`); call it and return its
output through the boundary DTO. **Output ownership (`data.outputSource`):**
- `'dto'` (default for single-function operations): the HTTP adapter owns the wire shape. Import
  `toDto` from `data.dtoModulePath` (the boundary DTO module) and return **`ok(toDto(result))`** — do
  NOT unwrap or reshape the result; `toDto` is the single projection point. This decouples the public
  contract from the usecase (the frontend copies the DTO's `responseShape`).
- `'contract'` (legacy, only when no DTO): map the response to the frontend contract Output exactly.
- `'usecase'` (fallback): the Output is the usecase output.
Each handler validates the boundary input only. NO `ctx.data`, NO persistence/domain-internals import.

## Golden example (compiles)

```ts
/// <mls fileReference="_{project}_/l1/{module}/layer_1_external/adapters/http/controllers/createOrder.ts" enhancement="_blank"/>
import { ok, AppError, type BffHandler, type ControllerRoute } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { createOrder, type CreateOrderInput } from '/_{project}_/l1/{module}/layer_2_application/usecases/createOrder.js';
import { toDto } from '/_{project}_/l1/{module}/layer_1_external/adapters/http/dto/createOrder.js';

export const {module}CreateOrderHandler: BffHandler = async ({ request, ctx }) => {
  const params = (request.params ?? {}) as Partial<CreateOrderInput>;
  // Read + validate ONLY genuine client inputs (source userInput/selectedEntity/routeParam).
  // Context values — the open-shift id (activeLifecycleInstance), actorSession, systemDefault,
  // businessContext — are NOT sent by the client; the usecase resolves them from ctx/ports, and they
  // are NOT on the usecase Input type, so forwarding one would be a compile error.
  if (!params.orderType) {
    throw new AppError('VALIDATION_ERROR', 'orderType is required', 400, { field: 'orderType' });
  }
  // Build an EXPLICIT input with only the client fields — never `request.params as XInput` wholesale.
  const input: CreateOrderInput = {
    orderType: params.orderType,
    tableId: params.tableId,
    items: params.items ?? [],
  };
  const result = await createOrder(ctx, input);
  // outputSource 'dto': the adapter owns the wire shape via the single projection point toDto.
  return ok(toDto(result));
};

// Self-describing routes — the runtime discovers them by importing this controller (no router file).
export const routes: ControllerRoute[] = [
  { key: '{module}.createOrder.createOrder', handler: {module}CreateOrderHandler },
];
```

## Rules

- Import line is ALWAYS `import { ok, AppError, type BffHandler, type ControllerRoute } from '/_102034_/l1/server/layer_2_controllers/contracts.js';`
  — include `AppError` even for `kind: 'query'` handlers (they still do boundary validation and throw it).
- When mapping to a frontend contract (`outputSource === 'contract'`), import its types with the FULL
  aliased path INCLUDING the leading slash: `import type { ... } from '/_{project}_/l2/{module}/web/contracts/{page}.js';`
  — the leading `/` is required by the path alias; NEVER emit `_{project}_/l2/...` without it.
- One exported `BffHandler` const per command, named `{module}{Pascal(command)}Handler`. NEVER add an
  explicit return type after the arrow (`BffHandler` already encodes it).
- Build an EXPLICIT input object with ONLY the public client fields from `data.handlers[].inputContract`
  whose source is listed in the shared `/_102029_/l2/clientBoundarySources.ts` module
  (`CLIENT_BOUNDARY_SOURCES`: `userInput`, `selectedEntity`, `routeParam`). NEVER cast `request.params as XInput`
  wholesale. Validate (`required:true`) and forward only those client fields. EVERY other source is
  resolved inside the USECASE from `ctx`/ports and is NOT on the usecase Input type — so the controller
  must NOT read it from params, validate it, or put it in the payload: `systemDefault`,
  `currentWorkspace`, `actorSession`, `businessContext`, `activeLifecycleInstance`. In particular,
  `activeLifecycleInstance` ids (e.g. the open `shiftId`) are resolved by the usecase from the aggregate
  port — forwarding one is a compile error because it is absent from the Input type. `businessContext`
  ids come from `ctx.sessionContext`, also resolved in the usecase. Business rules belong to the usecase.
- A field listed only in `contextResolution` is resolved context, not public boundary input. Do not emit
  `if (!input.<field>)` / `AppError(... field: '<field>')` for it unless the same field is also present
  in `inputContract` with `required:true`.
- **Boundary validation of an id checks SHAPE, not only presence.** A required id that is present but
  malformed must be rejected here with `AppError('VALIDATION_ERROR', …, 400, { field: '<field>' })`.
  Ids are opaque generated identifiers (`ctx.idGenerator`), so a client-supplied value that is not a
  well-formed identifier is a boundary error — passing it through reaches the persistence driver, whose
  own error surfaces as `INTERNAL_ERROR` (500) and leaks the SQL/driver message. Validate every
  `inputContract` field whose name ends in `Id` (or that the contract types as an id) before calling the
  usecase; do NOT hardcode a project-specific format — check the generic identifier shape the platform
  emits (non-empty, no whitespace, and the id charset used by `ctx.idGenerator`). A value that is
  well-formed but absent from storage is the usecase/adapter's `NOT_FOUND` (404), never a 500.
- Import the usecase function named by `usecaseRef` + its Input type (`inputTypeName` when given); call
  it. The imported name MUST match `usecaseRef` exactly — do not rename it to the command or the page.
- Returning the result: when `outputSource === 'dto'` (default) return `ok(toDto(result))` — the DTO is
  the single wire-shape projection; do NOT unwrap a property or reshape (this is what keeps the frontend
  contract stable across usecase regenerations). ONLY in the legacy `outputSource === 'contract'` /
  `'usecase'` modes: `kind: 'query'` may unwrap the named output property and, for a contract Output,
  map field names to match it exactly.
- NO `ctx.data`, NO imports from `adapters/persistence` or the domain internals.
- `kind: 'dispatcher'` → the canonical BFF route from l4 (`bffName`) over a usecase that exposes several
  functions (`usecaseRef` lists them separated by ` | `). Implement it WITHOUT calling usecases directly:
  inspect the input params and delegate to the matching per-function handler already defined in this file
  (pick by each function's required input field, e.g. an id field present → the byId variant; otherwise the
  list/other variant). If no variant matches, throw `AppError('VALIDATION_ERROR', ...)` naming the accepted
  fields. Never drop this route: the l2 contract calls the canonical name.
- ALWAYS export `const routes: ControllerRoute[]` with one entry per `data.routes[]`: `{ key, handler }`,
  where `key` is the route key from the defs (`{module}.{page}.{command}`) and `handler` is the exported
  handler const. The runtime discovers routes from this export — there is NO generated router file.

---

## V2: workspace controllers (`data.ownerKind === 'workspace'`)

When `data.ownerKind === 'workspace'` this is a **BFF-per-page controller**: ONE file for the whole
workspace/page (`data.workspaceId`), with **one handler per `data.handlers[]` entry** (each is a
`bffCall`). The rules above still hold (boundary-only input, no `ctx.data`, `routes` export); the
differences:

- **One handler per bffCall.** `handlerName` = `data.handlers[].handlerName` (already `{workspaceId}{Pascal(bffId)}Handler`).
  Each handler:
  1. **Authorization** — call the shared `enforceActors(ctx, ALLOWED, '<route>')` (define it ONCE per file)
     with the workspace scopes `data.allowedScopes`. It is permissive (the actor→login-role map is
     pending): absent session scope → allow + `ctx.log.info('bff.actor.no-scope', …)`; a declared
     `ctx.sessionContext.actorScope` with zero intersection → `return fail(new AppError('FORBIDDEN_ACTOR', …, 403))`.
  2. **Input** — validate the required boundary fields from `handler.inputContract` (same source rule:
     only `userInput`/`selectedEntity`/`routeParam`), then build the usecase input(s) from the client
     fields. Type it as the contract `handler.contract.inputTypeName` (imported from `handler.contract.modulePath`).
  3. **Call the usecase(s)** named EXACTLY by `handler.usecaseRefs` (real exports). Single use → one call;
     composed (`usecaseRefs.length > 1`) → `Promise.all`, and an `optionalUses` entry degrades to `null`
     on error (`.catch(() => null)`) with a warning in the envelope.
  4. **Project + return** per `handler.projection`:
     - `kind: 'object'` → `return ok({ …topFields })` typed to the contract `Output`. Each `topFields[i]`
       reads `<opResult>.<path>` (rename to the wire `name`).
     - `kind: 'list'` → the contract `Output` is a **BARE array** (`Item[]`). Map the usecase result's
       array to the item columns: `const items: Output = (<opResult>.<sourceArray> ?? []).map(row => ({ …itemFields }))`
       then `return ok(items)`. Read the `<sourceArray>` name from the usecase Output type (`.d.ts`) — for
       a `list` usecase it is `items`.
     - `kind: 'paginated'` → the contract `Output` is `{ <arrayFieldName>: Item[]; total; page; pageSize }`.
       Use the DECLARED `handler.projection.arrayFieldName` (e.g. `reservations`, NEVER `items`):
       `const <arrayFieldName>: Output['<arrayFieldName>'] = (<opResult>.<sourceArray> ?? []).map(row => ({ …itemFields }));`
       then `return ok({ <arrayFieldName>, total: <opResult>.total, page: …, pageSize: … })`.
     - `command` with no `handler.contract.outputTypeName` → passthrough: `return ok(<opResult>)`.
- **Imports**: the runtime contracts line as above; per used operation, the usecase function + its Input
  type from `/_{project}_/l1/{module}/layer_2_application/usecases/{operationId}.js`. **There is NO l1
  contract file — do NOT import from `l1/{module}/contracts/`.** The boundary input is validated from
  `handler.inputContract` and typed via the usecase Input type; the wire output is the projected object
  built inline from `handler.projection` (its shape IS the contract — the frontend copies the l4 contract
  separately). Do not declare a separate `XxxOutput` type; return the projected object structurally.
- **`routes`**: one entry per `data.routes[]` — `{ key: '<route string>', handler: <handlerName> }`. The
  `key` is the literal route from the defs (`{module}.{workspaceId}.{bffId}`).

### V2 golden example (paginated + command, compiles)

```ts
/// <mls fileReference="_{project}_/l1/{module}/layer_1_external/adapters/http/controllers/acompanharReservas.ts" enhancement="_blank"/>
import { ok, fail, AppError, type BffHandler, type BffResponse, type ControllerRoute, type RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { browseReservations, type BrowseReservationsInput } from '/_{project}_/l1/{module}/layer_2_application/usecases/browseReservations.js';
import { updateReservationStatus, type UpdateReservationStatusInput } from '/_{project}_/l1/{module}/layer_2_application/usecases/updateReservationStatus.js';
// NO l1/contracts import — the wire input is validated from handler.inputContract (typed via the usecase
// Input) and the wire output is the projected object built inline from handler.projection.

const ALLOWED: readonly string[] = ['{module}:equipeLoja'];
function enforceActors(ctx: RequestContext, allowed: readonly string[], route: string): BffResponse | null {
  if (allowed.length === 0) return null;
  const scope = ctx.sessionContext?.actorScope ?? [];
  if (scope.length === 0) { ctx.log.info('bff.actor.no-scope', { route, allowed }); return null; }
  if (scope.some((s) => allowed.includes(s))) return null;
  return fail(new AppError('FORBIDDEN_ACTOR', 'actor scope not permitted for ' + route, 403, { route }));
}

export const acompanharReservasListReservationsHandler: BffHandler = async ({ request, ctx }) => {
  const denial = enforceActors(ctx, ALLOWED, '{module}.acompanharReservas.listReservations');
  if (denial) return denial;
  const params = (request.params ?? {}) as { statusFilter?: string; page?: number; pageSize?: number };
  const input: BrowseReservationsInput = { statusFilter: params.statusFilter, page: params.page, pageSize: params.pageSize };
  const result = await browseReservations(ctx, input);
  const reservations = (result.reservations ?? []).map((row) => ({
    reservationId: row.reservationId, customerName: row.customerName, status: row.status,
  }));
  return ok({ reservations, total: result.total, page: result.page, pageSize: result.pageSize });
};

export const acompanharReservasUpdateStatusHandler: BffHandler = async ({ request, ctx }) => {
  const denial = enforceActors(ctx, ALLOWED, '{module}.acompanharReservas.updateStatus');
  if (denial) return denial;
  const params = (request.params ?? {}) as { reservationId?: string; newStatus?: string };
  if (!params.reservationId) throw new AppError('VALIDATION_ERROR', 'reservationId is required', 400, { field: 'reservationId' });
  const input: UpdateReservationStatusInput = { reservationId: params.reservationId, newStatus: params.newStatus };
  const result = await updateReservationStatus(ctx, input);
  return ok({ reservationId: result.reservationId, status: result.status });
};

export const routes: ControllerRoute[] = [
  { key: '{module}.acompanharReservas.listReservations', handler: acompanharReservasListReservationsHandler },
  { key: '{module}.acompanharReservas.updateStatus', handler: acompanharReservasUpdateStatusHandler },
];
```
