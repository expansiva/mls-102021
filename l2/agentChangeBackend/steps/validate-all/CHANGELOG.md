# CHANGELOG

## 2026-08-22 — repairHistory no dossiê (be4)

O último validate-all (pass limpo, pós-seeds) gravava `repairHistory: []` / `globalAttempts: 0`
porque o estado de repair tinha sido limpo no pass anterior. `foldRepairAudit` recupera o
histórico das `rounds`; `clearRepairState` só no validate-all FINAL (`preSeeds=false`).

## 2026-08-22 — guard: JSON.parse(row.<jsonb>) em adapter

Um `JSON.parse(row.<coluna>)` sobre coluna JSONB (pg já devolve objeto) vira finding reparável.
Caminho legítimo: `typeof row.col === 'string' ? JSON.parse(row.col) : (row.col ?? {})`.

## 2026-08-22 — guard: índice redundante `_pkey` / colunas da PK

Junto do guard de `primaryKey: []`: um índice cujo nome é `<table>_pkey` (reservado pelo Postgres) ou
cujas colunas são exatamente a `primaryKey` vira finding. O writer do gen-table é o caminho
legítimo (saneamento mecânico); o gate não afrouxa.

## 2026-07-16 — boundary DTO folder allowlisted no orphan check (Item 5 / Opção 3)
Os DTOs de boundary (`adapters/http/dto/<op>.ts` + `toDto`, gerados determinísticamente por gen-http,
sem `.defs.ts` por design) eram acusados como "orphan generated ts ... has no matching .defs.ts" e
faziam o validate-all FALHAR (run 102049 16/07: 15 findings). Adicionado allowlist por PASTA
(`expectedTsFolderWithoutDefs` = `{module}/layer_1_external/adapters/http/dto`) — como seeds/
registerRepositories, mas por pasta (o shortName varia por routine). Espelho documental no flow.json.

## 2026-07-16 — registerRepositories.ts não é órfão + check getTable×tableName

- Lição da rodada cafeFlow/102051: o composition root `registerRepositories.ts` (gerado deterministicamente pelo agentCbRegister, sem `.defs.ts` por design) era bloqueado como órfão. Adicionado à allowlist `expectedTsWithoutDefs` (espelhada em `flow.json`).
- Check determinístico novo TABLE BINDING: todo `getTable('<nome>')` de um repository adapter precisa casar com um `tableName` declarado nas TableDefinitions do módulo (rodada real: `getTable('orders')` × `tableName: 'order'` → PERSISTENCE_TABLE_NOT_FOUND só em runtime). Finding roteável para repair (re-materialização do adapter).

## 2026-07-15 — seeds.ts não é órfão

- Lição da rodada cafeFlow/102051: o check de órfãos bloqueava `seeds.ts` (`INTEGRITY FAILED: orphan generated ts`), mas o próprio fluxo o gera SEM `.defs.ts` (agentCbSeeds compila deterministicamente via cbSeedsCore/saveGeneratedTs).
- Adicionada allowlist declarativa `expectedTsWithoutDefs` (hoje só `{module}/layer_1_external/adapters/persistence/seeds.ts`), espelhada em `flow.json` (`expectedGeneratedTsWithoutDefs` no step cb-validate-all).
- Guard novo em cbMdmGuards (também aplicado aqui e no worker de materialização): `*.document.createdAt/updatedAt` é violação de contrato — `MdmDocumentRecord` não tem timestamps; usar `index.createdAt/updatedAt` (TS2339 real na rodada, manageStockItem).

## 2026-07-11 — migração ns3

- Step movido do folder plano `agentChangeBackend/` para `steps/validate-all/` (1 folder por unidade de manutenção).
- `fileReference` e `agentFolder` atualizados para o novo caminho; agentes resolvidos por `agentName` (getInstanceByName), imports do núcleo permanecem absolutos.
