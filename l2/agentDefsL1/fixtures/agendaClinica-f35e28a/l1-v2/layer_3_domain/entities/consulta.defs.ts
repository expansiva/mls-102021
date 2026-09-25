/// <mls fileReference="_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "domainEntity",
  "artifactId": "Consulta",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_3_domain/entities/paciente.defs.ts",
    "_102047_/l1/agendaClinica/layer_3_domain/entities/profissional.defs.ts"
  ],
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
