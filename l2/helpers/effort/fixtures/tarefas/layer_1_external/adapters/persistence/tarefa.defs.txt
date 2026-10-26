/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/persistence/tarefa.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "table",
  "artifactId": "tarefa",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_3_domain/entities/tarefa.defs.ts"
  ],
  "data": {
    "tableId": "tarefa",
    "entityId": "Tarefa",
    "physicalName": "tarefas_tarefa",
    "primaryKey": [
      "id"
    ],
    "uniqueKeys": [],
    "indexes": [
      {
        "name": "tarefas_tarefa_titulo",
        "columns": [
          "titulo"
        ],
        "unique": false
      },
      {
        "name": "tarefas_tarefa_status",
        "columns": [
          "status"
        ],
        "unique": false
      },
      {
        "name": "tarefas_tarefa_prioridade",
        "columns": [
          "prioridade"
        ],
        "unique": false
      },
      {
        "name": "tarefas_tarefa_prazo",
        "columns": [
          "prazo"
        ],
        "unique": false
      },
      {
        "name": "tarefas_tarefa_listaId",
        "columns": [
          "listaId"
        ],
        "unique": false
      },
      {
        "name": "tarefas_tarefa_responsavelId",
        "columns": [
          "responsavelId"
        ],
        "unique": false
      },
      {
        "name": "tarefas_tarefa_criadorId",
        "columns": [
          "criadorId"
        ],
        "unique": false
      },
      {
        "name": "tarefas_tarefa_tarefaPaiId",
        "columns": [
          "tarefaPaiId"
        ],
        "unique": false
      },
      {
        "name": "tarefas_tarefa_criadaEm",
        "columns": [
          "criadaEm"
        ],
        "unique": false
      }
    ]
  }
} as const;

export default definition;
