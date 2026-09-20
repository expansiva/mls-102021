/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/createComentario.defs.ts" enhancement="_blank"/>

export const createComentarioUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "createComentario",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "createComentario",
    "ports": [
      "Comentario",
      "Chamado"
    ],
    "rulesApplied": [
      "comentariosPermitidosSomenteEmChamadosAbertos"
    ],
    "functions": [
      {
        "functionName": "createComentario",
        "inputTypeName": "CreateComentarioInput",
        "outputTypeName": "CreateComentarioOutput",
        "input": [
          {
            "name": "chamadoId",
            "type": "string",
            "required": true,
            "description": "Selected open ticket to which the comment belongs.",
            "ofEntity": "Comentario",
            "fieldRef": "Comentario.chamadoId",
            "item": {
              "fields": []
            }
          },
          {
            "name": "atendenteId",
            "type": "string",
            "required": true,
            "description": "Authenticated attendant responsible for recording the comment.",
            "ofEntity": "Comentario",
            "fieldRef": "Comentario.atendenteId",
            "item": {
              "fields": []
            }
          },
          {
            "name": "conteudo",
            "type": "string",
            "required": true,
            "description": "Follow-up text written by the attendant for the ticket.",
            "ofEntity": "Comentario",
            "fieldRef": "Comentario.conteudo",
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
          "Comentario",
          "Chamado"
        ],
        "rulesApplied": [
          "comentariosPermitidosSomenteEmChamadosAbertos"
        ],
        "transactional": true,
        "steps": [
          "Resolve the selected Chamado through the Chamado port.",
          "Validate that the Chamado exists; this is required by the referenced rule and the relationship field constraint.",
          "Validate that Chamado.status is open; otherwise reject with rule id comentariosPermitidosSomenteEmChamadosAbertos and an English user-facing message.",
          "Create a Comentario with a generated comentarioId and the supplied chamadoId, atendenteId, and conteudo through the Comentario port.",
          "Return comentarioId, chamadoId, atendenteId, and conteudo from the created comment."
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
    "mdmRefs": [
      "Atendente"
    ]
  }
} as const;

export default createComentarioUsecase;

export const pipeline = [
  {
    "id": "createComentario__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/createComentario.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/createComentario.defs.ts",
    "dependsFiles": [
      "_102039_/l1/controleChamados/layer_2_application/ports/comentarioRepository.d.ts",
      "_102039_/l1/controleChamados/layer_2_application/ports/chamadoRepository.d.ts",
      "_102039_/l1/controleChamados/layer_3_domain/entities/comentario.d.ts",
      "_102039_/l1/controleChamados/layer_3_domain/entities/chamado.d.ts"
    ],
    "dependsOn": [],
    "skills": [
      "_102021_/l2/agentChangeBackend/skills/architecture.md",
      "_102021_/l2/agentChangeBackend/skills/applicationUsecase.md",
      "_102034_.d.ts"
    ],
    "rulesApplied": [
      "comentariosPermitidosSomenteEmChamadosAbertos"
    ],
    "agent": "agentCbMaterialize"
  }
] as const;
