# pool

This planner owns `pool/l1` of the module.

- Read the oldest `from: l2` file in `l4/<module>/pool/l1/` whose artifacts list
  `pool/l1/web/needs.json`. Pending is a file in the folder; there is no
  `status` field. `needs.json` itself is not a message.
- Read the module l4 (must be `complete`) and the existing l1/l5 of the module
  (inventory). The l4 is the only source of business meaning.
- Write `l1/<module>/pipeline/pipeline.json` and, in `plan20`,
  `pool/l2/web/backend.json` plus an `l1→l2` message. Never write l1
  `.defs.ts` / `.ts`.
- Trace processed messages on the **l1** pipeline
  (`l1/<module>/pipeline/pipeline.json`), never on the l4 pipeline.
- Do not delete the `pool/l1` message in this phase.
