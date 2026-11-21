/// <mls fileReference="_102047_/l4/agents/journeys/changeMyConduct.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const changeMyConductJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "changeMyConduct",
  "business": {
    "actorRef": "organizationMember",
    "title": "Change my conduct with an agent",
    "goal": "Adjust how an agent that acts on my behalf behaves for me.",
    "icon": "user-cog",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findMyAgent",
        "kind": "locate",
        "entity": "Agent",
        "title": "Find my agent",
        "description": "The member opens an agent that acts on their behalf.",
        "icon": "search"
      },
      {
        "stepId": "readMyConduct",
        "kind": "inspect",
        "entity": "PersonalConduct",
        "title": "Read my conduct",
        "description": "The member reads how the agent currently behaves for them, as kept by the cm.",
        "icon": "book-open"
      },
      {
        "stepId": "changeConduct",
        "kind": "act",
        "entity": "PersonalConduct",
        "effect": "update",
        "title": "Say what to change",
        "description": "The member writes what should change for them; the cm updates only their own conduct and the module records the change with who, when and a one-line summary.",
        "icon": "pencil",
        "affects": [
          "ConductChange"
        ]
      },
      {
        "stepId": "readMyConductHistory",
        "kind": "inspect",
        "entity": "ConductChange",
        "title": "Read my change history",
        "description": "The member reads only their own conduct changes, newest first, each with when and a one-line summary.",
        "icon": "history"
      }
    ],
    "outcome": {
      "statement": "The agent behaves as the member asked when acting on their behalf, without affecting others.",
      "evidence": [
        "The member's conduct shows the change",
        "The history lists the change with when and a one-line summary"
      ]
    }
  },
  "businessHash": "sha256:6d8f38e5aab6e32da7475db1f9443f617bd9f0c6cc0d00e48b55edc0950bf3d0"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ChangeMyConductJourneyType = typeof changeMyConductJourney;

export default changeMyConductJourney;
