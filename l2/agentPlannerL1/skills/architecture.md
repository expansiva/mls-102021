<!-- mls fileReference="_102021_/l2/agentPlannerL1/skills/architecture.md" enhancement="_blank" -->

# Hexagonal backend — planning rules

This planner does not generate `.ts`. It names the BFF routes, usecases, ports and tables the change-backend agent will materialize. The rules are the hexagonal model of `agentChangeBackend/skills/architecture.md`, applied to the plan.

## Layers

```
layer_1_external/adapters/   http controllers = BFF, persistence tables + repository adapters
layer_2_application/         usecases, ports (interfaces)
layer_3_domain/              entities (pure)
```

- One **usecase per operation** (`listMensalidade`, `createPagamento`, `settleMensalidade` for a transition).
- One **port per persisted entity** (`MensalidadeRepository`). Usecase `ports[]` lists entity ids, not the `Repository` suffix.
- One **table per persisted tdm entity** (and ddm only when ontology `storage.kind` is `relational` or `timeSeries`). Table id is lowerCamel of the entity (`mensalidade`).
- **MDM / `family: mdm` never gets a local table or port.** The usecase exists; access is `ctx.mdm`. Do not emit the entity in `tables[]` or `ports[]`.
- **Controller = BFF.** One handler per route. Route shape is `mod.<page>.<cmd|qry>Nome` (`mensalidadesAcademia.mensalidades_pagamentos.qryListMensalidade`). `kind` is `qry` or `cmd`. `usecaseRef` is the usecase id.
- Naming is deterministic from the ontology `entityId` (PascalCase entity, camelCase ids). Never translate the title.

## Status

`toCreate | toUpdate | toRemove | done`. Never `inProgress`. `existing` is the path of the l1 `.defs.ts` when `done` or `toUpdate`, and `""` when `toCreate`. `reason` is always one English line.
