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

## Invariants

- `/candidate` and `/rebuild all` are refused. No candidate root is applied.
- A path containing `..` is refused.
- The same module name in another project is not this checkpoint.
- A duplicate or late hook does not rewrite an approved entry.
- `input20` is not approved because a file exists under `drafts/`.
