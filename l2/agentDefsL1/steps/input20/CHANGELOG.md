# input20

## 2026-09-23 (d1_20)

- A present `toCreate` def is accepted when the progress file of the step that wrote it has that `defPath`, `status: done` and a `desiredHash` equal to the bytes on disk. The steps read are `domain30`, `persistence40`, `usecases50`, `controllers60` and `support70` (`traces/<step><step>.json`, schema `2026-09-22-d1-progress-v1`).
- That match does not retarget the plan. The action stays `create` and `contentHash` stays empty, so the snapshot hash stays the run id recorded on the receipt.
- A def with no such row, a hash that differs, or two receipts that disagree is still `EXISTS_WITHOUT_RECEIPT`. A missing def is planned again.
- `usecases50` already commits that progress file. `traces/usecases50-<usecaseId>.json` is a worker trace and is not read as a receipt.

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
