# finalize — Fechamento: status done + resumo

## Agentes

- agentCbFinalizeStatus (cb-finalize)
- agentCbFinalSummary (cb-final-summary)

## Input

Owners processados; run validado.

## Output

todoBackend status=done; resumo em l5/{module}/process.defs.ts; limpa traces; completa a task.

## Invariantes

Determinístico. Roda so apos cb-validate-all passar (materializacao provada completa).
