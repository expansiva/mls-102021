# input20 — snapshot, hashes, file closure

Deterministic. No LLM. No `prompt.md`. No `.defs.ts` is written.

## Input

The step prompt is the same JSON as entry10, with `planId: input20`. The checkpoint
must already have `entry10` approved. Sources are read by file identity:

- L4 module, journey index and journeys, ontology index and entities, rules, workflows, access, integration
- `pool/l2/web/menu.json`, `pool/l1/web/needs.json`, `pool/l2/web/backend.json`, `pool/l2/web/effort.json`
- the planner checkpoint `l1/<module>/pipeline/pipeline.json` (read only)
- `l2/<module>/web/contracts/<pageId>.defs.ts` when the page id is safe
- defs already at a planned `l1` path, only to compare an inventoried hash

Pool messages are not read. Statuses in the pool are not changed.

## Output

`l1/<module>/pipeline/agentDefsL1/input.json` records source hashes, the selected
ids, the planned files (`ownerRefs`, `dependsOn`, action) and problems. The same
snapshot hash does not rewrite the file. Reading that file back is the resume
input; the task memory is not.

`input20-done` is minted only when `consumersReleased` is true. A missing L2
contract, a missing required source, a divergent plan, a stale L4 or a done item
without an inventoried file leaves the inventory on disk and does not unlock
`domain30`.

## Selection

Backend and effort must agree on id, status and the route fields. Ports come from
backend only. `toRemove` on a live row is an error; removal lives in `removed`.
A removed route does not drop a usecase that another selected route still uses.
`existing` is the identity. A path is a base for update only when the previous
receipt lists that path and hash. A prefix of `l1/<module>` is not ownership.

Review problems (payload, access anchor, unbound outbound, unattributed changes,
screens with no routes) stay on the inventory and do not by themselves release
or block consumer phases. Contract absence does block them.
