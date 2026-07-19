# cb-rebuild-defs-cleanup

Terminal step of the **`/rebuild defs`** path only (defs-only TOTAL — B2). No LLM.

- **Input**: `{ modules: string[] }` (the run's modules, passed by `cb-gen-http`).
- **Does**: soft-deletes every DERIVED l1 backend file (level-1, extension `.ts`/`.test.ts`/`.d.ts`,
  i.e. NOT `.defs.ts`) under the run's modules — domain/port/adapter/table/usecase/controller `.ts`
  + `seeds.ts` + `registerRepositories.ts` + the l1 contract mirror. Keeps only the `.defs.ts`
  source of truth. Soft-delete = `status='deleted'` (recoverable from the collab-fs trash).
- **Output**: none on disk. Trace: `rebuild-defs: 0 materializados, M .ts soft-deletados`.
- **Then**: enqueues `cb-finalize` → `cb-final-summary`.

## Invariants / traps

- Reached ONLY when `cliCommand === 'rebuild-defs'`. `cb-gen-http` routes here instead of
  `cb-materialize`, skipping the whole materializing tail (materialize / gen-seeds / seed-assets /
  register / validate-all). None of those run in defs-only.
- **Best-effort**: a failure here must NEVER fail the rebuild-defs tree — the `.defs.ts` are already
  regenerated and the stale `.ts` are recoverable and re-materializable. On error it still advances
  to `cb-finalize` with a `REBUILD-DEFS-CLEANUP-SKIPPED` trace.
- Scoped to the run's modules (`folder === m || folder.startsWith('m/')`) so a rebuild-defs of one
  module never touches another.
- Why it exists: kills the "stale `.ts` masks a worker bug" class (runs c–h) and guarantees the next
  `/rebuild all` re-materializes every layer from zero. Mirrors changeFrontend `rebuild-defs-cleanup`.
