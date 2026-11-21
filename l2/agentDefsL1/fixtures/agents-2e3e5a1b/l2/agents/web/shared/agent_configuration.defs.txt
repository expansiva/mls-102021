/// <mls fileReference="_102047_/l2/agents/web/shared/agent_configuration.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "agentId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:agentConfigurationForm",
        "persist": false,
        "required": true
      }
    }
  },
  "requests": {
    "getAgentConfiguration": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "configuration",
        "limits"
      ]
    },
    "searchResponsibleCandidates": {
      "kind": "qry",
      "trigger": "searchResponsibleCandidates",
      "returns": [
        "users"
      ]
    },
    "saveAgentConfiguration": {
      "kind": "cmd",
      "trigger": "saveConfiguration",
      "returns": [
        "configuration",
        "limits"
      ],
      "writes": "Agent.update"
    }
  },
  "states": {
    "configuration": {
      "source": "getAgentConfiguration.configuration",
      "description": "The editable configuration of one agent as the cm keeps it: its @name, whether it is on, its responsible person and the version of the record used for concurrency.",
      "organisms": [
        "agentConfigurationForm"
      ]
    },
    "users": {
      "source": "searchResponsibleCandidates.users",
      "description": "the list of An organization user who can be, or is, the person responsible for an agent: the reference saved on the agent plus the readable name, status and login e-mail.",
      "organisms": [
        "agentConfigurationForm"
      ]
    },
    "limits": {
      "source": "getAgentConfiguration.limits",
      "description": "the list of One limit the cm applies to an agent: its readable name and its current value.",
      "organisms": [
        "agentLimits"
      ]
    }
  },
  "journeys": [
    {
      "step": "configureAgent/findAgentForConfig",
      "organisms": [],
      "continuesIn": "agents"
    },
    {
      "step": "configureAgent/readConfiguration",
      "organisms": [
        "agentConfigurationForm",
        "agentLimits"
      ]
    },
    {
      "step": "configureAgent/saveConfiguration",
      "organisms": [
        "agentConfigurationForm"
      ]
    }
  ],
  "rules": [
    "agentNameUniqueAmongActive",
    "noTechnicalIdsOnScreen"
  ],
  "access": {
    "actors": [
      "companyAdmin"
    ],
    "grants": [
      "adminManageAgents",
      "adminChoosePeople"
    ]
  }
} as const;
