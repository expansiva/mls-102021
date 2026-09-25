/// <mls fileReference="_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "repositoryPort",
  "artifactId": "ConsultaRepository",
  "moduleName": "agendaClinica",
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

export const pipeline = [
  {
    "id": "102047/agendaClinica/repositoryPort/ConsultaRepository",
    "type": "repositoryPort",
    "defPath": "_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.defs.ts"
    ],
    "dependsOn": [
      "102047/agendaClinica/domainEntity/Consulta"
    ],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/repositoryPort.md"
    ]
  }
] as const;
