# agentMaterializeL1

## 2026-09-29 (m1_34)

- A case the agent did not observe no longer blocks generating. The unit gate is `gateBatch`
  (`testing/verify.ts`). Only a broken compile or import, a throw, or a def gap with an owner
  (held) blocks. A predicted case ok/status decides nothing. `verifyBatch`/`classifyCase` stay
  as the case classifier.
- Verify is `VERIFIED` when the output is intact against a receipt with no failure. `heldBlock`
  no longer counts `inconclusive`. An unread grant refuses the unit (`GRANT_UNREAD`).
- There is no Studio compile gate yet: collab-msg has no `mls.l2.typescript`.

## 2026-09-29 (m1_33)

- The agent runs only in the Studio browser (collab-msg simulates it) and executes no generated
  code. `run/execute.ts` no longer imports `l1/.../caseRun.js` nor `testing/memoryLoad.js`:
  implement keeps the emitter's observations, verify observes no case, and the fixture pass gets
  no executor (`FIXTURE_HOST_UNAVAILABLE`). The case verdicts come from the monitor (m1_35).
- `MaterializeRunHost.workspace` is gone; `studioHost.ts` no longer reads `mls.stor.diskPath`.
- `mls-102021/l1/agentMaterializeL1/` is deleted: the node CLI (`nodejsMaterializeL1.ts`),
  `caseRun.ts`, `testing/memoryLoad.ts`, `localState.ts`, `testing/nodeAdapter.ts`, the
  `proofC*.ts` scripts and their tests. `run/command.ts` loses `parseCliArgs` and the CLI fields
  and help lines.
- New guard `agentRunsInBrowser.test.ts`: nothing reachable from `agentMaterializeL1.ts` imports
  `node:*`, a node builtin, `/_NNNN_/l1/`, `pg`, `jose`, `redis` or `@aws-sdk/*` (top-level
  `import type` exempt), with a positive control.

## 2026-09-28 (m1_32)

- New `state/localBindings.ts` (l2, no node import): the state, writer and project-lock protocol
  over the `LocalFiles` port, moved from `l1/.../localState.ts`. The CLI and the Studio host both
  use it. `claim` creates `writer.json` / `l5/m1-project-lock.json` only when absent; `release`
  removes it only for its own holder. The in-memory holder maps of `studioHost.ts` are gone.
  `l1/.../localState.ts` keeps only the proof seams (`M1_CRASH_AFTER`, `M1_TOUCH_REF`).
- Studio `LocalFiles`: `createExclusive` refuses when the stor already has the file; `remove` calls
  `localStor.deleteFile` when the host has it (collab-msg unlinks) and marks `status: 'deleted'`
  otherwise. Under collab-msg, `removeOwned` now really unlinks an owned output, as the CLI `rm` does.
- `WRITER_BUSY` carries `detail` (file, holder, what to remove if no run is active), printed by the
  CLI (`detail:`) and by the Studio summary. `PROJECT_LOCK_BUSY` names the lock file and its holder
  in the registration detail. An orphan file is not removed by the next run.
- The writer is claimed before `prepareCatalog`: a refused run writes nothing of the module
  (catalog and tests included). `CATALOG_INVALID` releases the writer.
- `catalogWithheld` takes the units whose receipt lists their output hash: a unit promoted once and
  blocked now keeps its scenarios, so its structure test keeps compiling. A unit never emitted
  stays a gap. The derivation recipe is unchanged.
- Studio host fills `workspace` (`repoRoot`, `projectDir`, `projectId`) from `mls.stor.diskPath`
  of the target's `l5/project.json` when the host has that capability. Without it, as before.
  Known limit (T0, owner planner L1): under the collab-msg Deno runtime `caseRun.js` and
  `testing/memoryLoad.js` do not load (bare `jose`, `pg`, `@aws-sdk/client-dynamodb` from 102034
  are not in the import map; `compileFiles` also spawns `process.execPath`, which is `deno`). No
  case runs there yet: the fixture reports `FIXTURE_RUNNER_UNAVAILABLE` with that cause instead of
  `FIXTURE_HOST_UNAVAILABLE`; a unit whose runner returns observations reports
  `CASE_RUNNER_UNAVAILABLE`, one whose runner returns none still reports "case did not run".

## 2026-09-28

- Fix: `emitPersistence.ts` emitted `UNIQUE_KEYS` with an inferred `as const` type, so a table
  with no unique keys produced `readonly []` and `rejectDuplicate`'s `key.every(...)` failed
  TS2339/TS7006 on generated `repositoryAdapter` files. `UNIQUE_KEYS` is now emitted with an
  explicit `readonly (readonly string[])[]` annotation, valid for both the empty and non-empty case.

## 2026-09-28 (m1_31)

- New `core/refs.ts`: ref parser and the ref policy shared by both hosts. `PLATFORM_PROJECTS`
  (same set as before: 102034, 102027), `readable` (target or platform) and `writable` (target
  only). The CLI (`l1/.../nodejsMaterializeL1.ts`) imports the set and `isPlatformRef` from there;
  its disk mapping is unchanged.
- Studio host (`studioHost.ts`): reads of a platform ref are allowed and call
  `mls.stor.server.loadProjectInfoIfNeeded(id)` once per project per host before the lookup. A
  failed load or a file absent after the load is `console.warn`ed with the ref and the project
  and read as absent. Writes and removals stay in the target project.
- A file at the root of a level (`_NNNNN_/l5/project.json`, `runtime.project.json`,
  `m1-project-lock.json`) maps to `{ level, folder: '' }`; before, every l5 root ref was refused
  (the lock write stopped the run). `..`, empty segments and an extra dot in the name stay refused;
  `runtime.project` at the l5 root is the one exception. The dead `folder === 'l5'` branch is gone.
- `readStudioProfile` reads the stor key `level: 5, folder: '', shortName: 'project'`, so the
  Studio now reads `appEnv`.
- `statusTask` also emits `update-status completed` on the root step (stepId 1), so a run, a
  refusal or a stop closes the task instead of leaving it `in progress`.
