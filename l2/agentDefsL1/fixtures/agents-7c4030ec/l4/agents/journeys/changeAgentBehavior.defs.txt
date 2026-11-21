/// <mls fileReference="_102047_/l4/agents/journeys/changeAgentBehavior.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const changeAgentBehaviorJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "changeAgentBehavior",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Change an agent's behavior",
    "goal": "Tell an agent in plain words how it should behave differently, or undo a past change.",
    "icon": "message-square",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findAgentForBehavior",
        "kind": "locate",
        "entity": "Agent",
        "title": "Find the agent",
        "description": "The admin opens the agent from the list or from the agent already in hand.",
        "icon": "search"
      },
      {
        "stepId": "readBehavior",
        "kind": "inspect",
        "entity": "AgentBehavior",
        "title": "Read current behavior",
        "description": "The admin reads the current behavior in plain language and the history of changes with who, when and a summary.",
        "icon": "book-open"
      },
      {
        "stepId": "requestBehaviorChange",
        "kind": "act",
        "entity": "AgentBehavior",
        "effect": "update",
        "title": "Say what to change",
        "description": "The admin writes what should change in the box and the cm updates the behavior.",
        "icon": "pencil"
      },
      {
        "stepId": "undoBehaviorChange",
        "kind": "act",
        "entity": "AgentBehavior",
        "effect": "update",
        "title": "Undo a change",
        "description": "When needed, the admin undoes a change from the history through the cm.",
        "icon": "undo"
      }
    ],
    "outcome": {
      "statement": "The agent behaves as the admin asked, and the change is in its history.",
      "evidence": [
        "The behavior text shows the new behavior",
        "The history lists the change with who, when and a one-line summary"
      ]
    }
  },
  "businessHash": "sha256:86e869c09d78c32fdf6b6e5ab3efc718179dd213aac5152a8e133ae41729b4ce"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ChangeAgentBehaviorJourneyType = typeof changeAgentBehaviorJourney;

export default changeAgentBehaviorJourney;
