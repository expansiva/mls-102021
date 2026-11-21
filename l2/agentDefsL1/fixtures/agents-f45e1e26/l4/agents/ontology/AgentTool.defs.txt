/// <mls fileReference="_102047_/l4/agents/ontology/AgentTool.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityAgentTool = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "AgentTool",
  "title": "Agent tool",
  "description": "Whether one tool is on or off for one agent, and whether that choice was made by the admin or by the automatic choice; an admin's choice is never changed automatically.",
  "displayField": "details.toolName",
  "relationships": {
    "tool": {
      "relationshipId": "agentToolTool",
      "to": "Tool",
      "via": "AgentTool.toolId",
      "cardinality": "N:1",
      "title": "Tool of the catalog",
      "description": "Each agent tool choice refers to one tool of the catalog.",
      "mode": "fk",
      "required": true
    },
    "agent": {
      "relationshipId": "agentToolAgent",
      "to": "Agent",
      "via": "AgentTool.agentId",
      "cardinality": "N:1",
      "title": "Agent",
      "description": "Each agent tool choice belongs to one agent of the cm, or its draft.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Reads one tool choice by its id when the tools scenario toggles a checkbox; used by the company admin.",
    "locate.byColumn": "Lists the tool choices of an agent filtered by on/off and by who chose them, to build the tools tree and to answer the cm which tools are on; used by the admin screens and the cm request.",
    "listByForeignKey": "Lists every tool choice of one agent, or of many agents at once for one tool, so the tree and the catalog refresh avoid one query per line; used by the admin, the draft review and the catalog refresh process.",
    "count": "Counts the tools that are on for an agent, shown on the agent tools scenario; used by every organization member who opens the agent.",
    "create": "Writes the choice for a tool the agent never had: when the company admin marks an action of the catalog that has no choice yet for that agent, it creates the choice for that agent and tool as on, chosen by the admin; when a draft is ready or a new tool arrives with the catalog, it creates it as an automatic choice, upserting by agent and tool so a repeated notice changes nothing; used by the company admin in the tools tree and by the processes.",
    "update": "Turns an existing choice of a tool on or off for an agent, changing only its on value and recording who chose it; used by the company admin when marking or unmarking an action that already has a choice in the tools tree and on a draft, and, only on automatic choices, by the processes.",
    "uniqueKey": "Refuses a second choice for the same agent and tool; enforced by the engine on write.",
    "transaction": "Applies all suggested tools of a ready draft, or all new tools after a catalog rebuild, all or nothing; used by the processes.",
    "read.mdmRecord": "Reads the admin who made a choice to show their name next to it, never an id; used by the tools scenario.",
    "agents.toolsForRequest": "Answers the cm, for an agent and a person, the tools that are on and not removed, minus those the person may not use; used by the cm on each request with no screen open."
  },
  "rules": [
    "adminChoiceNeverOverridden",
    "oneChoicePerAgentAndTool",
    "onlyEnabledToolsSent",
    "removedToolNeverSent",
    "personRestrictionsExcludeTools",
    "repeatedNoticeChangesNothing",
    "draftSuggestedToolsTurnedOn",
    "newToolsChosenFromDescription",
    "describeAgentForPersonWritesNothing",
    "markingWithoutChoiceCreatesAdminChoice"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "agents_agenttool",
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
        "description": "The agent (or its draft) of the cm this tool choice belongs to; the row stores the cm id, which is never shown on screen."
      },
      "toolId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Tool"
        ],
        "title": "Tool",
        "description": "The action of the tool catalog that is turned on or off for this agent."
      },
      "enabled": {
        "type": "boolean",
        "required": true,
        "indexed": true,
        "title": "On",
        "description": "Whether this tool is on for this agent; only tools that are on are sent to the cm."
      },
      "choiceSource": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "admin",
            "title": "Admin"
          },
          {
            "value": "automatic",
            "title": "Automatic choice"
          }
        ],
        "title": "Chosen by",
        "description": "Who made the current choice: the admin, or the automatic choice from the agent description. An admin's choice is never changed by the automatic choice."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Details",
        "description": "What else is kept about this tool choice.",
        "fields": {
          "decidedAt": {
            "type": "timestamp",
            "required": true,
            "derived": true,
            "title": "Chosen on",
            "description": "When the tool was last turned on or off for this agent; filled by the system on each change."
          },
          "decidedBy": {
            "type": "record",
            "to": [
              "OrganizationUser"
            ],
            "title": "Chosen by person",
            "description": "The company admin who made the choice; empty when the automatic choice made it."
          },
          "automaticOrigin": {
            "type": "enum",
            "values": [
              {
                "value": "draftSuggestion",
                "title": "Suggested in the draft"
              },
              {
                "value": "catalogRefresh",
                "title": "New tool after a catalog update"
              }
            ],
            "title": "Automatic origin",
            "description": "Which automatic step set the choice, when it was not the admin."
          },
          "toolName": {
            "type": "string",
            "derived": true,
            "title": "Tool",
            "description": "The readable name of the tool, read from the tool catalog, shown in the module / subject / action tree."
          },
          "toolRemoved": {
            "type": "boolean",
            "derived": true,
            "title": "Removed",
            "description": "True when the tool this choice refers to has left the current release and is marked removed in the tool catalog; it is shown as removed and never sent to the agent."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "agentId",
      "toolId"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityAgentToolType = typeof agentsEntityAgentTool;

export default agentsEntityAgentTool;
