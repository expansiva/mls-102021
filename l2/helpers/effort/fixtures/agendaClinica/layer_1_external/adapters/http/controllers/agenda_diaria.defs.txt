/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/agenda_diaria.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "httpController",
  "artifactId": "agenda_diaria",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_1_external/auth/authorityMap.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/requests/agenda_diaria.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.defs.ts"
  ],
  "data": {
    "pageId": "agenda_diaria",
    "handlers": [
      {
        "route": "agendaClinica.agenda_diaria.carregarAgendaDiaria",
        "kind": "query",
        "grantIds": [
          "profissionalConsultarEregistrarPropriaAgenda",
          "profissionalIdentificarPacientesDaPropriaAgenda"
        ],
        "serviceFunction": "agendaClinica.agenda_diaria.carregarAgendaDiaria",
        "contractPath": "l2/agendaClinica/web/contracts/agenda_diaria.defs.ts",
        "contractInterface": "Agenda_diariaContracts"
      },
      {
        "route": "agendaClinica.agenda_diaria.carregarConsultaSelecionada",
        "kind": "query",
        "grantIds": [
          "profissionalConsultarEregistrarPropriaAgenda",
          "profissionalIdentificarPacientesDaPropriaAgenda"
        ],
        "serviceFunction": "agendaClinica.agenda_diaria.carregarConsultaSelecionada",
        "contractPath": "l2/agendaClinica/web/contracts/agenda_diaria.defs.ts",
        "contractInterface": "Agenda_diariaContracts"
      },
      {
        "route": "agendaClinica.agenda_diaria.carregarMaisConsultasDoDia",
        "kind": "query",
        "grantIds": [
          "profissionalConsultarEregistrarPropriaAgenda",
          "profissionalIdentificarPacientesDaPropriaAgenda"
        ],
        "serviceFunction": "agendaClinica.agenda_diaria.carregarMaisConsultasDoDia",
        "contractPath": "l2/agendaClinica/web/contracts/agenda_diaria.defs.ts",
        "contractInterface": "Agenda_diariaContracts"
      },
      {
        "route": "agendaClinica.agenda_diaria.registrarAtendimento",
        "kind": "command",
        "grantIds": [
          "profissionalConsultarEregistrarPropriaAgenda",
          "profissionalIdentificarPacientesDaPropriaAgenda"
        ],
        "serviceFunction": "agendaClinica.agenda_diaria.registrarAtendimento",
        "contractPath": "l2/agendaClinica/web/contracts/agenda_diaria.defs.ts",
        "contractInterface": "Agenda_diariaContracts"
      }
    ]
  }
} as const;

export default definition;
