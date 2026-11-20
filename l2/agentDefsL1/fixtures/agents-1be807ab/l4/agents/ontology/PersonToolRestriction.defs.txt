/// <mls fileReference="_102047_/l4/agents/ontology/PersonToolRestriction.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityPersonToolRestriction = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "PersonToolRestriction",
  "title": "Person tool restriction",
  "description": "A tool a given person may not use through any agent, marked by the company admin.",
  "displayField": "details.toolName",
  "relationships": {
    "person": {
      "relationshipId": "restrictionPerson",
      "to": "OrganizationUser",
      "via": "PersonToolRestriction.personId",
      "cardinality": "N:1",
      "title": "Restricted person",
      "description": "Each restriction applies to one organization user.",
      "mode": "fk",
      "required": true
    },
    "tool": {
      "relationshipId": "restrictionTool",
      "to": "Tool",
      "via": "PersonToolRestriction.toolId",
      "cardinality": "N:1",
      "title": "Blocked tool",
      "description": "Each restriction blocks one tool of the catalog.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Reads one restriction by its id when the checklist screen already holds it; used by the company admin.",
    "locate.byColumn": "Lists the tools blocked for the chosen person, filtered by person, so the company admin sees the checklist with the tools already checked.",
    "listByForeignKey": "Lists the restrictions of one person, or of a tool, at once; also used when the cm asks which tools an agent has on that a given person may use now, to take the blocked ones out of the request.",
    "count": "Counts how many tools are blocked for a person, shown as a badge next to the person in the restrictions screen for the company admin.",
    "create": "Writes a restriction when the company admin checks a tool the person may not use through any agent.",
    "delete": "Removes the restriction when the company admin unchecks the tool, so the person may use it again through agents.",
    "uniqueKey": "Refuses a second restriction for the same person and the same tool, so checking a tool twice changes nothing.",
    "transaction": "Saves all the checks and unchecks the company admin made on one person's checklist together, all or nothing.",
    "read.mdmRecord": "Reads the organization user behind the restriction to show the person's name in the restrictions screen, never a technical id.",
    "agents.availableToolsForPerson": "Answers the cm, for an agent and the person who called it, with the tools the agent has on minus the ones this person may not use; works with no screen open."
  },
  "rules": [
    "restrictionUniquePerPersonTool",
    "restrictionAppliesThroughAnyAgent",
    "onlyCompanyAdminRestrictsTools",
    "removedToolRestrictionKept",
    "noTechnicalIdsOnScreen"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "agents_persontoolrestriction",
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
      "personId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "OrganizationUser"
        ],
        "title": "Person",
        "description": "The organization user who may not use this tool through any agent. Chosen from the organization users list."
      },
      "toolId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Tool"
        ],
        "title": "Tool",
        "description": "The catalog tool this person may not use through any agent."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Details",
        "description": "What the module keeps about this restriction besides the person and the tool.",
        "fields": {
          "markedAt": {
            "type": "timestamp",
            "required": true,
            "derived": true,
            "title": "Marked on",
            "description": "When the company admin checked this tool as blocked for the person; filled by the system when the restriction is saved."
          },
          "toolName": {
            "type": "string",
            "derived": true,
            "title": "Tool",
            "description": "The readable name of the blocked tool, read from the tool catalog; never typed nor stored on the restriction."
          },
          "toolPath": {
            "type": "string",
            "derived": true,
            "title": "Where the tool sits",
            "description": "The module, subject and action of the blocked tool in readable words, read from the tool catalog, so the checklist shows it in its tree."
          },
          "toolRemoved": {
            "type": "boolean",
            "derived": true,
            "title": "Tool removed from the release",
            "description": "Yes when the blocked tool was marked removed in the catalog because it left the release; the restriction is kept and simply has no effect while the tool is gone."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "personId",
      "toolId"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityPersonToolRestrictionType = typeof agentsEntityPersonToolRestriction;

export default agentsEntityPersonToolRestriction;
