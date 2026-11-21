/// <mls fileReference="_102047_/l4/agents/journeys/reviewAndActivateDraft.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const reviewAndActivateDraftJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "reviewAndActivateDraft",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Review and activate a draft",
    "goal": "Check a ready draft, adjust its tools, simulate it and put it to work or discard it.",
    "icon": "bot",
    "entry": {
      "mode": "fromNotification"
    },
    "steps": [
      {
        "stepId": "openReadyDraft",
        "kind": "locate",
        "entity": "AgentDraft",
        "title": "Open the ready draft",
        "description": "The admin opens the draft the cm reported as ready, whose suggested tools are already on for it.",
        "icon": "bell"
      },
      {
        "stepId": "reviewDraft",
        "kind": "inspect",
        "entity": "AgentDraft",
        "title": "Review the draft",
        "description": "The admin reads what the agent is, who it talks to and its proposed behavior.",
        "icon": "eye"
      },
      {
        "stepId": "adjustDraftTools",
        "kind": "act",
        "entity": "AgentTool",
        "effect": "update",
        "title": "Adjust its tools",
        "description": "The admin turns tools on or off in the module / subject / action tree; these choices are never overridden by the automatic choice.",
        "icon": "wrench"
      },
      {
        "stepId": "simulateDraft",
        "kind": "inspect",
        "entity": "AgentSimulation",
        "title": "Simulate the draft",
        "description": "The admin checks what the agent can do for a chosen role and what it understands from a sample sentence.",
        "icon": "play"
      },
      {
        "stepId": "chooseDraftOutcome",
        "kind": "decide",
        "entity": "AgentDraft",
        "title": "Activate or discard",
        "description": "The admin decides whether the ready draft becomes an active agent or is discarded; only a ready draft can be decided on.",
        "icon": "git-branch"
      },
      {
        "stepId": "activateDraft",
        "kind": "act",
        "entity": "AgentDraft",
        "effect": "transition",
        "transitionRef": "activate",
        "title": "Activate the agent",
        "description": "The ready draft becomes activated and is put to work as an agent.",
        "icon": "check",
        "decisionRef": "chooseDraftOutcome"
      },
      {
        "stepId": "discardDraft",
        "kind": "act",
        "entity": "AgentDraft",
        "effect": "transition",
        "transitionRef": "discard",
        "title": "Discard the draft",
        "description": "The ready draft becomes discarded.",
        "icon": "x",
        "decisionRef": "chooseDraftOutcome"
      }
    ],
    "outcome": {
      "statement": "The draft is either an active agent with the reviewed tools or discarded.",
      "evidence": [
        "An activated agent shows on the list as on, with its responsible person",
        "A discarded draft no longer shows as ready"
      ]
    }
  },
  "businessHash": "sha256:3382c68113e644b0381abbf001cde313d7807f1178213b2af5eedc0aa4ba10ac"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ReviewAndActivateDraftJourneyType = typeof reviewAndActivateDraftJourney;

export default reviewAndActivateDraftJourney;
