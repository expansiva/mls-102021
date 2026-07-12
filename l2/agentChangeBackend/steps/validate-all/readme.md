# validate-all — Barreira global de validação + repair global

## Agentes

- agentCbValidateAll (cb-validate-all)

## Input

Arquivos l1 salvos.

## Output

cb-health-report.json. Enfileira cb-finalize quando limpo; senao 1 rodada de repair (cb-validate-all-g{n}) ou falha limpa.

## Invariantes

Determinístico. Unico step que FALHA o run (limpo). Validadores compartilhados: cbComponentValidators.ts.
