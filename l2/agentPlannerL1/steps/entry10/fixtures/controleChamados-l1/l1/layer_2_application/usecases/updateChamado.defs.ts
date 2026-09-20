/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/updateChamado.defs.ts" enhancement="_blank"/>

export const updateChamadoUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "updateChamado",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "updateChamado",
    "ports": [
      "Chamado"
    ],
    "rulesApplied": [
      "fechamentoExigeChamadoAberto",
      "chamadoFechadoNaoPodeSerReaberto"
    ],
    "functions": [
      {
        "functionName": "updateChamado",
        "inputTypeName": "UpdateChamadoInput",
        "outputTypeName": "UpdateChamadoOutput",
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
          },
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
        "rulesApplied": [
          "fechamentoExigeChamadoAberto",
          "chamadoFechadoNaoPodeSerReaberto"
        ],
        "transactional": true,
        "steps": [
          "Use the Chamado port to load the existing Chamado by chamadoId inside the ctx.data transaction wrapper.",
          "Resolve status from the server-side systemDefault/current status rather than accepting it as public input.",
          "If the requested transition closes the Chamado, require the current status to be open and include rule id fechamentoExigeChamadoAberto in the validation error details when blocked.",
          "Call the domain canTransition helper using the declared chamadoLifecycle matrix; do not add a stricter local transition allow-list.",
          "If the existing Chamado is closed, reject any transition to open with rule id chamadoFechadoNaoPodeSerReaberto in the validation error details.",
          "Apply titulo and descricao, preserve the resolved status, save the Chamado through its port, and return the canonical output shape."
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

export default updateChamadoUsecase;

export const pipeline = [
  {
    "id": "updateChamado__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/updateChamado.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/updateChamado.defs.ts",
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
    "rulesApplied": [
      "fechamentoExigeChamadoAberto",
      "chamadoFechadoNaoPodeSerReaberto"
    ],
    "agent": "agentCbMaterialize"
  }
] as const;
