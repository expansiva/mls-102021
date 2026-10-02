/// <mls fileReference="_102047_/l4/agendaClinica/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agendaClinicaJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "agendaClinica",
  "journeys": [
    {
      "journeyId": "cadastrarPaciente",
      "actorRef": "recepcionista",
      "title": "Cadastrar paciente"
    },
    {
      "journeyId": "agendarConsulta",
      "actorRef": "recepcionista",
      "title": "Agendar consulta"
    },
    {
      "journeyId": "confirmarConsulta",
      "actorRef": "recepcionista",
      "title": "Confirmar consulta"
    },
    {
      "journeyId": "registrarFalta",
      "actorRef": "recepcionista",
      "title": "Registrar falta"
    },
    {
      "journeyId": "consultarAgendaDiaria",
      "actorRef": "profissional",
      "title": "Consultar agenda diária"
    },
    {
      "journeyId": "registrarConsultaAtendida",
      "actorRef": "profissional",
      "title": "Registrar consulta atendida"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5Readonly<Ns5JourneyIndexArtifact>;

export type AgendaClinicaJourneyIndexType = typeof agendaClinicaJourneyIndex;

export default agendaClinicaJourneyIndex;
