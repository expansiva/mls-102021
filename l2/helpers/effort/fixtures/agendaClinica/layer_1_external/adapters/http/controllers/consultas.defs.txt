/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "httpController",
  "artifactId": "consultas",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_1_external/auth/authorityMap.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/requests/consultas.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.defs.ts"
  ],
  "data": {
    "pageId": "consultas",
    "handlers": [
      {
        "route": "agendaClinica.consultas.agendarConsulta",
        "kind": "command",
        "grantIds": [
          "recepcionistaGerenciarPacientesEconsultas",
          "recepcionistaConsultarProfissionais"
        ],
        "serviceFunction": "agendaClinica.consultas.agendarConsulta",
        "contractPath": "l2/agendaClinica/web/contracts/consultas.defs.ts",
        "contractInterface": "ConsultasContracts"
      },
      {
        "route": "agendaClinica.consultas.carregarAgenda",
        "kind": "query",
        "grantIds": [
          "recepcionistaGerenciarPacientesEconsultas",
          "recepcionistaConsultarProfissionais"
        ],
        "serviceFunction": "agendaClinica.consultas.carregarAgenda",
        "contractPath": "l2/agendaClinica/web/contracts/consultas.defs.ts",
        "contractInterface": "ConsultasContracts"
      },
      {
        "route": "agendaClinica.consultas.carregarMaisAgenda",
        "kind": "query",
        "grantIds": [
          "recepcionistaGerenciarPacientesEconsultas",
          "recepcionistaConsultarProfissionais"
        ],
        "serviceFunction": "agendaClinica.consultas.carregarMaisAgenda",
        "contractPath": "l2/agendaClinica/web/contracts/consultas.defs.ts",
        "contractInterface": "ConsultasContracts"
      },
      {
        "route": "agendaClinica.consultas.carregarMaisPacientesParaAgendamento",
        "kind": "query",
        "grantIds": [
          "recepcionistaGerenciarPacientesEconsultas"
        ],
        "serviceFunction": "agendaClinica.consultas.carregarMaisPacientesParaAgendamento",
        "contractPath": "l2/agendaClinica/web/contracts/consultas.defs.ts",
        "contractInterface": "ConsultasContracts"
      },
      {
        "route": "agendaClinica.consultas.carregarMaisProfissionaisParaAgendamento",
        "kind": "query",
        "grantIds": [
          "recepcionistaConsultarProfissionais"
        ],
        "serviceFunction": "agendaClinica.consultas.carregarMaisProfissionaisParaAgendamento",
        "contractPath": "l2/agendaClinica/web/contracts/consultas.defs.ts",
        "contractInterface": "ConsultasContracts"
      },
      {
        "route": "agendaClinica.consultas.confirmarConsulta",
        "kind": "command",
        "grantIds": [
          "recepcionistaGerenciarPacientesEconsultas",
          "recepcionistaConsultarProfissionais"
        ],
        "serviceFunction": "agendaClinica.consultas.confirmarConsulta",
        "contractPath": "l2/agendaClinica/web/contracts/consultas.defs.ts",
        "contractInterface": "ConsultasContracts"
      },
      {
        "route": "agendaClinica.consultas.consultarConsultaSelecionada",
        "kind": "query",
        "grantIds": [
          "recepcionistaGerenciarPacientesEconsultas",
          "recepcionistaConsultarProfissionais"
        ],
        "serviceFunction": "agendaClinica.consultas.consultarConsultaSelecionada",
        "contractPath": "l2/agendaClinica/web/contracts/consultas.defs.ts",
        "contractInterface": "ConsultasContracts"
      },
      {
        "route": "agendaClinica.consultas.filtrarAgenda",
        "kind": "query",
        "grantIds": [
          "recepcionistaGerenciarPacientesEconsultas",
          "recepcionistaConsultarProfissionais"
        ],
        "serviceFunction": "agendaClinica.consultas.filtrarAgenda",
        "contractPath": "l2/agendaClinica/web/contracts/consultas.defs.ts",
        "contractInterface": "ConsultasContracts"
      },
      {
        "route": "agendaClinica.consultas.localizarPacientesParaAgendamento",
        "kind": "query",
        "grantIds": [
          "recepcionistaGerenciarPacientesEconsultas"
        ],
        "serviceFunction": "agendaClinica.consultas.localizarPacientesParaAgendamento",
        "contractPath": "l2/agendaClinica/web/contracts/consultas.defs.ts",
        "contractInterface": "ConsultasContracts"
      },
      {
        "route": "agendaClinica.consultas.localizarProfissionaisParaAgendamento",
        "kind": "query",
        "grantIds": [
          "recepcionistaConsultarProfissionais"
        ],
        "serviceFunction": "agendaClinica.consultas.localizarProfissionaisParaAgendamento",
        "contractPath": "l2/agendaClinica/web/contracts/consultas.defs.ts",
        "contractInterface": "ConsultasContracts"
      },
      {
        "route": "agendaClinica.consultas.registrarFalta",
        "kind": "command",
        "grantIds": [
          "recepcionistaGerenciarPacientesEconsultas",
          "recepcionistaConsultarProfissionais"
        ],
        "serviceFunction": "agendaClinica.consultas.registrarFalta",
        "contractPath": "l2/agendaClinica/web/contracts/consultas.defs.ts",
        "contractInterface": "ConsultasContracts"
      }
    ]
  }
} as const;

export default definition;
