/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/closeChamado.defs.ts" enhancement="_blank"/>

export const closeChamadoUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "closeChamado",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "closeChamado",
    "rulesApplied": [
      "fechamentoExigeChamadoAberto"
    ],
    "mdmRefs": []
  }
} as const;

export default closeChamadoUsecase;

export const pipeline = [
  {
    "id": "closeChamado__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/closeChamado.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/closeChamado.defs.ts",
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
    "rulesApplied": [
      "fechamentoExigeChamadoAberto"
    ],
    "agent": "agentCbMaterialize"
  }
] as const;
