# agentPlannerL1

## 2026-09-20 (p1_04)

- Transition usecase id is the l4 `transitionId` (`cancelarMatricula`), not
  concatenated with the entity. Same `transitionId` on two entities in the
  module suffixes the entity on every colliding side. Route follows the name.

## 2026-09-20 (p1_02)

- `plan20`: candidates from `needs.json`, match against the l1 inventory,
  one reasoning call only for aliases/merges the name match cannot resolve.
  Writes `pool/l2/web/backend.json` + `l1→l2` message. Closes the pipeline.
  No inventory (102047) ⇒ everything `toCreate`, `llmCalled: false`.

## 2026-09-20 (p1_01)

- Skeleton in the NS5/L2 pattern: `createAgent` (`agentProject: 102021`,
  `visibility: public`), `helpers/p1Core.ts` + `p1Dispatch.ts` + `l1Inventory.ts`,
  `docs/flow.json` as the contract, one folder per step.
- `entry10` is deterministic: two entries (hand `@@agentPlannerL1 <lowerCamel>`
  and a step prompt `{ moduleName, thread, file }`) share `executeP1Entry`.
  Writes `l1/<mod>/pipeline/pipeline.json` with `thread`, `round`, `needsFile`
  and `inventory`.
- Refusals in English, testable without an ExecutionContext: missing module, not
  lowerCamel, l4 not complete, `nothing pending for <mod> in pool/l1`,
  `needs.json is missing`, unknown schema.
- `readL1Inventory(project, module)` is pure over `mls.stor`. Fixture of
  `controleChamados` (102039) for the done/toUpdate/toRemove branches of p1_02.
  Empty l1 (102047 `mensalidadesAcademia`) ⇒ `present: false`.
- `plan20` declared `waiting`. No LLM in this spec.
