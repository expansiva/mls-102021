/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/consultaRepositoryAdapter.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "repositoryAdapter",
  "artifactId": "ConsultaRepository",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_1_external/adapters/persistence/consulta.defs.ts",
    "_102047_/l1/agendaClinica/layer_2_application/ports/consultaRepository.defs.ts"
  ],
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
        "field": "pacienteId",
        "column": "pacienteId"
      },
      {
        "field": "profissionalId",
        "column": "profissionalId"
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
        "field": "details.telephoneConfirmation.confirmedAt",
        "column": "json:details.telephoneConfirmation.confirmedAt"
      },
      {
        "field": "details.attendanceNote",
        "column": "json:details.attendanceNote"
      }
    ]
  }
} as const;

export default definition;
