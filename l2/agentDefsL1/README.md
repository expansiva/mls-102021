# agentDefsL1

L1 defs agent. This delivery is the skeleton: CLI, project identity, and resume.
It does not generate `.defs.ts` and it does not call a model. A step that is
only declared in `docs/flow.json` reports that it is not implemented.

## Invocation

```
@@agentDefsL1 <lowerCamel> /run
@@agentDefsL1 <lowerCamel> /resume
@@agentDefsL1 <lowerCamel> /help
```

`/help` writes nothing. `/run` records a checkpoint when the module has none
in this project. `/resume` continues an intact checkpoint and does not rewrite
it. A second `/run` of an intact checkpoint is the same no-op.

The project id is `mls.actualProject`, captured once on the task
(`longTermMemory.project`). Later hooks use that value. The same module name
in another project is a different module.

## Refusals

English, no model, no writes:

- missing module, or a module token that is not lowerCamel
- missing project identity
- more than one command, an unexpected argument, or an unknown flag (`/fast`, `/rebuild` without `all`, `/candidates`)
- `/candidate`, including `/candidate tobe/plan` — same flag spelling as the L1 planner, refused here. Nothing is pointed at `tobe`
- `/candidate` with `..` — `Candidate path must not contain '..'.`
- any other `..` — `Path must not contain '..'.`
- `/rebuild all` — same flag spelling as agentNewSolution5, refused. Nothing is deleted
- `/resume` without an intact checkpoint
- a checkpoint that does not parse, or that belongs to another flow, project or module
- a step prompt that carries a field this step does not know (`candidate` is not dropped)

## Write surface

| path | this delivery |
|---|---|
| `l1/<module>/pipeline/agentDefsL1/pipeline.json` | written on the first `/run` |
| `l1/<module>/pipeline/pipeline.json` | planner file. Never written or removed |
| `l1/<module>/pipeline/agentDefsL1/input.json` | reserved for input20 |
| `l1/<module>/pipeline/agentDefsL1/drafts/<step>.json` | reserved. A draft does not approve a step |
| `l1/<module>/pipeline/agentDefsL1/traces/<step>.json` | reserved |
| `l1/<module>/pipeline/agentDefsL1/report.json` | reserved for finalize80 |

Reads, writes and removes of this agent's files all use `pipelineFile(project, module)`.
A remove of the planner file is refused. No `.defs.ts` or `.ts` of l1 is written.
l4, l2, l5 and the pool are not written.

The display path includes the project: `_102047_/l1/<module>/pipeline/agentDefsL1/pipeline.json`.

## Resume metadata

Stored on the checkpoint and on the task: `project`, `moduleName`, `flowId`,
`flowVersion`, `schemaVersion`, `command`, `steps.entry10.status`,
`steps.entry10.artifactPaths`, `updatedAt`.

Intact means the file parses, those identities match the invocation, and
`entry10` is `approved` with its own artifact path. Resume then writes zero
bytes. A duplicate or late hook cannot move `entry10` off `approved` and
cannot move `awaitingStep` forward.

`input20` through `finalize80` are declared and not implemented. Reaching one
sets `pipeline.status` to `awaitingStep` and the trace `step <id> not implemented yet`.
That is not success. The task step is completed so the run does not fail; the
trace and the checkpoint say the step does not exist yet.

## Flow

`docs/flow.json` is the contract. Done-anchors (`<step>-done`) unlock the next
step. Fan-out, worker and repair ids are reserved (`<step>-fanout`,
`<step>-worker-<itemId>`, `<step>-repair-<n>`). One repair per unit, eight
attempts globally, and finalize80 does not open another repair cycle. Child
hooks do not create a task and do not add steps. `update-status` cleans with
`input_output`.

This flow never dispatches `agentCbMaterialize`, `agentChangeBackend` or
`agentChangeFrontend`.
