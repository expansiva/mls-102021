/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/pacientes.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "httpController",
  "artifactId": "pacientes",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_1_external/auth/authorityMap.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/requests/pacientes.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.defs.ts"
  ],
  "data": {
    "pageId": "pacientes",
    "handlers": [
      {
        "route": "agendaClinica.pacientes.loadPatientDetail",
        "kind": "query",
        "grantIds": [
          "recepcionistaGerenciarPacientesEconsultas"
        ],
        "serviceFunction": "agendaClinica.pacientes.loadPatientDetail",
        "contractPath": "l2/agendaClinica/web/contracts/pacientes.defs.ts",
        "contractInterface": "PacientesContracts"
      },
      {
        "route": "agendaClinica.pacientes.loadPatients",
        "kind": "query",
        "grantIds": [
          "recepcionistaGerenciarPacientesEconsultas"
        ],
        "serviceFunction": "agendaClinica.pacientes.loadPatients",
        "contractPath": "l2/agendaClinica/web/contracts/pacientes.defs.ts",
        "contractInterface": "PacientesContracts"
      },
      {
        "route": "agendaClinica.pacientes.savePatient",
        "kind": "command",
        "grantIds": [
          "recepcionistaGerenciarPacientesEconsultas"
        ],
        "serviceFunction": "agendaClinica.pacientes.savePatient",
        "contractPath": "l2/agendaClinica/web/contracts/pacientes.defs.ts",
        "contractInterface": "PacientesContracts"
      },
      {
        "route": "agendaClinica.pacientes.searchPatients",
        "kind": "query",
        "grantIds": [
          "recepcionistaGerenciarPacientesEconsultas"
        ],
        "serviceFunction": "agendaClinica.pacientes.searchPatients",
        "contractPath": "l2/agendaClinica/web/contracts/pacientes.defs.ts",
        "contractInterface": "PacientesContracts"
      }
    ]
  }
} as const;

export default definition;
