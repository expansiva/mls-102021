# artefatoEsperado — o que um módulo gerado pelo CB DEVE ter no l1

> Modelo de expectativa para validação "expectativa × realidade". Escrito 24/08/2026 a partir do
> código real (`flow.json` + `spec.md` + skills + validadores), com as divergências spec×código
> anotadas em §6. Par deste arquivo no módulo validado: `l1/<moduleName>/README.md`.

## 1. O que o agente é

O CB é o reconciliador autônomo de backend: sem prompt do usuário, varre
`l5/<module>/todoBackend.defs.ts` procurando owners `toCreate` e deriva do l4 (ontology +
operations + rules + workspaces/contracts) o backend hexagonal de 3 camadas em `l1/<module>`.
Escreve `.defs.ts` autossuficientes, materializa cada um em `.ts`, gera `seeds.ts` determinístico,
registra o backend no `l5/project.json` e valida tudo num gate determinístico
(`cb-validate-all`) — o único step que falha o run.

## 2. Inventário esperado — `l1/<moduleName>/`

```
layer_3_domain/
  entities/<entity>.defs.ts + .ts          puro, ZERO imports; invariantes como funções exportadas
layer_2_application/
  ports/<entity>Repository.defs.ts + .ts   I<Entity>Repository; evento: append-only (sem save/delete)
  usecases/<operationId>.defs.ts + .ts     uma função por entrada de functions[]; rulesApplied INLINE
layer_1_external/adapters/
  persistence/
    <tableId>.defs.ts + .ts                TableDefinition: colunas reais só p/ indexáveis + details JSONB
    <entity>RepositoryAdapter.defs.ts + .ts único lugar com ctx.data.moduleData
    seeds.ts                               SEM .defs.ts (por design)
    registerRepositories.ts                SEM .defs.ts (por design) — composition root OBRIGATÓRIO
  http/controllers/<workspaceId>.defs.ts + .ts   V2: 1 controller por WORKSPACE, 1 handler por bffCall
```

Todo arquivo com header `/// <mls fileReference="..." enhancement="_blank"/>`. Nomes derivados do
id canônico (`lowerFirst`), nunca do título pt.

### Contagens de sanidade

- nº de controllers = nº de workspaces do l4; nº de rotas = nº de `bffCalls`;
- **toda operação do l4 tem usecase E rota** — gap aparece no health como
  `operations: 'degraded'` + `operationsMissing` (guard 24/08; unidirecional: usecase sem
  chamador é LEGÍTIMO, nunca sinalizado — rotinas de pesquisa existem por decisão);
- todo adapter tem sua linha `registerRepository(...)` no `registerRepositories.ts`;
- todo `.defs.ts` tem seu `.ts` (COMPLETENESS) e o `.ts` não é mais velho (STALENESS).

## 3. Com o flip ligado (`MDM_WRITE_PATH_ENABLED = true`, 24/08)

Entidade `storage.target: mdm` **não tem** entity/port/tabela/adapter local nem linhas em
`localTables` do seeds; escrita/leitura só via `ctx.mdm` (`entity.get/create/update/inactivate/
reactivate`, ...); usecase carrega `data.mdmWrites` + `data.mdm` pinado do l4; o input
`includeInactive` é sintetizado. `external`: nenhum artefato E nenhum seed. `derived`: sem
tabela/port/adapter sempre (independe do flip). O flip vale para a PRÓXIMA geração — módulo antigo
mantém a forma até o `/rebuild all`.

## 4. Hexagonal — regras de dependência (e onde são validadas)

- `layer_3_domain` importa **nada**; `layer_2` importa domínio e DEFINE os ports; usecase usa
  `resolveRepository<I...>(ctx,'X')` e **nunca** importa adapter; `layer_1` importa os dois.
- `ctx.data` só em `adapters/persistence` — exceção única: `ctx.data.runInTransaction` no
  usecase. Controllers nunca tocam `ctx.data` nem persistence.
- Inversão de dependência fecha no composition root (`registerRepositories.ts`), consumido pelo
  runtime 102034 via `l5/project.json → persistenceModules[].tableDefsDir`.
- Validação: imports l1 resolvidos, ban de import relativo, ban de MDM cru, ban de port local para
  entidade MDM, política de persistência (`collectPersistencePolicyIssues`), compile do módulo
  inteiro. **A regra do `ctx.data` não tem checker determinístico** — é prompt/skill + compilador.

## 5. BFF — o contrato com o frontend

- Rota = `'<module>.<workspace>.<qry|cmd><Nome>'`, registrada em `export const routes` do
  controller do workspace. 1 controller por tela = backend for frontend por tela.
- Todo handler: `enforceActors(ctx, ALLOWED, route)` primeiro; valida só a borda (required do
  `inputContract` do l4); chama o usecase; devolve `ok(...)`. Identidade vem de `meta.userId`
  (email do cookie `loginUser`, injetado pelo cliente) — nunca input editável.
- Erros: `AppError('CODE', 'mensagem em INGLÊS', status)` — `__non_english_app_error__` bloqueia.

## 6. Onde a documentação MENTE (conferido 24/08 — não usar como expectativa)

- `spec.md:160` e `flow.json` prometem `http/routes/router.ts`, `persistence/persistence.ts` e
  escrita em `l0/config.json`: **não são gerados** — a descoberta é em runtime via
  `l5/project.json` (decisão registrada no header do `agentCbRegister.ts`).
- `flow.json → expectedGeneratedTsWithoutDefs` lista 2 defs-less; o código tem 3 (falta a pasta
  `http/dto`). E em V2 (workspace controllers) a pasta `dto/` pode nem existir.
- `collectMdmLifecycleIssues` NÃO roda no validate-all: roda no validator por componente da
  materialização (ganha repair em vez de falhar o run).
- "Seed local para entidade MDM" não é bloqueado no gate global (o coletor aceita o campo, mas o
  validate-all não o passa) — conferir manualmente em módulo com entidade MDM.

## 7. Sinais de saúde no `l4/trace/cb-health-report.json`

`outcome: passed` + `findings: []`; `seeds: 'ok'` implícito (top sem `seeds`/`seedError`/
`seedSkipped`); `operations` ausente no topo (= cobertura total; `'ok'` fica nos `rounds`);
`models.pendingRelease: 0` (leak do Monaco fechado); `rounds` com o histórico das passadas.
