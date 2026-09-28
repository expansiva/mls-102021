# plan20 — endpoints, usecases, ports and tables with l1 status

Candidates and inventory matching are deterministic. One reasoning call only for the unmatched remainder (alias of an existing usecase under another name, or a transactional merge across entities). No remainder means no LLM.

## Input

`pool/l1/web/needs.json` (from entry10), optional `pool/l1/web/l4diff.json` (from L4 p4_09; absent ⇒ `changes: []`), the l1 inventory on `pipeline.json`, the module l4 ontology (entity family / `storage.kind`, fk, lifecycle) and `access.defs.ts` actors.

## Output

`l4/<mod>/pool/l2/web/backend.json` plus an `l1→l2` pool message (`subject: backend plan of <mod> (web)`). Trace `delivered` on `pool/l1/pipeline.json`, close the pipeline, then trace
`processed` for every message read at entry and delete it (`deletePoolMessageAt`).
Duplicates go to `supersededMessages`. A message that arrived after entry stays.
The reply keeps the received `round` and is `estimate`. Draft:
`pool/l1/plan20-draft.json`. Done-anchor `plan20-done` closes the flow.

## Invariants

- Route `mod.<page>.<qry|cmd>Nome`. `usecaseRef` ∈ `usecases[]`. Entity ∈ l4.
- MDM never in `tables[]` or `ports[]`. Usecase exists; access is `ctx.mdm`. `noTable: mdm`, `tableRefs: []`.
- Every item has `tableRefs[]` (ids of `tables[]`) and `noTable: ok|mdm|none`. `ok` only when refs are not empty.
- `changes[]` copies `l4diff.json` items with `reason` (English, one line) and `source`. Shared across tables = one `changeId`, several `tableRefs`.
- Status `toCreate|toUpdate|toRemove|done`. Never `inProgress`. `existing` is the `.defs.ts` path when `done|toUpdate`, `""` when `toCreate`. `reason` always, English.
- Every needs page has ≥ 1 endpoint.
- `testSupport[]`: `identity:<actor>` (runtime; `personEntity` from `access.defs.ts`), `data:<entity>` per `tables[]` (L1; own fk targets, lifecycle `from` of needed transitions), `mdm:<entity>` for related MDM not bound to an actor (runtime). `executorRef`/`cleanupRef` empty ⇒ `gap` names the missing capability. Never grants, rows, hours or cost.
- Bounded repair (2) and one transport retry, NS5 pattern. No judgment gate.
