/// <mls fileReference="_102047_/l4/agents/journeys/adjustAgentTools.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const adjustAgentToolsJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "adjustAgentTools",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Adjust an agent's tools",
    "goal": "Decide which actions an agent may use.",
    "icon": "wrench",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findAgentForTools",
        "kind": "locate",
        "entity": "Agent",
        "title": "Find the agent",
        "description": "The admin opens the agent and its tools scenario.",
        "icon": "search"
      },
      {
        "stepId": "browseToolTree",
        "kind": "inspect",
        "entity": "Tool",
        "title": "Browse the tools tree",
        "description": "The admin reads the whole tool catalog: every module, subject and action with readable names and descriptions, removed tools marked as such. The agent's existing choice is shown marked on the actions it has turned on.",
        "icon": "folder-tree"
      },
      {
        "stepId": "enableUnchosenTool",
        "kind": "act",
        "entity": "AgentTool",
        "effect": "create",
        "title": "Turn on a tool with no choice yet",
        "description": "The admin marks an action the agent has no choice for yet, which creates that agent's choice for that action as an admin choice.",
        "icon": "square-plus"
      },
      {
        "stepId": "toggleTools",
        "kind": "act",
        "entity": "AgentTool",
        "effect": "update",
        "title": "Turn an existing choice on or off",
        "description": "The admin marks or unmarks an action that already has a choice for this agent, which changes whether that choice is enabled.",
        "icon": "square-check"
      }
    ],
    "outcome": {
      "statement": "The agent has exactly the tools the admin chose.",
      "evidence": [
        "The checkboxes show the admin's choices",
        "Later automatic choices do not change them"
      ]
    }
  },
  "businessHash": "sha256:456ca73c224692aab1b68355863337e2e09d60a511dd4f1be69904c719116a8c"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type AdjustAgentToolsJourneyType = typeof adjustAgentToolsJourney;

export default adjustAgentToolsJourney;
