/// <mls fileReference="_102047_/l4/agendaClinica/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact } from '/_102035_/l2/solution/types.js';

export const agendaClinicaWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "agendaClinica",
  "processes": [],
  "journeyDecisions": [
    {
      "journeyId": "cadastrarPaciente",
      "inProcess": false
    },
    {
      "journeyId": "agendarConsulta",
      "inProcess": false
    },
    {
      "journeyId": "confirmarConsulta",
      "inProcess": false
    },
    {
      "journeyId": "registrarFalta",
      "inProcess": false
    },
    {
      "journeyId": "consultarAgendaDiaria",
      "inProcess": false
    },
    {
      "journeyId": "registrarAtendimento",
      "inProcess": false
    }
  ]
} as const satisfies Ns5WorkflowsArtifact;

export type AgendaClinicaWorkflowsType = typeof agendaClinicaWorkflows;

export default agendaClinicaWorkflows;
