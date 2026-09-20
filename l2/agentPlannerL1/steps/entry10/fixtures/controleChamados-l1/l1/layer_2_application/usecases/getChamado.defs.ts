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
    "ports": [
      "Chamado"
    ],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "getChamado",
        "inputTypeName": "GetChamadoInput",
        "outputTypeName": "GetChamadoOutput",
        "input": [
          {
            "name": "chamadoId",
            "type": "string",
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
        "transactional": false,
        "steps": [
          "Load the Chamado aggregate through the Chamado port using chamadoId.",
          "Return chamadoId, titulo, descricao, and status from the loaded Chamado."
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
      "_102021_/l2/agentChangeBackend/skills/architecture.md",
      "_102021_/l2/agentChangeBackend/skills/applicationUsecase.md",
      "_102034_.d.ts"
    ],
    "agent": "agentCbMaterialize"
  }
] as const;
