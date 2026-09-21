# agentPlannerL1

## 2026-09-20 (p1_07)

- `l4diff` items whose `kind` is not in `P1_CHANGE_KINDS` are kept in
  `backend.json` `meta.unmappedChanges` (always present, empty when
  none) instead of vanishing. No semantic mapping. Gate does not fail.

## 2026-09-20 (p1_06)

- `entry10` honors `/candidate`. The step prompt reads `candidate` (L4 already
  writes it) and the hand invocation accepts `@@agentPlannerL1 <mod> /candidate
  [<rel>]`. Both call `setModuleRoot` before any l4/pool/pipeline read. Empty or
  absent resets to the canonical folder so a later task does not inherit. `..`
  in the path is refused in English. Without the flag the canonical l4 is
  byte-identical; pipeline and `pool/l2` writes follow `moduleFolder`.

## 2026-09-20 (p1_05)

- `backend.json` v1.1 groups every item by table (`tableRefs` / `noTable`) and
  carries `changes[]` from `l4diff.json` when L4 has written one. No l4diff
  (first generation) leaves `changes: []`. L2 effort40 keeps reading the same
  fields; nothing was renamed or removed.

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
