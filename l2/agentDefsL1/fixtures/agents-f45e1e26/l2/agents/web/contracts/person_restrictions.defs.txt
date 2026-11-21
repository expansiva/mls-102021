/// <mls fileReference="_102047_/l2/agents/web/contracts/person_restrictions.defs.ts" enhancement="_blank"/>

/** An active person of the organization who can be restricted, identified by name and login e-mail. */
export interface PersonOption {
  id: string;
  details: PersonOptionDetails;
}

/** Identification and login data of an organization user. */
export interface PersonOptionDetails {
  identification: PersonIdentification;
  agents: PersonAgentsData;
}

/** Name and status of an organization user. */
export interface PersonIdentification {
  name: string;
  readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
}

/** Agents-module data of an organization user, read from the platform login. */
export interface PersonAgentsData {
  readonly loginEmail?: string;
}

/** One action of the tool catalog with its place in the module / subject tree and, when it is blocked for the person, the restriction that blocks it. */
export interface ChecklistTool {
  id: string;
  name: string;
  status: 'available' | 'removed';
  details: ChecklistToolDetails;
  readonly blocked: boolean;
  personToolRestriction?: BlockedToolRestriction;
}

/** Readable module, subject and description of a catalog action. */
export interface ChecklistToolDetails {
  moduleTitle: string;
  subjectTitle: string;
  description: string;
}

/** A restriction that blocks one tool for one person through any agent. */
export interface BlockedToolRestriction {
  id: string;
  version: number;
  details: BlockedToolRestrictionDetails;
}

/** When the restriction was marked and the readable data of the blocked tool. */
export interface BlockedToolRestrictionDetails {
  readonly markedAt: string;
  readonly toolName: string;
  readonly toolPath: string;
  readonly toolRemoved: boolean;
}

/** Identity and version of an existing person tool restriction. */
export interface RestrictionRef {
  id: string;
  version: number;
}

export interface Person_restrictionsContracts {
  /**
   * Purpose: Lists the organization people with a platform login that the company admin can restrict, optionally searched by name.
   * Input: search: text typed to find a person by name (optional); page and pageSize: the page of people requested.
   * Processing: Uses OrganizationUser locate.users / locate.byName filtered by name when search is given. Applies onlyActiveUsersRestricted: only users with status Active are returned. Login e-mail is derived from the platform login, never stored. Ordered by name. noTechnicalIdsOnScreen: the id is returned only to identify the selection.
   * Output: A page of active people, each with id, name, status and login e-mail, as { items, page, pageSize, hasMore }.
   */
  'agents.person_restrictions.listPeople': {
    kind: 'qry';
    input: { search?: string; page: number; pageSize: number };
    output: { people: { items: PersonOption[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['onlyActiveUsersRestricted', 'noTechnicalIdsOnScreen'];
    access: { actors: ['companyAdmin']; grants: ['adminManageTools', 'adminChoosePeople']; scope: 'organization' };
  };
  /**
   * Purpose: Loads the restriction checklist of the chosen person: the whole tool catalog with the tools already blocked for that person marked.
   * Input: personId: the person selected in the picker.
   * Processing: Reads the person (refused if not Active, onlyActiveUsersRestricted). Reads the catalog via Tool agents.toolTree and the person’s restrictions via PersonToolRestriction listByForeignKey in one read each, then joins them by tool: blocked is computed true when a restriction exists for the person and tool (at most one, restrictionUniquePerPersonTool). Removed tools stay listed with status removed and their restriction kept (removedToolRestrictionKept). toolName, toolPath, toolRemoved are derived from the catalog and markedAt from the restriction; nothing is stored. Ordered by module title, subject title and tool name. No technical ids are meant for display.
   * Output: The person (name, status, login e-mail) and every catalog tool with module, subject, description, status, blocked flag and, when blocked, the restriction with id, version, marked date, tool name, path and removed flag.
   */
  'agents.person_restrictions.getPersonRestrictions': {
    kind: 'qry';
    input: { personId: string };
    output: { person: PersonOption; tools: ChecklistTool[] };
    rules: ['onlyActiveUsersRestricted', 'restrictionUniquePerPersonTool', 'removedToolRestrictionKept', 'noTechnicalIdsOnScreen'];
    access: { actors: ['companyAdmin']; grants: ['adminManageTools', 'adminChoosePeople']; scope: 'organization' };
  };
  /**
   * Purpose: Saves the checklist of the chosen person: the ticked tools become blocked through any agent and the unticked ones are freed.
   * Input: personId: the person whose tools are restricted; toolId: every tool ticked as blocked after the edit; knownRestrictions: id and version of the restrictions the page loaded, for optimistic concurrency.
   * Processing: Refuses unless the caller is company admin (onlyCompanyAdminRestrictsTools) and the person is Active (onlyActiveUsersRestricted). Checks the versions of knownRestrictions against storage and refuses on conflict. In one transaction, creates a restriction for each ticked tool without one (markedAt filled by the system) and deletes the restriction of each unticked tool; a tool already blocked is left unchanged (restrictionUniquePerPersonTool). Restrictions on removed tools that stay ticked are kept (removedToolRestrictionKept). From then on no agent offers those tools to the person (restrictionAppliesThroughAnyAgent). Derived fields are computed on read, not recorded.
   * Output: The person and the full checklist in its new saved state, same shape as getPersonRestrictions, with the new restrictions, their marked dates and versions.
   */
  'agents.person_restrictions.saveRestrictions': {
    kind: 'cmd';
    writes: 'PersonToolRestriction.update';
    input: { personId: string; toolId: string[]; knownRestrictions: RestrictionRef[] };
    output: { person: PersonOption; tools: ChecklistTool[] };
    rules: ['onlyCompanyAdminRestrictsTools', 'onlyActiveUsersRestricted', 'restrictionUniquePerPersonTool', 'restrictionAppliesThroughAnyAgent', 'removedToolRestrictionKept'];
    access: { actors: ['companyAdmin']; grants: ['adminManageTools', 'adminChoosePeople']; scope: 'organization' };
  };
}
