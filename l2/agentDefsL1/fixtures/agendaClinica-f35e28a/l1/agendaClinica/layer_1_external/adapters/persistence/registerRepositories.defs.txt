/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/registerRepositories.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "repositoryRegistration",
  "artifactId": "registerRepositories",
  "moduleName": "agendaClinica",
  "data": {
    "registrationId": "registerRepositories",
    "adapters": [
      {
        "portId": "ConsultaRepository",
        "adapterArtifactId": "ConsultaRepository"
      }
    ]
  }
} as const;

export default definition;

export const pipeline = [
  {
    "id": "102047/agendaClinica/repositoryRegistration/registerRepositories",
    "type": "repositoryRegistration",
    "defPath": "_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/registerRepositories.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/registerRepositories.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/consultaRepositoryAdapter.defs.ts"
    ],
    "dependsOn": [
      "102047/agendaClinica/repositoryAdapter/ConsultaRepository"
    ],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/repositoryRegistration.md"
    ]
  }
] as const;
