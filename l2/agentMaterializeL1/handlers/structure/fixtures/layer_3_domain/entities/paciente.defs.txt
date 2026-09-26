/// <mls fileReference="_102047_/l1/agendaClinica/layer_3_domain/entities/paciente.defs.ts" enhancement="_blank"/>

export const definition = {
  "schemaVersion": "2026-09-24-d1-definition-v2",
  "artifactType": "domainEntity",
  "artifactId": "Paciente",
  "moduleName": "agendaClinica",
  "status": "pending",
  "dependencies": [],
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
