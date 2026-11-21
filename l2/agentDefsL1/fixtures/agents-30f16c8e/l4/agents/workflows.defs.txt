/// <mls fileReference="_102047_/l4/agents/workflows.defs.ts" enhancement="_blank"/>

import type { Ns5WorkflowsArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsWorkflows = {
  "schemaVersion": "2026-09-17-ns5-workflows-v3",
  "moduleName": "agents",
  "processes": [
    {
      "processId": "virtualEmployeeCreation",
      "title": "Create a virtual employee",
      "description": "The company admin asks for a new agent, the cm prepares a draft or refuses it, the suggested tools are turned on and the admin reviews, simulates and activates or discards the draft.",
      "trigger": {
        "kind": "manual",
        "actorRef": "companyAdmin"
      },
      "tasks": [
        {
          "taskId": "describeNewAgent",
          "kind": "human",
          "actorRef": "companyAdmin",
          "journeyRef": "createVirtualEmployee",
          "next": [
            "waitDraftPreparation"
          ],
          "description": "The admin describes the new agent and its functions; the module records the prompt, the requester and the time as a draft that starts as preparing, and then sends the request to the cm.",
          "icon": "user-plus"
        },
        {
          "taskId": "waitDraftPreparation",
          "kind": "wait",
          "next": [
            "applySuggestedTools"
          ],
          "description": "Wait for the cm arrival agentDraftReady, which reports the draft as ready with suggested tools or refused with a reason.",
          "icon": "hourglass",
          "wake": {
            "mode": "none"
          }
        },
        {
          "taskId": "applySuggestedTools",
          "kind": "mechanical",
          "entityRef": "AgentTool",
          "effect": "update",
          "next": [
            "reviewDraft"
          ],
          "description": "The arrival updates the draft to ready, keeping its suggested tools, or to refused, keeping the reason; when ready, the suggested tools are turned on for that agent without touching any choice the admin already made; a refused draft ends the occurrence with its reason shown; a repeated arrival changes nothing.",
          "icon": "wrench"
        },
        {
          "taskId": "reviewDraft",
          "kind": "human",
          "actorRef": "companyAdmin",
          "journeyRef": "reviewAndActivateDraft",
          "next": [],
          "description": "The admin reviews the ready draft, adjusts its tools and simulates it, then uses three separate steps: first chooses the outcome, then either activates the draft (ready to activated) or discards it (ready to discarded); only a ready draft can be decided on.",
          "icon": "clipboard-check"
        }
      ],
      "room": "person",
      "functions": [
        {
          "functionId": "startVirtualEmployeeRequest",
          "description": "Called by the screen or the cm on behalf of the company admin; validates the admin role and a non-empty prompt, records the draft in this module with the prompt, the requester and the time as preparing, sends the request to the cm and asks it to open the origin message and the Task referencing the draft, and returns the draft situation as preparing; a repeated call with the same request returns the same occurrence."
        },
        {
          "functionId": "receiveDraftOutcome",
          "description": "Called by the cm arrival cm.agentDraftReady; validates that the draft belongs to an open occurrence, updates the draft to ready keeping the suggested tools or to refused keeping the reason, turns on the suggested tools when ready, passes the turn to the admin and asks the cm to notify them; a notice that arrives again changes nothing and returns the current situation."
        },
        {
          "functionId": "resolveDraftReviewer",
          "description": "Called when the review stage opens; returns the company admin who described the draft, or another company admin when that person is no longer one, without writing anything."
        },
        {
          "functionId": "completeDraftReview",
          "description": "Called by the screen or the cm on behalf of the admin; validates the draft is ready, changes the draft from ready to activated or from ready to discarded in this module, asks the cm to act on the agent accordingly, closes the Task and asks the cm to notify; repeating the call after the outcome returns the recorded outcome unchanged."
        }
      ]
    },
    {
      "processId": "toolCatalogRefresh",
      "title": "Rebuild the tool catalog",
      "description": "When a release delivers the catalog of actions, the module creates the new tools, updates the existing ones matched by toolKey, replacing the whole stored catalog item of each tool with the item exactly as the platform delivers it, marks the ones that left as removed and chooses new tools for every agent of the company from its description.",
      "trigger": {
        "kind": "event",
        "event": "platform.releaseCatalogChanged"
      },
      "tasks": [
        {
          "taskId": "rebuildCatalog",
          "kind": "mechanical",
          "entityRef": "Tool",
          "effect": "update",
          "next": [
            "chooseNewToolsPerAgent"
          ],
          "description": "Create the tools for new actions of the release keeping the whole catalog item as the platform delivers it, update the existing tools matched by toolKey replacing their whole stored catalog item with the delivered one so it never goes stale, and mark the tools that left the release as removed, never deleting them.",
          "icon": "refresh-cw"
        },
        {
          "taskId": "chooseNewToolsPerAgent",
          "kind": "llm",
          "entityRef": "AgentTool",
          "effect": "update",
          "next": [],
          "description": "For every agent of the company, read from the cm and not only agents that already have tool choices, decide from its description which new tools should be on, never changing a choice the admin made.",
          "icon": "sparkles"
        }
      ],
      "room": "exclusive",
      "functions": [
        {
          "functionId": "applyReleaseCatalog",
          "description": "Called by the release arrival; validates the catalog, creates tools for new actions storing the whole catalog item as delivered, updates existing tools matched by toolKey replacing their whole stored catalog item with the delivered one, marks missing ones as removed, opens the occurrence and returns the counts of new, updated and removed tools; the same release delivered again changes nothing."
        },
        {
          "functionId": "chooseToolsForAgents",
          "description": "Called by the llm stage; for every agent of the company read from the cm, including agents with no tool choice yet, turns on suggested new tools only where the admin has made no choice, records the choice as automatic and returns the tools turned on; repeating it keeps the same result."
        }
      ]
    },
    {
      "processId": "executionRecording",
      "title": "Record an agent execution",
      "description": "When the cm sends the summary of a finished execution, the module records it once for the activity of the agent.",
      "trigger": {
        "kind": "event",
        "event": "cm.record"
      },
      "tasks": [
        {
          "taskId": "recordExecution",
          "kind": "mechanical",
          "entityRef": "ExecutionSummary",
          "effect": "create",
          "next": [],
          "description": "Store the execution summary with when, how long, cost, actions and results, whether a person took over and the link to the conversation.",
          "icon": "history"
        }
      ],
      "room": "exclusive",
      "functions": [
        {
          "functionId": "recordExecutionSummary",
          "description": "Called by the cm arrival cm.record; validates the agent and the execution identity, writes the summary and returns it; the same execution sent again is not recorded twice and returns the existing summary."
        }
      ]
    }
  ],
  "journeyDecisions": [
    {
      "journeyId": "createVirtualEmployee",
      "inProcess": true,
      "processId": "virtualEmployeeCreation"
    },
    {
      "journeyId": "reviewAndActivateDraft",
      "inProcess": true,
      "processId": "virtualEmployeeCreation"
    },
    {
      "journeyId": "changeAgentBehavior",
      "inProcess": false
    },
    {
      "journeyId": "adjustAgentTools",
      "inProcess": false
    },
    {
      "journeyId": "configureAgent",
      "inProcess": false
    },
    {
      "journeyId": "simulateAgentByRole",
      "inProcess": false
    },
    {
      "journeyId": "restrictPersonTools",
      "inProcess": false
    },
    {
      "journeyId": "followAgentActivity",
      "inProcess": false
    },
    {
      "journeyId": "simulateAsMyself",
      "inProcess": false
    },
    {
      "journeyId": "changeMyConduct",
      "inProcess": false
    }
  ]
} as const satisfies Ns5Readonly<Ns5WorkflowsArtifact>;

export type AgentsWorkflowsType = typeof agentsWorkflows;

export default agentsWorkflows;
