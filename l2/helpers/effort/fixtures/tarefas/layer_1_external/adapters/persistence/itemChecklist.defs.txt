/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/persistence/itemChecklist.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "table",
  "artifactId": "itemChecklist",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_3_domain/entities/itemChecklist.defs.ts"
  ],
  "data": {
    "tableId": "itemChecklist",
    "entityId": "ItemChecklist",
    "physicalName": "tarefas_itemchecklist",
    "primaryKey": [
      "id"
    ],
    "uniqueKeys": [],
    "indexes": [
      {
        "name": "tarefas_itemchecklist_tarefaId",
        "columns": [
          "tarefaId"
        ],
        "unique": false
      },
      {
        "name": "tarefas_itemchecklist_ordem",
        "columns": [
          "ordem"
        ],
        "unique": false
      }
    ]
  }
} as const;

export default definition;
