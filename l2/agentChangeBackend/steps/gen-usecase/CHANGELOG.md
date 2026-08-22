# CHANGELOG

## 2026-08-22 — pinar `mdm` no defs (be4)

O l4 traz `"mdm": {"lifecycle": "inactivate"}`, o scan lê, o prompt do gen-usecase manda — e o
defs salvo era a saída do MODELO, sem o bloco. O materialize lê o defs, o guard
`collectMdmLifecycleIssues` lia `data.mdm` vazio, três runs seguidos sem `ctx.mdm`. Agora
`pinUsecaseL4Mdm` copia o bloco do owner no `afterPromptStep`, igual a `ports`/`mdmRefs`/`outputShape`.

## 2026-07-15 — exemplos negativos de ofEntity

- Rodada cafeFlow/102051: 9 reparos por campos inventados — filtros (`searchTerm`, `statusFilter`), coleções de saída (`orders`, `items`) e agregações (`topSellers`, `lowStockAlerts`) tratados como campos de entidade.
- prompt.md agora define: `ofEntity` só para campo que EXISTE na ontologia L4, com exemplos negativos explícitos dessa rodada.

## 2026-07-11 — migração ns3

- Step movido do folder plano `agentChangeBackend/` para `steps/gen-usecase/` (1 folder por unidade de manutenção).
- `fileReference` e `agentFolder` atualizados para o novo caminho; agentes resolvidos por `agentName` (getInstanceByName), imports do núcleo permanecem absolutos.
