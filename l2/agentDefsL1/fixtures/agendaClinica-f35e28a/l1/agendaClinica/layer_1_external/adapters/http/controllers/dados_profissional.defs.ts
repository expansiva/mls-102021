/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/dados_profissional.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "httpController",
  "artifactId": "dados_profissional",
  "moduleName": "agendaClinica",
  "data": {
    "pageId": "dados_profissional",
    "handlers": [
      {
        "route": "agendaClinica.dados_profissional.cmdCreateProfissional",
        "kind": "command",
        "usecaseId": "createProfissional",
        "grantIds": [
          "profissionalProprioCadastro"
        ]
      },
      {
        "route": "agendaClinica.dados_profissional.cmdUpdateProfissional",
        "kind": "command",
        "usecaseId": "updateProfissional",
        "grantIds": [
          "profissionalProprioCadastro"
        ]
      },
      {
        "route": "agendaClinica.dados_profissional.qryListProfissional",
        "kind": "query",
        "usecaseId": "listProfissional",
        "grantIds": [
          "profissionalProprioCadastro"
        ]
      }
    ]
  }
} as const;

export default definition;

export const pipeline = [
  {
    "id": "102047/agendaClinica/httpController/dados_profissional",
    "type": "httpController",
    "defPath": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/dados_profissional.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/dados_profissional.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_2_application/usecases/createProfissional.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/listProfissional.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/usecases/updateProfissional.defs.ts"
    ],
    "dependsOn": [
      "102047/agendaClinica/usecase/createProfissional",
      "102047/agendaClinica/usecase/listProfissional",
      "102047/agendaClinica/usecase/updateProfissional"
    ],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/httpController.md"
    ],
    "routes": [
      "agendaClinica.dados_profissional.cmdCreateProfissional",
      "agendaClinica.dados_profissional.cmdUpdateProfissional",
      "agendaClinica.dados_profissional.qryListProfissional"
    ]
  }
] as const;
