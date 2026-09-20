/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/locateChamado.defs.ts" enhancement="_blank"/>

export const locateChamadoUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "locateChamado",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "locateChamado",
    "ports": [
      "Chamado"
    ],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "locateChamado",
        "inputTypeName": "LocateChamadoInput",
        "outputTypeName": "LocateChamadoOutput",
        "input": [],
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
          "Use the Chamado port to list the open Chamado aggregate.",
          "Return the selected open Chamado projection with chamadoId, titulo, descricao, and status.",
          "Do not invent additional filtering or lifecycle transitions; the lifecycle defines open as the initial state and closed as terminal, but this query does not mutate state."
        ],
        "outputShape": {
          "kind": "list",
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

export default locateChamadoUsecase;

export const pipeline = [
  {
    "id": "locateChamado__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/locateChamado.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/locateChamado.defs.ts",
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
