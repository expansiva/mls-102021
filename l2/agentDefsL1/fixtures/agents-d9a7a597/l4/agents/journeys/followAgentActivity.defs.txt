/// <mls fileReference="_102047_/l4/agents/journeys/followAgentActivity.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const followAgentActivityJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "followAgentActivity",
  "business": {
    "actorRef": "organizationMember",
    "title": "See agents and their activity",
    "goal": "Know which agents exist, what they are for and what they did.",
    "icon": "activity",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "browseAgents",
        "kind": "locate",
        "entity": "Agent",
        "title": "Browse the agents",
        "description": "The member sees the agent cards with name, who it talks to, whether it is on and who is responsible.",
        "icon": "list"
      },
      {
        "stepId": "readOverview",
        "kind": "inspect",
        "entity": "Agent",
        "title": "Read the overview",
        "description": "The member reads what the agent is, who it talks to and on whose behalf it acts.",
        "icon": "info"
      },
      {
        "stepId": "readActivity",
        "kind": "inspect",
        "entity": "ExecutionSummary",
        "title": "See what it did",
        "description": "The member reads the executions newest first: when, how long, cost, actions and results, whether a person took over, and the link to the conversation.",
        "icon": "history"
      }
    ],
    "outcome": {
      "statement": "The member understands what the agent is and what it has been doing.",
      "evidence": [
        "The overview is shown read only",
        "The activity list shows the executions newest first"
      ]
    }
  },
  "businessHash": "sha256:a461290306fa9e3beaf4b55c463f875c95bf135f7de2232bb660ff1fd8a77b8a"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type FollowAgentActivityJourneyType = typeof followAgentActivityJourney;

export default followAgentActivityJourney;
