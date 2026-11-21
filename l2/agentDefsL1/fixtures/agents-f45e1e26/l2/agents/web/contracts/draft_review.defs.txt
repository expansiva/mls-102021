/// <mls fileReference="_102047_/l2/agents/web/contracts/draft_review.defs.ts" enhancement="_blank"/>

/** A ready agent draft prepared by the cm: who the new agent would be, what it does, who it talks to, on whose behalf it acts, its proposed behavior, the original description, who requested it and when, and its situation. */
export interface DraftReview {
  name: string;
  summary?: string;
  audience?: string;
  onBehalfOf?: string;
  proposedBehavior?: string;
  prompt: string;
  situation: 'preparing' | 'ready' | 'refused' | 'activated' | 'discarded';
  requestedBy?: string;
  requestedAt?: string;
}

/** Details of one tool choice: when it was made, the readable tool name and whether the tool left the release. */
export interface DraftToolLineDetails {
  readonly decidedAt: string;
  readonly toolName?: string;
  readonly toolRemoved?: boolean;
}

/** Readable placement and description of a catalog tool in the module / subject / action tree. */
export interface DraftToolCatalogDetails {
  moduleTitle: string;
  subjectTitle: string;
  description: string;
}

/** The catalog tool a choice refers to, with its readable name, situation and tree placement. */
export interface DraftToolCatalog {
  name: string;
  status: 'available' | 'removed';
  details: DraftToolCatalogDetails;
}

/** One tool choice of the draft’s agent: whether it is on, who made the choice and when, with the catalog tool it refers to. */
export interface DraftToolLine {
  id: string;
  version: number;
  toolId: string;
  enabled: boolean;
  choiceSource: 'admin' | 'automatic';
  details: DraftToolLineDetails;
  tool: DraftToolCatalog;
}

/** A change to one existing tool choice: the choice, its version and its new on/off value. */
export interface DraftToolChange {
  id: string;
  version: number;
  enabled: boolean;
}

/** Name and status of an organization user. */
export interface SimulationPersonIdentification {
  name: string;
  readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
}

/** Login data of an organization user read from the platform login. */
export interface SimulationPersonAgents {
  readonly loginEmail?: string;
}

/** Readable details of an organization user. */
export interface SimulationPersonDetails {
  identification: SimulationPersonIdentification;
  agents: SimulationPersonAgents;
}

/** An active organization user with a platform login, with an opaque reference to choose them for a simulation. */
export interface SimulationPerson {
  personRef: string;
  details: SimulationPersonDetails;
}

/** Whether the agent can use one tool for the chosen person or role, and why. */
export interface ToolVerdict {
  moduleName: string;
  subjectName: string;
  actionName: string;
  canUse: boolean;
  reason: 'allowed' | 'restrictedForPerson' | 'notPermittedForRole' | 'removedFromRelease';
  reasonText?: string;
}

/** An action the agent would take from a sample sentence. */
export interface UnderstoodAction {
  actionName: string;
}

/** How the agent reads a sample sentence: whether it asks for an action, the tree path it points to, the actions it would take and an explanation. */
export interface SimulationUnderstanding {
  asksForAction: boolean;
  moduleName?: string;
  subjectName?: string;
  actions: UnderstoodAction[];
  explanation?: string;
}

/** The result of one simulation of the draft, at the ’what it can’ or ’what it understands’ level; nothing of it is stored. */
export interface DraftSimulation {
  agent: string;
  level: 'whatItCan' | 'whatItUnderstands';
  toolVerdicts?: ToolVerdict[];
  understanding?: SimulationUnderstanding;
}

