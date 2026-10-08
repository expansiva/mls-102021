/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/profissionais.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "httpController",
  "artifactId": "profissionais",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_1_external/auth/authorityMap.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/requests/profissionais.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.defs.ts"
  ],
  "data": {
    "pageId": "profissionais",
    "handlers": [
      {
        "route": "agendaClinica.profissionais.createProfessional",
        "kind": "command",
        "grantIds": [
          "recepcionistaConsultarProfissionais"
        ],
        "serviceFunction": "agendaClinica.profissionais.createProfessional",
        "contractPath": "l2/agendaClinica/web/contracts/profissionais.defs.ts",
        "contractInterface": "ProfissionaisContracts"
      },
      {
        "route": "agendaClinica.profissionais.getProfessional",
        "kind": "query",
        "grantIds": [
          "recepcionistaConsultarProfissionais"
        ],
        "serviceFunction": "agendaClinica.profissionais.getProfessional",
        "contractPath": "l2/agendaClinica/web/contracts/profissionais.defs.ts",
        "contractInterface": "ProfissionaisContracts"
      },
      {
        "route": "agendaClinica.profissionais.loadAvailableProfessionals",
        "kind": "query",
        "grantIds": [
          "recepcionistaConsultarProfissionais"
        ],
        "serviceFunction": "agendaClinica.profissionais.loadAvailableProfessionals",
        "contractPath": "l2/agendaClinica/web/contracts/profissionais.defs.ts",
        "contractInterface": "ProfissionaisContracts"
      },
      {
        "route": "agendaClinica.profissionais.loadMoreAvailableProfessionals",
        "kind": "query",
        "grantIds": [
          "recepcionistaConsultarProfissionais"
        ],
        "serviceFunction": "agendaClinica.profissionais.loadMoreAvailableProfessionals",
        "contractPath": "l2/agendaClinica/web/contracts/profissionais.defs.ts",
        "contractInterface": "ProfissionaisContracts"
      },
      {
        "route": "agendaClinica.profissionais.loadMoreProfessionalSearch",
        "kind": "query",
        "grantIds": [
          "recepcionistaConsultarProfissionais"
        ],
        "serviceFunction": "agendaClinica.profissionais.loadMoreProfessionalSearch",
        "contractPath": "l2/agendaClinica/web/contracts/profissionais.defs.ts",
        "contractInterface": "ProfissionaisContracts"
      },
      {
        "route": "agendaClinica.profissionais.searchAvailableProfessionals",
        "kind": "query",
        "grantIds": [
          "recepcionistaConsultarProfissionais"
        ],
        "serviceFunction": "agendaClinica.profissionais.searchAvailableProfessionals",
        "contractPath": "l2/agendaClinica/web/contracts/profissionais.defs.ts",
        "contractInterface": "ProfissionaisContracts"
      },
      {
        "route": "agendaClinica.profissionais.updateProfessional",
        "kind": "command",
        "grantIds": [
          "recepcionistaConsultarProfissionais"
        ],
        "serviceFunction": "agendaClinica.profissionais.updateProfessional",
        "contractPath": "l2/agendaClinica/web/contracts/profissionais.defs.ts",
        "contractInterface": "ProfissionaisContracts"
      }
    ]
  }
} as const;

export default definition;
