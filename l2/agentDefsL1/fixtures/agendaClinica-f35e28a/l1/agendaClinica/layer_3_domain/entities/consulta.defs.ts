/// <mls fileReference="_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "domainEntity",
  "artifactId": "Consulta",
  "moduleName": "agendaClinica",
  "data": {
    "entityId": "Consulta",
    "storageTarget": "moduleDatabase",
    "fields": [
      {
        "name": "id",
        "type": "uuid",
        "derived": true
      },
      {
        "name": "version",
        "type": "integer",
        "derived": true
      },
      {
        "name": "patientId",
        "type": "record",
        "ref": "Paciente"
      },
      {
        "name": "professionalId",
        "type": "record",
        "ref": "Profissional"
      },
      {
        "name": "scheduledAt",
        "type": "timestamp"
      },
      {
        "name": "status",
        "type": "enum"
      },
      {
        "name": "details",
        "type": "object"
      },
      {
        "name": "details.attendanceNote",
        "type": "text"
      }
    ],
    "lifecycle": {
      "states": [
        {
          "state": "scheduled",
          "reachedBy": "actor"
        },
        {
          "state": "confirmed",
          "reachedBy": "actor"
        },
        {
          "state": "noShow",
          "reachedBy": "actor"
        },
        {
          "state": "attended",
          "reachedBy": "actor"
        }
      ],
      "transitions": [
        {
          "transitionId": "confirmarConsulta",
          "from": [
            "scheduled"
          ],
          "to": "confirmed",
          "by": [
            "recepcionista"
          ],
          "ruleRefs": [
            "consultationTransitionFlow"
          ]
        },
        {
          "transitionId": "registrarFalta",
          "from": [
            "scheduled",
            "confirmed"
          ],
          "to": "noShow",
          "by": [
            "recepcionista"
          ],
          "ruleRefs": [
            "consultationTransitionFlow"
          ]
        },
        {
          "transitionId": "registrarAtendimento",
          "from": [
            "scheduled",
            "confirmed"
          ],
          "to": "attended",
          "by": [
            "profissional"
          ],
          "ruleRefs": [
            "consultationTransitionFlow",
            "attendanceNoteRequired",
            "professionalOwnAppointment"
          ]
        }
      ]
    },
    "invariants": [
      "uniqueProfessionalSchedule",
      "consultationTransitionFlow"
    ],
    "imports": []
  }
} as const;

export default definition;

export const pipeline = [
  {
    "id": "102047/agendaClinica/domainEntity/Consulta",
    "type": "domainEntity",
    "defPath": "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_3_domain/entities/paciente.defs.ts",
      "_102047_/l1/agendaClinica/layer_3_domain/entities/profissional.defs.ts"
    ],
    "dependsOn": [
      "102047/agendaClinica/domainEntity/Paciente",
      "102047/agendaClinica/domainEntity/Profissional"
    ],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/domainEntity.md"
    ]
  }
] as const;
