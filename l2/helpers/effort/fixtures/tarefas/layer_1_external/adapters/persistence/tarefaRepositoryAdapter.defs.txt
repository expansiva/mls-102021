/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/persistence/tarefaRepositoryAdapter.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "repositoryAdapter",
  "artifactId": "TarefaRepository",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_1_external/adapters/persistence/tarefa.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/ports/tarefaRepository.defs.ts"
  ],
  "data": {
    "entityId": "Tarefa",
    "portId": "TarefaRepository",
    "tableId": "tarefa",
    "columns": [
      {
        "field": "id",
        "column": "id"
      },
      {
        "field": "version",
        "column": "json:version"
      },
      {
        "field": "titulo",
        "column": "titulo"
      },
      {
        "field": "status",
        "column": "status"
      },
      {
        "field": "prioridade",
        "column": "prioridade"
      },
      {
        "field": "prazo",
        "column": "prazo"
      },
      {
        "field": "listaId",
        "column": "listaId"
      },
      {
        "field": "responsavelId",
        "column": "responsavelId"
      },
      {
        "field": "criadorId",
        "column": "criadorId"
      },
      {
        "field": "tarefaPaiId",
        "column": "tarefaPaiId"
      },
      {
        "field": "criadaEm",
        "column": "criadaEm"
      },
      {
        "field": "details.descricao",
        "column": "json:details.descricao"
      },
      {
        "field": "details.etiquetas",
        "column": "json:details.etiquetas"
      },
      {
        "field": "details.motivoDevolucao",
        "column": "json:details.motivoDevolucao"
      },
      {
        "field": "details.devolvidaEm",
        "column": "json:details.devolvidaEm"
      },
      {
        "field": "details.retomadaEm",
        "column": "json:details.retomadaEm"
      },
      {
        "field": "details.concluidaEm",
        "column": "json:details.concluidaEm"
      },
      {
        "field": "details.canceladaEm",
        "column": "json:details.canceladaEm"
      },
      {
        "field": "details.quemAgeAgora",
        "column": "json:details.quemAgeAgora"
      },
      {
        "field": "details.aberta",
        "column": "json:details.aberta"
      },
      {
        "field": "details.venceHoje",
        "column": "json:details.venceHoje"
      },
      {
        "field": "details.atrasada",
        "column": "json:details.atrasada"
      },
      {
        "field": "details.devolvidaPendente",
        "column": "json:details.devolvidaPendente"
      },
      {
        "field": "details.quantidadeSubtarefas",
        "column": "json:details.quantidadeSubtarefas"
      },
      {
        "field": "details.progressoChecklist",
        "column": "json:details.progressoChecklist"
      }
    ]
  }
} as const;

export default definition;
