/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/registerComentario.defs.ts" enhancement="_blank"/>

export const registerComentarioUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "registerComentario",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "registerComentario",
    "ports": [
      "Comentario",
      "Chamado"
    ],
    "rulesApplied": [
      "comentariosPermitidosSomenteEmChamadosAbertos"
    ],
    "functions": [
      {
        "functionName": "registerComentario",
        "inputTypeName": "RegisterComentarioInput",
        "outputTypeName": "RegisterComentarioOutput",
        "input": [
          {
            "name": "atendenteId",
            "type": "string",
            "required": true,
            "description": "Atendente selecionado para registrar o comentário.",
            "ofEntity": "Atendente",
            "fieldRef": "Atendente.atendenteId",
            "item": {
              "fields": []
            }
          },
          {
            "name": "chamadoId",
            "type": "string",
            "required": true,
            "description": "Chamado identificado pela rota.",
            "ofEntity": "Chamado",
            "fieldRef": "Chamado.chamadoId",
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
          "Resolve o Atendente por atendenteId usando ctx.mdm.entity.get({ mdmId: atendenteId }); não cria port para MDM.",
          "Carrega o Chamado por chamadoId através do port Chamado.",
          "Aplica a regra comentariosPermitidosSomenteEmChamadosAbertos: se o Chamado não tiver status open, rejeita com erro em inglês contendo o identificador da regra.",
          "Cria o Comentario com comentarioId gerado pelo mecanismo de domínio/port e os campos chamadoId, atendenteId e conteudo; persiste pelo port Comentario dentro da transação.",
          "Retorna comentarioId, chamadoId, atendenteId e conteudo do comentário persistido."
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

export default registerComentarioUsecase;

export const pipeline = [
  {
    "id": "registerComentario__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/registerComentario.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/registerComentario.defs.ts",
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
