/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/seeds.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "persistenceSeeds",
  "artifactId": "seeds",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/consulta.defs.ts"
  ],
  "data": {
    "seedId": "seeds",
    "phase": "plan",
    "scenarios": [
      {
        "scenarioId": "agendarConsulta",
        "tableId": "consulta",
        "source": "journey:agendarConsulta",
        "constraints": [
          "ref:patientId:Paciente",
          "ref:professionalId:Profissional",
          "state:scheduled",
          "uniqueKeys:professionalId+scheduledAt"
        ],
        "refs": [
          {
            "field": "patientId",
            "relationshipId": "appointmentPatient",
            "entityId": "Paciente"
          },
          {
            "field": "professionalId",
            "relationshipId": "appointmentProfessional",
            "entityId": "Profissional"
          }
        ],
        "states": [
          "scheduled"
        ],
        "entityId": "Consulta",
        "stateField": "status"
      },
      {
        "scenarioId": "confirmarConsulta",
        "tableId": "consulta",
        "source": "journey:confirmarConsulta",
        "constraints": [
          "ref:patientId:Paciente",
          "ref:professionalId:Profissional",
          "state:confirmed",
          "uniqueKeys:professionalId+scheduledAt"
        ],
        "refs": [
          {
            "field": "patientId",
            "relationshipId": "appointmentPatient",
            "entityId": "Paciente"
          },
          {
            "field": "professionalId",
            "relationshipId": "appointmentProfessional",
            "entityId": "Profissional"
          }
        ],
        "states": [
          "confirmed"
        ],
        "entityId": "Consulta",
        "stateField": "status"
      },
      {
        "scenarioId": "consultarAgendaDiaria",
        "tableId": "consulta",
        "source": "journey:consultarAgendaDiaria",
        "constraints": [
          "ref:patientId:Paciente",
          "ref:professionalId:Profissional",
          "uniqueKeys:professionalId+scheduledAt"
        ],
        "refs": [
          {
            "field": "patientId",
            "relationshipId": "appointmentPatient",
            "entityId": "Paciente"
          },
          {
            "field": "professionalId",
            "relationshipId": "appointmentProfessional",
            "entityId": "Profissional"
          }
        ],
        "states": [],
        "entityId": "Consulta",
        "stateField": "status"
      },
      {
        "scenarioId": "registrarAtendimento",
        "tableId": "consulta",
        "source": "journey:registrarAtendimento",
        "constraints": [
          "noteRequired:details.attendanceNote:attended",
          "ref:patientId:Paciente",
          "ref:professionalId:Profissional",
          "state:attended",
          "uniqueKeys:professionalId+scheduledAt"
        ],
        "refs": [
          {
            "field": "patientId",
            "relationshipId": "appointmentPatient",
            "entityId": "Paciente"
          },
          {
            "field": "professionalId",
            "relationshipId": "appointmentProfessional",
            "entityId": "Profissional"
          }
        ],
        "states": [
          "attended"
        ],
        "entityId": "Consulta",
        "stateField": "status",
        "requires": [
          "details.attendanceNote"
        ]
      },
      {
        "scenarioId": "registrarFalta",
        "tableId": "consulta",
        "source": "journey:registrarFalta",
        "constraints": [
          "ref:patientId:Paciente",
          "ref:professionalId:Profissional",
          "state:noShow",
          "uniqueKeys:professionalId+scheduledAt"
        ],
        "refs": [
          {
            "field": "patientId",
            "relationshipId": "appointmentPatient",
            "entityId": "Paciente"
          },
          {
            "field": "professionalId",
            "relationshipId": "appointmentProfessional",
            "entityId": "Profissional"
          }
        ],
        "states": [
          "noShow"
        ],
        "entityId": "Consulta",
        "stateField": "status"
      }
    ],
    "dependencies": [
      {
        "entityId": "Consulta",
        "kind": "module",
        "seeded": false
      },
      {
        "entityId": "ContatoPaciente",
        "kind": "mdm",
        "seeded": false
      },
      {
        "entityId": "Paciente",
        "kind": "mdm",
        "seeded": false
      },
      {
        "entityId": "Profissional",
        "kind": "mdm",
        "seeded": false
      },
      {
        "entityId": "Recepcionista",
        "kind": "mdm",
        "seeded": false
      }
    ],
    "datasets": [
      {
        "datasetId": "consulta",
        "tableId": "consulta",
        "owners": [
          "agendarConsulta",
          "confirmarConsulta",
          "consultarAgendaDiaria",
          "registrarAtendimento",
          "registrarFalta"
        ]
      }
    ]
  }
} as const;

export default definition;
