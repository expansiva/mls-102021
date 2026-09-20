/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/deleteChamado.defs.ts" enhancement="_blank"/>

export const deleteChamadoUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "deleteChamado",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "deleteChamado",
    "ports": [
      "Chamado"
    ],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "deleteChamado",
        "inputTypeName": "DeleteChamadoInput",
        "outputTypeName": "DeleteChamadoOutput",
        "input": [
          {
            "name": "chamadoId",
            "type": "uuid",
            "required": true,
            "description": "Identificador estável do chamado, transportado entre as etapas de acompanhamento.",
            "ofEntity": "Chamado",
            "fieldRef": "Chamado.chamadoId",
            "item": {
              "fields": []
            }
          }
        ],
        "output": [
          {
            "name": "chamadoId",
            "type": "string",
            "required": true,
            "ofEntity": "Chamado"
          },
          {
            "name": "titulo",
            "type": "string",
            "required": true,
            "ofEntity": "Chamado"
          },
          {
            "name": "descricao",
            "type": "string",
            "required": true,
            "ofEntity": "Chamado"
          },
          {
            "name": "status",
            "type": "string",
            "required": true,
            "ofEntity": "Chamado"
          }
        ],
        "ports": [
          "Chamado"
        ],
        "rulesApplied": [],
        "transactional": true,
        "steps": [
          "Load the Chamado aggregate by chamadoId through the Chamado port.",
          "Capture the canonical output fields from the loaded aggregate.",
          "Delete the Chamado aggregate through the Chamado port within the transaction.",
          "Return chamadoId, titulo, descricao, and status from the deleted aggregate."
        ],
        "outputShape": {
          "kind": "object",
          "fields": [
            {
              "name": "chamadoId",
              "type": "string",
              "required": true,
              "fieldRef": "Chamado.chamadoId"
            },
            {
              "name": "titulo",
              "type": "string",
              "required": true,
              "fieldRef": "Chamado.titulo"
            },
            {
              "name": "descricao",
              "type": "string",
              "required": true,
              "fieldRef": "Chamado.descricao"
            },
            {
              "name": "status",
              "type": "string",
              "required": true,
              "fieldRef": "Chamado.status"
            }
          ]
        }
      }
    ],
    "mdmRefs": []
  }
} as const;

export default deleteChamadoUsecase;

export const pipeline = [
  {
    "id": "deleteChamado__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/deleteChamado.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/deleteChamado.defs.ts",
    "dependsFiles": [
      "_102039_/l1/controleChamados/layer_2_application/ports/chamadoRepository.d.ts",
      "_102039_/l1/controleChamados/layer_3_domain/entities/chamado.d.ts"
    ],
    "dependsOn": [],
    "skills": [
      "_102021_/l2/agentChangeBackend/skills/architecture.md",
      "_102021_/l2/agentChangeBackend/skills/applicationUsecase.md",
      "_102034_.d.ts"
    ],
    "agent": "agentCbMaterialize"
  }
] as const;
