/// <mls fileReference="_102047_/l1/tarefas/layer_3_domain/entities/itemChecklist.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "domainEntity",
  "artifactId": "ItemChecklist",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_3_domain/entities/tarefa.defs.ts"
  ],
  "data": {
    "entityId": "ItemChecklist",
    "storageTarget": "moduleDatabase",
    "fields": [
      {
        "name": "id",
        "type": "uuid",
        "derived": true
      },
      {
        "name": "version",
        "type": "integer",
        "derived": true
      },
      {
        "name": "tarefaId",
        "type": "record",
        "ref": "Tarefa"
      },
      {
        "name": "ordem",
        "type": "integer"
      },
      {
        "name": "details",
        "type": "object"
      },
      {
        "name": "details.descricao",
        "type": "string"
      },
      {
        "name": "details.concluido",
        "type": "boolean"
      },
      {
        "name": "details.concluidoEm",
        "type": "timestamp",
        "derived": true
      }
    ],
    "lifecycle": {
      "states": [],
      "transitions": []
    },
    "invariants": [
      "itemChecklistSoQuemVeTarefa",
      "marcarItemNaoMudaSituacao",
      "itemChecklistTarefaNaoEncerrada"
    ],
    "imports": []
  }
} as const;

export default definition;
