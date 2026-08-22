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

**O step não confia nas próprias escritas.** Depois de virar os statuses ele RELÊ o `todoBackend` e
compara com o que acredita ter escrito, nas DUAS superfícies que podem virar o arquivo em disco: o
conteúdo do stor (o que o próximo run lê) e o modelo Monaco, quando existe (o que o export escreve).
Divergência → warning ALTO no trace + retry único dos owners divergentes; persistindo → step `failed`.
O resultado vai para o `cb-run` report em `todoReadBack` (esperado × persistido, por superfície).

Motivo: um run verde sobre um todoBackend podre é pior que um run vermelho — com 64 owners de volta em
`toCreate`, o run seguinte regenera do zero um módulo que já estava íntegro. Ver
`flow.json → conventions.defsWritePersistence` e `conventions.ownerStatus.readBackAtFinalize`.
