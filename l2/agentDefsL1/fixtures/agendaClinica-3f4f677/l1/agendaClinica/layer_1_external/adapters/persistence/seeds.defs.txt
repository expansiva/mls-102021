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
          "ref:pacienteId:Paciente",
          "ref:profissionalId:Profissional",
          "state:scheduled",
          "uniqueKeys:profissionalId+scheduledAt"
        ],
        "refs": [
          {
            "field": "pacienteId",
            "relationshipId": "consultaPaciente",
            "entityId": "Paciente"
          },
          {
            "field": "profissionalId",
            "relationshipId": "consultaProfissional",
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
        "scenarioId": "confirmarConsultaPorTelefone",
        "tableId": "consulta",
        "source": "journey:confirmarConsultaPorTelefone",
        "constraints": [
          "ref:pacienteId:Paciente",
          "ref:profissionalId:Profissional",
          "uniqueKeys:profissionalId+scheduledAt"
        ],
        "refs": [
          {
            "field": "pacienteId",
            "relationshipId": "consultaPaciente",
            "entityId": "Paciente"
          },
          {
            "field": "profissionalId",
            "relationshipId": "consultaProfissional",
            "entityId": "Profissional"
          }
        ],
        "states": [],
        "entityId": "Consulta",
        "stateField": "status"
      },
      {
        "scenarioId": "consultarAgendaDiaria",
        "tableId": "consulta",
        "source": "journey:consultarAgendaDiaria",
        "constraints": [
          "ref:pacienteId:Paciente",
          "ref:profissionalId:Profissional",
          "uniqueKeys:profissionalId+scheduledAt"
        ],
        "refs": [
          {
            "field": "pacienteId",
            "relationshipId": "consultaPaciente",
            "entityId": "Paciente"
          },
          {
            "field": "profissionalId",
            "relationshipId": "consultaProfissional",
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
          "ref:pacienteId:Paciente",
          "ref:profissionalId:Profissional",
          "state:attended",
          "uniqueKeys:profissionalId+scheduledAt"
        ],
        "refs": [
          {
            "field": "pacienteId",
            "relationshipId": "consultaPaciente",
            "entityId": "Paciente"
          },
          {
            "field": "profissionalId",
            "relationshipId": "consultaProfissional",
            "entityId": "Profissional"
          }
        ],
        "states": [
          "attended"
        ],
        "entityId": "Consulta",
        "stateField": "status"
      },
      {
        "scenarioId": "registrarFalta",
        "tableId": "consulta",
        "source": "journey:registrarFalta",
        "constraints": [
          "ref:pacienteId:Paciente",
          "ref:profissionalId:Profissional",
          "state:noShow",
          "uniqueKeys:profissionalId+scheduledAt"
        ],
        "refs": [
          {
            "field": "pacienteId",
            "relationshipId": "consultaPaciente",
            "entityId": "Paciente"
          },
          {
            "field": "profissionalId",
            "relationshipId": "consultaProfissional",
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
      }
    ],
    "datasets": [
      {
        "datasetId": "consulta",
        "tableId": "consulta",
        "owners": [
          "agendarConsulta",
          "confirmarConsultaPorTelefone",
          "consultarAgendaDiaria",
          "registrarAtendimento",
          "registrarFalta"
        ]
      }
    ]
  }
} as const;

export default definition;
