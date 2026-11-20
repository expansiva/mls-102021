/// <mls fileReference="_102047_/l4/agents/ontology/PersonalConduct.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityPersonalConduct = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "PersonalConduct",
  "title": "Personal conduct",
  "description": "How an agent that acts on a member's behalf behaves for that member, with the history of the member's own changes; kept and changed in the cm.",
  "displayField": "summary",
  "relationships": {},
  "capabilities": {},
  "rules": [
    "ownConductOnly",
    "conductOnlyForAgentActingOnBehalf"
  ],
  "kind": "external",
  "connectionId": "cm",
  "record": {
    "fields": {
      "agent": {
        "type": "record",
        "required": true,
        "to": [
          "Agent"
        ],
        "title": "Agent",
        "description": "The agent that acts on the member's behalf and whose conduct this is."
      },
      "person": {
        "type": "record",
        "required": true,
        "to": [
          "OrganizationUser"
        ],
        "title": "Member",
        "description": "The organization member this conduct applies to; always the person signed in."
      },
      "summary": {
        "type": "string",
        "required": true,
        "title": "Current conduct",
        "description": "How the agent currently behaves for this member, in plain language, as the cm returns it."
      },
      "changeRequest": {
        "type": "text",
        "title": "What do you want to change",
        "description": "What the member writes should change in how the agent behaves for them; sent to the cm, which updates only this member's conduct."
      },
      "history": {
        "type": "object",
        "collection": true,
        "title": "History of my changes",
        "description": "The member's own changes to this conduct, newest first, as the cm lists them.",
        "fields": {
          "changedAt": {
            "type": "timestamp",
            "required": true,
            "title": "When",
            "description": "When the change was made."
          },
          "changedBy": {
            "type": "record",
            "required": true,
            "to": [
              "OrganizationUser"
            ],
            "title": "Who",
            "description": "Who made the change; the member themselves."
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
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityPersonalConductType = typeof agentsEntityPersonalConduct;

export default agentsEntityPersonalConduct;
