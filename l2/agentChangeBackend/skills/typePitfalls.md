# Type pitfalls (compiler-error micro-repair)

The generated `.ts` is compiled with `strict: true` and MUST compile clean. These are the recurring
compiler errors — fix the reported error with the SMALLEST change; do not restructure anything else.

- **TS2352 — never cast a typed record directly to a looser shape.** `rec as Record<string, unknown>`
  fails for `MdmRelationshipRecord` / `MdmEntityIndexRecord` / a domain entity (no index signature).
  Cast THROUGH unknown: `rec as unknown as Record<string, unknown>`; narrow details the same way:
  `(doc.details ?? {}) as unknown as YourShape`. Filters too: `{ subtype: 'Table' } as unknown as Partial<MdmEntityIndexRecord>`.
- **TS2367 — enum vs literal comparison.** When a field is enum-typed and the literal may not overlap,
  compare via `String(rec.status) === 'active'`.
- **TS2304 — undeclared identifier.** Every repository used must be declared in THIS file
  (`const shifts = resolveRepository<IShiftRepository>(ctx, 'Shift');`). When repairing, KEEP every
  declaration the remaining code still uses — do not delete a `const` another line needs.
- **TS2339 — MDM lives on `ctx.mdm`, not on repository ports.** Use `ctx.mdm.entity.*` /
  `ctx.mdm.collection.*` / `ctx.mdm.prospect.*`; never `ctx.data.data.*` or raw `ctx.data.mdm*`.
- **TS2353 — append-only EVENT entities have NO `updatedAt`.** They carry only `createdAt` (plus their
  own declared timestamps like `occurredAt` / `voidedAt`). Remove `updatedAt` from an event object
  literal; only mutable **core** aggregates have `updatedAt`. (Set the other required nullable columns —
  e.g. `voidedAt`, `voidedByUserId`, `compensatingAdjustmentId` — to `null`, not omitted.)
- **TS2322 / TS2345 — a nullable value where non-null is required.** A port method typed
  `Promise<T | null>` (e.g. `findCurrent()`) really can return null: assign it to a `T | null` variable
  and null-check (or throw `NOT_FOUND`) before use; never assign it to a non-null variable or pass it
  where `T` is required.
- **Invented relationship keys.** `entity.related(key)` takes a typed `CompactRelationshipRefKey` —
  never invent one or force it with a literal cast (`entity.related(key as 'o')`). Read the linked id
  from a DECLARED entity field (e.g. `details.<moduleId>.menuCategoryId`) instead.
