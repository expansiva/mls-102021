/// <mls fileReference="_102047_/l4/agents/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agentsRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "agents",
  "rules": {
    "agentNameUniqueAmongActive": "An agent's @name cannot be one already used by another active agent; the cm refuses it and the screen tells the admin the name is taken.",
    "agentDraftSuggestedToolsOnWhenReady": "When the cm reports through agentDraftReady that a draft is ready, the draft kept in this module becomes ready, keeps the tools the cm suggested, and every suggested tool is turned on for that draft's agent in this module.",
    "agentDraftNoticeIdempotent": "An agentDraftReady report from the cm, whether ready or refused, that arrives again changes nothing.",
    "adminChoiceNotOverriddenByAutomatic": "A tool choice the company admin made for an agent is never changed by the automatic choice of tools.",
    "agentBehaviorChangedOnlyThroughCm": "An agent's behavior is read, changed and undone only through the cm; this module never stores it.",
    "behaviorChangeByAdminOnly": "Only the company admin may change or undo an agent's behavior.",
    "undoRestoresPreviousBehavior": "Undoing a change from the behavior history brings back the behavior the agent had before that change, and the change is shown as undone.",
    "ownConductOnly": "An organization member may change only their own conduct with an agent, never the conduct of another person.",
    "conductOnlyForAgentActingOnBehalf": "A member may change their conduct only with an agent that acts on their behalf.",
    "simulationSavesNothing": "A simulation only shows results and saves nothing.",
    "memberSimulatesOnlyAsSelf": "An organization member may simulate an agent only as themselves.",
    "adminSimulatesByRole": "The company admin may simulate an agent for a chosen person or for a role.",
    "onlyToolsOnAreConsidered": "A simulation considers only the tools that are on for the agent.",
    "personRestrictionAppliesInRequest": "When someone calls an agent, the tools that person may not use are not available to the agent in that request.",
    "noTechnicalIdsOnScreen": "Screens show readable names only and never show technical ids.",
    "toolKeyUnique": "Each action has one tool in the catalog, matched by its stable code when the catalog is rebuilt.",
    "toolNeverDeleted": "A tool is never deleted from the catalog; one that leaves the release is marked removed.",
    "catalogRebuiltOnRelease": "The tool catalog is rebuilt when a module is created or a new release arrives: new tools are created, tools that already exist are updated by matching their stable code, tools that left the release are marked removed, and tools that came back become available again. On every rebuild, each tool's stored catalog item is replaced with the whole item as the platform delivers it, so the stored catalog never goes stale.",
    "removedToolNotSent": "A tool marked removed is not sent to the cm as a tool an agent may use.",
    "adminChoiceNeverOverridden": "Once the admin has turned a tool on or off for an agent, no automatic step changes that choice.",
    "oneChoicePerAgentAndTool": "There is at most one on or off choice for each pair of agent and tool.",
    "onlyEnabledToolsSent": "When the cm asks for an agent's tools, only the tools that are on for that agent are sent, each with its whole stored catalog item.",
    "removedToolNeverSent": "A tool choice that refers to a removed tool is shown as removed and never sent to the agent.",
    "personRestrictionsExcludeTools": "When the cm asks for an agent and a person, the tools that person may not use are left out of the tools returned.",
    "repeatedNoticeChangesNothing": "A notice from the cm that has already been handled changes nothing when it arrives again.",
    "draftSuggestedToolsTurnedOn": "The tools suggested in a ready draft are turned on for it as automatic choices, without changing any choice the admin already made.",
    "restrictionUniquePerPersonTool": "A person has at most one restriction for each tool.",
    "restrictionAppliesThroughAnyAgent": "A tool restricted for a person cannot be used by that person through any agent.",
    "onlyCompanyAdminRestrictsTools": "Only the company admin may mark or unmark the tools a person may not use.",
    "removedToolRestrictionKept": "A restriction on a tool that was marked removed is kept and has no effect while the tool is gone.",
    "executionRecordedOnce": "The same finished execution is never recorded twice, even when its summary arrives again.",
    "onlyInboundWritesExecution": "Execution summaries are recorded only from what the cm sends.",
    "executionNeverEdited": "A recorded execution summary is never changed afterwards.",
    "onlyActiveUsersRestricted": "Only active organization users are offered for tool restrictions and for simulation.",
    "draftDecisionOnlyWhenReady": "Only a ready draft can be decided on: activating it makes it activated and discarding it makes it discarded.",
    "refusalReasonShownWhenRefused": "A refused draft is shown with the reason the cm gave for refusing it.",
    "activityNewestFirst": "An agent's activity is listed newest first.",
    "newToolsChosenFromDescription": "New tools in the catalog are chosen automatically from each agent's description for every agent of the company, read from the cm, not only for agents that already have a tool choice; the admin may then adjust them.",
    "describeAgentForPersonWritesNothing": "When the cm asks this module to describe an agent for a person, the module only reads: it returns only the tools that are on for that agent, minus the tools that person may not use, each with its whole stored catalog item; it invents nothing and writes nothing.",
    "toolKeepsWholeCatalogItem": "Each tool in the catalog keeps the whole catalog item as the platform delivers it, not a part of it.",
    "agentToolsShowWholeCatalog": "The agent tools screen shows every action of the tool catalog, with the ones the agent has turned on shown as marked.",
    "markingWithoutChoiceCreatesAdminChoice": "When the admin marks an action the agent has no choice for yet, a new choice for that agent and that action is created as an admin choice; marking or unmarking an action that already has a choice only turns that choice on or off.",
    "agentDraftRecordedBeforeSending": "When the admin asks for a new agent, this module records the prompt, who asked and when, starts the draft as preparing, and then sends the request to the cm.",
    "refusedDraftKeepsReason": "When the cm reports through agentDraftReady that it refused a draft, the draft becomes refused and keeps the reason the cm gave; no one on the screen makes a draft ready or refused.",
    "conductChangeRecorded": "Every time a member changes their conduct with an agent, this module records who changed it, when and a one-line summary; the current conduct itself stays in the cm.",
    "ownConductHistoryOnly": "A member, and likewise the company admin, sees only their own conduct changes, newest first, never anyone else's."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type AgentsRulesType = typeof agentsRules;

export default agentsRules;