export interface Draft_reviewContracts {
  /**
   * Purpose: Loads everything the draft review shows when it opens: the draft as the cm keeps it and the tool choices of the draft’s agent.
   * Input: draftId: the cm reference of the draft, taken from the URL (the notification link).
   * Processing: Reads the draft from the cm (name, summary, audience, on whose behalf, proposed behavior, original prompt, situation, requester shown by readable name, requested date). Lists every AgentTool of the draft’s agent in one read (listByForeignKey) and joins each to its Tool for module title, subject title, name, description and status. toolName and toolRemoved are derived from the catalog on read, never stored; decidedAt is the system-filled change time. The suggested tools are already on as automatic choices (agentDraftSuggestedToolsOnWhenReady, draftSuggestedToolsTurnedOn); removed tools are flagged (removedToolNeverSent). The requester is returned as a name, never an id (noTechnicalIdsOnScreen).
   * Output: draft: the draft in its current situation; tools: every tool choice of the draft’s agent with its catalog tool, ordered by module title, subject title and tool name.
   */
  'agents.draft_review.getDraftReview': {
    kind: 'qry';
    input: { draftId: string };
    output: { draft: DraftReview; tools: DraftToolLine[] };
    rules: ['agentDraftSuggestedToolsOnWhenReady', 'draftSuggestedToolsTurnedOn', 'removedToolNeverSent', 'noTechnicalIdsOnScreen'];
    access: { actors: ['companyAdmin']; grants: ['adminManageAgents', 'adminManageTools', 'adminChoosePeople']; scope: 'organization' };
  };
  /**
   * Purpose: Finds the people the company admin can simulate the draft for.
   * Input: name: typed text to filter by person name; page and pageSize: the page requested.
   * Processing: Uses OrganizationUser locate.users / locate.byName filtered by name, keeping only users with a platform login whose status is Active (onlyActiveUsersRestricted). Status and login e-mail are derived from the platform, not stored. Each person carries an opaque reference instead of a visible id (noTechnicalIdsOnScreen).
   * Output: people: one page of active people with name, status and login e-mail, ordered by name.
   */
  'agents.draft_review.searchSimulationPeople': {
    kind: 'qry';
    input: { name?: string; page: number; pageSize: number };
    output: { people: { items: SimulationPerson[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['onlyActiveUsersRestricted', 'adminSimulatesByRole', 'noTechnicalIdsOnScreen'];
    access: { actors: ['companyAdmin']; grants: ['adminManageAgents', 'adminManageTools', 'adminChoosePeople']; scope: 'organization' };
  };
  /**
   * Purpose: Runs a simulation of the draft through the cm: which tools it could use for a person or role, or how it reads a sample sentence.
   * Input: draftId: the draft under review (URL); level: whatItCan or whatItUnderstands; subjectKind: person or role for whatItCan; person: the reference of the chosen active person; roleName: the chosen role; sentence: the sample request for whatItUnderstands.
   * Processing: For whatItCan, requires subjectKind with person (active only, onlyActiveUsersRestricted) or roleName (adminSimulatesByRole); considers only tools on for the draft’s agent (onlyToolsOnAreConsidered), marks removed tools as removedFromRelease (removedToolNotSent) and, for a person, their restrictions as restrictedForPerson (personRestrictionAppliesInRequest). For whatItUnderstands, requires sentence and asks the cm how it reads it. Writes nothing (simulationSavesNothing); returns readable names only (noTechnicalIdsOnScreen).
   * Output: simulation: the draft agent’s name and the level, with toolVerdicts for whatItCan or understanding for whatItUnderstands.
   */
  'agents.draft_review.simulateDraft': {
    kind: 'qry';
    input: { draftId: string; level: 'whatItCan' | 'whatItUnderstands'; subjectKind?: 'person' | 'role'; person?: string; roleName?: string; sentence?: string };
    output: { simulation: DraftSimulation };
    rules: ['simulationSavesNothing', 'adminSimulatesByRole', 'onlyToolsOnAreConsidered', 'personRestrictionAppliesInRequest', 'removedToolNotSent', 'onlyActiveUsersRestricted', 'noTechnicalIdsOnScreen'];
    access: { actors: ['companyAdmin']; grants: ['adminManageAgents', 'adminManageTools', 'adminChoosePeople']; scope: 'organization' };
  };
  /**
   * Purpose: Saves the on/off choices the company admin made on the draft’s suggested tools.
   * Input: draftId: the draft under review (URL); changes: each changed tool choice with its id, version and new on value.
   * Processing: Refuses when the draft is no longer ready. For each change, checks the choice belongs to the draft’s agent and its version matches, then updates only enabled, sets choiceSource to admin and records the calling admin as decidedBy; decidedAt is filled by the system. All changes are applied together. From then on no automatic step changes these choices (adminChoiceNeverOverridden, adminChoiceNotOverriddenByAutomatic); one choice per agent and tool is kept (oneChoicePerAgentAndTool).
   * Output: tools: the changed tool choices in their new state, each with its catalog tool, derived name, removed flag and new version.
   */
  'agents.draft_review.saveDraftTools': {
    kind: 'cmd';
    writes: 'AgentTool.update';
    input: { draftId: string; changes: DraftToolChange[] };
    output: { tools: DraftToolLine[] };
    rules: ['adminChoiceNeverOverridden', 'adminChoiceNotOverriddenByAutomatic', 'oneChoicePerAgentAndTool', 'draftDecisionOnlyWhenReady'];
    access: { actors: ['companyAdmin']; grants: ['adminManageAgents', 'adminManageTools', 'adminChoosePeople']; scope: 'organization' };
  };
  /**
   * Purpose: Asks the cm to activate the draft as a working agent with the reviewed tools.
   * Input: draftId: the draft under review (URL); expectVersion: the version of the draft the admin reviewed, so a draft changed meanwhile is refused.
   * Processing: Refuses when the draft changed since it was loaded (expectVersion) or unless its situation is ready (draftDecisionOnlyWhenReady). Calls the cm activate operation; if the cm refuses because the @name is used by another active agent, returns that the name is taken (agentNameUniqueAmongActive). The tool choices already saved stay as they are.
   * Output: draft: the draft in its new situation (activated).
   */
  'agents.draft_review.activateDraft': {
    kind: 'cmd';
    writes: 'AgentDraft.activate';
    input: { draftId: string; expectVersion: number };
    output: { draft: DraftReview };
    rules: ['draftDecisionOnlyWhenReady', 'agentNameUniqueAmongActive'];
    access: { actors: ['companyAdmin']; grants: ['adminManageAgents', 'adminManageTools', 'adminChoosePeople']; scope: 'organization' };
  };
  /**
   * Purpose: Asks the cm to discard the draft so it no longer shows as ready.
   * Input: draftId: the draft under review (URL); expectVersion: the version of the draft the admin reviewed, so a draft changed meanwhile is refused.
   * Processing: Refuses when the draft changed since it was loaded (expectVersion) or unless its situation is ready (draftDecisionOnlyWhenReady), then calls the cm discard operation.
   * Output: draft: the draft in its new situation (discarded).
   */
  'agents.draft_review.discardDraft': {
    kind: 'cmd';
    writes: 'AgentDraft.discard';
    input: { draftId: string; expectVersion: number };
    output: { draft: DraftReview };
    rules: ['draftDecisionOnlyWhenReady'];
    access: { actors: ['companyAdmin']; grants: ['adminManageAgents', 'adminManageTools', 'adminChoosePeople']; scope: 'organization' };
  };
}
