/// <mls fileReference="_102047_/l1/tarefas/layer_3_domain/entities/listaTarefas.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "domainEntity",
  "artifactId": "ListaTarefas",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [],
  "data": {
    "entityId": "ListaTarefas",
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
        "name": "nome",
        "type": "string"
      },
      {
        "name": "details",
        "type": "object"
      },
      {
        "name": "details.descricao",
        "type": "text"
      },
      {
        "name": "details.quantidadeTarefasAbertas",
        "type": "integer",
        "derived": true
      }
    ],
    "lifecycle": {
      "states": [],
      "transitions": []
    },
    "invariants": [
      "nomeListaUnico",
      "somenteGestorMantemListas"
    ],
    "imports": []
  }
} as const;

export default definition;
