/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "repositoryPort",
  "artifactId": "ConsultaRepository",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts"
  ],
  "data": {
    "entityId": "Consulta",
    "interfaceName": "ConsultaRepository",
    "methods": [
      {
        "name": "create",
        "params": [
          "Consulta"
        ],
        "returns": "Consulta"
      },
      {
        "name": "list",
        "params": [
          "ConsultaFilter"
        ],
        "returns": "Consulta[]"
      },
      {
        "name": "transition",
        "params": [
          "Consulta",
          "transitionId"
        ],
        "returns": "Consulta"
      }
    ]
  }
} as const;

export default definition;
