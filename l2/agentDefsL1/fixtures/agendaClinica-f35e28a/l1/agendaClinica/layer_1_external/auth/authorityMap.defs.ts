/// <mls fileReference="_102047_/l1/agendaClinica/layer_1_external/auth/authorityMap.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "authorityMap",
  "artifactId": "authorityMap",
  "moduleName": "agendaClinica",
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

export const pipeline = [
  {
    "id": "102047/agendaClinica/authorityMap/authorityMap",
    "type": "authorityMap",
    "defPath": "_102047_/l1/agendaClinica/layer_1_external/auth/authorityMap.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_1_external/auth/authorityMap.ts",
    "outputAvailability": "future",
    "dependsFiles": [
      "_102047_/l1/agendaClinica/layer_2_application/scope/accessScope.defs.ts"
    ],
    "dependsOn": [
      "102047/agendaClinica/accessScope/accessScope"
    ],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/authorityMap.md"
    ]
  }
] as const;
