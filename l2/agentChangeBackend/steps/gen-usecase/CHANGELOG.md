# CHANGELOG

## 2026-07-15 — exemplos negativos de ofEntity (todo/generate/changeBackend.run15jul.md §4)

- Rodada cafeFlow/102051: 9 reparos por campos inventados — filtros (`searchTerm`, `statusFilter`), coleções de saída (`orders`, `items`) e agregações (`topSellers`, `lowStockAlerts`) tratados como campos de entidade.
- prompt.md agora define: `ofEntity` só para campo que EXISTE na ontologia L4, com exemplos negativos explícitos dessa rodada.

## 2026-07-11 — migração ns3 (todo/modernizeChangeBackend.md)

- Step movido do folder plano `agentChangeBackend/` para `steps/gen-usecase/` (1 folder por unidade de manutenção).
- `fileReference` e `agentFolder` atualizados para o novo caminho; agentes resolvidos por `agentName` (getInstanceByName), imports do núcleo permanecem absolutos.
