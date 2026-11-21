/// <mls fileReference="_102047_/l2/agents/web/shared/draft_review.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {
      "draftId": {
        "type": "string",
        "sources": [
          "url",
          "localStorage"
        ],
        "effect": "filter:draftSummary",
        "persist": true,
        "required": true
      },
      "agentDraftId": {
        "type": "string",
        "sources": [
          "url"
        ],
        "effect": "select:draftSummary",
        "persist": false,
        "required": false
      }
    }
  },
  "requests": {
    "getDraftReview": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "draft",
        "tools"
      ]
    },
    "searchSimulationPeople": {
      "kind": "qry",
      "trigger": "searchSimulationPeople",
      "returns": [
        "people"
      ]
    },
    "simulateDraft": {
      "kind": "qry",
      "trigger": "simulateDraft",
      "returns": [
        "simulation"
      ]
    },
    "saveDraftTools": {
      "kind": "cmd",
      "trigger": "saveDraftTools",
      "returns": [
        "tools"
      ],
      "writes": "AgentTool.update"
    },
    "activateDraft": {
      "kind": "cmd",
      "trigger": "activateDraft",
      "returns": [
        "draft"
      ],
      "writes": "AgentDraft.activate"
    },
    "discardDraft": {
      "kind": "cmd",
      "trigger": "discardDraft",
      "returns": [
        "draft"
      ],
      "writes": "AgentDraft.discard"
    }
  },
  "states": {
    "draft": {
      "source": "getDraftReview.draft",
      "description": "A ready agent draft prepared by the cm: who the new agent would be, what it does, who it talks to, on whose behalf it acts, its proposed behavior, the original description, who requested it and when, and its situation.",
      "organisms": [
        "draftDecision",
        "draftSummary"
      ]
    },
    "tools": {
      "source": "getDraftReview.tools",
      "description": "the list of One tool choice of the draft's agent: whether it is on, who made the choice and when, with the catalog tool it refers to.",
      "organisms": [
        "draftTools"
      ]
    },
    "simulation": {
      "source": "simulateDraft.simulation",
      "description": "The result of one simulation of the draft, at the 'what it can' or 'what it understands' level; nothing of it is stored.",
      "organisms": [
        "draftSimulation"
      ]
    },
    "people": {
      "source": "searchSimulationPeople.people",
      "description": "the list of An active organization user with a platform login, with an opaque reference to choose them for a simulation.",
      "organisms": [
        "draftSimulation"
      ]
    }
  },
  "journeys": [
    {
      "step": "reviewAndActivateDraft/openReadyDraft",
      "organisms": [
        "draftSummary",
        "draftDecision"
      ]
    },
    {
      "step": "reviewAndActivateDraft/reviewDraft",
      "organisms": [
        "draftSummary"
      ]
    },
    {
      "step": "reviewAndActivateDraft/adjustDraftTools",
      "organisms": [
        "draftTools"
      ]
    },
    {
      "step": "reviewAndActivateDraft/simulateDraft",
      "organisms": [
        "draftSimulation"
      ]
    },
    {
      "step": "reviewAndActivateDraft/activateDraft",
      "organisms": [
        "draftDecision"
      ],
      "continuesIn": "agents"
    },
    {
      "step": "reviewAndActivateDraft/discardDraft",
      "organisms": [
        "draftDecision"
      ],
      "continuesIn": "agents"
    }
  ],
  "rules": [
    "adminChoiceNeverOverridden",
    "adminChoiceNotOverriddenByAutomatic",
    "adminSimulatesByRole",
    "agentDraftSuggestedToolsOnWhenReady",
    "agentNameUniqueAmongActive",
    "draftDecisionOnlyWhenReady",
    "draftSuggestedToolsTurnedOn",
    "noTechnicalIdsOnScreen",
    "oneChoicePerAgentAndTool",
    "onlyActiveUsersRestricted",
    "onlyToolsOnAreConsidered",
    "personRestrictionAppliesInRequest",
    "removedToolNeverSent",
    "removedToolNotSent",
    "simulationSavesNothing"
  ],
  "access": {
    "actors": [
      "companyAdmin"
    ],
    "grants": [
      "adminManageAgents",
      "adminManageTools",
      "adminChoosePeople"
    ]
  }
} as const;
