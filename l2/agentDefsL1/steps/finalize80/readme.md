# finalize80 — integrity, coverage and the receipt

Deterministic. No LLM. No `prompt.md`. No repair step.

## Input

The step prompt is the entry10 JSON with `planId: finalize80`. The checkpoint
must already have `entry10` approved. The step reads `input.json`, the drafts,
the defs on disk and the source hashes. It does not run an earlier phase.

## Output

`report.json` lists phases, generated, preserved and removed defs, owners,
sources, enum consumption, coverage, future outputs and findings.
`executableBackend` stays false. A future `.ts` that is absent is pending
materialization. An absent L2 contract is `CONTRACT_ABSENT`.

A step that is not on the checkpoint is not executed. A run held at an earlier
step is left there. The report does not call that a completed generation.

When the defs are intact, `pipeline.status` becomes `complete` and
`finalize80` is `approved`. An error sets `awaitingStep` to `finalize80`,
`steps.finalize80.status` to `failed`, and `error` to `CODE:count`. The same
report bytes are not rewritten.
