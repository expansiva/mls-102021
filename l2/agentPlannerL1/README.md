# agentPlannerL1

L1 planner. Reads a finished l4 module and the oldest `l2→l1` message in
`pool/l1` whose artifact is `needs.json`, inventories the existing l1 (if any),
and writes `pool/l2/web/backend.json` v1.2 (endpoints, usecases, ports, tables with
`OwnerStatus`, `tableRefs`/`noTable` on every item, `changes[]` from optional
`l4diff.json`, and `testSupport[]`). Unique name `agentPlannerL1`. Lives in `mls-102021` next to
`agentChangeBackend`.

Estimate only (27/09): nothing is written or deleted under `l1/<mod>` or `l2/<mod>`.
The trace lives in `pool/l1/pipeline.json`. After the plan is delivered each
consumed `pool/l1` message gets a `processed` trace and is deleted
(`deletePoolMessageAt`); duplicates are listed in `supersededMessages`.
`implement` messages belong to `agentDefsL1` and are never touched.

## Invocation

```
@@agentPlannerL1 <lowerCamel>
@@agentPlannerL1 <lowerCamel> /candidate
@@agentPlannerL1 <lowerCamel> /candidate pipeline/changes/<id>/revisions/<rev>/l4
```

Or a step whose prompt is JSON `{ moduleName, thread, file, candidate }`.
`candidate` is optional; L4 writes the resolved folder when it dispatched with
`/candidate`. Both paths read the same `pool/l1` messages and write the same
pipeline (`l4/<mod>/pool/l1/pipeline.json`, or under the `/candidate` root).

- `/candidate` alone points `moduleFolder` at `<mod>/tobe/plan`. A relative path
  is joined under the module. With the flag the canonical tree (l1, l2 and l4)
  is byte-identical; only the candidate root may change. Without the flag the
  canonical l4 is byte-identical.
- Writes (`pool/l1` pipeline, `pool/l2`) follow `moduleFolder`, so they land inside the
  candidate when the flag is set.

## Refusals (English, no LLM)

- missing / not lowerCamel module token
- `/candidate` path containing `..`
- module l4 `pipeline.json` missing or not `status: complete`
- empty `pool/l1` (or only `needs.json`): `nothing pending for <mod> in pool/l1`
- only `implement` messages: `pool/l1 has no estimate message; implement belongs to agentDefsL1, not to the planner`
- oldest l2→l1 message does not list `needs.json`, or the file is absent
- `needs.json` `schemaVersion` other than `2026-09-21-p2-needs-v1`
- two different requests in the box: `pool/l1 has N different requests; resolve with the l2 planner`

## Pipeline

`docs/flow.json` is the contract: `entry10 → plan20`. `entry10` is deterministic
and records `inventory` (from `routeKeys`, controllers, usecases, ports, tables,
`todoBackend.defs.ts owners[].statusBackend`). Without l1 (102047 today)
`inventory.present` is `false`. `plan20` matches candidates against that
inventory; one reasoning call only for the unmatched remainder. It writes
`pool/l2/web/backend.json` (schema `2026-09-21-p1-backend-v1.2`) and an `l1→l2`
message, then closes the pipeline. When `pool/l1/web/l4diff.json` is present it
fills `changes[]`; otherwise `changes` is empty and the rest of the plan is
unchanged.

Re-execution starts from zero (rewrites `pool/l1/pipeline.json`, drops the
`pool/l1` draft). If the previous run approved plan20 but did not finish the
deletes, entry10 finishes them instead of planning again. It never touches l1
or l2.

Types reused from `/_102035_/l2/solution/{pool,fs,types}.js`. `parseDefsSource`
from `agentChangeBackend/helpers/cbDefsSource.ts` reads `.defs.ts` without eval.
`OwnerStatus` is the CB enum.
