# CHANGELOG

## 2026-08-22 — fixtures de l2 não importam l1/server do 102034

Código de agente em `l2` nunca importa (nem como tipo) o `l1/server` do 102034 — o
`tsconfig.frontend.json` compila `l2` DOM-only (`types: []`). A forma do fixture fica local.

## 2026-08-22 — strip redundant `<table>_pkey` indexes before save

Postgres already creates `<tableName>_pkey` from `PRIMARY KEY`. The model has emitted that index
alongside `primaryKey` (petShop `appointment_availability_pkey` → 42P07 at publish). The writer now
drops reserved `_pkey` names and indexes whose columns are exactly the primary key before `saveDefs`.
Secondary indexes keep the `_idx` suffix (`service_execution_*_idx` is the legitimate shape).

## 2026-07-11 — migração ns3

- Step movido do folder plano `agentChangeBackend/` para `steps/gen-table/` (1 folder por unidade de manutenção).
- `fileReference` e `agentFolder` atualizados para o novo caminho; agentes resolvidos por `agentName` (getInstanceByName), imports do núcleo permanecem absolutos.
