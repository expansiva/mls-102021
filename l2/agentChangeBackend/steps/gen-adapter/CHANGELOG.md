# CHANGELOG

## 2026-08-28 — persistência = `ctx.data.moduleData.getTable` (obrigação, não permissão)

O planner colapsava a lista de proibições `ctx.data.mdm*` numa nota que também
proibia `ctx.data.moduleData` — a única API de persistência. O materialize
obedecia a nota e gerava um `WeakMap` por request (lista vazia, banco intacto).

- Prompt humano: obrigação positiva *antes* das proibições MDM; a frase permissiva
  ("is allowed only") virou "is scoped to local module tables (never MDM)".
- `sanitizeAdapterNotes` no save e no reúso (run comum reaproveita .defs.ts
  envenenado). `rewriteAdapterDefsNotes` só reescreve se as notas mudaram.
- Skill `repositoryAdapter.md` **não** vai ao planner: é skill de código (~170
  linhas) do materialize; notas são o contrato do planner, e o sanitizador
  garante a obrigação mesmo se o modelo parafrasear.

## 2026-08-25 — list honra search (ILIKE) e sortBy/sortOrder

A lista de catálogo passa a declarar `search`/`sortBy`/`sortOrder`. O adapter materializa:
`findMany({ ilike: { title|name } })` no runtime 102034; `orderBy` na coluna snake_case; enum
ordenado em memória pela união do domínio, não por texto SQL. `title`/`name`/datas são colunas
(planTableColumns), não JSONB.

## 2026-08-24 — JSONB details keys = l4 fieldId (camelCase)

Seeds write `details.dueDate`. An adapter that reads `details.due_date` returns the row without
the field and the list column is blank. Skill + human prompt: keys inside the envelope are the
fieldId verbatim; snake_case is only for table columns. Guard `collectDetailsKeyIssues` (validate-all)
compares adapter keys to l4 fieldIds. Round-trip fixture: seed-row → toDomain keeps every field.

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
