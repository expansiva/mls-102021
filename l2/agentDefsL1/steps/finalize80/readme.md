# finalize80 — integrity, coverage and the receipt

Deterministic. No LLM. No `prompt.md`. No repair step.

## Input

The step prompt is the entry10 JSON with `planId: finalize80`. The checkpoint
must already have `entry10` approved. The step reads `input.json`, the drafts,
the defs on disk and the source hashes. It does not run an earlier phase.

## Output

`report.json` lists phases, generated, preserved and removed defs, owners,
sources, enum consumption, coverage, future outputs and findings.
`cost` sums finite `interaction.cost` on the steps of this task: `calls` is
how many of those steps belong to the phase, `cost` is their sum to 4 decimal
places, and the phase is the `planId` text before the first `-` (`other` when
the step has no `planId`). No such step yields `{ total: 0, byPhase: {} }`.
Reports written before this field still parse.
`executableBackend` stays false. A future `.ts` that is absent is pending
materialization. An absent L2 contract is `CONTRACT_ABSENT`.
A persisted outbound that names `IQueueRuntime.publish` is
`MECHANISM_INCOMPATIBLE` on the file, not a binding.

A step that is not on the checkpoint is not executed. A run held at an earlier
step is left there. The report does not call that a completed generation.

When the defs are intact, `pipeline.status` becomes `complete` and
`finalize80` is `approved`. An error sets `awaitingStep` to `finalize80`,
`steps.finalize80.status` to `failed`, and `error` to `CODE:count`. The same
report bytes are not rewritten.

## Pool dispatch (d1_38)

Only on a complete report: the l1 `implement` messages entry10 listed are traced
`processed` in `report.pool` (earlier lines kept), and each is deleted after its line is
read back from disk. Not an authorization; absent when nothing was consumed.
