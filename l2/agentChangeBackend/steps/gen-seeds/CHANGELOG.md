# CHANGELOG

## 2026-08-31 — seeds.defs.ts + código tipado

O planner JSON não muda (`validateSeedPlan` igual). A materialização passa a gravar `seeds.defs.ts`
(envelope `buildArtifact` + pipeline `persistenceSeeds`) e a emitir `seeds.ts` tipado pela entidade
(`const rows: Entity[]`), com `seedIds` nomeados e busca determinística via validador de domínio.
O LLM materializer não reescreve esse artefato.

## 2026-08-31 — `readRuleDefinitions` extraído para helper compartilhado

O leitor (e o tipo do registro de regra) mora em `helpers/cbRules.ts`. O planner continua recebendo
id + título + descrição + appliesTo das regras aplicadas — o refactor não muda o prompt de seeds.

## 2026-07-11 — migração ns3

- Step movido do folder plano `agentChangeBackend/` para `steps/gen-seeds/` (1 folder por unidade de manutenção).
- `fileReference` e `agentFolder` atualizados para o novo caminho; agentes resolvidos por `agentName` (getInstanceByName), imports do núcleo permanecem absolutos.
