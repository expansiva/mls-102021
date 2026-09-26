/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/registerRepositories.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "repositoryRegistration",
  "artifactId": "registerRepositories",
  "moduleName": "agendaClinica",
  "status": "generated",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/consultaRepositoryAdapter.defs.ts"
  ],
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
