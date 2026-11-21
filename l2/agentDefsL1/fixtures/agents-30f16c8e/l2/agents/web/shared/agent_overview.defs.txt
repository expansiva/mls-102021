/// <mls fileReference="_102047_/l2/agents/web/shared/agent_overview.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "agentId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:agentOverviewDetail",
        "persist": false,
        "required": true
      }
    }
  },
  "requests": {
    "getAgentOverview": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "agent"
      ]
    }
  },
  "states": {
    "agent": {
      "source": "getAgentOverview.agent",
      "description": "An agent of the organization as the cm keeps it, read only: its @name, whether it is on, what it is, who it talks to, on whose behalf it acts and the name of the person responsible for it.",
      "organisms": [
        "agentOverviewDetail"
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
      "organisms": [
        "agentOverviewDetail"
      ]
    },
    {
      "step": "followAgentActivity/readActivity",
      "organisms": [],
      "continuesIn": "agent_activity"
    }
  ],
  "rules": [
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
      "memberSeeAgents",
      "memberSeePeopleNames"
    ]
  }
} as const;
