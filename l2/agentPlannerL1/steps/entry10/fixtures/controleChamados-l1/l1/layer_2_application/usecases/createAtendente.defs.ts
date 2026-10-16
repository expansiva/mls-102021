/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/createAtendente.defs.ts" enhancement="_blank"/>

export const createAtendenteUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "createAtendente",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "createAtendente",
    "rulesApplied": [],
    "mdmRefs": [
      "Atendente"
    ]
  }
} as const;

export default createAtendenteUsecase;

export const pipeline = [
  {
    "id": "createAtendente__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/createAtendente.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/createAtendente.defs.ts",
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
