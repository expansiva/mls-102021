/// <mls fileReference="_102047_/l4/agents/journeys/simulateAsMyself.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const simulateAsMyselfJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "simulateAsMyself",
  "business": {
    "actorRef": "organizationMember",
    "title": "Simulate an agent as myself",
    "goal": "Check what an agent can do for me and how it reads my request.",
    "icon": "play",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findAgentForMe",
        "kind": "locate",
        "entity": "Agent",
        "title": "Find the agent",
        "description": "The member opens the agent and its simulation scenario.",
        "icon": "search"
      },
      {
        "stepId": "seeWhatItCanForMe",
        "kind": "inspect",
        "entity": "AgentSimulation",
        "title": "See what it can for me",
        "description": "The member sees which tools the agent can or cannot use for them and why.",
        "icon": "shield-check"
      },
      {
        "stepId": "seeWhatItUnderstandsForMe",
        "kind": "inspect",
        "entity": "AgentSimulation",
        "title": "Test a sentence",
        "description": "The member types a sentence and sees whether it asks for an action, which path and which actions.",
        "icon": "message-circle"
      }
    ],
    "outcome": {
      "statement": "The member knows what the agent would do for them.",
      "evidence": [
        "The usable and blocked tools for the member are shown with reasons",
        "The understood actions for the sentence are shown"
      ]
    }
  },
  "businessHash": "sha256:d4cf7ed146e49be0741c1a084e30cdf4f66f8fa4c145d0dd40f6d44e8e9b1638"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type SimulateAsMyselfJourneyType = typeof simulateAsMyselfJourney;

export default simulateAsMyselfJourney;
