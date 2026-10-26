# agentNewReleaseL1

Applies one master's backend change effort onto the L1 defs of a module.

Two invocations:

- `@@agentNewReleaseL1 <module>` reads `l4/<module>/pool/l4/changeEffort.json` and the product `.defs.ts` files under `l1/<module>/`.
- `@@agentNewReleaseL1 <module> /check` reads the portrait taken by the first call and compares the product defs. Any other flag is refused with the usage line.

## Mechanical edit

When every unit is a rule add or remove, a field removal on an entity or repository, a journey or step removal on seeds, or a workflow removal, the agent writes each changed def with `writeSourceText`. For each target `.defs.ts` it deletes the sibling `.ts` with `deleteFile` when that file is in the index. A missing `.ts` is skipped. A `.defs.ts` is never deleted on this path. A delete error ends `failed`, names the path, and lists the `.ts` files already deleted. The task ends `completed` with one line per edit (`path: added|removed <ruleId>`, or `path: removed field|journey|step <id>`), the deleted `.ts` paths, and one materialize command for the module:

```
@@agentMaterializeL1 {"scope":"<module>"}
```

A missing module, an extra argument, an unknown flag, a missing `changeEffort.json` (the message cites that path), a plan refusal, or a plan with nothing to edit and nothing to materialize (`nothing to apply`) finishes without writing. The refusal text is the plan's reason. A write error ends `failed`, names the path and the error, and lists the defs already written.

The same message also lists one line per touched unit, `<kind> <id>: <edit|removed field|removed journey|removed step|materialize> <path>`. A rule edit uses `edit`. A field, journey, or step removal uses that verb. Each `materialize` unit uses `materialize`. `kind` and `id` come from this master's effort. The mechanical path ends with `outside effort: 0`.

`/check` on this path is refused with `no generator run is pending`. It does not write defs.

## `/units`

The same first call also writes the mechanical edits above. Everything the mechanical path does not cover goes to `agentDefsL1` as an explicit unit list, in effort order and without repeats: every `create`, every `regenerateDefs` unit of an answer with `contract: change`, every `workflow` in `regenerateDefs` that this effort did not remove, and any other `regenerateDefs` unit the mechanical edit does not apply (another kind, a request that still cites a removed field, a request that must gain a rule but has no route whose `uses` cites a usecase in that same answer). For each of those `regenerateDefs` units the agent deletes the `.defs.ts` and the sibling `.ts` (a missing file is skipped; a `create` has no def to delete). The portrait is taken after the mechanical writes and those deletions, at `l1/<module>/pipeline/agentNewReleaseL1/snapshot.json` (path to sha256). The message lists each generator unit as `<kind> <id>: units <path>` and then these two commands, in this order. It never emits `/run`. Mechanical edits on the same call keep the unit lines above.

```
@@agentDefsL1 <module> /units <kind>:<id> ...
@@agentNewReleaseL1 <module> /check
```

The caller runs the defs generator, then `/check`.

## Refusal

Refused, and never applied in silence: `abend`, `runAgents`, and `remove` of a kind other than `workflow`. A missing rule id, or a field, journey, or step removal with no id, is also refused. A definition that cannot be parsed, or a list the mechanical edit must change and that is not a list, refuses the effort.

`/check` without that portrait is refused and the message cites `l1/<module>/pipeline/agentNewReleaseL1/snapshot.json`. With the portrait, the agent reads the product defs again and compares hashes with the paths the plan allows: the `create` and `regenerateDefs` units of this master, plus the page controller of each request. A path that was created, changed or deleted and is not allowed ends `failed`. The message lists those paths under `changed outside the plan:` and contains no `@@agentMaterializeL1` command. The portrait stays.

When nothing is outside the plan, the agent deletes the sibling `.ts` of each created or changed path the guard accepted, then deletes the portrait. The task ends `completed` with those deleted `.ts` paths and one `@@agentMaterializeL1 {"scope":"<module>"}`. A path that only disappeared is not a materialize target, and then the message is `nothing to materialize`. Each created or changed path is also one line, `<kind> <id>: units <path>` when the generator changed the def and `<kind> <id>: materialize <path>` when only the `.ts` is redone. A path with no effort unit uses the def `artifactType`, or `def`, and the file name. Then the message reads `l1/<module>/pipeline/agentDefsL1/report.json` and prints `model calls: <phase> <n> $<cost>` per phase in alphabetical order with a `total`, four decimal places, or `model calls: none` when `cost` is missing, the total is 0, or `byPhase` is empty. It ends with `outside effort: 0`. A delete error ends `failed` and leaves the portrait.

When the guard finds a path outside the plan, the message still starts with `changed outside the plan:` and then `outside effort: <n>` plus `<path>: not in the effort plan` on each following line.

The portrait and the check ignore everything under `l1/<module>/pipeline/` and `l1/<module>/materialization/`. Those bytes are not product defs. A product def that changes and is not in the allowed set, including `support70`, is reported as outside.

This agent does not call `agentDefsL1` or `agentMaterializeL1`. Both reject a step opened by another agent. The caller sends each command itself.
