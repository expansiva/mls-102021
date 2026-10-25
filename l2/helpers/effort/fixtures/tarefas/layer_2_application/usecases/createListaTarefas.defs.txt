/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/createListaTarefas.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "createListaTarefas",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_2_application/ports/listaTarefasRepository.defs.ts",
    "_102047_/l1/tarefas/layer_3_domain/entities/listaTarefas.defs.ts",
    "_102047_/l4/tarefas/rules.defs.ts"
  ],
  "data": {
    "usecaseId": "createListaTarefas",
    "entityId": "ListaTarefas",
    "operation": "create",
    "rulesApplied": [
      "nomeListaUnico",
      "somenteGestorMantemListas"
    ],
    "effects": []
  }
} as const;

export default definition;
