/// <mls fileReference="_102047_/l2/agents/web/contracts/agent_overview.defs.ts" enhancement="_blank"/>

/** An agent of the organization as the cm keeps it, read only: its @name, whether it is on, what it is, who it talks to, on whose behalf it acts and the name of the person responsible for it. */
export interface AgentOverview {
  name: string;
  isOn: boolean;
  definition?: string;
  talksTo?: string;
  onBehalfOf?: string;
  readonly responsibleName?: string;
}

export interface Agent_overviewContracts {
  /**
   * Purpose: Loads, in one call, the read-only overview of the chosen agent: what it is, who it talks to, on whose behalf it acts, whether it is on and who is responsible for it.
   * Input: agentId: the cm identifier of the chosen agent, taken from the page URL; it is never shown on screen.
   * Processing: Reads the agent from the cm (name, isOn, definition, talksTo, onBehalfOf, responsible). Resolves the responsible person’s organization user record and returns only their readable name (OrganizationUser.details.identification.name), never the record id, as noTechnicalIdsOnScreen demands. Only fields allowed to organization members and company admins by their grants are returned. Writes nothing.
   * Output: agent: the agent’s @name, on/off state, plain-language description, who it talks to, on whose behalf it acts, and the responsible person’s name (absent when no responsible person is set).
   */
  'agents.agent_overview.getAgentOverview': {
    kind: 'qry';
    input: { agentId: string };
    output: { agent: AgentOverview };
    rules: ['noTechnicalIdsOnScreen'];
    access: { actors: ['companyAdmin', 'organizationMember']; grants: ['adminManageAgents', 'adminChoosePeople', 'memberSeeAgents', 'memberSeePeopleNames']; scope: 'organization' };
  };
}
