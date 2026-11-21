/// <mls fileReference="_102047_/l4/agents/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "businessDomain": "Home of the company's AI agents: agents, drafts, behavior and simulation live in the cm (collab messages) and are read and changed through it; this module owns the tool catalog of the app modules and the cm, which tools each agent has on, which people may not use a tool, and the execution summaries the cm sends.",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "agents",
    "description": "Branch details.agents of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Agent",
      "kind": "external"
    },
    {
      "entityId": "AgentDraft",
      "kind": "external"
    },
    {
      "entityId": "AgentBehavior",
      "kind": "external"
    },
    {
      "entityId": "PersonalConduct",
      "kind": "external"
    },
    {
      "entityId": "AgentSimulation",
      "kind": "external"
    },
    {
      "entityId": "Tool",
      "kind": "entity",
      "class": "supporting"
    },
    {
      "entityId": "AgentTool",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "PersonToolRestriction",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "ExecutionSummary",
      "kind": "entity",
      "class": "event"
    },
    {
      "entityId": "OrganizationUser",
      "kind": "role",
      "subtype": "Person"
    }
  ],
  "relationships": [
    {
      "relationshipId": "agentToolTool",
      "from": "AgentTool",
      "to": "Tool",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Each agent tool choice refers to one tool of the catalog.",
      "field": "AgentTool.toolId"
    },
    {
      "relationshipId": "agentToolAgent",
      "from": "AgentTool",
      "to": "Agent",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Each agent tool choice belongs to one agent of the cm (or its draft); the table stores the cm id.",
      "field": "AgentTool.agentId"
    },
    {
      "relationshipId": "restrictionPerson",
      "from": "PersonToolRestriction",
      "to": "OrganizationUser",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Each restriction applies to one organization user.",
      "field": "PersonToolRestriction.personId"
    },
    {
      "relationshipId": "restrictionTool",
      "from": "PersonToolRestriction",
      "to": "Tool",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Each restriction blocks one tool of the catalog.",
      "field": "PersonToolRestriction.toolId"
    },
    {
      "relationshipId": "executionAgent",
      "from": "ExecutionSummary",
      "to": "Agent",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Each execution summary is about one agent; the table stores the cm id.",
      "field": "ExecutionSummary.agentId"
    },
    {
      "relationshipId": "executionRequester",
      "from": "ExecutionSummary",
      "to": "OrganizationUser",
      "type": "manyToOne",
      "required": false,
      "mode": "fk",
      "description": "The person who called the agent in the execution, when known.",
      "field": "ExecutionSummary.personId"
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyIndexV3>;

export type AgentsOntologyIndexType = typeof agentsOntologyIndex;

export default agentsOntologyIndex;
