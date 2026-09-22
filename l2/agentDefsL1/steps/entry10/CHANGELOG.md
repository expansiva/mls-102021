# entry10

## 2026-09-21 (d1_01)

- Deterministic CLI: `/run`, `/resume`, `/help`. No model.
- Checkpoint at `l1/<module>/pipeline/agentDefsL1/pipeline.json`, project included.
- `/candidate` and `/rebuild all` refused. Planner `pipeline.json` is not touched.
- An intact checkpoint is not rewritten by resume, a second run, or a late hook.
- Later flow steps stay declared and report that they are not implemented.
