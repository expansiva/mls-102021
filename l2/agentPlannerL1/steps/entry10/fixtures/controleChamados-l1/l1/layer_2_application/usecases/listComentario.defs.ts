/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/listComentario.defs.ts" enhancement="_blank"/>

export const listComentarioUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "listComentario",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "listComentario",
    "ports": [
      "Comentario"
    ],
    "rulesApplied": [],
    "functions": [
      {
        "functionName": "listComentario",
        "inputTypeName": "ListComentarioInput",
        "outputTypeName": "ListComentarioOutput",
        "input": [],
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
          "Load all Comentario records through the Comentario port.",
          "Return the selected comentarioId, chamadoId, atendenteId, and conteudo fields as the list projection."
        ],
        "outputShape": {
          "kind": "list",
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

export default listComentarioUsecase;

export const pipeline = [
  {
    "id": "listComentario__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/listComentario.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/listComentario.defs.ts",
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
