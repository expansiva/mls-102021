# CHANGELOG

## 2026-07-15 — seeds.ts não é órfão (todo/generate/changeBackend.run15jul.md §1)

- Lição da rodada cafeFlow/102051: o check de órfãos bloqueava `seeds.ts` (`INTEGRITY FAILED: orphan generated ts`), mas o próprio fluxo o gera SEM `.defs.ts` (agentCbSeeds compila deterministicamente via cbSeedsCore/saveGeneratedTs).
- Adicionada allowlist declarativa `expectedTsWithoutDefs` (hoje só `{module}/layer_1_external/adapters/persistence/seeds.ts`), espelhada em `flow.json` (`expectedGeneratedTsWithoutDefs` no step cb-validate-all).
- Guard novo em cbMdmGuards (também aplicado aqui e no worker de materialização): `*.document.createdAt/updatedAt` é violação de contrato — `MdmDocumentRecord` não tem timestamps; usar `index.createdAt/updatedAt` (TS2339 real na rodada, manageStockItem).

## 2026-07-11 — migração ns3 (todo/modernizeChangeBackend.md)

- Step movido do folder plano `agentChangeBackend/` para `steps/validate-all/` (1 folder por unidade de manutenção).
- `fileReference` e `agentFolder` atualizados para o novo caminho; agentes resolvidos por `agentName` (getInstanceByName), imports do núcleo permanecem absolutos.
