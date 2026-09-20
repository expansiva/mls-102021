# plan20

## 2026-09-20 (p1_04)

- Transition usecase id is the l4 `transitionId`, without concatenating the
  entity. Collision across entities suffixes the entity on every side.
  `p1UsecaseId` stays per-item; disambiguation is in `collectCandidates`.

## 2026-09-20 (p1_02)

- Candidates from `needs.json` reads/writes. Match against the l1 inventory
  (`done` / `toUpdate` / `toRemove`). No inventory ⇒ everything `toCreate`.
- One reasoning call, strict tool `submitP1BackendResolution`, only for
  unmatched aliases and multi-entity merges. Otherwise `llmCalled: false`.
- Structural gate + deterministic repair (MDM stripped from tables/ports,
  unique routes). Writes `pool/l2/web/backend.json` and an l1→l2 message.
  Closes the pipeline. Does not delete `pool/l1`. Does not write l1 source.
