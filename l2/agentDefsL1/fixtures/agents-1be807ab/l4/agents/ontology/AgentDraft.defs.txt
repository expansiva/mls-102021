/// <mls fileReference="_102047_/l4/agents/ontology/AgentDraft.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityAgentDraft = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "AgentDraft",
  "title": "Agent draft",
  "description": "A virtual employee the cm prepares from the admin's prompt, with its situation (preparing, ready, or refused with the reason); it is activated or discarded through the cm and stays in the cm.",
  "displayField": "name",
  "relationships": {},
  "capabilities": {},
  "rules": [
    "agentDraftSuggestedToolsOnWhenReady",
    "agentDraftNoticeIdempotent",
    "agentNameUniqueAmongActive",
    "adminChoiceNotOverriddenByAutomatic",
    "draftDecisionOnlyWhenReady",
    "refusalReasonShownWhenRefused"
  ],
  "kind": "external",
  "connectionId": "cm",
  "record": {
    "fields": {
      "name": {
        "type": "string",
        "required": true,
        "title": "Name",
        "description": "The name the new virtual employee would be called by in a chat (shown as @name)."
      },
      "prompt": {
        "type": "text",
        "required": true,
        "title": "Description of the new agent",
        "description": "What the admin wrote to describe the new agent and its functions, in plain words."
      },
      "situation": {
        "type": "enum",
        "required": true,
        "values": [
          {
            "value": "preparing",
            "title": "Preparing"
          },
          {
            "value": "ready",
            "title": "Ready"
          },
          {
            "value": "refused",
            "title": "Refused"
          },
          {
            "value": "activated",
            "title": "Activated"
          },
          {
            "value": "discarded",
            "title": "Discarded"
          }
        ],
        "title": "Situation",
        "description": "Where the draft stands in the cm, as shown on the first screen."
      },
      "refusalReason": {
        "type": "text",
        "title": "Reason for refusal",
        "description": "Why the cm refused to prepare the draft; shown only when the draft was refused."
      },
      "summary": {
        "type": "text",
        "title": "What the agent is",
        "description": "A plain-language description of the proposed agent, prepared by the cm."
      },
      "audience": {
        "type": "text",
        "title": "Who it talks to",
        "description": "The people or groups the proposed agent would talk to."
      },
      "onBehalfOf": {
        "type": "text",
        "title": "On whose behalf it acts",
        "description": "Whether the agent acts in its own name or on behalf of a person, as proposed by the cm."
      },
      "proposedBehavior": {
        "type": "text",
        "title": "Proposed behavior",
        "description": "The behavior the cm proposes for the agent, in plain language."
      },
      "suggestedTools": {
        "type": "record",
        "collection": true,
        "to": [
          "Tool"
        ],
        "title": "Suggested tools",
        "description": "The tools from the catalog the cm suggested for this agent; they are turned on for it when the draft is reported ready."
      },
      "requestedBy": {
        "type": "record",
        "to": [
          "OrganizationUser"
        ],
        "title": "Requested by",
        "description": "The company admin who described the new agent."
      },
      "requestedAt": {
        "type": "timestamp",
        "title": "Requested on",
        "description": "When the admin sent the description to the cm."
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityAgentDraftType = typeof agentsEntityAgentDraft;

export default agentsEntityAgentDraft;
