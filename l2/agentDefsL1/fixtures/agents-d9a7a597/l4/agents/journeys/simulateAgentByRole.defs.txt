/// <mls fileReference="_102047_/l4/agents/journeys/simulateAgentByRole.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const simulateAgentByRoleJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "simulateAgentByRole",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Simulate an agent by role",
    "goal": "See what an agent can do for a person or role and how it reads a sentence.",
    "icon": "play",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findAgentToSimulate",
        "kind": "locate",
        "entity": "Agent",
        "title": "Find the agent",
        "description": "The admin opens the agent and its simulation scenario.",
        "icon": "search"
      },
      {
        "stepId": "simulateWhatItCan",
        "kind": "inspect",
        "entity": "AgentSimulation",
        "title": "See what it can",
        "description": "For a chosen person or role, the admin sees which tools can or cannot be used and why.",
        "icon": "shield-check"
      },
      {
        "stepId": "simulateWhatItUnderstands",
        "kind": "inspect",
        "entity": "AgentSimulation",
        "title": "See what it understands",
        "description": "For a sentence, the admin sees whether it asks for an action, which path of the tree and which actions.",
        "icon": "message-circle"
      }
    ],
    "outcome": {
      "statement": "The admin knows what the agent would do for that role and sentence.",
      "evidence": [
        "The list of usable and blocked tools with reasons is shown",
        "The understood path and actions are shown for the sentence"
      ]
    }
  },
  "businessHash": "sha256:ac6cd57327f1118995c2d18570b6a8739fed15741d7ce2415ce4289eca054cfd"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type SimulateAgentByRoleJourneyType = typeof simulateAgentByRoleJourney;

export default simulateAgentByRoleJourney;
