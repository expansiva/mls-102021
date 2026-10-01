Copied byte for byte from `mls-102047` commit `39a5166` (`39a516622a60793e79596c23b16836e61783f11e`).

`.defs.ts` is stored as `.defs.txt` so the project scan does not compile the copy. `loadD1Fixture` returns the logical `.defs.ts` path and the original bytes.

Included because `input20` `inputPaths` reads it, beyond `pool/{l1,l2}/web/*.json`: `l4/controleEstoque/pool/l1/pipeline.json`.

Platform ontology referenced by `ontology/index` (`platformOntology`): `mls-102034` `HEAD` `l4/ontology/mdm.defs.ts`, stored at `_102034_/l4/ontology/mdm.defs.txt`.

```
git -C mls-base/mls-102047 archive 39a5166 \
  l4/controleEstoque l2/controleEstoque/web/contracts l2/controleEstoque/web/shared \
  | tar -x
git -C mls-base/mls-102034 show HEAD:l4/ontology/mdm.defs.ts
```
