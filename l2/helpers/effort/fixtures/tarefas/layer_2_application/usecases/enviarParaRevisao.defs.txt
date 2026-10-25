/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/usecases/enviarParaRevisao.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "usecase",
  "artifactId": "enviarParaRevisao",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/tarefas/layer_2_application/ports/tarefaRepository.defs.ts",
    "_102047_/l1/tarefas/layer_3_domain/entities/tarefa.defs.ts",
    "_102047_/l4/tarefas/ontology/Tarefa.defs.ts",
    "_102047_/l4/tarefas/rules.defs.ts"
  ],
  "data": {
    "usecaseId": "enviarParaRevisao",
    "entityId": "Tarefa",
    "operation": "transition",
    "rulesApplied": [
      "apenasResponsavelExecuta",
      "avisarQuemAgeAgora"
    ],
    "effects": [],
    "transitionRef": "enviarParaRevisao"
  }
} as const;

export default definition;
