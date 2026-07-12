# Skill: httpController → `layer_1_external/adapters/http/controllers/{name}.ts`

Generate the BFF handler(s) — driving HTTP adapter. **L4 is the source of truth**: generate exactly
one `BffHandler` per entry in `data.handlers` (each has `command`, `usecaseRef`, `kind` and usually
`inputTypeName`); import the usecase FUNCTION named EXACTLY by `usecaseRef` (it was read from the
generated usecase, so the export is guaranteed to exist — never invent a different name) and its input
type by `inputTypeName` when present (otherwise `{Capitalize(command)}Input`); call it and return its
output. The frontend contract is OPTIONAL refinement:
if `data.outputSource === 'contract'` (and the contract `.ts` is in dependsFiles), map the response to
the contract Output exactly; otherwise the Output is the usecase output. Each handler validates the
boundary input only. NO `ctx.data`, NO persistence/domain-internals import.

## Golden example (compiles)

```ts
/// <mls fileReference="_{project}_/l1/{module}/layer_1_external/adapters/http/controllers/createOrder.ts" enhancement="_blank"/>
import { ok, AppError, type BffHandler, type ControllerRoute } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { createOrder, type CreateOrderInput } from '/_{project}_/l1/{module}/layer_2_application/usecases/createOrder.js';

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
  return ok(result.order);
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
- Import the usecase function named by `usecaseRef` + its Input type (`inputTypeName` when given); call
  it; wrap the result in `ok(...)`. The imported name MUST match `usecaseRef` exactly — do not rename it
  to the command or the page.
- `kind: 'query'` → return the queried data (unwrap the named output property); `command`/`mutation` →
  return the whole result. When a contract Output is provided, map field names to match it exactly.
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
