# agentNewReleaseL1

Applies one master's backend change effort onto the L1 defs of a module.

Two invocations:

- `@@agentNewReleaseL1 <module>` reads `l4/<module>/pool/l4/changeEffort.json` and the product `.defs.ts` files under `l1/<module>/`.
- `@@agentNewReleaseL1 <module> /check` reads the portrait taken by the first call and compares the product defs. Any other flag is refused with the usage line.

## Def edit

When the effort is a rule add or remove, the agent writes each changed def with `writeSourceText`. For each target `.defs.ts` it deletes the sibling `.ts` with `deleteFile` when that file is in the index. A missing `.ts` is skipped. A `.defs.ts` is never deleted. A delete error ends `failed`, names the path, and lists the `.ts` files already deleted. The task ends `completed` with one line per edit (`path: added|removed <ruleId>`), the deleted `.ts` paths, and one materialize command for the module:

```
@@agentMaterializeL1 {"scope":"<module>"}
```

A missing module, an extra argument, an unknown flag, a missing `changeEffort.json` (the message cites that path), a plan refusal, or a plan with nothing to edit and nothing to materialize (`nothing to apply`) finishes without writing. The refusal text is the plan's reason. A write error ends `failed`, names the path and the error, and lists the defs already written.

Refused, and never applied in silence: `abend`, `create` of a kind other than `route` or `usecase`, `remove`, `runAgents`, `contract: change`, and `regenerateDefs` that does not come from a rule added or removed. A request that must gain a rule but has no route whose `uses` cites a usecase in that same answer is refused with `cannot tell which route takes the rule`.

`/check` on this path is refused with `no generator run is pending`. It does not write defs.

## Generator

A `create` of kind `route` or `usecase`, or a file whose `status` is `contract`, does not write product defs. The first call stores a portrait at `l1/<module>/pipeline/agentNewReleaseL1/snapshot.json` (path to sha256) and ends `completed`. The message lists the effort units (`kind id path`) and then these two commands, in this order:

```
@@agentDefsL1 <module> /run
@@agentNewReleaseL1 <module> /check
```

`remove` and `abend` are still refused. The caller runs the defs generator, then `/check`.

`/check` without that portrait is refused and the message cites `l1/<module>/pipeline/agentNewReleaseL1/snapshot.json`. With the portrait, the agent reads the product defs again and compares hashes with the paths the plan allows: the `create` and `regenerateDefs` units of this master, plus the page controller of each request. A path that was created, changed or deleted and is not allowed ends `failed`. The message lists those paths under `changed outside the plan:` and contains no `@@agentMaterializeL1` command. The portrait stays.

When nothing is outside the plan, the agent deletes the sibling `.ts` of each created or changed path the guard accepted, then deletes the portrait. The task ends `completed` with those deleted `.ts` paths and one `@@agentMaterializeL1 {"scope":"<module>"}`. A path that only disappeared is not a materialize target, and then the message is `nothing to materialize`. A delete error ends `failed` and leaves the portrait.

The portrait and the check ignore everything under `l1/<module>/pipeline/` and `l1/<module>/materialization/`. Those bytes are not product defs. A product def that changes and is not in the allowed set, including `support70`, is reported as outside.

This agent does not call `agentDefsL1` or `agentMaterializeL1`. Both reject a step opened by another agent. The caller sends each command itself.
