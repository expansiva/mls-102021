/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/consultaRepositoryAdapter.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "repositoryAdapter",
  "artifactId": "ConsultaRepository",
  "moduleName": "agendaClinica",
  "data": {
    "entityId": "Consulta",
    "portId": "ConsultaRepository",
    "tableId": "consulta",
    "columns": [
      {
        "field": "id",
        "column": "id"
      },
      {
        "field": "version",
        "column": "json:version"
      },
      {
        "field": "patientId",
        "column": "patientId"
      },
      {
        "field": "professionalId",
        "column": "professionalId"
      },
      {
        "field": "scheduledAt",
        "column": "scheduledAt"
      },
      {
        "field": "status",
        "column": "status"
      },
      {
        "field": "details.attendanceNote",
        "column": "json:details.attendanceNote"
      }
    ]
  }
} as const;

export default definition;

export const pipeline = [
  {
    "id": "102047/agendaClinica/repositoryAdapter/ConsultaRepository",
    "type": "repositoryAdapter",
    "defPath": "_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/consultaRepositoryAdapter.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/consultaRepositoryAdapter.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/consulta.defs.ts",
      "_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.defs.ts"
    ],
    "dependsOn": [
      "102047/agendaClinica/repositoryPort/ConsultaRepository",
      "102047/agendaClinica/table/consulta"
    ],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/repositoryAdapter.md"
    ]
  }
] as const;
