/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/registerComentario.defs.ts" enhancement="_blank"/>

export const registerComentarioUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "registerComentario",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "registerComentario",
    "rulesApplied": [
      "comentariosPermitidosSomenteEmChamadosAbertos"
    ],
    "mdmRefs": [
      "Atendente"
    ]
  }
} as const;

export default registerComentarioUsecase;

export const pipeline = [
  {
    "id": "registerComentario__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/registerComentario.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/registerComentario.defs.ts",
    "dependsFiles": [
      "_102039_/l1/controleChamados/layer_2_application/ports/comentarioRepository.d.ts",
      "_102039_/l1/controleChamados/layer_2_application/ports/chamadoRepository.d.ts",
      "_102039_/l1/controleChamados/layer_3_domain/entities/comentario.d.ts",
      "_102039_/l1/controleChamados/layer_3_domain/entities/chamado.d.ts"
    ],
    "dependsOn": [],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/usecase.md",
      "_102034_.d.ts"
    ],
    "rulesApplied": [
      "comentariosPermitidosSomenteEmChamadosAbertos"
    ],
    "agent": "agentCbMaterialize"
  }
] as const;
