# agentChangeBackend — spec (sem implementação)

Projeto: master backend (102021). Tipo: **worker (reconciliador) de backend**.
Documento auto-contido (não depende de outros arquivos).

## Propósito

Olhar o `l5/{module}/todoBackend.defs.ts` e **fazer só o que está pendente** (um "to-be"): criar/atualizar/remover os **artefatos de backend** do módulo a partir da **ontologia + operations/workflows/rules** (a intenção) e dos contratos BFF de cada página (o contrato com o frontend). Materializa os `.defs.ts → .ts`. No fim, muda o status no `todoBackend`. Pode ser chamado **a qualquer momento** e fazer **um único item** (uma tabela, um usecase, um adapter, um arquivo). Idempotente.

A partir desta versão o backend é organizado em **3 camadas, modelo hexagonal (ports & adapters)** — antes eram 4. Ver "Arquitetura de 3 camadas".

## Modelo compartilhado (contexto auto-contido)

**Camadas de origem (intenção, lidas — no projeto do cliente, ex.: `mls-102043`):**
- `l4/{module}/ontology/*` — entidades de dado canônicas.
- `l4/rules/*` — regras de negócio.
- `l4/{module}/module.defs.ts` — índice de ontologia, relacionamentos e contexto de design.
- `l4/operations/*`, `l4/workflows/*` — operações e workflows.
- `l2/{module}/web/contracts/{page}.defs.ts` / `.ts` — contrato por página (Input/Output exatos que o frontend espera). **Consumido**, não autorado por este agente.

**Camada de destino (artefatos de backend, escritos — no projeto do cliente):** `l1/{module}/...` nas 3 camadas hexagonais abaixo. Materializa `.defs.ts → .ts` (L1).

> Os artefatos moram sempre no **projeto do cliente**; o que muda é qual **agente/projeto** roda. Este agente é definido em 102021 (master backend) e opera sobre o `l5`/`l4`/`l2`/`l1` do projeto do cliente.

**Owners (de onde o backend nasce):**
- **Operation** = ação direta sobre 1 entidade → entidade de domínio + tabela/port/adapter de persistência + usecase. Declara `reads`/`writes` por **id de ontologia**; o backend deriva as tabelas.
- **Workflow** = processo → orquestra operations; pode implicar usecases de orquestração, domain-services/events e efeitos de persistência (status/eventos).
- **Ontology** = entidades de dado → entidade de domínio (`layer_3_domain`) + tabela (`adapters/persistence`) derivada dela.
- **Page contract (BFF commands)** = contato com o frontend → controller HTTP + rota (`adapters/http`).

**Status de reconciliação (arquivos de trabalho por camada):**
`l5/{module}/todoFrontend.defs.ts` e `l5/{module}/todoBackend.defs.ts`, cada um com owners `workflow | operation` e status `toCreate | toUpdate | toRemove | inProgress | done`.
O gerador nomeia a unidade no vocabulário dele: o **ns4** escreve `ownerType: "useCase"` com o
status em `statusBackend` — mesmos ids de operation, então é tradução, não um segundo modelo de
owner. A escrita de volta vai no MESMO campo lido e preserva o arquivo como o gerador escreveu
(header, `import type`, `satisfies`): reserializar tiraria o typecheck do projeto gerado.
Este worker lê/escreve **apenas `todoBackend`**; o `agentChangeFrontend` cuida do `todoFrontend`.
O L4 é read-only para este agente. Se owners legados ainda tiverem `statusBackend` inline, esse campo é ignorado para decisão de trabalho; divergência inline × todo vira warning.

**Dialetos do L4 que este agente lê:** `} as const;` (ns/ns3) e `} as const satisfies <Artefato>;`
(ns4). No ns4 mudou também DE ONDE vem cada coisa: os `relationships` moram em
`{module}/ontology/index.defs.ts` (não mais no `module.defs.ts`), os papéis são os `profiles` de
`{module}/access/access-matrix.defs.ts` (não há mais `actors.defs.ts`), as regras usam a chave `id`,
e `workflows/` passou a ser o **lifecycle de uma entidade** (states/transitions) — não é unidade de
geração e não aparece no todo. Entidade `kind: "projection"` é read-model: mapeia para `metric` — não
vira raiz de agregado sozinha, mas ganha tabela e seeds quando alguma operation a lê (é assim que um
dashboard responde em runtime).

**Espaço de IDs:** o backend resolve tabelas a partir dos **ids de ontologia** das operations/entities. **Nunca** confiar em nomes de agregado.

