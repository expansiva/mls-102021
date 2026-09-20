/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/createChamado.defs.ts" enhancement="_blank"/>

export const createChamadoUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "createChamado",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "createChamado",
    "ports": [
      "Chamado"
    ],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "createChamado",
        "inputTypeName": "CreateChamadoInput",
        "outputTypeName": "CreateChamadoOutput",
        "input": [
          {
            "name": "titulo",
            "type": "string",
            "required": true,
            "description": "Resumo do assunto ou solicitação de atendimento registrada no chamado.",
            "ofEntity": "Chamado",
            "fieldRef": "Chamado.titulo",
            "item": {
              "fields": []
            }
          },
          {
            "name": "descricao",
            "type": "string",
            "required": true,
            "description": "Detalhamento da solicitação de atendimento registrada no chamado.",
            "ofEntity": "Chamado",
            "fieldRef": "Chamado.descricao",
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
          "Validate required titulo and descricao fields.",
          "Resolve the initial status from the system default as open.",
          "Generate chamadoId using ctx.idGenerator.",
          "Create the Chamado aggregate through the Chamado port.",
          "Return chamadoId, titulo, descricao, and status."
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

export default createChamadoUsecase;

export const pipeline = [
  {
    "id": "createChamado__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/createChamado.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/createChamado.defs.ts",
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
