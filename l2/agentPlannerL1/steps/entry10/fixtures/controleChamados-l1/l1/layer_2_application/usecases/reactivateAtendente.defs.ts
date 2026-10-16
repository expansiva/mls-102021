/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/reactivateAtendente.defs.ts" enhancement="_blank"/>

export const reactivateAtendenteUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "reactivateAtendente",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "reactivateAtendente",
    "rulesApplied": [],
    "mdmRefs": [
      "Atendente"
    ],
    "mdm": {
      "lifecycle": "reactivate"
    }
  }
} as const;

export default reactivateAtendenteUsecase;

export const pipeline = [
  {
    "id": "reactivateAtendente__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/reactivateAtendente.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/reactivateAtendente.defs.ts",
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
