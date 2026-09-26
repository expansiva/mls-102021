/// <mls fileReference="_102047_/l4/agendaClinica/journeys/cadastrarPaciente.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const cadastrarPacienteJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cadastrarPaciente",
  "business": {
    "actorRef": "recepcionista",
    "title": "Cadastrar paciente",
    "goal": "Registrar um paciente para viabilizar seus agendamentos na clínica.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "registrarPaciente",
        "kind": "act",
        "entity": "Paciente",
        "effect": "create",
        "title": "x",
        "description": "Cadastra ou vincula o registro mestre do paciente e registra os dados específicos necessários à clínica."
      }
    ],
    "outcome": {
      "statement": "O paciente fica disponível para agendamento na clínica.",
      "evidence": [
        "Registro do paciente disponível para consulta e seleção ao agendar uma consulta."
      ]
    }
  },
  "businessHash": "sha256:1e88d83d4117c2cc29fc6e46e92ef6f50e8846ed46c0fce1b23a8a1565f49ce0"
} as const satisfies Ns5JourneyArtifact;

export type CadastrarPacienteJourneyType = typeof cadastrarPacienteJourney;

export default cadastrarPacienteJourney;
