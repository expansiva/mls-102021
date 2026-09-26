/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/auth/authorityMap.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "authorityMap",
  "artifactId": "authorityMap",
  "moduleName": "agendaClinica",
  "status": "blocked",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.defs.ts"
  ],
  "data": {
    "mapId": "authorityMap",
    "entries": [
      {
        "grantId": "profissionalAgendaPropria",
        "actorRef": "profissional"
      },
      {
        "grantId": "profissionalPacientesDaAgenda",
        "actorRef": "profissional"
      },
      {
        "grantId": "recepcionistaGestaoAgenda",
        "actorRef": "recepcionista"
      }
    ]
  }
} as const;

export default definition;
