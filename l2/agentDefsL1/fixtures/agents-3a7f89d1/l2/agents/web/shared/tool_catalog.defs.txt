/// <mls fileReference="_102047_/l2/agents/web/shared/tool_catalog.defs.ts" enhancement="_blank"/>

export const definition = {
  "entry": {
    "params": {}
  },
  "requests": {
    "getToolCatalog": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "modules",
        "toolUsage"
      ]
    },
    "listCatalogUpdates": {
      "kind": "qry",
      "trigger": "onLoad",
      "returns": [
        "updates"
      ]
    }
  },
  "states": {
    "modules": {
      "source": "getToolCatalog.modules",
      "description": "the list of A module of the tool catalog (an app module or the cm itself), with its subjects and their actions.",
      "organisms": [
        "toolCatalogTree"
      ]
    },
    "toolUsage": {
      "source": "getToolCatalog.toolUsage",
      "description": "the list of A tool of the catalog with the number of agents that have it turned on.",
      "organisms": [
        "toolUsageHighlights"
      ]
    },
    "updates": {
      "source": "listCatalogUpdates.updates",
      "description": "the list of A tool as a catalog change: when it entered the catalog and, if it left the release, when it was marked removed.",
      "organisms": [
        "catalogUpdatesTimeline"
      ]
    }
  },
  "journeys": [],
  "rules": [
    "catalogRebuiltOnRelease",
    "noTechnicalIdsOnScreen",
    "toolNeverDeleted"
  ],
  "access": {
    "actors": [
      "companyAdmin",
      "organizationMember"
    ],
    "grants": [
      "adminManageTools",
      "memberReadToolCatalog"
    ]
  }
} as const;
