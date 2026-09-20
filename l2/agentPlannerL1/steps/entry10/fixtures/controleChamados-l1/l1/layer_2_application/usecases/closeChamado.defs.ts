/// <mls fileReference="_102039_/l1/controleChamados/layer_2_application/usecases/closeChamado.defs.ts" enhancement="_blank"/>

export const closeChamadoUsecase = {
  "schemaVersion": "2026-06-26",
  "artifactType": "usecase",
  "artifactId": "closeChamado",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbUsecase",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "usecaseId": "closeChamado",
    "ports": [
      "Chamado"
    ],
    "rulesApplied": [
      "fechamentoExigeChamadoAberto"
    ],
    "functions": [
      {
        "functionName": "closeChamado",
        "inputTypeName": "CloseChamadoInput",
        "outputTypeName": "CloseChamadoOutput",
        "input": [
          {
            "name": "chamadoId",
            "type": "string",
            "required": true,
            "description": "Chamado identifier from the route parameter.",
            "ofEntity": "Chamado",
            "fieldRef": "Chamado.chamadoId",
            "item": {
              "fields": []
            }
          },
          {
            "name": "status",
            "type": "string",
            "required": true,
            "description": "Decision taken; the contract restricts this value to the enum value closed (enumValues: [\"closed\"]).",
            "ofEntity": "Chamado",
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
        "rulesApplied": [
          "fechamentoExigeChamadoAberto"
        ],
        "transactional": true,
        "steps": [
          "Load Chamado by chamadoId through the Chamado port inside the transaction.",
          "Validate the requested status is closed, as required by the L4 enum constraint [\"closed\"].",
          "Apply the domain canTransition helper using the declared chamadoLifecycle matrix; do not add a stricter local transition allow-list.",
          "Apply rule fechamentoExigeChamadoAberto: reject with an English AppError whose details include ruleId fechamentoExigeChamadoAberto when the loaded Chamado status is not open.",
          "Set the Chamado status to closed and save the aggregate through the Chamado port.",
          "Return chamadoId, titulo, descricao, and the resulting status from the saved Chamado."
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

export default closeChamadoUsecase;

export const pipeline = [
  {
    "id": "closeChamado__applicationUsecase",
    "type": "applicationUsecase",
    "outputPath": "_102039_/l1/controleChamados/layer_2_application/usecases/closeChamado.ts",
    "defPath": "_102039_/l1/controleChamados/layer_2_application/usecases/closeChamado.defs.ts",
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
      "fechamentoExigeChamadoAberto"
    ],
    "agent": "agentCbMaterialize"
  }
] as const;
