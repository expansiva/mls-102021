# Skill: persistenceSeeds → `layer_1_external/adapters/persistence/seeds.ts`

Compile `seeds.ts` from `seeds.defs.ts`. The planner JSON is already validated; this file is
**pure, deterministic TypeScript**. Do not call an LLM to invent rows, ids, or timestamps.

## Golden shape (compiles)

```ts
import type { Petition } from '/_{project}_/l1/{module}/layer_3_domain/entities/petition.js';
import type { TableSeedRows } from '/_102034_/l1/server/layer_1_external/persistence/contracts.js';

const petitionPublished: Petition = {
  petitionId: '…',
  imageReferences: [],
  createdAt: '2026-07-01T08:00:00.000Z',
};

const petitionRows: Petition[] = [petitionPublished];

export const seedIds = {
  petitionPublished: petitionPublished.petitionId,
} as const;

export const seedSpares = {
  Petition: { /* leftover valid values per seeded bare-string field */ },
} as const;

export const petitionSeeds: TableSeedRows = {
  seedFor: '{module}Petition',
  rows: [ /* snake_case table row; details keys are entity fieldIds */ ],
};
```

## Hard rules

- **No `Date.now()`, `Math.random()`, I/O, or network.** Two runs of the same defs must byte-match
  on every business value. Ids come from the compiler's stable UUID, timestamps from the plan.
- Rows are typed by the **entity** (`const rows: Petition[]`). A string where the entity declares an
  array is a compile error — do not coerce. The `TableSeedRows` export is the runtime boundary only
  (`rows: Array<Record<string, unknown>>`); do not change that contract.
- When a field is a bare `string` (not a literal union) **and** a domain validator accepts `string`,
  call that validator and search deterministically for a value it accepts (vary trailing digits, cap
  100 attempts). If none passes, keep the planned value and record a warning. A literal-union field
  is already checked by the compiler — do not wrap it (`seedStringPassing` returns `string` and
  takes `(value: string) => boolean`). In doubt, emit the planned value as-is. The generator does
  not interpret the rule; the app's function does. The decision is the declared field type and the
  function signature, never the function name.
- Export `seedIds` with one named anchor per seeded row (`entityId` camel + row key).
- Export `seedSpares` with leftover valid values per seeded bare-string field (same search as
  `seedStringPassing` when a validator exists; otherwise the next unused planned variant). Create
  tests consume these so they do not reuse a unique seeded value. Small and deterministic — no
  `Math.random`.
- Never invent a country-, document-, or domain-specific check in this file.
