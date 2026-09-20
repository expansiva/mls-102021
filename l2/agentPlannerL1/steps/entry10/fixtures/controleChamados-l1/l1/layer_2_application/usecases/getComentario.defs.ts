/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/getComentario.defs.ts" enhancement="_blank"/>

export const getComentarioUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "getComentario",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "getComentario",
    "ports": [
      "Comentario"
    ],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "getComentario",
        "inputTypeName": "GetComentarioInput",
        "outputTypeName": "GetComentarioOutput",
        "input": [
          {
            "name": "comentarioId",
            "type": "string",
            "required": true,
            "description": "Identificador estável do comentário persistido no histórico de acompanhamento.",
            "ofEntity": "Comentario",
            "fieldRef": "Comentario.comentarioId",
            "item": {
              "fields": []
            }
          }
        ],
        "output": [
          {
            "name": "comentarioId",
            "type": "string",
            "required": true,
            "ofEntity": "Comentario"
          },
          {
            "name": "chamadoId",
            "type": "string",
            "required": true,
            "ofEntity": "Comentario"
          },
          {
            "name": "atendenteId",
            "type": "string",
            "required": true,
            "ofEntity": "Comentario"
          },
          {
            "name": "conteudo",
            "type": "string",
            "required": true,
            "ofEntity": "Comentario"
          }
        ],
        "ports": [
          "Comentario"
        ],
        "rulesApplied": [],
        "transactional": false,
        "steps": [
          "Load the Comentario aggregate through the Comentario port using comentarioId.",
          "Return comentarioId, chamadoId, atendenteId, and conteudo with the declared output shape."
        ],
        "outputShape": {
          "kind": "object",
          "fields": [
            {
              "name": "comentarioId",
              "type": "string",
              "required": true,
              "fieldRef": "Comentario.comentarioId"
            },
            {
              "name": "chamadoId",
              "type": "string",
              "required": true,
              "fieldRef": "Comentario.chamadoId"
            },
            {
              "name": "atendenteId",
              "type": "string",
              "required": true,
              "fieldRef": "Comentario.atendenteId"
            },
            {
              "name": "conteudo",
              "type": "string",
              "required": true,
              "fieldRef": "Comentario.conteudo"
            }
          ]
        }
      }
    ],
    "mdmRefs": []
  }
} as const;

export default getComentarioUsecase;

export const pipeline = [
  {
    "id": "getComentario__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/getComentario.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/getComentario.defs.ts",
    "dependsFiles": [
      "_102039_/l1/controleChamados/layer_2_application/ports/comentarioRepository.d.ts",
      "_102039_/l1/controleChamados/layer_3_domain/entities/comentario.d.ts"
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
