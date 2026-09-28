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

## Accepted plan (d1_35)

`/run` needs exactly one `mode: implement` message in `l4/<module>/pool/l1`, written by the
newRelease when the user accepts the effort. It must be for the thread of the approved L1
planner trace (`pool/l1/pipeline.json`), that thread must have been planned in `estimate`,
and it must name the accepted `menu`, `needs`, `backend` and `effort` files. `pool/l2` must be
empty (agentDefsL2 consumed its own implement first). Otherwise: refusal, nothing written.
Entry records the provenance in `l1/<module>/pipeline/agentDefsL1/approval.json` (message and
sha256 of every accepted artifact). finalize80, when the defs are complete, traces the
implement `processed` there and then deletes it. `/resume` without the message is allowed
only with that trace, the same planner thread and the same accepted bytes.

## Invariants

- `/candidate` and `/rebuild all` are refused. No candidate root is applied.
- A path containing `..` is refused.
- The same module name in another project is not this checkpoint.
- A duplicate or late hook does not rewrite an approved entry.
- `input20` is not approved because a file exists under `drafts/`.
