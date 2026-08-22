# CHANGELOG

## 2026-08-22 — fixtures de l2 não importam l1/server do 102034

Código de agente em `l2` nunca importa (nem como tipo) o `l1/server` do 102034 — o
`tsconfig.frontend.json` compila `l2` DOM-only (`types: []`). Um `import type { TableDefinition }`
no fixture puxava `env.ts` e acusava 10 erros de `node:fs`/`process` que não existiam no baseline.
A forma do fixture fica local.

## 2026-08-22 — JSONB details: pg devolve objeto, JSON.parse estoura

`pg` converte JSONB para objeto. O adapter gerado fazia `JSON.parse(row.details)` (tipo `string | null`);
isso vira `JSON.parse("[object Object]")`, o `catch` mudo devolve defaults e a tela mostra só ids.
Skill: aceitar objeto ou string; `console.warn` com tabela/id no catch real. Guard
`collectJsonbRowParseFindings` no materialize e no validate-all.

## 2026-07-11 — migração ns3

- Step movido do folder plano `agentChangeBackend/` para `steps/gen-adapter/` (1 folder por unidade de manutenção).
- `fileReference` e `agentFolder` atualizados para o novo caminho; agentes resolvidos por `agentName` (getInstanceByName), imports do núcleo permanecem absolutos.
