/// <mls fileReference="_102047_/l4/agendaClinica/journeys/cadastrarPaciente.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const cadastrarPacienteJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cadastrarPaciente",
  "business": {
    "actorRef": "recepcionista",
    "title": "Cadastrar paciente",
    "goal": "Registrar um novo paciente para viabilizar seus atendimentos na clínica.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "informarDadosPaciente",
        "kind": "act",
        "entity": "Paciente",
        "effect": "create",
        "title": "Informar dados do paciente",
        "description": "A recepcionista registra os dados cadastrais do paciente, criando ou vinculando seu registro mestre."
      }
    ],
    "outcome": {
      "statement": "O paciente fica cadastrado e disponível para agendamento.",
      "evidence": [
        "O cadastro do paciente pode ser localizado pelo nome ou documento.",
        "O paciente aparece como opção ao criar uma consulta."
      ]
    }
  },
  "businessHash": "sha256:8a98aa265e434056dd1941591632096ba08331b0b14a316b6d55f71af7c0aa1f"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CadastrarPacienteJourneyType = typeof cadastrarPacienteJourney;

export default cadastrarPacienteJourney;
