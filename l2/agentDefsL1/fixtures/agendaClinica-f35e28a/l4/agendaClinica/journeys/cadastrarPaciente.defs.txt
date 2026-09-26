/// <mls fileReference="_102047_/l4/agendaClinica/journeys/cadastrarPaciente.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const cadastrarPacienteJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cadastrarPaciente",
  "business": {
    "actorRef": "recepcionista",
    "title": "Cadastrar paciente",
    "goal": "Registrar ou associar o paciente à clínica para que possa receber consultas.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "localizarPaciente",
        "kind": "locate",
        "entity": "Paciente",
        "title": "x",
        "description": "Busca o paciente pelos dados disponíveis para evitar um cadastro duplicado."
      },
      {
        "stepId": "registrarPaciente",
        "kind": "act",
        "entity": "Paciente",
        "effect": "create",
        "title": "x",
        "description": "Cadastra ou associa o paciente encontrado à clínica, mantendo seus dados cadastrais atualizados."
      }
    ],
    "outcome": {
      "statement": "O paciente fica disponível na agenda da clínica.",
      "evidence": [
        "Cadastro do paciente localizado ou criado e associado à clínica."
      ]
    }
  },
  "businessHash": "sha256:5eb5e8ae725c989c7e48287ea2c80d60e51e59fd834cc2b1228ad6784bcbd2db"
} as const satisfies Ns5JourneyArtifact;

export type CadastrarPacienteJourneyType = typeof cadastrarPacienteJourney;

export default cadastrarPacienteJourney;
