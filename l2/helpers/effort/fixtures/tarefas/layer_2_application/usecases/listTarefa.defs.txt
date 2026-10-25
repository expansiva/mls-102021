/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/listTarefa.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "listTarefa",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_2_application/ports/tarefaRepository.defs.ts",
    "_102047_/l1/tarefas/layer_3_domain/entities/tarefa.defs.ts"
  ],
  "data": {
    "usecaseId": "listTarefa",
    "entityId": "Tarefa",
    "operation": "list",
    "rulesApplied": [],
    "effects": []
  }
} as const;

export default definition;
