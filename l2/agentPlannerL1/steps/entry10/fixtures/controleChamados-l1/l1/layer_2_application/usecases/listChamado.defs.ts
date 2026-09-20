/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/listChamado.defs.ts" enhancement="_blank"/>

export const listChamadoUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "listChamado",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "listChamado",
    "ports": [
      "Chamado"
    ],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "listChamado",
        "inputTypeName": "ListChamadoInput",
        "outputTypeName": "ListChamadoOutput",
        "input": [
          {
            "name": "sortBy",
            "type": "string",
            "required": false,
            "description": "Campo de ordenação da listagem.",
            "ofEntity": "",
            "fieldRef": "Chamado.status",
            "item": {
              "fields": []
            }
          },
          {
            "name": "sortOrder",
            "type": "string",
            "required": false,
            "description": "Direção da ordenação.",
            "ofEntity": "",
            "fieldRef": "Chamado.status",
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
          "Load all Chamado records through the Chamado repository port.",
          "Apply the optional status sort field and ascending or descending order when provided.",
          "Return the selected Chamado fields according to the canonical list output shape."
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

export default listChamadoUsecase;

export const pipeline = [
  {
    "id": "listChamado__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/listChamado.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/listChamado.defs.ts",
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
