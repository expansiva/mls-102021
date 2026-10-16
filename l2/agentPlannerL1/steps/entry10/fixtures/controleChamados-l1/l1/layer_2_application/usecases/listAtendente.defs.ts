/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/listAtendente.defs.ts" enhancement="_blank"/>

export const listAtendenteUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "listAtendente",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "listAtendente",
    "rulesApplied": [],
    "mdmRefs": [
      "Atendente"
    ],
    "mdm": {
      "activeFilterInput": "includeInactive",
      "situationOutput": "active"
    }
  }
} as const;

export default listAtendenteUsecase;

export const pipeline = [
  {
    "id": "listAtendente__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/listAtendente.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/listAtendente.defs.ts",
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
