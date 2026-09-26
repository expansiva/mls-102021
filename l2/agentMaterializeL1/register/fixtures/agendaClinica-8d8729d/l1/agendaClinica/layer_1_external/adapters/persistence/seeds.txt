/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/seeds.ts" enhancement="_blank"/>
import type { TableSeedRows } from '/_102034_/l1/server/layer_1_external/persistence/contracts.js';

export const seedPlan = {
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
  ]
} as const;

export function applicableSeeds(mode: string): TableSeedRows[] {
  if (mode !== 'development' && mode !== 'presentation') return [];
  return [];
}
