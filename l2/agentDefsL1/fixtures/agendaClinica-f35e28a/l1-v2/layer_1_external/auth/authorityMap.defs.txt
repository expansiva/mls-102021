/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/auth/authorityMap.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "authorityMap",
  "artifactId": "authorityMap",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [
    "_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.defs.ts"
  ],
  "data": {
    "mapId": "authorityMap",
    "entries": [
      {
        "grantId": "profissionalAgendaDiaria",
        "actorRef": "profissional"
      },
      {
        "grantId": "profissionalPacientesDaAgenda",
        "actorRef": "profissional"
      },
      {
        "grantId": "profissionalProprioCadastro",
        "actorRef": "profissional"
      },
      {
        "grantId": "recepcionistaAgendaConsultas",
        "actorRef": "recepcionista"
      },
      {
        "grantId": "recepcionistaCadastroPacientes",
        "actorRef": "recepcionista"
      },
      {
        "grantId": "recepcionistaLocalizarProfissionais",
        "actorRef": "recepcionista"
      },
      {
        "grantId": "recepcionistaProprioCadastro",
        "actorRef": "recepcionista"
      }
    ]
  }
} as const;

export default definition;
