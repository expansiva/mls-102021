Copied byte for byte from `mls-102047` commit `71cca1d` (`71cca1d6ea64dbad2bc78d574dcbb36e54b8a782`): P1 replanned with `transitionRef` (decide: aprovar/rejeitar), D1 `/run` complete (8 steps, 26 defs).

`.defs.ts` is stored as `.defs.txt` so the project scan does not compile the copy. `loadD1Fixture` returns the logical `.defs.ts` path and the original bytes.

Included because `input20` `inputPaths` reads it: `l4/reembolsoDespesas/pool/l1/pipeline.json`, the L4 module defs, `pool/l1/web/*`, `pool/l2/web/*`, and `l2/reembolsoDespesas/web/{contracts,shared}`. L4 and L2 pipeline drafts are not D1 inputs and were not copied.

Recorded `usecases50` call files (19) are stored at `l1/reembolsoDespesas/pipeline/agentDefsL1/calls/`. `seedD1Fixture` does not write them: the names are not Studio paths. The tip still fills each usecase with `fixturePlan`.

Platform ontology referenced by `ontology/index` (`platformOntology`): `mls-102034` `23e09d8` `l4/ontology/mdm.defs.ts` (last changed in `b52ef78`, before `71cca1d`), stored at `_102034_/l4/ontology/mdm.defs.txt` (same bytes as `agendaClinica-53f1f35`).

```
git -C mls-base/mls-102047 archive 71cca1d \
  l4/reembolsoDespesas/module.defs.ts l4/reembolsoDespesas/rules.defs.ts \
  l4/reembolsoDespesas/workflows.defs.ts l4/reembolsoDespesas/access.defs.ts \
  l4/reembolsoDespesas/integration.defs.ts l4/reembolsoDespesas/journeys \
  l4/reembolsoDespesas/ontology l4/reembolsoDespesas/pool/l1/pipeline.json \
  l4/reembolsoDespesas/pool/l1/web l4/reembolsoDespesas/pool/l2/web \
  l2/reembolsoDespesas/web/contracts l2/reembolsoDespesas/web/shared \
  l1/reembolsoDespesas/pipeline/agentDefsL1/calls \
  | tar -x
git -C mls-base/mls-102034 show 23e09d8:l4/ontology/mdm.defs.ts
```
