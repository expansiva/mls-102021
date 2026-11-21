/// <mls fileReference="_102047_/l4/agents/ontology/ConductChange.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityConductChange = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "ConductChange",
  "title": "Conduct change",
  "description": "One change a member made to how an agent behaves for them: who, when and a one-line summary. Recorded by this module each time a member changes their conduct; the current conduct stays in the cm.",
  "displayField": "summary",
  "relationships": {
    "person": {
      "relationshipId": "conductChangePerson",
      "to": "OrganizationUser",
      "via": "ConductChange.personId",
      "cardinality": "N:1",
      "title": "Member",
      "description": "The member who changed their own conduct.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "create": "Records a change with who, when and a one-line summary each time a member changes their conduct; used by the member in changeMyConduct.",
    "locate.byColumn": "Lists the signed-in member's own changes, newest first; used by the member and the company admin for their own history only.",
    "read.mdmRecord": "Reads the member who made the change to show their name, never an id."
  },
  "rules": [
    "ownConductOnly",
    "conductChangeRecorded",
    "ownConductHistoryOnly"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "agents_conductchange",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "agentId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Agent"
        ],
        "title": "Agent",
        "description": "The agent whose conduct was changed; the row stores the cm id, never shown on screen."
      },
      "personId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "OrganizationUser"
        ],
        "title": "Who",
        "description": "The member who made the change; always the person signed in."
      },
      "changedAt": {
        "type": "timestamp",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "When",
        "description": "When the change was made; filled by the system."
      },
      "summary": {
        "type": "string",
        "required": true,
        "title": "Summary",
        "description": "One-line summary of what changed.",
        "maxLength": 200
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ConductChangesEntityConductChangeType = typeof agentsEntityConductChange;

export default agentsEntityConductChange;
