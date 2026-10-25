/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/listItemChecklist.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "listItemChecklist",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_2_application/ports/itemChecklistRepository.defs.ts",
    "_102047_/l1/tarefas/layer_3_domain/entities/itemChecklist.defs.ts"
  ],
  "data": {
    "usecaseId": "listItemChecklist",
    "entityId": "ItemChecklist",
    "operation": "list",
    "rulesApplied": [],
    "effects": []
  }
} as const;

export default definition;
