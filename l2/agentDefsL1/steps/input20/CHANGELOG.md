# input20

## 2026-09-22 (d1_13a)

- L2 contracts are read with `readContractAst`. `parseD1Source` stays for `.json` and object-literal `.defs.ts`.
- `CONTRACT_ABSENT` is only a missing file. A file that exists and does not parse is `CONTRACT_UNPARSED`. Both name the path.

## 2026-09-22 (d1_07c)

- When consumer phases are not released, the checkpoint sets `awaitingStep` to `input20` and `steps.input20` to `failed` with the blocking codes and counts (`CONTRACT_ABSENT:6`). The problem list stays in `input.json`.
- The task step is completed and the waiting steps are stopped, so the run ends. The checkpoint does not say `input20` was approved, and `input20-done` is not minted.
- A second pass does not rewrite that checkpoint.

## 2026-09-21 (d1_02)

- Reads the fixed snapshot (backend v1.1, effort v1.1, needs, menu, L4 indexes) and writes `input.json`.
- Selects by backend and effort. Ports come from backend. `existing` keeps the id.
- Expands the file closure with `ownerRefs`. One controller per page, one file per usecase.
- Missing or divergent sources are problems that name the path. Nothing is dropped quietly.
- Does not write L4, L2, l5, the planner checkpoint or `.defs.ts`.
