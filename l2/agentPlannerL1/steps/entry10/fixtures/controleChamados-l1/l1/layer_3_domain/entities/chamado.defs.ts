/// <mls fileReference="_102039_/l1/controleChamados/layer_3_domain/entities/chamado.defs.ts" enhancement="_blank"/>

export const chamadoDomainEntity = {
  "schemaVersion": "2026-06-26",
  "artifactType": "domainEntity",
  "artifactId": "Chamado",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbDomainEntity",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "entityId": "Chamado",
    "title": "Chamado",
    "fields": [
      {
        "fieldId": "chamadoId",
        "title": "Identificador do chamado",
        "type": "uuid",
        "required": true,
        "description": "Identificador estável do chamado, transportado entre as etapas de acompanhamento.",
        "constraints": [
          {
            "constraintId": "uniqueChamadoId",
            "kind": "unique",
            "value": "true",
            "description": "Cada chamado possui um identificador estável exclusivo.",
            "source": "inferred"
          }
        ]
      },
      {
        "fieldId": "titulo",
        "title": "Título",
        "type": "string",
        "required": true,
        "description": "Resumo do assunto ou solicitação de atendimento registrada no chamado.",
        "constraints": []
      },
      {
        "fieldId": "descricao",
        "title": "Descrição",
        "type": "text",
        "required": true,
        "description": "Detalhamento da solicitação de atendimento registrada no chamado.",
        "constraints": []
      },
      {
        "fieldId": "status",
        "title": "Status",
        "type": "string",
        "required": true,
        "description": "Situação atual do acompanhamento do chamado.",
        "constraints": [
          {
            "constraintId": "statusEnum",
            "kind": "enum",
            "value": "[\"open\",\"closed\"]",
            "description": "Status permitidos para o ciclo de atendimento do chamado.",
            "source": "journey"
          }
        ],
        "enum": [
          "open",
          "closed"
        ]
      }
    ],
    "valueObjects": [],
    "statusEnum": [
      "open",
      "closed"
    ],
    "lifecycle": {
      "workflowId": "chamadoLifecycle",
      "entityRef": "Chamado",
      "states": [
        "closed",
        "open"
      ],
      "initialState": "open",
      "terminalStates": [
        "closed"
      ],
      "allowed": {
        "closed": [],
        "open": [
          "closed"
        ]
      }
    },
    "invariants": [
      "O chamadoId deve ser único entre todos os chamados."
    ]
  }
} as const;

export default chamadoDomainEntity;

export const pipeline = [
  {
    "id": "chamado__domainEntity",
    "type": "domainEntity",
    "outputPath": "_102039_/l1/controleChamados/layer_3_domain/entities/chamado.ts",
    "defPath": "_102039_/l1/controleChamados/layer_3_domain/entities/chamado.defs.ts",
    "dependsFiles": [],
    "dependsOn": [],
    "skills": [
      "_102021_/l2/agentChangeBackend/skills/architecture.md",
      "_102021_/l2/agentChangeBackend/skills/domainEntity.md",
      "_102034_.d.ts"
    ],
    "agent": "agentCbMaterialize"
  }
] as const;
