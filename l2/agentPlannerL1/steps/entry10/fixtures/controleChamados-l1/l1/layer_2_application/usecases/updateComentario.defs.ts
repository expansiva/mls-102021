/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/updateComentario.defs.ts" enhancement="_blank"/>

export const updateComentarioUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "updateComentario",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "updateComentario",
    "ports": [
      "Comentario",
      "Chamado"
    ],
    "rulesApplied": [
      "comentariosPermitidosSomenteEmChamadosAbertos"
    ],
    "functions": [
      {
        "functionName": "updateComentario",
        "inputTypeName": "UpdateComentarioInput",
        "outputTypeName": "ComentarioOutput",
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
          },
          {
            "name": "chamadoId",
            "type": "string",
            "required": true,
            "description": "Chamado aberto selecionado ao qual o comentário pertence.",
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
            "description": "Atendente autenticado identificado como responsável pelo registro do comentário.",
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
            "description": "Texto de acompanhamento escrito pelo atendente para o chamado.",
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
          "Within the transaction wrapper provided by ctx.data, load the Comentario aggregate through the Comentario port using comentarioId.",
          "Load the Chamado through the Chamado port using chamadoId and verify that its status is open; otherwise reject with an English AppError containing rule id comentariosPermitidosSomenteEmChamadosAbertos.",
          "Resolve the Atendente master-data reference by id through ctx.mdm.entity.get({ mdmId: atendenteId }); do not create a port for Atendente.",
          "Apply the requested selected-entity values and user-provided conteudo to the Comentario aggregate, preserving its identity and required relationships.",
          "Save the updated Comentario through its port in the same transaction and return exactly comentarioId, chamadoId, atendenteId, and conteudo."
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

export default updateComentarioUsecase;

export const pipeline = [
  {
    "id": "updateComentario__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/updateComentario.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/updateComentario.defs.ts",
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
