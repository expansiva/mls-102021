# plan20 — endpoints, usecases, ports and tables with l1 status

Candidates and inventory matching are deterministic. One reasoning call only for the unmatched remainder (alias of an existing usecase under another name, or a transactional merge across entities). No remainder means no LLM.

## Input

`pool/l1/web/needs.json` (from entry10), the l1 inventory on `pipeline.json`, and the module l4 ontology (entity family / `storage.kind`).

## Output

`l4/<mod>/pool/l2/web/backend.json` plus an `l1→l2` pool message (`subject: backend plan of <mod> (web)`). Trace `delivered` on the l1 pipeline. Done-anchor `plan20-done` closes the flow.

## Invariants

- Route `mod.<page>.<qry|cmd>Nome`. `usecaseRef` ∈ `usecases[]`. Entity ∈ l4.
- MDM never in `tables[]` or `ports[]`. Usecase exists; access is `ctx.mdm`.
- Status `toCreate|toUpdate|toRemove|done`. Never `inProgress`. `existing` is the `.defs.ts` path when `done|toUpdate`, `""` when `toCreate`. `reason` always, English.
- Every needs page has ≥ 1 endpoint.
- Bounded repair (2) and one transport retry, NS5 pattern. No judgment gate.
