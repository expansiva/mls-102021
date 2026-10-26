/// <mls fileReference="_102047_/l1/tarefas/layer_1_external/adapters/integration/outbound.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "integrationOutbound",
  "artifactId": "outbound",
  "moduleName": "tarefas",
  "status": "blocked",
  "dependencies": [
    "_102047_/l1/tarefas/layer_2_application/usecases/aceitar.defs.ts",
    "_102047_/l1/tarefas/layer_2_application/usecases/cancelar.defs.ts"
  ],
  "data": {
    "integrationId": "outbound",
    "events": [
      {
        "eventId": "tarefaCancelada",
        "on": "Tarefa.cancelar",
        "entityId": "Tarefa",
        "mechanism": "",
        "consumer": "cancelar"
      },
      {
        "eventId": "tarefaConcluida",
        "on": "Tarefa.aceitar",
        "entityId": "Tarefa",
        "mechanism": "",
        "consumer": "aceitar"
      }
    ]
  }
} as const;

export default definition;
