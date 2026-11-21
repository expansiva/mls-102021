/// <mls fileReference="_102047_/l2/agents/web/shared/agent_tools.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "agentId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:agentToolTree",
        "persist": false,
        "required": true
      },
      "toolId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "prefill:agentToolTree",
        "persist": false,
        "required": false
      }
    }
  },
  "requests": {
    "getAgentToolTree": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "name",
        "actions"
      ]
    },
    "listAutomaticToolChoices": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "choices"
      ]
    },
    "enableUnchosenTool": {
      "kind": "cmd",
      "trigger": "enableUnchosenTool",
      "returns": [
        "action"
      ],
      "writes": "AgentTool.create"
    },
    "toggleToolChoice": {
      "kind": "cmd",
      "trigger": "toggleToolChoice",
      "returns": [
        "action"
      ],
      "writes": "AgentTool.update"
    }
  },
  "states": {
    "name": {
      "source": "getAgentToolTree.name",
      "description": "the name that getAgentToolTree returns",
      "organisms": [
        "agentToolTree"
      ]
    },
    "actions": {
      "source": "getAgentToolTree.actions",
      "description": "the list of One action of the tool catalog in the module / subject / action tree, with the agent's choice for it when one exists.",
      "organisms": [
        "agentToolTree"
      ]
    },
    "choices": {
      "source": "listAutomaticToolChoices.choices",
      "description": "the list of A tool choice of an agent made by an automatic step, with the release of its tool.",
      "organisms": [
        "automaticToolChoices"
      ]
    }
  },
  "journeys": [
    {
      "step": "adjustAgentTools/findAgentForTools",
      "organisms": [],
      "continuesIn": "agents"
    },
    {
      "step": "adjustAgentTools/browseToolTree",
      "organisms": [
        "agentToolTree",
        "automaticToolChoices"
      ]
    },
    {
      "step": "adjustAgentTools/enableUnchosenTool",
      "organisms": [
        "agentToolTree"
      ]
    },
    {
      "step": "adjustAgentTools/toggleTools",
      "organisms": [
        "agentToolTree"
      ]
    }
  ],
  "rules": [
    "adminChoiceNeverOverridden",
    "agentToolsShowWholeCatalog",
    "draftSuggestedToolsTurnedOn",
    "markingWithoutChoiceCreatesAdminChoice",
    "newToolsChosenFromDescription",
    "noTechnicalIdsOnScreen",
    "oneChoicePerAgentAndTool",
    "removedToolNeverSent"
  ],
  "access": {
    "actors": [
      "companyAdmin"
    ],
    "grants": [
      "adminManageAgents",
      "adminManageTools"
    ]
  }
} as const;
