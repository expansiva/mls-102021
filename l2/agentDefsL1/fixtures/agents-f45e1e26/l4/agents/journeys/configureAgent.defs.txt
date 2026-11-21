/// <mls fileReference="_102047_/l4/agents/journeys/configureAgent.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const configureAgentJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "configureAgent",
  "business": {
    "actorRef": "companyAdmin",
    "title": "Configure an agent",
    "goal": "Set how people call the agent, whether it is on and who is responsible for it.",
    "icon": "settings",
    "entry": {
      "mode": "contextOrLookup"
    },
    "steps": [
      {
        "stepId": "findAgentForConfig",
        "kind": "locate",
        "entity": "Agent",
        "title": "Find the agent",
        "description": "The admin opens the agent and its configuration scenario.",
        "icon": "search"
      },
      {
        "stepId": "readConfiguration",
        "kind": "inspect",
        "entity": "Agent",
        "title": "Read the configuration",
        "description": "The admin sees the @name, whether it is on, the responsible person and the limits as the cm lists them.",
        "icon": "eye"
      },
      {
        "stepId": "saveConfiguration",
        "kind": "act",
        "entity": "Agent",
        "effect": "update",
        "title": "Save the changes",
        "description": "The admin changes the @name, on or off and the responsible person through the cm, which refuses a name already used by another active agent and the screen says so.",
        "icon": "save"
      }
    ],
    "outcome": {
      "statement": "The agent's configuration is updated in the cm, or the admin knows why the name was refused.",
      "evidence": [
        "The configuration shows the new @name, state and responsible person",
        "A refused name shows a clear message"
      ]
    }
  },
  "businessHash": "sha256:6f6670d53ef926ae6b1e009d36f0d75792dd9771bc11e0417c419e84b87f3652"
} as const satisfies Ns5Readonly<Ns5JourneyArtifact>;

export type ConfigureAgentJourneyType = typeof configureAgentJourney;

export default configureAgentJourney;
