/// <mls fileReference="_102047_/l4/agents/ontology/AgentBehavior.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityAgentBehavior = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "AgentBehavior",
  "title": "Agent behavior",
  "description": "The current behavior of an agent in plain language (role and state texts in the cm) and the history of its changes with author, date and a one-line summary; changed or undone through the cm.",
  "displayField": "summary",
  "relationships": {},
  "capabilities": {},
  "rules": [
    "agentBehaviorChangedOnlyThroughCm",
    "behaviorChangeByAdminOnly",
    "undoRestoresPreviousBehavior"
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
        "description": "The agent whose behavior this is, as the cm identifies it."
      },
      "currentBehavior": {
        "type": "text",
        "required": true,
        "title": "Current behavior",
        "description": "The agent's current behavior in plain language, built by the cm from its role and state texts."
      },
      "summary": {
        "type": "string",
        "required": true,
        "title": "Summary",
        "description": "A one-line summary of the current behavior, shown as the title of the behavior scenario.",
        "maxLength": 200
      },
      "changeRequest": {
        "type": "text",
        "title": "What do you want to change",
        "description": "The plain-language request the admin writes in the box; the cm turns it into a new behavior."
      },
      "changes": {
        "type": "object",
        "collection": true,
        "title": "History of changes",
        "description": "Past changes to the agent's behavior, newest first, as the cm keeps them.",
        "fields": {
          "changeRef": {
            "type": "string",
            "required": true,
            "title": "Change",
            "description": "The cm's reference to this change, used to undo it; never shown on screen."
          },
          "changedBy": {
            "type": "record",
            "required": true,
            "to": [
              "OrganizationUser"
            ],
            "title": "Who",
            "description": "The person who made the change."
          },
          "changedAt": {
            "type": "timestamp",
            "required": true,
            "title": "When",
            "description": "When the change was made."
          },
          "summary": {
            "type": "string",
            "required": true,
            "title": "Summary",
            "description": "A one-line summary of what changed.",
            "maxLength": 200
          },
          "undone": {
            "type": "boolean",
            "title": "Undone",
            "description": "Whether this change was later undone through the cm."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityAgentBehaviorType = typeof agentsEntityAgentBehavior;

export default agentsEntityAgentBehavior;
