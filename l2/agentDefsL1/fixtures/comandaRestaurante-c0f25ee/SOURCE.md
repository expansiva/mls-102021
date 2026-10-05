Copied byte for byte from `mls-102047` commit `c0f25ee` (`c0f25eee1bc192b164e675665311ea27dc37b44f`): D1 `/run` complete on the final contract (`3f69977`), run `20261005135600.1001`.

`.defs.ts` is stored as `.defs.txt` so the project scan does not compile the copy. `loadD1Fixture` returns the logical `.defs.ts` path and the original bytes.

Included because `input20` `inputPaths` reads it: `l4/comandaRestaurante/**` module defs, `pool/l1/pipeline.json`, `pool/l1/web/*`, `pool/l2/web/*`, and `l2/comandaRestaurante/web/{contracts,shared}`. Drafts and `traces/` were not copied. `comandaRestaurante-3f69977` was left in place.

Recorded `usecases50` call files are stored at `l1/comandaRestaurante/pipeline/agentDefsL1/calls/`. `resolve25.json` is stored next to them. `seedD1Fixture` does not write the call files: the names are not Studio paths.

The five produced `l1/comandaRestaurante/layer_2_application/requests/*.defs.ts` are under `expected/requests/` as `.defs.txt` (reference only).

Platform ontology referenced by `ontology/index` (`platformOntology`): `mls-102034` `23e09d8` `l4/ontology/mdm.defs.ts` (last changed in `b52ef78`, before `c0f25ee`), stored at `_102034_/l4/ontology/mdm.defs.txt` (same bytes as `reembolsoDespesas-71cca1d`).

```
git -C mls-base/mls-102047 archive c0f25ee \
  l4/comandaRestaurante/module.defs.ts l4/comandaRestaurante/rules.defs.ts \
  l4/comandaRestaurante/workflows.defs.ts l4/comandaRestaurante/access.defs.ts \
  l4/comandaRestaurante/integration.defs.ts l4/comandaRestaurante/journeys \
  l4/comandaRestaurante/ontology l4/comandaRestaurante/pool/l1/pipeline.json \
  l4/comandaRestaurante/pool/l1/web l4/comandaRestaurante/pool/l2/web \
  l2/comandaRestaurante/web/contracts l2/comandaRestaurante/web/shared \
  l1/comandaRestaurante/pipeline/agentDefsL1/calls \
  l1/comandaRestaurante/pipeline/agentDefsL1/resolve25.json \
  l1/comandaRestaurante/layer_2_application/requests \
  | tar -x
git -C mls-base/mls-102034 show 23e09d8:l4/ontology/mdm.defs.ts
```