**Guardrails (lições analise10/11/12):**
- **Ontologia = só dados** (o agente nunca cria tabela para use-case/`Uc*`; se aparecer entidade `kind:"usecase"`, ignora — não é dado persistente, não trava).
- `metricsTablesRequired` é invariante derivado (métricas pedidas ⇒ `true`); nunca rebaixar — coagir se necessário, não falhar.
- **Critic/repair:** erros determinísticos (integridade referencial) são duros; quando o critic (LLM) não converge no budget, aceita o último índice e rebaixa o restante a **warning** — nunca derruba a task.

**Repair loop + juiz (implementado 2026-07-04 — bloco compartilhado com o ns2; ver `todo/ajustesFinaisChangeBackend.md` §2 e `improveAddNewSolution2_1.md` §4.3/§4.4):**
- **Princípio:** o motor de flow não muda. "Reabrir um step" = enfileirar um step novo com planId/args únicos (`add-step`), que qualquer hook já emite. O estado durável de roteamento (findings → componente de origem, orçamentos) vive em `l4/trace/cb-repair-state.json` (`cbRepair.ts`).
- **Repair por componente (materialização):** quando o validador por-componente rejeita o `.ts` (import alucinado, regra sumida, shape MDM inventado, required fora do contrato) ou o modelo não devolve código, o worker grava findings + código rejeitado e falha; o dispatcher re-spawna o worker com os findings **injetados no prompt** (planId único `cb-mat-L{rank}[-g{round}][-r{attempt}]`). Orçamento: 2 repairs por componente (3 chamadas no total). Esgotou → falha limpa, reportada pelo `cb-validate-all`.
- **Juiz LLM (`agentCbJudge`, cedo):** roda logo após o fan-out de usecases — o primeiro artefato LLM durável consumido a jusante — e ANTES de controllers/materialização (a parte cara). LLM **valida, nunca gera**: compara cada usecase defs com o contrato L4 do owner (ports, rulesApplied executável, inputs × accessPattern, contextResolution não virando input manual, acceptanceAssertions satisfazível) + detecção determinística de defs faltante. Findings tipados pela taxonomia `estrutural | decisao | fora_de_escopo` (fora_de_escopo é descartado). Erros → re-spawn dos workers de origem com findings no contexto → `cb-judge-r2` re-verifica (máx. 2 passadas); sobras na última passada viram **warning** — o juiz sinaliza, o gate duro continua sendo o determinístico (nunca rebaixar o determinístico).
- **Round global (validate-all):** se TODOS os findings forem de nível materialização (`.ts` ruim/faltando), 1 round de repair: marca os defs stale + grava findings e reenfileira `cb-materialize` em modo repair (pula seeds/register — defs não mudaram) → `cb-validate-all-g{n}`. Finding de nível defs ou orçamento esgotado → **falha limpa** com trace objetivo (owners ficam `inProgress`, nada vira `done`).
- **Orçamentos (anti-loop):** 2 repairs/componente; 1 round global; 2 passadas de juiz.
- **Compilador no loop (item 11 da spec do ambiente):** o `saveGeneratedTs` compila o `.ts` recém-salvo (Monaco/TypeScript strict) e devolve os erros; erro de compilação vira finding de repair (código + erros no prompt do re-spawn) e o par é forçado stale — se não convergir no orçamento, o check de staleness do `cb-validate-all` bloqueia. Classes reais pegas no piloto: cast direto de record tipado (TS2352 → usar `as unknown as`), identificador não declarado (TS2304, `const` perdido num repair), `ctx.data.data.*` (TS2339), enum × literal (TS2367). As regras anti-recorrência estão em `skills/architecture.md` §TypeScript strictness. **Não** relaxar o tsconfig — ele pegou bugs reais, não só ruído de cast.
- **Console limpo + auditoria durável:** caminhos de repair não escrevem no console; o texto vai para o trace do step, o registro para `cb-repair-state.json` (`history[]`, sobrevive ao descarte dos filhos de fan-out) e o `cb-validate-all` embute o histórico no trace da task (sucesso e falha).
- **Juiz escopado na re-verificação:** o `cb-judge-r{n}` recebe `owners` nos args e re-julga SÓ os usecases reparados (mecânico, mais barato/rápido).
- **Semântica do motor (lição run 2026-07-04):** step `failed` NÃO satisfaz `dependsOn` — um worker filho falhado derruba o parent paralelo e o join (continue-dispatcher/juiz) espera para sempre. Por isso workers **nunca retornam `failed`**: a falha completa com trace `[repair]`/`[worker-error]` + registro no `cb-repair-state`; quem falha o run é o `cb-validate-all` (sequencial), limpo e com os findings.
- **Telas e menu** não são responsabilidade deste agente (são `statusFrontend`). O **contrato por página** (`web/contracts`) e as **funções cliente** que a página usa para chamar o backend também são `statusFrontend`; este agente **consome** o contrato para moldar a resposta do controller, mas não o escreve.

