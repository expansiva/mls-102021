/// <mls fileReference="_102047_/l4/agents/journeys/restrictPersonTools.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const restrictPersonToolsJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "restrictPersonTools",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Restrict a person's tools",
    "goal": "Mark the tools a person may not use through any agent.",
    "icon": "user-x",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "choosePerson",
        "kind": "locate",
        "entity": "PersonToolRestriction",
        "title": "Choose the person",
        "description": "The admin picks the person from the organization users.",
        "icon": "users"
      },
      {
        "stepId": "reviewRestrictions",
        "kind": "inspect",
        "entity": "PersonToolRestriction",
        "title": "Review current restrictions",
        "description": "The admin sees the tool checklist with the tools already blocked for this person.",
        "icon": "list-checks"
      },
      {
        "stepId": "markRestrictions",
        "kind": "act",
        "entity": "PersonToolRestriction",
        "effect": "update",
        "title": "Mark blocked tools",
        "description": "The admin checks or unchecks the tools this person may not use through any agent.",
        "icon": "ban"
      }
    ],
    "outcome": {
      "statement": "No agent offers the blocked tools when this person calls it.",
      "evidence": [
        "The checklist shows the blocked tools for the person",
        "A simulation for the person shows those tools as not usable"
      ]
    }
  },
  "businessHash": "sha256:2e34c019fda89daebbfd214cc7c9530186f1fcf970e1ac9de3b173399b299fd1"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type RestrictPersonToolsJourneyType = typeof restrictPersonToolsJourney;

export default restrictPersonToolsJourney;
