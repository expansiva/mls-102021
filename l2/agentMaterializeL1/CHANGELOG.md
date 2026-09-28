# agentMaterializeL1

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
