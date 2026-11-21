/// <mls fileReference="_102047_/l4/agents/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsIntegration = {
  "schemaVersion": "2026-11-20-ns5-integration-v5",
  "moduleName": "agents",
  "inbound": [],
  "outbound": [],
  "plugins": [],
  "connections": [
    {
      "connectionId": "cm",
      "operationId": "listAgents",
      "direction": "call",
      "usedBy": [
        "createVirtualEmployee.openAgentList",
        "createVirtualEmployee.followDraftSituation",
        "reviewAndActivateDraft.openReadyDraft",
        "changeAgentBehavior.findAgentForBehavior",
        "adjustAgentTools.findAgentForTools",
        "configureAgent.findAgentForConfig",
        "simulateAgentByRole.findAgentToSimulate",
        "followAgentActivity.browseAgents",
        "simulateAsMyself.findAgentForMe",
        "changeMyConduct.findMyAgent",
        "virtualEmployeeCreation.waitDraftPreparation",
        "toolCatalogRefresh.chooseNewToolsPerAgent"
      ],
      "entityRefs": [
        "Agent"
      ],
      "effect": "list",
      "description": "Shows the list of agents from the cm; for each agent only its name, its situation and the reason of a refusal are read from the cm."
    },
    {
      "connectionId": "cm",
      "operationId": "readAgent",
      "direction": "call",
      "usedBy": [
        "reviewAndActivateDraft.reviewDraft",
        "changeAgentBehavior.readBehavior",
        "configureAgent.readConfiguration",
        "followAgentActivity.readOverview",
        "changeMyConduct.readMyConduct",
        "virtualEmployeeCreation.reviewDraft"
      ],
      "entityRefs": [
        "Agent",
        "AgentBehavior",
        "PersonalConduct"
      ],
      "effect": "read",
      "description": "Reads one agent from the cm: what it is, its behavior, whether it is on, who is responsible, its limits and the version read."
    },
    {
      "connectionId": "cm",
      "operationId": "updateAgent",
      "direction": "call",
      "usedBy": [
        "changeAgentBehavior.requestBehaviorChange",
        "configureAgent.saveConfiguration",
        "changeMyConduct.changeConduct"
      ],
      "entityRefs": [
        "Agent",
        "PersonalConduct"
      ],
      "effect": "update",
      "description": "Changes an agent in the cm by a prompt or by a field (behavior, @name, on or off, responsible, limits, own conduct), with the version read and the author; a name already used by another active agent is refused and the screen says so."
    },
    {
      "connectionId": "cm",
      "operationId": "listAgentHistory",
      "direction": "call",
      "usedBy": [
        "changeAgentBehavior.readBehavior"
      ],
      "entityRefs": [
        "AgentBehavior"
      ],
      "effect": "list",
      "description": "Shows the history of behavior changes of an agent with who, when and a one-line summary."
    },
    {
      "connectionId": "cm",
      "operationId": "undoAgentChange",
      "direction": "call",
      "usedBy": [
        "changeAgentBehavior.undoBehaviorChange"
      ],
      "entityRefs": [
        "AgentBehavior"
      ],
      "effect": "update",
      "description": "Undoes one behavior change of an agent in the cm, with the version read."
    },
    {
      "connectionId": "cm",
      "operationId": "simulateAgent",
      "direction": "call",
      "usedBy": [
        "reviewAndActivateDraft.simulateDraft",
        "simulateAgentByRole.simulateWhatItCan",
        "simulateAgentByRole.simulateWhatItUnderstands",
        "simulateAsMyself.seeWhatItCanForMe",
        "simulateAsMyself.seeWhatItUnderstandsForMe"
      ],
      "description": "Simulates an agent in the cm at the levels \"what it can\" and \"what it understands\"; nothing is saved.",
      "entityRefs": [
        "AgentSimulation"
      ],
      "effect": "create"
    },
    {
      "connectionId": "cm",
      "operationId": "createAgent",
      "direction": "call",
      "usedBy": [
        "createVirtualEmployee.describeAgent",
        "virtualEmployeeCreation.describeNewAgent"
      ],
      "entityRefs": [
        "Agent"
      ],
      "effect": "create",
      "description": "Sends the admin's request, already recorded in this module's draft with the prompt, requester and time, to the cm so it prepares the new virtual employee; the answer comes later through agentDraftReady."
    },
    {
      "connectionId": "cm",
      "operationId": "activateAgent",
      "direction": "call",
      "usedBy": [
        "reviewAndActivateDraft.activateDraft"
      ],
      "entityRefs": [
        "Agent"
      ],
      "effect": "update",
      "description": "Makes the agent of a ready draft, reviewed and activated in this module, the agent in force in the cm."
    },
    {
      "connectionId": "cm",
      "operationId": "discardAgentDraft",
      "direction": "call",
      "usedBy": [
        "reviewAndActivateDraft.discardDraft"
      ],
      "entityRefs": [
        "Agent"
      ],
      "effect": "remove",
      "description": "Tells the cm to throw away the agent it prepared for a ready draft discarded in this module."
    },
    {
      "connectionId": "cm",
      "operationId": "listCmTools",
      "direction": "call",
      "usedBy": [
        "toolCatalogRefresh.rebuildCatalog"
      ],
      "entityRefs": [
        "Tool"
      ],
      "effect": "list",
      "description": "Lists the cm's own tools so they enter the tool catalog when it is rebuilt, each storing its whole catalog item as delivered, replaced on every rebuild."
    },
    {
      "connectionId": "cm",
      "operationId": "runAiPrompt",
      "direction": "call",
      "usedBy": [
        "toolCatalogRefresh.chooseNewToolsPerAgent"
      ],
      "entityRefs": [
        "AgentTool"
      ],
      "effect": "create",
      "description": "For every agent of the company, read from the cm and not only agents that already have tool choices, chooses from its description which new tools of the release are turned on for it; choices made by the admin are never changed."
    },
    {
      "connectionId": "cm",
      "operationId": "agentDraftReady",
      "direction": "serve",
      "usedBy": [
        "Receives the end of a draft preparation: when ready, the draft becomes ready keeping the suggested tools and those tools are turned on for that agent; when refused, the draft becomes refused keeping the reason; a repeated notice changes nothing."
      ],
      "description": "The cm tells that a draft is ready with suggested tools or refused with a reason; it updates this module's draft from preparing to ready (keeping the suggested tools) or to refused (keeping the reason).",
      "entityEffects": [
        {
          "entityId": "AgentDraft",
          "effects": [
            "update"
          ]
        },
{
          "entityId": "AgentTool",
          "effects": [
            "create"
          ]
        }
      ]
    },
    {
      "connectionId": "cm",
      "operationId": "describe",
      "direction": "serve",
      "usedBy": [
        "Answers the cm's request to describe an agent for a person with only the tools that are on for that agent, minus the tools that person is restricted from, each with its whole stored catalog item; nothing is invented and nothing is written."
      ],
      "description": "Read only: returns the agent's tools that are on, leaving out the tools the person is restricted from, each with the whole catalog item stored for it as the platform delivered it; it invents nothing and never writes.",
      "entityEffects": [
        {
          "entityId": "AgentTool",
          "effects": [
            "list"
          ]
        },
        {
          "entityId": "PersonToolRestriction",
          "effects": [
            "list"
          ]
        },
        {
          "entityId": "Tool",
          "effects": [
            "list"
          ]
        }
      ]
    },
    {
      "connectionId": "cm",
      "operationId": "record",
      "direction": "serve",
      "usedBy": [
        "Records the summary of one finished execution of an agent; the same execution is never recorded twice."
      ],
      "description": "Stores when, how long, cost, actions and results, whether a person took over and the link to the conversation.",
      "entityEffects": [
        {
          "entityId": "ExecutionSummary",
          "effects": [
            "create"
          ]
        }
      ]
    },
    {
      "connectionId": "platform",
      "operationId": "releaseCatalogChanged",
      "direction": "serve",
      "usedBy": [
        "Rebuilds the tool catalog when a module is created or a new release arrives; tools that leave the release are marked removed and never deleted."
      ],
      "description": "The release routine delivers the actions of every module: new actions create tools, actions matching an existing tool by toolKey update it, and tools that left the release are marked removed. Only the actions the platform marks as usable by the assistant become tools; those that only serve as options are left out. A tool without its own description uses its title. Every rebuild replaces each tool's stored catalog item with the whole item as the platform delivers it, so the stored catalog never goes stale.",
      "entityEffects": [
        {
          "entityId": "Tool",
          "effects": [
            "create",
            "update"
          ]
        }
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type AgentsIntegrationType = typeof agentsIntegration;

export default agentsIntegration;
