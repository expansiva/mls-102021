/// <mls fileReference="_102047_/l2/agents/web/contracts/agent_configuration.defs.ts" enhancement="_blank"/>

/** An organization user who can be, or is, the person responsible for an agent: the reference saved on the agent plus the readable name, status and login e-mail. */
export interface ResponsiblePerson {
  agent: {
    responsible: string;
  };
  details: {
    identification: {
      name: string;
      readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
    };
    agents: {
      readonly loginEmail?: string;
    };
  };
}

/** The editable configuration of one agent as the cm keeps it: its @name, whether it is on, its responsible person and the version of the record used for concurrency. */
export interface AgentConfiguration {
  name: string;
  isOn: boolean;
  responsible?: ResponsiblePerson;
  version: number;
}

/** One limit the cm applies to an agent: its readable name and its current value. */
export interface AgentLimit {
  label: string;
  value?: string;
}

export interface Agent_configurationContracts {
  /**
   * Purpose: Loads in one call the chosen agent’s configuration and the limits the cm lists for it.
   * Input: agentId: the cm reference of the agent chosen in the URL.
   * Processing: Reads the agent from the cm (organization scope of the company admin). Resolves the responsible person reference to the organization user’s name, status and login e-mail (login e-mail and status are derived, read from the platform, never stored here). Returns the record version for the next save and the cm limits as listed, in cm order. Only readable names are returned for display (noTechnicalIdsOnScreen); the responsible reference and version are kept only as values to save.
   * Output: configuration: the agent’s @name, on/off state, responsible person (absent when none is set) and version; limits: every limit with its label and current value.
   */
  'agents.agent_configuration.getAgentConfiguration': {
    kind: 'qry';
    input: { agentId: string };
    output: { configuration: AgentConfiguration; limits: AgentLimit[] };
    rules: ['noTechnicalIdsOnScreen'];
    access: { actors: ['companyAdmin']; grants: ['adminManageAgents', 'adminChoosePeople']; scope: 'organization' };
  };
  /**
   * Purpose: Finds organization users with a platform login to choose as the agent’s responsible person.
   * Input: search: part of the person’s name typed by the admin; page and pageSize: the page of results requested.
   * Processing: Uses the locate.users capability of OrganizationUser filtered by name, within the admin’s organization, ordered by name. Returns only the fields the adminChoosePeople grant allows (name, status, login e-mail) plus the reference to save in Agent.responsible; no technical id is meant for display (noTechnicalIdsOnScreen).
   * Output: users: one page of candidate people with their reference, name, status and login e-mail, as { items, page, pageSize, hasMore }.
   */
  'agents.agent_configuration.searchResponsibleCandidates': {
    kind: 'qry';
    input: { search?: string; page: number; pageSize: number };
    output: { users: { items: ResponsiblePerson[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['noTechnicalIdsOnScreen'];
    access: { actors: ['companyAdmin']; grants: ['adminManageAgents', 'adminChoosePeople']; scope: 'organization' };
  };
  /**
   * Purpose: Saves the agent’s @name, on/off state and responsible person in the cm.
   * Input: agentId: the cm reference of the agent from the URL; expectVersion: the version of the agent configuration the admin loaded, refused if the record changed meanwhile; name: the new @name; isOn: whether the agent is on; responsible: the reference of the organization user chosen as responsible.
   * Processing: Checks expectVersion against the current version and sends the update to the cm. agentNameUniqueAmongActive: when another active agent already uses the @name, the cm refuses it; the endpoint changes nothing and returns a clear ’name already taken’ error. On success, reads the agent back from the cm and resolves the responsible person’s name, status and login e-mail.
   * Output: configuration: the agent in its new saved state (@name, on/off, responsible person, new version); limits: the agent’s limits as the cm lists them after the save.
   */
  'agents.agent_configuration.saveAgentConfiguration': {
    kind: 'cmd';
    writes: 'Agent.update';
    input: { agentId: string; expectVersion: number; name: string; isOn: boolean; responsible?: string };
    output: { configuration: AgentConfiguration; limits: AgentLimit[] };
    rules: ['agentNameUniqueAmongActive'];
    access: { actors: ['companyAdmin']; grants: ['adminManageAgents', 'adminChoosePeople']; scope: 'organization' };
  };
}
