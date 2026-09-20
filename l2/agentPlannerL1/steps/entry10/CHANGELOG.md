# entry10

## 2026-09-20 (p1_01)

- Deterministic gate: parse, read `pool/l1` (from l2, artifact `needs.json`),
  refuse, inventory the existing l1, write the l1 `pipeline.json`.
- Hand invocation loads the oldest message and puts `{ moduleName, thread, file }`
  on every planned step so the pool dispatch prompt and the hand path share
  `executeP1Entry`.
- No `prompt.md`: this step does not call a model.
- Always restarts: wipes `l1/<mod>/pipeline/`. Never deletes the pool. Never
  writes l1 `.defs.ts`/`.ts`.
