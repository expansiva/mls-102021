# entry10 — take the pool/l1 needs message and open the l1 pipeline

Deterministic. No LLM.

## Input

- Hand: `@@agentPlannerL1 <lowerCamel>` → every pool/l1 **message** from l2
  (oldest first). `needs.json` is ignored as a message.
- Step: prompt JSON `{ moduleName, thread, file }`. Same grouping.

## Output

`l1/<mod>/pipeline/pipeline.json` with `thread`, `round`, `messageFile`,
`sourceMessages`, `needsFile`, `inventory`, `steps.entry10.status: approved`.
Wipes `l1/<mod>/pipeline/` first. Does not touch generated l1 source. Does not
delete the pool. Done-anchor `entry10-done` unlocks `plan20`.

## Invariants

- Module token is lowerCamel. l4 `pipeline.json` must be `complete`.
- Empty box (or only `needs.json`) refuses `nothing pending for <mod> in pool/l1`.
- Missing `needs.json` or unknown `schemaVersion` refuses in English.
- Same `moduleName` + `mode` + `artifacts` → one request. Two different requests
  refuse in English for the l2 planner.
- `inventory.present` is false when the module has no l1.
- Does not write `.defs.ts`/`.ts` of l1. Does not delete pool messages.
