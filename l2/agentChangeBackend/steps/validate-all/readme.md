# validate-all — Barreira global de validação + repair global

## Agentes

- agentCbValidateAll (cb-validate-all)

## Input

Arquivos l1 salvos.

## Output

cb-health-report.json. Enfileira cb-finalize quando limpo; senao 1 rodada de repair (cb-validate-all-g{n}) ou falha limpa.

## Invariantes

Determinístico. Unico step que FALHA o run (limpo). Validadores compartilhados: cbComponentValidators.ts.

## Corpus de regressão (offline)

Os guards puros também rodam contra 5 apps já gerados (`102046`, `102047`, `102048`,
`102049`, `102051`) via `helpers/cbCorpus.ts`. Sem LLM, sem VM, sem escrita nos apps.
O aceite não é zero achados — o l1 "bom" de um app antigo acusa o que os guards de
hoje acusam. A barra é o baseline versionado
`helpers/fixtures/cbCorpusBaseline.json` (contagem por projeto e família; arquivos
acusados quando a família é pequena).

Quando um guard novo entra (ou um existente muda o conjunto de achados):

1. Rodar `node scripts/run-tests.mjs 102021 l2` a partir de `mls-base` e ler o delta
   (`102046 detailsKey: baseline 8, got 12`). Delta positivo em código legítimo é
   falso positivo e queima repair — revisar **antes** de regravar.
2. Se o delta for o esperado, regravar:
   `CB_CORPUS_REWRITE_BASELINE=1 node scripts/run-tests.mjs 102021 l2`
3. O caso WeakMap de 28/08 está congelado em
   `helpers/fixtures/taskRepositoryAdapter.weakmap.txt` — não depende do `mls-102047`
   vivo.