## Arquitetura de 3 camadas (hexagonal)

Layout por módulo, em `l1/{module}/` do projeto do cliente:

```
layer_1_external/          # adapters (entrada e saída) — a borda do sistema
  adapters/
    http/
      routes/              # registro de rotas (singleton router.ts)
      controllers/         # BFF: 1 controller por página, 1 handler por bffCommand
    queues/                # adapters de fila (consumers)
    webhooks/              # adapters de webhook (inbound)
    cron/                  # adapters de agendamento
    plugins/               # adapters de plugin
    persistence/           # adapter de SAÍDA: implementação dos repositórios + TableDefinition

layer_2_application/       # casos de uso — o QUE acontece, orquestra domínio e ports
  usecases/                # 1 função por command do usecase
  services/                # serviços de aplicação (orquestração que não é de um único usecase)
  ports/                   # interfaces que a aplicação precisa (ex.: I{Entity}Repository)
  dto/                     # objetos de transferência na borda da aplicação
  commands/                # intenções de escrita
  queries/                 # intenções de leitura

layer_3_domain/            # domínio PURO — sem ctx.data, sem I/O, sem framework
  entities/                # entidades + invariantes (shape canônico, camelCase)
  value-objects/           # value objects
  domain-services/         # lógica de domínio entre entidades/VOs
  rules/                   # regras/invariantes de domínio
  events/                  # eventos de domínio
```

**Regra de dependência (aponta para dentro):** `layer_1_external → layer_2_application → layer_3_domain`. O domínio (`layer_3_domain`) não depende de ninguém. A aplicação define **ports** (interfaces); os **adapters** (http de entrada, persistence de saída) dependem da aplicação e do domínio, nunca o contrário. **`ctx.data` só pode aparecer dentro de `adapters/persistence`.**

**Fluxo de uma requisição:** `adapters/http/controllers` (recebe, valida borda) → `usecase` (`layer_2_application`) → entidades/domain-services (`layer_3_domain`) e, para dados, o **port** de repositório → `adapters/persistence` (implementação do port, toca tabelas).

**Persistência = adapter de saída + port (decisão desta versão):**
- A **entidade de domínio** (`layer_3_domain/entities`) é pura: shape (camelCase), value-objects, invariantes, métodos de domínio. Não conhece colunas, JSONB, MDM nem `ctx.data`.
- O **port de repositório** (`layer_2_application/ports/{entity}Repository`) é a interface (`I{Entity}Repository`) que o usecase usa, tipada em termos de domínio.
- O **adapter de persistência** (`layer_1_external/adapters/persistence`) implementa o port: toca `ctx.data`, mapeia domínio ↔ registro (snake_case, `details` JSONB), resolve MDM, grava métricas, e **possui a `TableDefinition`**. Storage (Postgres/Timescale/Dynamo/Memory) é trocável aqui sem afetar domínio nem aplicação.
- **MDM master data** (`{ kind:'mdm', moduleRef:'102034', entity }`) — a **persistência das tabelas MDM é responsabilidade EXCLUSIVA do 102034** (`mdm_documents`, `mdm_documents_entities_index`, ...). O módulo cliente **nunca** gera `TableDefinition` de MDM nem registra tabela MDM no manifesto de persistência: adapters/usecases acessam MDM somente pela facade `ctx.mdm` (`entity`, `collection` e `prospect`), nunca por `ctx.data.mdmDocument`, `ctx.data.mdmEntityIndex` ou `ctx.data.mdmRelationship`. A referência/governança (`entity`, `domainId`, `sourceOfTruth:'102034'`) vive no defs da entidade de domínio. (`horizontalOwned`, ex.: `Payment`, segue o mesmo princípio — a tabela é do módulo horizontal, não do cliente.)

