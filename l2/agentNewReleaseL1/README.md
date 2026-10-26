# agentNewReleaseL1

One path. The caller sends each command. This agent does not call `agentDefsL1` or `agentMaterializeL1`.

## Prepare

`@@agentNewReleaseL1 <module>`

Refuses, and writes nothing, when `l1/<module>_old/` already has a file, when `l4/<module>/pool/l4/changeEffort.json` is missing, or when `l1/<module>/` has no file.

Otherwise it copies every file under `l1/<module>/` to the same path under `l1/<module>_old/` (same text, same extension) and deletes the originals only after every copy is written. A failure in the middle undoes the copies and ends `failed`.

It then writes a creation copy of `l4/<module>/pool/l2/web/backend.json` and `effort.json`: every row the defs generator reads with a status, except `toRemove`, becomes `toCreate` with an empty `existing`. The two originals, and the planner record at `l4/<module>/pool/l1/pipeline.json` (or a marker when that record is absent), are saved under `l1/<module>_old/pipeline/agentNewReleaseL1/saved/`. The planner record written at the root is the one the generator expects, with artifact paths taken out of `tobe/plan` when that is where they were. `l1/<module>_old/pipeline/agentNewReleaseL1/prepared.json` lists what moved.

The message ends with:

```
@@agentDefsL1 <module> /run
@@agentNewReleaseL1 <module> /compare
```

## `/run`

`@@agentDefsL1 <module> /run` is the defs generator. This agent does not change it. The caller sends it on the empty `l1/<module>/` the prepare step left behind.

## `/compare`

`@@agentNewReleaseL1 <module> /compare`

Without `l1/<module>_old/`, it refuses with `no prepared run` and writes nothing.

It reads `l1/<module>/pipeline/agentDefsL1/report.json`. When that report is missing, invalid, or not `complete`, it restores the module and the saved plan, deletes `_old`, and ends `failed` with the generator reason.

Otherwise it compares each new `*.defs.ts` (not under `pipeline/` or `materialization/`) with the file at the same path in `_old`. The comparison uses the parsed definition without `doc` at any depth and without the envelope `status`. Model prose does not count.

- `igual`: the def, its sibling `.ts`, the controller `.test.ts`, and the materializer receipt of that unit come back from `_old`, byte for byte.
- `mudou` or `nova`: the new def stays and no `.ts` stays with it.
- `removida`: the def that exists only in `_old` does not come back, and neither does its `.ts`.

`registration.json`, `report.json`, `materialization/`, and `seedRows` come back only when every def is `igual`. `engine.ts` and `moduleTick.ts` come back only when the module has at least one `workflowProcess` def and every one of them is `igual`.

The saved `backend.json`, `effort.json`, and planner record are restored on every path. `_old` is deleted last.

The message is one line per unit, `<kind> <id>: igual|mudou|nova|removida <path>`, then the effort check against the master `102021` answers in `changeEffort.json` (`effort missing`, `effort extra`, `effort check: matches`, or `effort check: not available`). That check is a warning. It does not restore or delete anything. Then one cost line: `run cost: <total>` and `model calls: …` when the generator report has `cost`, otherwise `run cost: not recorded by the defs generator; read it from the /run task`. Then:

```
creation plan: written and undone
planner run: written and undone
@@agentMaterializeL1 {"scope":"<module>"}
```

## What this agent no longer does

It does not edit defs in place, it does not take a portrait, and it does not accept `/units` or `/check`.
