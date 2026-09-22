# input20

## 2026-09-21 (d1_02)

- Reads the fixed snapshot (backend v1.1, effort v1.1, needs, menu, L4 indexes) and writes `input.json`.
- Selects by backend and effort. Ports come from backend. `existing` keeps the id.
- Expands the file closure with `ownerRefs`. One controller per page, one file per usecase.
- Missing or divergent sources are problems that name the path. Nothing is dropped quietly.
- Does not write L4, L2, l5, the planner checkpoint or `.defs.ts`.
