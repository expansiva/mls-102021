# Hexagonal backend — architecture (base skill, read first)

Generate ONE TypeScript file for a client module under `l1/{module}` following the **hexagonal
(ports & adapters)** model. The `.defs.ts` you receive is the single source of truth for WHAT to
generate; this skill is HOW. Output only the `.ts` for the given `outputPath`, starting with the
`/// <mls fileReference="..." enhancement="_blank"/>` header.

## Layers and dependency direction (inward only)

```
layer_1_external/adapters/   http (controllers=BFF), persistence (TableDefinition + repository adapters), queues/webhooks/cron/plugins
layer_2_application/         usecases, ports (interfaces), services, dto, commands, queries
layer_3_domain/             entities, value-objects, domain-services, rules, events  (PURE)
```

- `layer_3_domain` imports NOTHING external (no platform, no `ctx`, no SQL).
- `layer_2_application` imports the domain and defines **ports**; usecases resolve concrete
  repositories from the platform registry (never import an adapter).
- `layer_1_external` (adapters) imports application + domain. **`ctx.data` is allowed ONLY inside
  `adapters/persistence`.** HTTP controllers never touch `ctx.data` or persistence.

## Platform runtime contracts (project 102034 — the only allowed platform imports)

```ts
import { ok, AppError, type BffHandler, type RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { registerRepository, resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import type { TableDefinition } from '/_102034_/l1/server/layer_1_external/persistence/contracts.js';
// RequestContext: { data: IDataRuntime; log; clock: { nowIso() }; idGenerator: { newId() }; sessionContext; requestMeta? }
// ctx.sessionContext.activeCompanyId / activeUnitId: businessContext scope resolved by runtime/session
// ctx.sessionContext.workspaceId: UI workspace id, not a business company filter
// ctx.data.moduleData.getTable<TRow>(name): Promise<ITableRepository<TRow>>
//   ITableRepository: findOne({where}), findMany({where?, ilike?, orderBy?:{field,direction}, limit?, offset?}),
//                     count({where?, ilike?}) — same filter as findMany, ignores limit/offset,
//                     findManyByValues({field,values,limit?}), insert({record}), update({where,patch}), delete({where})
//   resolveListPage({page?, pageSize?}) from the same module: default pageSize 20, cap 200 (declares the cut)
// ctx.data.runInTransaction(async (tx) => { ... })  // tx is an IDataRuntime
// MDM facade: ctx.mdm.entity.get/create/update/inactivate/delete/link/unlink
//             ctx.mdm.collection.getMany/listByType/relatedOfMany/hydrateMany
//             ctx.mdm.prospect.create/get/listByType/update/promoteToEntity
```

## Port ↔ adapter wiring (dependency inversion)

- The usecase depends on the port interface `I{Entity}Repository` and gets the concrete adapter with
  `resolveRepository<I{Entity}Repository>(ctx, '{Entity}')`. It NEVER imports the adapter.
- The adapter is a factory `create{Entity}RepositoryAdapter(ctx): I{Entity}Repository` (methods close
  over `ctx`). The composition root (`adapters/persistence/registerRepositories.ts`) registers it with
  `registerRepository('{Entity}', create{Entity}RepositoryAdapter)`. That file is generated
  deterministically by agentCbRegister and imported by the 102034 runtime through the
  `persistenceModules[].tableDefsDir` config link — do NOT generate it, and do NOT import it from
  controllers or usecases.

## Hard rules

- **Naming is deterministic from the ontology `entityId`/`operationId`** (PascalCase entity, camelCase
  ids). NEVER translate to the PT title (no `pedidoEntity` for `Order`).
- **`ctx.data` ONLY in `adapters/persistence` for local module tables and transaction/queue runtime.**
  Domain and application must not reference it except usecases may open `ctx.data.runInTransaction`.
- **MDM/horizontal entities have NO local table.** Read/write MDM via `ctx.mdm`; never use raw
  `ctx.data.mdmDocument`, `ctx.data.mdmEntityIndex`, `ctx.data.mdmRelationship` or `tx.mdm*`.
- **JSONB-first persistence**: only indexed fields are real columns; everything else + child
  collections go in a single `details` JSONB column (the adapter serializes/parses it).
- Ids via `ctx.idGenerator.newId()`; timestamps via `ctx.clock.nowIso()`.
- `AppError(code, message, httpStatus, details?)`: `VALIDATION_ERROR` 400, `NOT_FOUND` 404. `message` is English (or i18n), never a hardcoded locale.
  `CONFLICT` 409. Generate only what the `.defs.ts` declares.

## TypeScript strictness (the generated .ts is compiled with strict:true — it MUST compile clean)

Recurring compiler errors to AVOID (each one fails the run):

- **TS2352 — never cast a typed platform/domain record directly to a looser shape.**
  `rec as Record<string, unknown>` fails when `rec` is `MdmRelationshipRecord`, `MdmEntityIndexRecord`,
  `MdmDetailRecord` or a domain entity (no index signature). Cast THROUGH unknown:
  `rec as unknown as Record<string, unknown>` — same for narrowing details:
  `(doc.details ?? {}) as unknown as YourShape`.
- **TS2352 on filters** — `{ subtype: 'Table' } as Partial<MdmEntityIndexRecord>` fails when the
  literal is not in the enum. Use `{ subtype: 'Table' } as unknown as Partial<MdmEntityIndexRecord>`.
- **TS2367 — enum vs literal comparison.** When a field is enum-typed and the literal may not overlap,
  compare via `String(rec.status) === 'active'`.
- **TS2304 — never reference an undeclared identifier.** Every repository you use must be declared in
  THIS file: `const shifts = resolveRepository<IShiftRepository>(ctx, 'Shift');`. When editing/repairing
  code, keep every declaration the remaining code still uses.
- **TS2339 — MDM is on `ctx.mdm`, not on repository ports.** Use `ctx.mdm.entity.*`,
  `ctx.mdm.collection.*` and, for prospect workflows, `ctx.mdm.prospect.*`; do not call
  `ctx.data.data.*` or raw `ctx.data.mdm*`.
