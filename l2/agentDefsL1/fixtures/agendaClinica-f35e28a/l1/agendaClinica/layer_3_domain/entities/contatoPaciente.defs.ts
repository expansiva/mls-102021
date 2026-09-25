/// <mls fileReference="_102047_/l1/agendaClinica/layer_3_domain/entities/contatoPaciente.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "domainEntity",
  "artifactId": "ContatoPaciente",
  "moduleName": "agendaClinica",
  "data": {
    "entityId": "ContatoPaciente",
    "storageTarget": "mdm",
    "fields": [
      {
        "name": "id",
        "type": "uuid",
        "derived": true
      },
      {
        "name": "version",
        "type": "integer",
        "derived": true
      },
      {
        "name": "details",
        "type": "object"
      },
      {
        "name": "details.identification",
        "type": "object"
      },
      {
        "name": "details.identification.name",
        "type": "string"
      },
      {
        "name": "details.identification.countryCode",
        "type": "string"
      },
      {
        "name": "details.base",
        "type": "object"
      },
      {
        "name": "details.contactChannel",
        "type": "object"
      },
      {
        "name": "details.contactChannel.contactType",
        "type": "enum"
      },
      {
        "name": "details.contactChannel.value",
        "type": "string"
      },
      {
        "name": "details.contactChannel.isVerified",
        "type": "boolean"
      },
      {
        "name": "details.general",
        "type": "object"
      },
      {
        "name": "details.agendaClinica",
        "type": "object"
      }
    ],
    "lifecycle": {
      "states": [],
      "transitions": []
    },
    "invariants": [],
    "imports": []
  }
} as const;

export default definition;

export const pipeline = [
  {
    "id": "102047/agendaClinica/domainEntity/ContatoPaciente",
    "type": "domainEntity",
    "defPath": "_102047_/l1/agendaClinica/layer_3_domain/entities/contatoPaciente.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_3_domain/entities/contatoPaciente.ts",
    "outputAvailability": "future",
    "dependsFiles": [],
    "dependsOn": [],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/domainEntity.md"
    ]
  }
] as const;
