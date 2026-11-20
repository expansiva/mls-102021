/// <mls fileReference="_102047_/l4/agents/journeys/createVirtualEmployee.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const createVirtualEmployeeJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "createVirtualEmployee",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Create a virtual employee",
    "goal": "Ask for a new agent by describing it and its functions in plain words.",
    "icon": "user-plus",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "openAgentList",
        "kind": "locate",
        "entity": "Agent",
        "title": "Open the agents list",
        "description": "The admin opens the first screen with the agents and drafts and chooses to create a new virtual employee.",
        "icon": "list"
      },
      {
        "stepId": "describeAgent",
        "kind": "act",
        "entity": "AgentDraft",
        "effect": "create",
        "title": "Describe the new agent",
        "description": "The admin writes a prompt describing the new agent and its functions, and the request goes to the cm, which prepares a draft or refuses it.",
        "icon": "sparkles"
      },
      {
        "stepId": "followDraftSituation",
        "kind": "inspect",
        "entity": "AgentDraft",
        "title": "Follow the draft situation",
        "description": "The admin sees the draft on the list as preparing, ready, or refused with the reason.",
        "icon": "hourglass"
      }
    ],
    "outcome": {
      "statement": "A draft request for the new virtual employee is with the cm and visible on the agents list.",
      "evidence": [
        "The draft card appears on the first screen as preparing",
        "When refused, the card shows the reason given by the cm"
      ]
    }
  },
  "businessHash": "sha256:05bae0a5dd340dd381fa0536abda9e2d52f80bee4da898fc0620ad27e9f21e3b"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type CreateVirtualEmployeeJourneyType = typeof createVirtualEmployeeJourney;

export default createVirtualEmployeeJourney;
