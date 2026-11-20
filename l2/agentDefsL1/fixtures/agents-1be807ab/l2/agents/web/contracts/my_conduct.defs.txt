/// <mls fileReference="_102047_/l2/agents/web/contracts/my_conduct.defs.ts" enhancement="_blank"/>

/** The agent a personal conduct belongs to: its @name and on whose behalf it acts. */
export interface ConductAgent {
  name: string;
  onBehalfOf?: string;
}

/** The signed-in member’s personal conduct with one agent: the agent, how it currently behaves for that member, and the version of the conduct as the cm keeps it. */
export interface MyConduct {
  agent: ConductAgent;
  summary: string;
  version: number;
}

/** One earlier change the member made to their own conduct with an agent: when, who and a one-line summary. */
export interface ConductHistoryEntry {
  changedAt: string;
  changedBy: string;
  summary: string;
}

export interface My_conductContracts {
  /**
   * Purpose: Loads the signed-in person’s current conduct with the chosen agent, together with the agent’s @name and on whose behalf it acts.
   * Input: agentId: the agent chosen in the URL.
   * Processing: Reads the agent from the cm (name, onBehalfOf) and the personal conduct of the logged-in person with that agent from the cm, with its current version. ownConductOnly: only the conduct of the person signed in is read, never another person’s. conductOnlyForAgentActingOnBehalf: if the agent does not act on this person’s behalf, the query refuses with a clear error.
   * Output: The personal conduct of the signed-in person with that agent: the agent’s name and onBehalfOf, the current conduct summary in plain language and its version.
   */
  'agents.my_conduct.getMyConduct': {
    kind: 'qry';
    input: { agentId: string };
    output: { conduct: MyConduct };
    rules: ['ownConductOnly', 'conductOnlyForAgentActingOnBehalf'];
    access: { actors: ['companyAdmin', 'organizationMember']; grants: ['adminManageAgents', 'adminOwnConduct', 'memberSeeAgents', 'memberOwnConduct']; scope: 'organization' };
  };
  /**
   * Purpose: Lists the signed-in person’s own earlier changes to their conduct with the chosen agent, newest first, page by page.
   * Input: agentId: the agent chosen in the URL. page and pageSize: the page of history requested.
   * Processing: Reads from the cm the history of the logged-in person’s conduct with that agent, ordered by changedAt descending, and returns the requested page. ownConductOnly: only the history of the person signed in. conductOnlyForAgentActingOnBehalf: refuses for an agent that does not act on this person’s behalf. changedBy is returned as the person’s readable name, never an id.
   * Output: One page of history entries { items, page, pageSize, hasMore }, each with when it happened, who made it and a one-line summary.
   */
  'agents.my_conduct.listMyConductHistory': {
    kind: 'qry';
    input: { agentId: string; page: number; pageSize: number };
    output: { history: { items: ConductHistoryEntry[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['ownConductOnly', 'conductOnlyForAgentActingOnBehalf'];
    access: { actors: ['companyAdmin', 'organizationMember']; grants: ['adminManageAgents', 'adminOwnConduct', 'memberSeeAgents', 'memberOwnConduct']; scope: 'organization' };
  };
  /**
   * Purpose: Sends to the cm, in plain words, what the signed-in person wants to change in how the agent behaves for them.
   * Input: agentId: the agent whose conduct changes. expectVersion: the version of the conduct the person read; the update is refused if the conduct changed since. changeRequest: what the person wrote should change.
   * Processing: Sends the change request to the cm as an update of the personal conduct of the logged-in person with that agent, checking expectVersion against the current version and refusing on conflict; the person is taken from the session, never from the input. ownConductOnly: only the caller’s own conduct is updated, no one else’s. conductOnlyForAgentActingOnBehalf: refuses when the agent does not act on this person’s behalf. Refuses an empty change request. The cm records the change in the person’s history.
   * Output: The personal conduct of the signed-in person with that agent in its new state: the agent’s name and onBehalfOf, the updated current conduct summary and its new version.
   */
  'agents.my_conduct.sendConductChange': {
    kind: 'cmd';
    writes: 'PersonalConduct.update';
    input: { agentId: string; expectVersion: number; changeRequest: string };
    output: { conduct: MyConduct };
    rules: ['ownConductOnly', 'conductOnlyForAgentActingOnBehalf'];
    access: { actors: ['companyAdmin', 'organizationMember']; grants: ['adminManageAgents', 'adminOwnConduct', 'memberSeeAgents', 'memberOwnConduct']; scope: 'organization' };
  };
}
