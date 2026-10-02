Copied byte for byte from `mls-102047` commit `cab144b` (`cab144bf6d5ced7347dbd293db1197133defe1d9`).

`.defs.ts` is stored as `.defs.txt` so the project scan does not compile the copy. `loadD1Fixture` returns the logical `.defs.ts` path and the original bytes.

Included because `input20` `inputPaths` reads it: `l4/agendaClinica/pool/l1/pipeline.json`, the L4 module defs, `pool/l1/web/*`, `pool/l2/web/*`, and `l2/agendaClinica/web/{contracts,shared}`. L4 pipeline drafts are not D1 inputs and were not copied.

Recorded `usecases50` receipts (40 files, no reply body) are stored at `l1/agendaClinica/pipeline/agentDefsL1/calls/`. `seedD1Fixture` does not write them: the names are not Studio paths. The tip still fills each usecase with `fixturePlan`.

Platform ontology referenced by `ontology/index` (`platformOntology`): `mls-102034` `HEAD` `587c4c7` `l4/ontology/mdm.defs.ts`, stored at `_102034_/l4/ontology/mdm.defs.txt` (same bytes as `controleEstoque-39a5166`).

```
git -C mls-base/mls-102047 archive cab144b \
  l4/agendaClinica/module.defs.ts l4/agendaClinica/rules.defs.ts \
  l4/agendaClinica/workflows.defs.ts l4/agendaClinica/access.defs.ts \
  l4/agendaClinica/integration.defs.ts l4/agendaClinica/journeys \
  l4/agendaClinica/ontology l4/agendaClinica/pool/l1/pipeline.json \
  l4/agendaClinica/pool/l1/web l4/agendaClinica/pool/l2/web \
  l2/agendaClinica/web/contracts l2/agendaClinica/web/shared \
  l1/agendaClinica/pipeline/agentDefsL1/calls \
  | tar -x
git -C mls-base/mls-102034 show 587c4c76721c02326959307d04bb0f31df497d34:l4/ontology/mdm.defs.ts
```
