/// <mls fileReference="_102047_/l4/agents/ontology/ExecutionSummary.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsEntityExecutionSummary = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agents",
  "entityId": "ExecutionSummary",
  "title": "Execution summary",
  "description": "The summary of one finished execution of an agent sent by the cm: when, how long, cost, actions and their results, whether a person took over, and the link to the conversation. The same execution is never recorded twice.",
  "displayField": "startedAt",
  "relationships": {
    "agent": {
      "relationshipId": "executionAgent",
      "to": "Agent",
      "via": "ExecutionSummary.agentId",
      "cardinality": "N:1",
      "title": "Agent that ran",
      "mode": "fk",
      "required": true
    },
    "requester": {
      "relationshipId": "executionRequester",
      "to": "OrganizationUser",
      "via": "ExecutionSummary.personId",
      "cardinality": "N:1",
      "title": "Person who called the agent",
      "mode": "fk",
      "required": "when the cm knows who called the agent"
    }
  },
  "capabilities": {
    "create": "Records the summary the cm sends for each finished execution, written by the execution recording process with no screen open.",
    "uniqueKey": "Refuses a second summary with the same execution reference, so an execution that arrives again is recorded once.",
    "locate.byColumn": "Lists the executions of one agent, or those called by one person, newest first by start time, for the activity scenario used by every organization member.",
    "listByForeignKey": "Fills the activity scenario of an agent screen with the executions that point at that agent in one read.",
    "read.byId": "Reads one execution to show its actions, results and conversation link.",
    "count": "Counts the executions of an agent for the badge on its activity scenario.",
    "read.mdmRecord": "Reads the organization user behind the person column to show who called the agent.",
    "agents.openConversation": "Gives the link to the cm conversation of the execution so a member can open it from the activity list."
  },
  "rules": [
    "executionRecordedOnce",
    "onlyInboundWritesExecution",
    "executionNeverEdited",
    "activityNewestFirst"
  ],
  "writer": "inbound",
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "agents_executionsummary",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "agentId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Agent"
        ],
        "title": "Agent",
        "description": "The agent that ran. The table stores the cm id of the agent; the agent itself lives in the cm."
      },
      "personId": {
        "type": "record",
        "indexed": true,
        "to": [
          "OrganizationUser"
        ],
        "title": "Person who called the agent",
        "description": "The organization member who called the agent in this execution, when the cm knows who it was."
      },
      "executionRef": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "title": "Execution reference",
        "description": "The cm's own identifier of the finished execution. It makes the same execution never be recorded twice when the summary arrives again. It is never shown on screen.",
        "maxLength": 120
      },
      "startedAt": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "title": "Started at",
        "description": "When the execution began. The activity list shows it newest first."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Execution details",
        "description": "Everything the cm reported about the execution that nobody filters by.",
        "fields": {
          "durationMs": {
            "type": "integer",
            "required": true,
            "title": "Duration",
            "description": "How long the execution took, shown in plain time units.",
            "min": 0
          },
          "cost": {
            "type": "money",
            "title": "Cost",
            "description": "What the execution cost, as reported by the cm."
          },
          "tookOver": {
            "type": "boolean",
            "required": true,
            "title": "A person took over",
            "description": "Whether a person took over the conversation from the agent during this execution."
          },
          "conversationLink": {
            "type": "string",
            "title": "Conversation link",
            "description": "Link that opens the conversation in the cm where this execution happened.",
            "maxLength": 500
          },
          "actions": {
            "type": "object",
            "collection": true,
            "title": "Actions and results",
            "description": "The actions the agent performed in this execution, each with its result, in the order they happened.",
            "fields": {
              "toolName": {
                "type": "string",
                "required": true,
                "title": "Action",
                "description": "Readable name of the action the agent performed.",
                "maxLength": 200
              },
              "result": {
                "type": "enum",
                "required": true,
                "values": [
                  {
                    "value": "succeeded",
                    "title": "Succeeded"
                  },
                  {
                    "value": "failed",
                    "title": "Failed"
                  },
                  {
                    "value": "refused",
                    "title": "Refused"
                  }
                ],
                "title": "Result",
                "description": "Whether the action worked."
              },
              "resultNote": {
                "type": "text",
                "title": "Result note",
                "description": "A short sentence about what happened, in plain language.",
                "maxLength": 1000
              }
            }
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "executionRef"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgentsEntityExecutionSummaryType = typeof agentsEntityExecutionSummary;

export default agentsEntityExecutionSummary;
