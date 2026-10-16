/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/updateChamado.defs.ts" enhancement="_blank"/>

export const updateChamadoUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "updateChamado",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "updateChamado",
    "rulesApplied": [
      "fechamentoExigeChamadoAberto",
      "chamadoFechadoNaoPodeSerReaberto"
    ],
    "mdmRefs": []
  }
} as const;

export default updateChamadoUsecase;

export const pipeline = [
  {
    "id": "updateChamado__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/updateChamado.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/updateChamado.defs.ts",
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
      "fechamentoExigeChamadoAberto",
      "chamadoFechadoNaoPodeSerReaberto"
    ],
    "agent": "agentCbMaterialize"
  }
] as const;
