/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/getAtendente.defs.ts" enhancement="_blank"/>

export const getAtendenteUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "getAtendente",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "getAtendente",
    "rulesApplied": [],
    "mdmRefs": [
      "Atendente"
    ],
    "mdm": {
      "situationOutput": "active"
    }
  }
} as const;

export default getAtendenteUsecase;

export const pipeline = [
  {
    "id": "getAtendente__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/getAtendente.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/getAtendente.defs.ts",
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
