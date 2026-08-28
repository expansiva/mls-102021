# CHANGELOG

## 2026-08-28 — o item do owner leva a matriz de lifecycle quando o módulo declara uma

O worker de usecase não via invariantes de domínio nem o workflow. É ele que materializa
`if (!canTransition*) throw`. Com `lifecycle` no item, o modelo não tem que inventar a máquina; sem
workflow o item fica igual ao de antes (campo ausente, não vazio).

## 2026-08-28 — o juiz espera o fan-out, não o dispatcher

`cb-judge` era enfileirado com `dependsOn` no passo corrente (`cb-gen-usecase`), que completa no
instante em que despacha. No run do `todo` (102047) o juiz leu 0/9 defs de usecase e o `cb-gen-http`,
logo atrás, leu 4/9: 5 bffCalls e o controller inteiro do `taskHub` foram descartados em silêncio, e o
app publicado respondeu `ROUTINE_NOT_FOUND` em 11 dos 15 testes. O enqueue passa agora
`FANOUT_PLAN_ID` explicitamente (é o que o `cb-gen-domain` sempre fez e o que o flow.json já
documentava).

## 2026-08-25 — list encaminha search/sortBy/sortOrder ao port.list

Inputs opcionais da lista de catálogo são públicos (`required: false`) e vão para
`port.list({ search, sortBy, sortOrder })`. `sortBy` é a união de `inputs[].enumValues`.

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
