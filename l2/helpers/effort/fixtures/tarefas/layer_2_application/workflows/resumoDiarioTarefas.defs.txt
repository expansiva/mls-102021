/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/workflows/resumoDiarioTarefas.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "workflowProcess",
  "artifactId": "resumoDiarioTarefas",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l4/tarefas/journeys/resumoDiario.defs.ts",
    "_102047_/l4/tarefas/workflows.defs.ts"
  ],
  "data": {
    "processId": "resumoDiarioTarefas",
    "trigger": {
      "kind": "scheduled",
      "schedule": "Todo dia às 8h"
    },
    "functions": [
      "listarResponsaveisResumo",
      "abrirResumoDiario",
      "concluirResumoDiario"
    ],
    "operations": []
  }
} as const;

export default definition;
