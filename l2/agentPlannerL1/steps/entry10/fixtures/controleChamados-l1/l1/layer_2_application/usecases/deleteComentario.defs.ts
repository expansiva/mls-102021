/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/deleteComentario.defs.ts" enhancement="_blank"/>

export const deleteComentarioUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "deleteComentario",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "deleteComentario",
    "rulesApplied": [],
    "mdmRefs": []
  }
} as const;

export default deleteComentarioUsecase;

export const pipeline = [
  {
    "id": "deleteComentario__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/deleteComentario.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/deleteComentario.defs.ts",
    "dependsFiles": [
      "_102039_/l1/controleChamados/layer_2_application/ports/comentarioRepository.d.ts",
      "_102039_/l1/controleChamados/layer_3_domain/entities/comentario.d.ts"
    ],
    "dependsOn": [],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/usecase.md",
      "_102034_.d.ts"
    ],
    "agent": "agentCbMaterialize"
  }
] as const;
