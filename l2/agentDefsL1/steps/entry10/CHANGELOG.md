# entry10

## 2026-09-27 (d1_35)

- `/run` and `/resume` refuse without the accepted `implement` in pool/l1 (or, on resume, its
  recorded and consumed approval). Estimate, duplicate, historical or replaced-plan messages
  and a pending pool/l2 are refused without writing.
- Entry writes `approval.json` with the message and the hash of each accepted artifact.

## 2026-09-21 (d1_01)

- Deterministic CLI: `/run`, `/resume`, `/help`. No model.
- Checkpoint at `l1/<module>/pipeline/agentDefsL1/pipeline.json`, project included.
- `/candidate` and `/rebuild all` refused. Planner `pipeline.json` is not touched.
- An intact checkpoint is not rewritten by resume, a second run, or a late hook.
- Later flow steps stay declared and report that they are not implemented.
