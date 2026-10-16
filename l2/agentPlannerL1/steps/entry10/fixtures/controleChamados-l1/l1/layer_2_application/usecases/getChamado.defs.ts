/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/getChamado.defs.ts" enhancement="_blank"/>

export const getChamadoUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "getChamado",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "getChamado",
    "rulesApplied": [],
    "mdmRefs": []
  }
} as const;

export default getChamadoUsecase;

export const pipeline = [
  {
    "id": "getChamado__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/getChamado.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/getChamado.defs.ts",
    "dependsFiles": [
      "_102039_/l1/controleChamados/layer_2_application/ports/chamadoRepository.d.ts",
      "_102039_/l1/controleChamados/layer_3_domain/entities/chamado.d.ts"
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
