# entry10 — take the pool/l1 needs message and open the l1 pipeline

Deterministic. No LLM.

## Input

- Hand: `@@agentPlannerL1 <lowerCamel>` → every pool/l1 **message** from l2
  (oldest first). `needs.json` is ignored as a message.
- Step: prompt JSON `{ moduleName, thread, file }`. Same grouping.

## Output

`l4/<mod>/pool/l1/pipeline.json` with `thread`, `round`, `messageFile`,
`sourceMessages`, `needsFile`, `inventory`, `steps.entry10.status: approved`.
Drops the previous `pool/l1/plan20-draft.json` first. Writes and deletes nothing
under l1/ or l2/. If the previous run approved plan20 and some of its
`sourceMessages` are still in the box, finishes their deletes (resume) instead of
planning them again. Done-anchor `entry10-done` unlocks `plan20`.

## Invariants

- Module token is lowerCamel. l4 `pipeline.json` must be `complete`.
- Empty box (or only `needs.json`) refuses `nothing pending for <mod> in pool/l1`.
- Missing `needs.json` or unknown `schemaVersion` refuses in English.
- Same `moduleName` + `mode` + `artifacts` → one request. Two different requests
  refuse in English for the l2 planner.
- `inventory.present` is false when the module has no l1.
- Only `mode: estimate`. `implement` is ignored and never deleted; a box with
  only `implement` refuses.
- Does not write or delete anything under l1/ or l2/.
