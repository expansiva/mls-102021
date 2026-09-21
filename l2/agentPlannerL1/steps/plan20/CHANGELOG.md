# plan20

## 2026-09-20 (p1_07)

- Unknown `l4diff` kinds (`outbound`, `task`, …) are recorded in
  `meta.unmappedChanges` (`changeId`, `kind`, `source`) instead of
  disappearing. `changes[]` still only holds `P1_CHANGE_KINDS`. The
  gate does not fail. Schema stays v1.1 (new field in `meta` only).

## 2026-09-20 (p1_05)

- Schema `2026-09-21-p1-backend-v1.1`: every endpoint, usecase, port, table and
  removed item has `tableRefs[]` (ids of `tables[]`) and `noTable: ok|mdm|none`.
  MDM (`Aluno`) is `mdm` with empty refs; persisted tables are `ok`.
- Module-level `changes[]` from optional `pool/l1/web/l4diff.json` (p4_09).
  Absent file ⇒ `changes: []`. One `changeId` may list several `tableRefs`.
  Compatible: new fields only.

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
