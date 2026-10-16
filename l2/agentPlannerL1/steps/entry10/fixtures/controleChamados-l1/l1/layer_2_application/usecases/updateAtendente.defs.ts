/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/updateAtendente.defs.ts" enhancement="_blank"/>

export const updateAtendenteUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "updateAtendente",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "updateAtendente",
    "rulesApplied": [],
    "mdmRefs": [
      "Atendente"
    ]
  }
} as const;

export default updateAtendenteUsecase;

export const pipeline = [
  {
    "id": "updateAtendente__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/updateAtendente.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/updateAtendente.defs.ts",
    "dependsFiles": [],
    "dependsOn": [],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/usecase.md",
      "_102034_.d.ts"
    ],
    "agent": "agentCbMaterialize"
  }
] as const;
