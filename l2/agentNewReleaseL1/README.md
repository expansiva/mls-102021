# agentNewReleaseL1

Applies one master's backend change effort onto the L1 defs of a module. Invocation: `@@agentNewReleaseL1 <module>`.

It reads `l4/<module>/pool/l4/changeEffort.json` and the `.defs.ts` files under `l1/<module>/` in the current project. It keeps the answers whose master project is this agent (102021, the L1 master) and writes each changed def with `writeSourceText`. The task ends `completed` with one line per edit (`path: added|removed <ruleId>`) and one materialize command per target:

```
@@agentMaterializeL1 {"target":"<path>"}
```

A missing module, an extra argument, a missing `changeEffort.json` (the message cites that path), a plan refusal, or a plan with nothing to edit and nothing to materialize (`nothing to apply`) finishes without writing. The refusal text is the plan's reason. A write error ends `failed`, names the path and the error, and lists the defs already written.

Refused, and never applied in silence: `abend`, `create`, `remove`, `runAgents`, `contract: change`, and `regenerateDefs` that does not come from a rule added or removed. A request that must gain a rule but has no route whose `uses` cites a usecase in that same answer is refused with `cannot tell which route takes the rule`.

This agent does not call `agentMaterializeL1`. That agent rejects a step opened by another agent (`agentMaterializeL1 has no step of its own`, `agentMaterializeL1.ts:103-113`). The caller sends each `@@agentMaterializeL1 {"target":…}` command itself.
