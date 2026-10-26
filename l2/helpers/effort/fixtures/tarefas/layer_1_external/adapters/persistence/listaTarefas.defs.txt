/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/persistence/listaTarefas.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "table",
  "artifactId": "listaTarefas",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_3_domain/entities/listaTarefas.defs.ts"
  ],
  "data": {
    "tableId": "listaTarefas",
    "entityId": "ListaTarefas",
    "physicalName": "tarefas_listatarefas",
    "primaryKey": [
      "id"
    ],
    "uniqueKeys": [
      [
        "nome"
      ]
    ],
    "indexes": [
      {
        "name": "tarefas_listatarefas_nome",
        "columns": [
          "nome"
        ],
        "unique": true
      }
    ]
  }
} as const;

export default definition;
