/// <mls fileReference="_102047_/l1/tarefas/layer_2_application/scope/accessScope.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "accessScope",
  "artifactId": "accessScope",
  "moduleName": "tarefas",
  "status": "pending",
  "dependencies": [],
  "data": {
    "scopeId": "accessScope",
    "grants": [
      {
        "grantId": "gestorListas",
        "actorRef": "gestor",
        "entityRefs": [
          "ListaTarefas"
        ],
        "disclosure": "fullRecord",
        "scopeMode": "organization",
        "session": "verified",
        "path": [
          {
            "entityId": "ListaTarefas",
            "steps": [],
            "pending": ""
          }
        ],
        "pending": ""
      },
      {
        "grantId": "gestorParticipantes",
        "actorRef": "gestor",
        "entityRefs": [
          "Participante"
        ],
        "disclosure": "fieldsOnly",
        "allowedFields": [
          "Participante.details.identification",
          "Participante.details.tarefas"
        ],
        "scopeMode": "organization",
        "session": "verified",
        "path": [
          {
            "entityId": "Participante",
            "steps": [],
            "pending": ""
          }
        ],
        "pending": ""
      },
      {
        "grantId": "gestorTodasTarefas",
        "actorRef": "gestor",
        "entityRefs": [
          "Tarefa",
          "ItemChecklist"
        ],
        "disclosure": "fullRecord",
        "scopeMode": "organization",
        "session": "verified",
        "path": [
          {
            "entityId": "Tarefa",
            "steps": [],
            "pending": ""
          },
          {
            "entityId": "ItemChecklist",
            "steps": [],
            "pending": ""
          }
        ],
        "pending": ""
      },
      {
        "grantId": "membroChecklistPropria",
        "actorRef": "membroEquipe",
        "anchorEntity": "Participante",
        "entityRefs": [
          "ItemChecklist"
        ],
        "disclosure": "fullRecord",
        "scopeMode": "own",
        "session": "verified",
        "path": [
          {
            "entityId": "ItemChecklist",
            "steps": [],
            "pending": "ANCHOR_UNRESOLVED"
          }
        ],
        "pending": "ACCESS_ANCHOR"
      },
      {
        "grantId": "membroConsultarListas",
        "actorRef": "membroEquipe",
        "entityRefs": [
          "ListaTarefas"
        ],
        "disclosure": "fullRecord",
        "scopeMode": "organization",
        "session": "verified",
        "path": [
          {
            "entityId": "ListaTarefas",
            "steps": [],
            "pending": ""
          }
        ],
        "pending": ""
      },
      {
        "grantId": "membroEscolherResponsavel",
        "actorRef": "membroEquipe",
        "entityRefs": [
          "Participante"
        ],
        "disclosure": "fieldsOnly",
        "allowedFields": [
          "Participante.details.identification.name",
          "Participante.details.identification.status",
          "Participante.details.tarefas.aceitaTarefasEfetivo",
          "Participante.details.tarefas.podeCriarTarefasEfetivo"
        ],
        "scopeMode": "organization",
        "session": "verified",
        "path": [
          {
            "entityId": "Participante",
            "steps": [],
            "pending": ""
          }
        ],
        "pending": ""
      },
      {
        "grantId": "membroTarefasProprias",
        "actorRef": "membroEquipe",
        "anchorEntity": "Participante",
        "entityRefs": [
          "Tarefa"
        ],
        "disclosure": "fullRecord",
        "scopeMode": "own",
        "session": "verified",
        "path": [
          {
            "entityId": "Tarefa",
            "steps": [
              {
                "relationshipId": "tarefaCriador",
                "from": "Tarefa",
                "to": "Participante",
                "field": "Tarefa.criadorId"
              }
            ],
            "pending": ""
          }
        ],
        "pending": "ACCESS_ANCHOR"
      }
    ]
  }
} as const;

export default definition;
