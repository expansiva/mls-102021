/// <mls fileReference="_102047_/l4/agents/ontology/Agent.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityAgent = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "Agent",
  "title": "Agent",
  "description": "An AI agent of the organization as the cm keeps it: definition, @name, who it talks to, on whose behalf it acts, whether it is on, who is responsible and its limits. Read and changed only through the cm.",
  "displayField": "name",
  "relationships": {
    "agentTools": {
      "relationshipId": "agentToolAgent",
      "to": "AgentTool",
      "via": "AgentTool.agentId",
      "cardinality": "1:N",
      "title": "Tool choices of this agent",
      "description": "Which tools of the catalog are on or off for this agent; kept in this module with the cm id of the agent.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "executions": {
      "relationshipId": "executionAgent",
      "to": "ExecutionSummary",
      "via": "ExecutionSummary.agentId",
      "cardinality": "1:N",
      "title": "What the agent did",
      "description": "Execution summaries the cm sent about this agent, shown newest first in the activity scenario.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {},
  "rules": [
    "agentNameUniqueAmongActive"
  ],
  "kind": "external",
  "connectionId": "cm",
  "record": {
    "fields": {
      "name": {
        "type": "string",
        "required": true,
        "title": "Name (@name)",
        "description": "The name people use to call the agent in a chat, shown as @name. The cm refuses a name already used by another active agent."
      },
      "definition": {
        "type": "text",
        "title": "What the agent is",
        "description": "Plain-language description of what the agent is and what it is for, as the cm keeps it; shown read only on the overview."
      },
      "talksTo": {
        "type": "text",
        "title": "Who it talks to",
        "description": "Who the agent talks to (the people or groups it serves), as the cm describes it; shown on the card and on the overview."
      },
      "onBehalfOf": {
        "type": "text",
        "title": "On whose behalf it acts",
        "description": "On whose behalf the agent acts: in its own name when called by @name, or on behalf of a person; read from the cm."
      },
      "isOn": {
        "type": "boolean",
        "required": true,
        "title": "On",
        "description": "Whether the agent is on and answers requests; changed by the admin through the cm."
      },
      "responsible": {
        "type": "record",
        "to": [
          "OrganizationUser"
        ],
        "title": "Responsible person",
        "description": "The organization user responsible for this agent, chosen from the platform user list and saved through the cm."
      },
      "limits": {
        "type": "object",
        "collection": true,
        "title": "Limits",
        "description": "The limits of the agent exactly as the cm lists them; shown read only in the configuration scenario.",
        "fields": {
          "label": {
            "type": "string",
            "required": true,
            "title": "Limit",
            "description": "Readable name of the limit as the cm lists it."
          },
          "value": {
            "type": "string",
            "title": "Value",
            "description": "Current value of the limit as the cm reports it."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityAgentType = typeof agentsEntityAgent;

export default agentsEntityAgent;