**Derivação de tabela (modelo JSONB — aproveitar ao máximo):** direção **domínio → persistência**, determinística. **1 tabela física por agregado raiz** (`kind:'core'`), com **poucas colunas "de fora": só os campos que precisam de índice** — PK, FKs consultadas (das `relationships`), `status`/`lifecycleStates` e timestamps usados para ordenação/filtro pelas `operations`/`workflows`. **Todo o resto vai para uma única coluna `details` (JSONB)**, inclusive **as tabelas filhas que não precisam de consulta direta**: entidades `kind:'supporting'` numa relação `oneToMany`/`oneToOne` com o raiz são **embutidas como coleção dentro do `details`** (ex.: `Order.details.items: OrderItem[]`) — **sem tabela própria**. O `details` pode conter **várias entidades filhas** ("várias tabelas dentro do JSON"). Mapeamento por `kind`:
- `core` → **tabela do agregado** (colunas indexadas + `details` JSONB).
- `supporting` (filho de um `core`, sem consulta isolada) → **dentro do `details`** do raiz; no domínio é value-object/part do agregado.
- `event` (append-only) → **tabela própria**.
- `mdm` → **sem tabela** (ver acima).

Promover um campo de dentro do `details` para coluna só quando ele passa a ser **filtrado/indexado**; o inverso (coluna que não precisa de índice) deve ir para o `details`. Field indexado sem coluna — ou coluna sem necessidade de índice — é erro de planejamento (reportar). O **único** lugar que conhece o shape do `details` é o adapter de persistência; domínio, ports e usecases enxergam só o agregado limpo.

## Artefatos gerados e convenção de `.defs.ts`

**Convenção de save:** todo artefato é um par `{nome}.defs.ts → {nome}.ts` **na mesma pasta** da camada de destino (ex.: `layer_1_external/adapters/http/controllers/cardapioEstoque.defs.ts → cardapioEstoque.ts`).

**Princípio (auto-suficiência):** cada `.defs.ts` precisa ser **SUFICIENTE** para gerar o seu `.ts`. A geração é feita por **outro agente** (`agentMaterializeGen`), que consome **APENAS o `.defs.ts`** — nada mais. Para isso o `.defs.ts` carrega:

1. O **bloco de planejamento** (`export const ... = { schemaVersion, artifactType, artifactId, moduleName, status, source, data:{...} } as const`) — o QUÊ do artefato, escrito pelos agentes de geração de defs.
2. Para entidades/adapters com nome derivado, um bloco **`materialization: { fileName, className, contractName }`**.
3. O **`export const pipeline = [...] as const`** — o **"manifesto de geração"** que este agente/materialização garante (acrescenta se faltar): **um item por artefato**, com tudo que a LLM precisa para gerar o `.ts` sem abrir mais nada:
   - `id`, `type` — identidade e tipo do artefato.
   - `outputPath` (sempre `.ts`) — arquivo a gerar; `defPath` — este `.defs.ts`.
   - `dependsFiles[]` (sempre `.d.ts`) — **as assinaturas da(s) camada(s) interna(s) que o `.ts` importa** (o *callee*: domínio/port/usecase/tabela).
   - `dependsOn[]` — ordenação na materialização.
   - `skills[]` — **o contexto da LLM**: a skill da camada (`_102021_/l2/skills/layer_*.md`) + as definitions da plataforma (`_102034_.d.ts`).
   - `rulesPath?` + `rulesApplied?` — as regras de negócio a aplicar (texto autoritativo).
   - `afterSaveBackEnd?` — hook determinístico de registro (manifesto / router / composition root).
   - `agent` — sempre `agentMaterializeGen` (quem gera o `.ts`).

   Exemplo canônico de `data` completo + `pipeline` (com `skills` e `afterSaveBackEnd`): `_102043_/l1/cafeFlow/layer_1_external/dailySalesMetrics.defs.ts`. **Regra:** se a LLM precisaria de alguma informação que não está no `data` nem alcançável pelos `dependsFiles`/`skills`/`rulesPath`, o `.defs.ts` está incompleto — completar antes de materializar.

**Tipos de artefato, pasta e `type` do pipeline:**

