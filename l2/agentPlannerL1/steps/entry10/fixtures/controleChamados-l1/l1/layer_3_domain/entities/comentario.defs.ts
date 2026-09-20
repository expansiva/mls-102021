/// <mls fileReference="_102039_/l1/controleChamados/layer_3_domain/entities/comentario.defs.ts" enhancement="_blank"/>

export const comentarioDomainEntity = {
  "schemaVersion": "2026-06-26",
  "artifactType": "domainEntity",
  "artifactId": "Comentario",
  "moduleName": "controleChamados",
  "status": "draft",
  "source": {
    "agentName": "agentCbDomainEntity",
    "stepId": 0,
    "planId": ""
  },
  "data": {
    "entityId": "Comentario",
    "title": "Comentário",
    "fields": [
      {
        "fieldId": "comentarioId",
        "title": "Identificador do comentário",
        "type": "uuid",
        "required": true,
        "description": "Identificador estável do comentário persistido no histórico de acompanhamento.",
        "constraints": [
          {
            "constraintId": "uniqueComentarioId",
            "kind": "unique",
            "value": "true",
            "description": "Cada comentário possui um identificador estável e exclusivo.",
            "source": "inferred"
          }
        ]
      },
      {
        "fieldId": "chamadoId",
        "title": "Chamado",
        "type": "uuid",
        "required": true,
        "description": "Chamado aberto selecionado ao qual o comentário pertence.",
        "constraints": []
      },
      {
        "fieldId": "atendenteId",
        "title": "Atendente que registrou",
        "type": "uuid",
        "required": true,
        "description": "Atendente autenticado identificado como responsável pelo registro do comentário.",
        "constraints": []
      },
      {
        "fieldId": "conteudo",
        "title": "Comentário",
        "type": "text",
        "required": true,
        "description": "Texto de acompanhamento escrito pelo atendente para o chamado.",
        "constraints": [
          {
            "constraintId": "conteudoMinLength",
            "kind": "minLength",
            "value": "1",
            "description": "O comentário deve conter texto.",
            "source": "journey"
          }
        ]
      }
    ],
    "valueObjects": [],
    "statusEnum": [],
    "invariants": [
      "comentarioId deve ser único e estável para cada comentário persistido.",
      "conteudo deve conter pelo menos 1 caractere.",
      "O comentário só pode ser registrado para um chamado com status aberto."
    ]
  }
} as const;

export default comentarioDomainEntity;

export const pipeline = [
  {
    "id": "comentario__domainEntity",
    "type": "domainEntity",
    "outputPath": "_102039_/l1/controleChamados/layer_3_domain/entities/comentario.ts",
    "defPath": "_102039_/l1/controleChamados/layer_3_domain/entities/comentario.defs.ts",
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
