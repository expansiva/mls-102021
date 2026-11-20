/// <mls fileReference="_102047_/l4/agents/ontology/Tool.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityTool = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "Tool",
  "title": "Tool",
  "description": "One action of the tool catalog, from an app module or from the cm itself, placed in the module / subject / action tree with a readable name and description. Rebuilt when a module is created or a release arrives; a tool that leaves the release is marked removed and never deleted.",
  "displayField": "name",
  "relationships": {
    "agentChoices": {
      "relationshipId": "agentToolTool",
      "to": "AgentTool",
      "via": "AgentTool.toolId",
      "cardinality": "1:N",
      "title": "Agent choices for this tool",
      "description": "Each agent tool choice refers to one tool of the catalog.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "restrictions": {
      "relationshipId": "restrictionTool",
      "to": "PersonToolRestriction",
      "via": "PersonToolRestriction.toolId",
      "cardinality": "1:N",
      "title": "People restricted from this tool",
      "description": "Each restriction blocks one tool of the catalog.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Reads one tool by its id to show its name and description in the agent tools tree, the restriction list and the activity of an agent.",
    "locate.byColumn": "Lists the tools filtered by module, subject and situation to build the module / subject / action tree for the company admin and the members.",
    "locate.byText": "Finds tools whose name contains the typed text, for the search box of the tools tree and of the people restrictions screen.",
    "count": "Counts the available tools per module or subject for the tree headers.",
    "create": "Adds a new tool when the catalog is rebuilt after a module is created or a new release arrives, upserting by tool key so a repeated rebuild adds nothing twice.",
    "update": "Refreshes the readable name, description and release of a tool during the catalog rebuild, and replaces its stored catalog item with the whole item the platform delivers now.",
    "transition": "Marks a tool removed when it leaves the release, or available again when it returns, moved only by the catalog rebuild.",
    "uniqueKey": "Refuses a second tool with the same tool key, so each action of the release appears once in the catalog.",
    "transaction": "Writes the whole catalog rebuild all or nothing, so the tree never shows half a release.",
    "agents.rebuildCatalog": "Rebuilds the tool catalog from the actions of the app modules and the cm tools whenever a module is created or a new release arrives, with no screen open, replacing the stored catalog item of every tool with the whole item the platform delivers.",
    "agents.toolTree": "Returns the whole catalog as a module / subject / action tree with readable names, for the agent tools scenario, the draft review and the people restrictions screen; on the agent tools scenario every action of the catalog is listed, with the agent's existing choice shown marked on the ones the agent has turned on."
  },
  "rules": [
    "toolKeyUnique",
    "toolNeverDeleted",
    "catalogRebuiltOnRelease",
    "removedToolNotSent",
    "noTechnicalIdsOnScreen",
    "toolKeepsWholeCatalogItem",
    "agentToolsShowWholeCatalog"
  ],
  "writer": "inbound",
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "agents_tool",
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
      "toolKey": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "title": "Tool key",
        "description": "Stable code of the action in the release, used to match the tool when the catalog is rebuilt. Never shown on screen.",
        "maxLength": 200
      },
      "origin": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "appModule",
            "title": "App module"
          },
          {
            "value": "cm",
            "title": "Collab messages"
          }
        ],
        "title": "Origin",
        "description": "Whether the action comes from an app module or from the cm itself."
      },
      "moduleName": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Module",
        "description": "Module the action belongs to: the first level of the module / subject / action tree.",
        "maxLength": 100
      },
      "subject": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Subject",
        "description": "Subject inside the module: the second level of the tree.",
        "maxLength": 100
      },
      "name": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Name",
        "description": "Readable name of the action shown in the tools tree and the restriction lists.",
        "maxLength": 150
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "available",
            "title": "Available"
          },
          {
            "value": "removed",
            "title": "Removed"
          }
        ],
        "title": "Situation",
        "description": "Whether the tool is in the current release or has left it. A removed tool is kept, never deleted."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Details",
        "description": "Readable texts and release information of the tool.",
        "fields": {
          "moduleTitle": {
            "type": "string",
            "required": true,
            "title": "Module title",
            "description": "Readable name of the module shown in the tree.",
            "maxLength": 150
          },
          "subjectTitle": {
            "type": "string",
            "required": true,
            "title": "Subject title",
            "description": "Readable name of the subject shown in the tree.",
            "maxLength": 150
          },
          "description": {
            "type": "text",
            "required": true,
            "title": "Description",
            "description": "Plain-language explanation of what the action does, shown next to its checkbox and used to suggest tools from an agent description."
          },
          "releaseLabel": {
            "type": "string",
            "title": "Release",
            "description": "Release in which the tool was last found when the catalog was rebuilt.",
            "maxLength": 60
          },
          "addedAt": {
            "type": "timestamp",
            "required": true,
            "title": "Added on",
            "description": "When the tool first entered the catalog."
          },
          "removedAt": {
            "type": "timestamp",
            "title": "Removed on",
            "description": "When the tool left the release and was marked removed."
          },
          "usedByAgents": {
            "type": "integer",
            "derived": true,
            "title": "Agents using it",
            "description": "Number of agents that have this tool turned on."
          },
          "catalogItem": {
            "type": "json",
            "required": true,
            "title": "Catalog item",
            "description": "The whole catalog item of the action exactly as the platform delivers it, not a part of it. Every catalog rebuild replaces it, so the stored item is never stale. When the cm asks to describe an agent for a person, this whole stored item is returned for each tool that is on for that agent and that the person is not restricted from. Never shown on screen."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "toolKey"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "available",
      "reachedBy": "command"
    },
    {
      "state": "removed",
      "reachedBy": "command"
    }
  ],
  "transitions": [
    {
      "transitionId": "removeFromRelease",
      "from": [
        "available"
      ],
      "to": "removed",
      "by": [],
      "description": "The catalog rebuild finds that the action left the release and marks the tool removed; it stays in the catalog and is no longer sent to the cm."
    },
    {
      "transitionId": "restoreToRelease",
      "from": [
        "removed"
      ],
      "to": "available",
      "by": [],
      "description": "The catalog rebuild finds the action back in a new release and makes the tool available again."
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityToolType = typeof agentsEntityTool;

export default agentsEntityTool;