| Artefato | Pasta (`l1/{module}/...`) | `type` |
|---|---|---|
| Entidade de domínio (pura) | `layer_3_domain/entities/{entity}` | `domainEntity` |
| Value object / domain-service / regra / evento | `layer_3_domain/{value-objects\|domain-services\|rules\|events}` | `valueObject` / `domainService` / `domainRule` / `domainEvent` |
| Port de repositório (interface) | `layer_2_application/ports/{entity}Repository` | `repositoryPort` |
| Usecase | `layer_2_application/usecases/{usecase}` | `applicationUsecase` |
| Service / DTO / command / query | `layer_2_application/{services\|dto\|commands\|queries}` | `applicationService` / `dto` / `command` / `query` |
| Tabela / tabela de métrica | `layer_1_external/adapters/persistence/{table}` | `persistenceTable` / `persistenceMetricTable` |
| Adapter de repositório (impl do port) | `layer_1_external/adapters/persistence/{entity}RepositoryAdapter` | `repositoryAdapter` |
| Controller HTTP (BFF, por página) | `layer_1_external/adapters/http/controllers/{page}` | `httpController` |
| Rota HTTP | `layer_1_external/adapters/http/routes` | `httpRoute` |
| Adapter de fila / webhook / cron / plugin | `layer_1_external/adapters/{queues\|webhooks\|cron\|plugins}` | `queueAdapter` / `webhookAdapter` / `cronAdapter` / `pluginAdapter` |

**Singletons (criados vazios se faltarem):** `l2/{module}/module.ts`; `layer_1_external/adapters/http/routes/router.ts` (mapa de handlers BFF); `layer_1_external/adapters/persistence/persistence.ts` (manifesto exportando `tableDefinitions: TableDefinition[]`, mesmo que vazio); `l0/config.json` apontando o router e o entrypoint de persistência para os novos caminhos.

**Ordem de materialização (dirigida por dependência):**
1. `layer_3_domain` (entidades, value-objects, regras, eventos, domain-services) — sem dependências de dado.
2. `layer_2_application/ports` — dependem do domínio.
3. `adapters/persistence`: tabelas/métricas (derivadas da entidade de domínio) → adapter de repositório (depende de port + tabela + domínio).
4. `layer_2_application`: usecases, services, commands, queries, dto (dependem de ports + domínio).
5. `adapters/http`: controllers (dependem do usecase + contrato da página) → rotas.

`afterSaveBackEnd`: tabela → registra no manifesto de persistência; controller → registra a entrada de rota no router.

## BFF (backend-for-frontend)

O `l1` (backend) conversa com o frontend via **BFF**: cada **página** tem funções que chamam o backend, e o backend **retorna exatamente o que a página precisa — nem mais, nem menos**.

- Cada página declara comandos BFF em `l2/{module}/web/contracts/{page}.defs.ts`: `{ commandName, routeKey, purpose, kind:'query'|'command'|'mutation', input[], output[], origin }`. `origin` é só rastreio leve para o owner L4; não carrega tabela/usecase/regra/provenance de campo.
- O backend materializa controllers a partir dos owners L4. Cada handler usa `owner.bffName` como rota compartilhada, com fallback `{module}.{pageId}.{commandName}` apenas para L4 legado.
- Cada handler: valida só a **borda** (campos obrigatórios/shape → `VALIDATION_ERROR` 400), chama o **usecase** (`layer_2_application`, importando função + tipos I/O) e **molda a resposta no shape exato do contrato** `l2/{module}/web/contracts/{page}.ts` (mapeia nomes se o usecase devolver snake_case). Nada além disso.
- Uma **rota** por command é registrada no router com a chave canônica `bffName`/`routeKey` → handler.
- O handler **não** toca domínio nem persistência direto (sem `ctx.data`, sem import de `adapters/persistence`): a regra de negócio é do usecase/domínio.

## Mapeamento 4 camadas → 3 camadas (migração)

| Antes (4 camadas) | Agora (3 camadas, hexagonal) |
|---|---|
| `layer_2_controllers/{page}` (BFF) | `layer_1_external/adapters/http/controllers/{page}` (+ `routes/router.ts`) |
| `layer_3_usecases/{uc}` | `layer_2_application/usecases/{uc}` (+ services/commands/queries/dto) |
| `layer_4_entities/{e}` (shape + acesso a dado) | **dividido**: shape puro → `layer_3_domain/entities/{e}`; interface → `layer_2_application/ports/{e}Repository`; acesso a dado (`ctx.data`) → `layer_1_external/adapters/persistence/{e}RepositoryAdapter` |
| `layer_1_external/{table}` (TableDefinition) | `layer_1_external/adapters/persistence/{table}` |
| `layer_1_external/persistence.ts` | `layer_1_external/adapters/persistence/persistence.ts` |
| `layer_2_controllers/router.ts` | `layer_1_external/adapters/http/routes/router.ts` |

## Responsabilidade deste agente

