/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/deleteComentario.defs.ts" enhancement="_blank"/>

export const deleteComentarioUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "deleteComentario",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "deleteComentario",
    "ports": [
      "Comentario"
    ],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "deleteComentario",
        "inputTypeName": "DeleteComentarioInput",
        "outputTypeName": "DeleteComentarioOutput",
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
        "transactional": true,
        "steps": [
          "Execute within the transaction wrapper provided by ctx.data.",
          "Resolve the Comentario repository port and load the comment by comentarioId.",
          "Delete the persisted comment through the Comentario port.",
          "Return the deleted comment projection with comentarioId, chamadoId, atendenteId, and conteudo."
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

export default deleteComentarioUsecase;

export const pipeline = [
  {
    "id": "deleteComentario__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/deleteComentario.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/deleteComentario.defs.ts",
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
