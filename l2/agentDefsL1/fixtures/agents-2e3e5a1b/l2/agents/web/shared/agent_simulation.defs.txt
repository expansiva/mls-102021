/// <mls fileReference="_102047_/l2/agents/web/shared/agent_simulation.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "agentId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:whatItCan",
        "persist": false,
        "required": true
      }
    }
  },
  "requests": {
    "getSimulationPage": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "agent",
        "whatItCan"
      ]
    },
    "simulateWhatItCan": {
      "kind": "qry",
      "trigger": "simulateWhatItCan",
      "returns": [
        "whatItCan"
      ]
    },
    "findPeopleToSimulate": {
      "kind": "qry",
      "trigger": "findPeopleToSimulate",
      "returns": [
        "people"
      ]
    },
    "simulateWhatItUnderstands": {
      "kind": "qry",
      "trigger": "simulateWhatItUnderstands",
      "returns": [
        "whatItUnderstands"
      ]
    }
  },
  "states": {
    "agent": {
      "source": "getSimulationPage.agent",
      "description": "The agent being simulated, identified by its @name.",
      "organisms": [
        "whatItCan",
        "whatItUnderstands"
      ]
    },
    "whatItCan": {
      "source": "getSimulationPage.whatItCan",
      "description": "The 'what it can' simulation of an agent for one person or role: who it was run for and the verdict for each tool.",
      "organisms": [
        "whatItCan"
      ]
    },
    "people": {
      "source": "findPeopleToSimulate.people",
      "description": "the list of An active organization user a simulation can be run for, with a reference and a readable name.",
      "organisms": [
        "whatItCan"
      ]
    },
    "whatItUnderstands": {
      "source": "simulateWhatItUnderstands.whatItUnderstands",
      "description": "The 'what it understands' simulation of an agent for one sentence.",
      "organisms": [
        "whatItUnderstands"
      ]
    }
  },
  "journeys": [
    {
      "step": "simulateAgentByRole/findAgentToSimulate",
      "organisms": [],
      "continuesIn": "agents"
    },
    {
      "step": "simulateAgentByRole/simulateWhatItCan",
      "organisms": [
        "whatItCan"
      ]
    },
    {
      "step": "simulateAgentByRole/simulateWhatItUnderstands",
      "organisms": [
        "whatItUnderstands"
      ]
    },
    {
      "step": "simulateAsMyself/findAgentForMe",
      "organisms": [],
      "continuesIn": "agents"
    },
    {
      "step": "simulateAsMyself/seeWhatItCanForMe",
      "organisms": [
        "whatItCan"
      ]
    },
    {
      "step": "simulateAsMyself/seeWhatItUnderstandsForMe",
      "organisms": [
        "whatItUnderstands"
      ]
    }
  ],
  "rules": [
    "adminSimulatesByRole",
    "memberSimulatesOnlyAsSelf",
    "noTechnicalIdsOnScreen",
    "onlyActiveUsersRestricted",
    "onlyToolsOnAreConsidered",
    "personRestrictionAppliesInRequest",
    "removedToolNotSent",
    "restrictionAppliesThroughAnyAgent",
    "simulationSavesNothing"
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
      "memberSeePeopleNames",
      "memberSimulateAsMyself"
    ]
  }
} as const;
