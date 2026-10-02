/// <mls fileReference="_102047_/l4/agendaClinica/journeys/registrarFalta.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const registrarFaltaJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "registrarFalta",
  "business": {
    "actorRef": "recepcionista",
    "title": "Registrar falta",
    "goal": "Registrar que o paciente não compareceu à consulta.",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "localizarConsultaDoPaciente",
        "kind": "locate",
        "entity": "Consulta",
        "title": "Localizar consulta do paciente",
        "description": "A recepcionista abre a consulta em contexto ou a localiza na agenda."
      },
      {
        "stepId": "conferirConsultaAgendada",
        "kind": "inspect",
        "entity": "Consulta",
        "title": "Conferir consulta agendada",
        "description": "A recepcionista confere o paciente, o profissional e o horário da consulta."
      },
      {
        "stepId": "marcarFaltaPaciente",
        "kind": "act",
        "entity": "Consulta",
        "effect": "transition",
        "transitionRef": "registrarFalta",
        "title": "Marcar falta do paciente",
        "description": "A recepcionista registra que o paciente não compareceu ao atendimento."
      }
    ],
    "outcome": {
      "statement": "A consulta fica registrada como falta do paciente.",
      "evidence": [
        "O status da consulta indica falta.",
        "A consulta permanece visível no histórico de atendimentos do paciente."
      ]
    }
  },
  "businessHash": "sha256:3f3671fbde1fea60867cd9c4a752f83e871e0d114abded767478a7bfcb84077a"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RegistrarFaltaJourneyType = typeof registrarFaltaJourney;

export default registrarFaltaJourney;
