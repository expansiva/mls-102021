/// <mls fileReference="_102047_/l1/agendaClinica/layer_3_domain/entities/paciente.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-21-d1-definition-v1",
  "artifactType": "domainEntity",
  "artifactId": "Paciente",
  "moduleName": "agendaClinica",
  "data": {
    "entityId": "Paciente",
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
        "name": "details.identification.subtype",
        "type": "enum",
        "derived": true
      },
      {
        "name": "details.identification.name",
        "type": "string"
      },
      {
        "name": "details.identification.status",
        "type": "enum",
        "derived": true
      },
      {
        "name": "details.identification.docType",
        "type": "enum"
      },
      {
        "name": "details.identification.docId",
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
        "name": "details.base.aliases",
        "type": "string"
      },
      {
        "name": "details.base.contacts",
        "type": "object",
        "derived": true
      },
      {
        "name": "details.base.relationshipRefs",
        "type": "object",
        "derived": true
      },
      {
        "name": "details.base.notes",
        "type": "string"
      },
      {
        "name": "details.person",
        "type": "object"
      },
      {
        "name": "details.person.privacyConsent",
        "type": "object"
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
    "id": "102047/agendaClinica/domainEntity/Paciente",
    "type": "domainEntity",
    "defPath": "_102047_/l1/agendaClinica/layer_3_domain/entities/paciente.defs.ts",
    "outputPath": "_102047_/l1/agendaClinica/layer_3_domain/entities/paciente.ts",
    "outputAvailability": "future",
    "dependsFiles": [],
    "dependsOn": [],
    "skills": [
      "_102021_/l2/agentDefsL1/skills/architecture.md",
      "_102021_/l2/agentDefsL1/skills/domainEntity.md"
    ]
  }
] as const;
