/// <mls fileReference="_102047_/l2/agents/web/shared/agent_activity.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "agentId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:executionTimeline",
        "persist": false,
        "required": true
      }
    }
  },
  "requests": {
    "getAgentActivity": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "agent",
        "executions"
      ]
    },
    "listAgentExecutions": {
      "kind": "qry",
      "trigger": "listAgentExecutions",
      "returns": [
        "executions"
      ]
    }
  },
  "states": {
    "agent": {
      "source": "getAgentActivity.agent",
      "description": "The agent whose activity is listed, by its readable name.",
      "organisms": [
        "executionTimeline"
      ]
    },
    "executions": {
      "source": "getAgentActivity.executions",
      "description": "the list of One finished execution of an agent: when it started, its details with actions and results, and the person who called it when known.",
      "organisms": [
        "executionTimeline"
      ]
    }
  },
  "journeys": [
    {
      "step": "followAgentActivity/browseAgents",
      "organisms": [],
      "continuesIn": "agents"
    },
    {
      "step": "followAgentActivity/readOverview",
      "organisms": [],
      "continuesIn": "agent_overview"
    },
    {
      "step": "followAgentActivity/readActivity",
      "organisms": [
        "executionTimeline"
      ]
    }
  ],
  "rules": [
    "activityNewestFirst",
    "noTechnicalIdsOnScreen"
  ],
  "access": {
    "actors": [
      "companyAdmin",
      "organizationMember"
    ],
    "grants": [
      "adminManageAgents",
      "adminChoosePeople",
      "adminReadActivity",
      "memberSeeAgents",
      "memberReadActivity",
      "memberSeePeopleNames"
    ]
  }
} as const;
