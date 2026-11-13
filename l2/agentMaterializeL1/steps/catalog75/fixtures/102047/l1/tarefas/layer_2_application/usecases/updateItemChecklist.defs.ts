/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/updateItemChecklist.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "updateItemChecklist",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_2_application/ports/itemChecklistRepository.defs.ts",
    "_102047_/l1/tarefas/layer_3_domain/entities/itemChecklist.defs.ts",
    "_102047_/l4/tarefas/rules.defs.ts"
  ],
  "data": {
    "usecaseId": "updateItemChecklist",
    "entityId": "ItemChecklist",
    "operation": "update",
    "rulesApplied": [
      "itemChecklistSoQuemVeTarefa",
      "itemChecklistTarefaNaoEncerrada",
      "marcarItemNaoMudaSituacao"
    ],
    "effects": []
  }
} as const;

export default definition;
