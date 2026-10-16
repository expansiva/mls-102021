/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/inactivateAtendente.defs.ts" enhancement="_blank"/>

export const inactivateAtendenteUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "inactivateAtendente",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "inactivateAtendente",
    "rulesApplied": [],
    "mdmRefs": [
      "Atendente"
    ],
    "mdm": {
      "lifecycle": "inactivate"
    }
  }
} as const;

export default inactivateAtendenteUsecase;

export const pipeline = [
  {
    "id": "inactivateAtendente__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/inactivateAtendente.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/inactivateAtendente.defs.ts",
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
