/// <mls fileReference="_102047_/l4/agents/journeys/index.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyIndexArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsJourneyIndex = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "moduleName": "agents",
  "journeys": [
    {
      "journeyId": "createVirtualEmployee",
      "actorRef": "companyAdmin",
      "title": "Create a virtual employee"
    },
    {
      "journeyId": "reviewAndActivateDraft",
      "actorRef": "companyAdmin",
      "title": "Review and activate a draft"
    },
    {
      "journeyId": "changeAgentBehavior",
      "actorRef": "companyAdmin",
      "title": "Change an agent's behavior"
    },
    {
      "journeyId": "adjustAgentTools",
      "actorRef": "companyAdmin",
      "title": "Adjust an agent's tools"
    },
    {
      "journeyId": "configureAgent",
      "actorRef": "companyAdmin",
      "title": "Configure an agent"
    },
    {
      "journeyId": "simulateAgentByRole",
      "actorRef": "companyAdmin",
      "title": "Simulate an agent by role"
    },
    {
      "journeyId": "restrictPersonTools",
      "actorRef": "companyAdmin",
      "title": "Restrict a person's tools"
    },
    {
      "journeyId": "followAgentActivity",
      "actorRef": "organizationMember",
      "title": "See agents and their activity"
    },
    {
      "journeyId": "simulateAsMyself",
      "actorRef": "organizationMember",
      "title": "Simulate an agent as myself"
    },
    {
      "journeyId": "changeMyConduct",
      "actorRef": "organizationMember",
      "title": "Change my conduct with an agent"
    }
  ],
  "systemDecisions": []
} as const satisfies Ns5Readonly<Ns5JourneyIndexArtifact>;

export type AgentsJourneyIndexType = typeof agentsJourneyIndex;

export default agentsJourneyIndex;
