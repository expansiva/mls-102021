# input20

## 2026-09-28 (d1_40)

- `regenerateCurrent` also runs agentDefsL2 input20 (`buildD2InputSnapshot`) and contracts30 (`generateD2Contracts`) over the regenerated needs/backend/effort, so the seed page contracts come from the same plan revision. They are outputs, not copies of the bench; `regenHead.test` compares them byte for byte and checks that every backend route has one binding, a declared input and one input symbol in its page contract.
- `CURRENT_SEED_MDM_BINDING_SKIP` is gone: the contracts copied from the bench were older than the plan (six routes had no binding).

## 2026-09-28 (d1_39)

- The backend plan is accepted only as v1.2 (`2026-09-21-p1-backend-v1.2`). `D1_BACKEND_SCHEMAS` is gone. Another version is `SCHEMA_DIVERGENT` on its path, and the message says to regenerate it with its producer. Nothing is converted.
- `backend.testSupport[]` is checked when both plans are current: the array is required (empty is valid); each item has the nine fields, a unique id, status `toCreate|toUpdate|toRemove|done`, owner `L1|runtime`, needs actors and ontology entities as refs, and a gap when an executor or cleanup ref is empty; `done` needs both refs. Code `TEST_SUPPORT_INVALID` on the backend path. D1 does not fill any field.
- `effort.testSupport[]` must be the copy of the backend array and `effort.meta.sourceVersion` the backend schema; otherwise `DIVERGENT_SOURCE` on the effort path.
- New seed `fixtures/current`: inputs copied from mls-102047, needs/backend/effort/planner pipeline written by the producers (`regenHead.ts` `regenerateCurrent`, byte-for-byte test). `fixtures/head` stays as the v1.1 refusal proof.

## 2026-09-28 (d1_37)

- The effort plan is accepted only as v1.2 (`2026-09-21-p2-effort-v1.2`), the version the L2 producer writes. A v1.1 effort is `SCHEMA_DIVERGENT` on its path and holds consumer phases. No v1.1 reader. The mirrored `testSupport[]` and `meta.sourceVersion` are not read by D1.
- The frozen fixtures still carry effort v1.1 and are not converted; the tests that replay them now prove the refusal.

## 2026-09-27 (m1_28)

- The backend plan is accepted as v1.1 or v1.2 (`D1_BACKEND_SCHEMAS`). A v1.1 plan gives the same snapshot (pinned in gate.test).

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
