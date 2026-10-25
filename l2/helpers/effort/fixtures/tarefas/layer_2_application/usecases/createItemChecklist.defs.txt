/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/createItemChecklist.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "createItemChecklist",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_2_application/ports/itemChecklistRepository.defs.ts",
    "_102047_/l1/tarefas/layer_3_domain/entities/itemChecklist.defs.ts",
    "_102047_/l4/tarefas/rules.defs.ts"
  ],
  "data": {
    "usecaseId": "createItemChecklist",
    "entityId": "ItemChecklist",
    "operation": "create",
    "rulesApplied": [
      "itemChecklistSoQuemVeTarefa",
      "itemChecklistTarefaNaoEncerrada",
      "marcarItemNaoMudaSituacao"
    ],
    "effects": []
  }
} as const;

export default definition;
