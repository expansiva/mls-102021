# entry10 — identity, checkpoint, resume

Deterministic. No LLM. No `prompt.md`.

## Input

`@@agentDefsL1 <lowerCamel> /run`, `/resume` or `/help`.

The step prompt is JSON `{ planId, moduleName, project, command }`. Any other
field is refused. `project` must match the task memory captured at invocation.

## Output

First `/run` writes `l1/<module>/pipeline/agentDefsL1/pipeline.json` with
`steps.entry10.status: approved` and the project in the artifact path.
Done-anchor `entry10-done` carries `{ project, moduleName, completedStep, nextStep, artifact }`.
It does not carry a draft.

`/help` and every refusal write nothing. `/resume` of an intact checkpoint
writes nothing. The planner file `l1/<module>/pipeline/pipeline.json` is never
touched.

## Command authorizes (d1_38)

`/run` and `/resume` run on the command, from the newRelease or a direct invocation. No
`implement` message, `approval.json`, planner thread or other proof is read to decide. The
checks are technical: prompt, project, module, checkpoint, and input20's sources and contracts.
An `implement` addressed to l1 in `l4/<module>/pool/l1` is optional transport: entry10 lists the
ones present now in its `entry10-done` result (`dispatch`), and finalize80, when the defs are
complete, traces each one `processed` in `report.json` (`pool`) and only then deletes it.
Estimate messages and later arrivals are not touched. Without a message nothing is fabricated.

## Invariants

- `/candidate` and `/rebuild all` are refused. No candidate root is applied.
- A path containing `..` is refused.
- The same module name in another project is not this checkpoint.
- A duplicate or late hook does not rewrite an approved entry.
- `input20` is not approved because a file exists under `drafts/`.