1. **Varrer** os owners (Operations/Workflows/Ontology e contratos BFF quando existirem) cujo `todoBackend` esteja pendente — ou processar **um item específico** recebido como argumento.
2. Para cada item pendente:
   - `toCreate` / `toUpdate`: derivar/atualizar os artefatos das 3 camadas — entidade de domínio (+ value-objects/rules/events quando aplicável), port + adapter de persistência, tabela(s)/métrica(s), usecase(s), controller HTTP + rota (BFF), e **materializar** (`.defs.ts → .ts`).
   - `toRemove`: remover/deprecar artefato + `.ts` materializado (cascata; **cuidado com dados** — marcar `deprecated` e exigir confirmação antes de drop real de tabela).
3. **Mudar o status no `todoBackend`** do item ao concluir.

## Steps (alto nível, sem implementação)

- `scan-pending` — lista owners com `todoBackend` pendente (ou recebe 1 item).
- `plan-artifacts` — do conjunto pendente, planeja os artefatos das 3 camadas e o índice de persistência (com os guardrails acima). Mantém o loop critic/repair endurecido.
- `generate-backend` (por item) — domínio / port / adapter de persistência (tabela) / usecase / controller+rota (BFF).
- `materialize` — chama a materialização L1 existente (`.defs.ts → .ts`), respeitando a ordem por dependência.
- `flip-status` — marca `todoBackend.status = inProgress` ao iniciar e `todoBackend.status = done` ao concluir.

## Entrada / Saída

- **Entrada:** intenção do módulo (ontologia + operations/workflows + rules), `l5/{module}/todoBackend.defs.ts` e contrato BFF por página quando já existir. Opcional: um item específico (tabela/usecase/entity/adapter) para processar só ele.
- **Saída:** artefatos de backend em `l1/{module}` (3 camadas) criados/atualizados/removidos, materializados em `.ts`, e `todoBackend` dos itens processados atualizado.

## Status (`todoBackend`)

Pega itens com `todoBackend.status` pendente (`toCreate` | `inProgress`); ao dar `lock` seta `inProgress`; marca `done` **assim que os `.defs.ts` do owner estão gerados** (no fim do `cb-gen-http`, ANTES da materialização) — não no fim do run. Motivo: materialize/seeds/assets são os passos que falham no fim; marcar `done` após os defs faz um re-run **reaproveitar** os defs prontos (pula toda a cadeia de geração, inclusive o juiz LLM, ~20 min) e só materializar `.ts` desatualizados + seeds faltando. Portanto `done` = "defs gerados"; o sucesso do run (o `.ts` compilar) continua sendo gate do `cb-validate-all`. Um `@@changeBackend` sem pendências NÃO para: vai direto materializar os `.ts` desatualizados (staleness: `.ts` mais antigo que `.defs.ts`) e gerar seeds se faltar o arquivo (seeds existente só é regerado com `/rebuild all` ou `/rebuild seeds`). **Independente do frontend:** o `agentChangeFrontend` controla o `todoFrontend` separadamente, então não há ordem obrigatória entre os dois workers nem colisão de escrita no L4. Owners semeados pela Etapa 1 (`agentNewSolution2`) nascem nos dois todos como `toCreate`.

## O que este agente NÃO faz

- Não decide O QUE muda (isso é `agentChangeSolution`/`agentNewSolution2`); só executa o que já está marcado.
- Não gera telas nem menu, **não autora** o contrato por página (`web/contracts`) nem as funções cliente que a página usa para chamar o backend (isso é `statusFrontend`). Apenas **consome** o contrato para moldar a resposta do controller HTTP.
- Não cria/edita ontologia, workflows, operations ou rules (consome).

## Referências de artefato

- Lê: `l4/{module}/ontology/*` + `l4/rules/*` + `l4/{module}/module.defs.ts`, `l4/operations/*`, `l4/workflows/*` e `l2/{module}/web/contracts/{page}.defs.ts` / `.ts` quando existirem.
- Escreve: `l1/{module}/layer_3_domain/*`, `l1/{module}/layer_2_application/*`, `l1/{module}/layer_1_external/adapters/*` (http, persistence, queues, webhooks, cron, plugins) + `.ts` materializado.
- Reusa: materialização L1 já existente (102021 `agentMaterializeSolution` — `agentPrepareDefsL1` acrescenta o `pipeline`, `agentMaterializeL1Def` resolve o item, `agentMaterializeGen` gera o `.ts`).
