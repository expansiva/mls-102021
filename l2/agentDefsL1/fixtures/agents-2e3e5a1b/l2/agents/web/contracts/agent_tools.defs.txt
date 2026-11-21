/// <mls fileReference="_102047_/l2/agents/web/contracts/agent_tools.defs.ts" enhancement="_blank"/>

/** Readable placement and explanation of one catalog action. */
export interface ToolDetails {
  moduleTitle: string;
  subjectTitle: string;
  description: string;
  removedAt?: string;
}

/** When and by whom a tool choice of an agent was made, and the state of the tool it refers to. */
export interface AgentToolChoiceDetails {
  readonly decidedAt: string;
  decidedBy?: string;
  automaticOrigin?: 'draftSuggestion' | 'catalogRefresh';
  readonly toolName: string;
  readonly toolRemoved: boolean;
}

/** The on or off choice of one tool for one agent, with who made it. */
export interface AgentToolChoice {
  id: string;
  version: number;
  enabled: boolean;
  choiceSource: 'admin' | 'automatic';
  details: AgentToolChoiceDetails;
}

/** One action of the tool catalog in the module / subject / action tree, with the agent’s choice for it when one exists. */
export interface ToolTreeAction {
  id: string;
  moduleName: string;
  subject: string;
  name: string;
  status: 'available' | 'removed';
  details: ToolDetails;
  agentTool?: AgentToolChoice;
}

/** The release in which a catalog tool was last found. */
export interface ToolReleaseDetails {
  releaseLabel?: string;
}

/** Release information of the catalog tool a choice refers to. */
export interface ToolRelease {
  details: ToolReleaseDetails;
}

/** A tool choice of an agent made by an automatic step, with the release of its tool. */
export interface AutomaticToolChoice {
  id: string;
  enabled: boolean;
  choiceSource: 'admin' | 'automatic';
  details: AgentToolChoiceDetails;
  tool: ToolRelease;
}

export interface Agent_toolsContracts {
  /**
   * Purpose: Loads the agent’s name and the whole tool catalog as module / subject / action entries, each with the agent’s current choice for it.
   * Input: agentId: the cm id of the agent opened from the URL.
   * Processing: Reads the agent name from the cm. Reads every tool of the catalog (available and removed, per agentToolsShowWholeCatalog) via agents.toolTree, and all tool choices of the agent in one listByForeignKey read, joining them by tool. Sorted by module title, subject title and action name. decidedBy is resolved to the admin’s readable name via read.mdmRecord (noTechnicalIdsOnScreen); toolName and toolRemoved are derived from the catalog at read time (removedToolNeverSent: removed tools are shown as removed). Tool.toolKey and catalogItem are never returned.
   * Output: name and the list of every catalog action with its readable names, description, status and removal date, plus agentTool (id, version, on/off, who chose, when) when the agent has a choice for it.
   */
  'agents.agent_tools.getAgentToolTree': {
    kind: 'qry';
    input: { agentId: string };
    output: { name: string; actions: ToolTreeAction[] };
    rules: ['agentToolsShowWholeCatalog', 'noTechnicalIdsOnScreen', 'removedToolNeverSent'];
    access: { actors: ['companyAdmin']; grants: ['adminManageAgents', 'adminManageTools']; scope: 'organization' };
  };
  /**
   * Purpose: Lists the tool choices of the agent that were made automatically, newest first.
   * Input: agentId: the cm id of the agent opened from the URL.
   * Processing: Locates the agent’s tool choices with choiceSource = automatic (locate.byColumn), ordered by decidedAt descending. Joins the tool to read its releaseLabel; toolName and toolRemoved are derived from the catalog. Choices the admin has made are never listed here, since adminChoiceNeverOverridden keeps them out of automatic steps.
   * Output: The automatic choices with on/off, automatic origin (draft suggestion or catalog refresh), when, tool name, removed mark and the release label of the tool.
   */
  'agents.agent_tools.listAutomaticToolChoices': {
    kind: 'qry';
    input: { agentId: string };
    output: { choices: AutomaticToolChoice[] };
    rules: ['adminChoiceNeverOverridden', 'draftSuggestedToolsTurnedOn', 'newToolsChosenFromDescription'];
    access: { actors: ['companyAdmin']; grants: ['adminManageAgents', 'adminManageTools']; scope: 'organization' };
  };
  /**
   * Purpose: Creates the agent’s first choice for a catalog action the admin has just ticked.
   * Input: agentId: cm id of the agent; toolId: the catalog action ticked; enabled: the ticked state, true.
   * Processing: Per markingWithoutChoiceCreatesAdminChoice, creates the AgentTool for this agent and tool as on with choiceSource = admin and decidedBy = the logged admin; decidedAt is filled by the system. oneChoicePerAgentAndTool: refuses when a choice already exists for this pair (the page must then use toggleToolChoice). Being an admin choice, it is never changed by later automatic steps (adminChoiceNeverOverridden).
   * Output: The catalog action with its tool data and its new agentTool choice, on, chosen by the admin, with id and version.
   */
  'agents.agent_tools.enableUnchosenTool': {
    kind: 'cmd';
    writes: 'AgentTool.create';
    input: { agentId: string; toolId: string; enabled: boolean };
    output: { action: ToolTreeAction };
    rules: ['markingWithoutChoiceCreatesAdminChoice', 'oneChoicePerAgentAndTool', 'adminChoiceNeverOverridden'];
    access: { actors: ['companyAdmin']; grants: ['adminManageAgents', 'adminManageTools']; scope: 'organization' };
  };
  /**
   * Purpose: Turns an existing tool choice of the agent on or off.
   * Input: id and version: the existing choice and the version the page holds; toolId: the catalog action the choice refers to, checked against the stored choice and never changed; enabled: the new on/off value.
   * Processing: Checks the version (optimistic concurrency) and that the choice refers to toolId. Changes only enabled, sets choiceSource = admin and decidedBy = the logged admin; decidedAt is refreshed by the system. From then on no automatic step changes this choice (adminChoiceNeverOverridden). No new choice is created (markingWithoutChoiceCreatesAdminChoice, oneChoicePerAgentAndTool).
   * Output: The catalog action with its tool data and the updated agentTool choice in its new state and version.
   */
  'agents.agent_tools.toggleToolChoice': {
    kind: 'cmd';
    writes: 'AgentTool.update';
    input: { id: string; version: number; toolId: string; enabled: boolean };
    output: { action: ToolTreeAction };
    rules: ['markingWithoutChoiceCreatesAdminChoice', 'adminChoiceNeverOverridden', 'oneChoicePerAgentAndTool'];
    access: { actors: ['companyAdmin']; grants: ['adminManageAgents', 'adminManageTools']; scope: 'organization' };
  };
}
