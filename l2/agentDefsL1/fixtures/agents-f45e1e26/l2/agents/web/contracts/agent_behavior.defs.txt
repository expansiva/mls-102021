/// <mls fileReference="_102047_/l2/agents/web/contracts/agent_behavior.defs.ts" enhancement="_blank"/>

/** The agent a behavior belongs to, identified as the cm knows it, with its @name. */
export interface BehaviorAgent {
  agent: {
    name: string;
  };
}

/** An agent’s current behavior in plain language as the cm keeps it, with its one-line summary. */
export interface AgentBehaviorDetail {
  agent: BehaviorAgent;
  summary: string;
  currentBehavior: string;
}

/** One past change of an agent’s behavior: the cm reference, who made it, when, a one-line summary and whether it was undone. */
export interface BehaviorChange {
  changeRef: string;
  changedBy: string;
  changedAt: string;
  summary: string;
  undone?: boolean;
}

export interface Agent_behaviorContracts {
  /**
   * Purpose: Loads how the chosen agent behaves today, with its @name and one-line summary.
   * Input: agentId: the cm id of the agent chosen in the URL.
   * Processing: Reads the agent’s behavior from the cm (agentBehaviorChangedOnlyThroughCm: nothing is stored in this module) and the agent’s @name; organization scope of the admin.
   * Output: The agent (id and @name), the one-line summary and the full current behavior text.
   */
  'agents.agent_behavior.getAgentBehavior': {
    kind: 'qry';
    input: { agentId: string };
    output: { behavior: AgentBehaviorDetail };
    rules: ['agentBehaviorChangedOnlyThroughCm'];
    access: { actors: ['companyAdmin']; grants: ['adminManageAgents']; scope: 'organization' };
  };
  /**
   * Purpose: Lists the history of behavior changes of the chosen agent, newest first, one page at a time.
   * Input: agentId: the cm id of the agent; page and pageSize: the page of history wanted.
   * Processing: Reads the change history from the cm (agentBehaviorChangedOnlyThroughCm), ordered by changedAt newest first; resolves the author to a readable name; each change keeps its undone mark (undoRestoresPreviousBehavior).
   * Output: A page of changes with cm reference, author name, date, one-line summary and undone mark, as { items, page, pageSize, hasMore }.
   */
  'agents.agent_behavior.listBehaviorChanges': {
    kind: 'qry';
    input: { agentId: string; page: number; pageSize: number };
    output: { changes: { items: BehaviorChange[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['agentBehaviorChangedOnlyThroughCm', 'undoRestoresPreviousBehavior'];
    access: { actors: ['companyAdmin']; grants: ['adminManageAgents']; scope: 'organization' };
  };
  /**
   * Purpose: Sends to the cm either a plain-language request to change the agent’s behavior or the undo of a change picked from the history.
   * Input: agentId: the cm id of the agent; expectVersion: the version of the behavior the admin was looking at, so a change made meanwhile is refused instead of overwritten; changeRequest: what the admin wrote in the box; undoChangeRef: the cm reference of the change to undo. Exactly one of changeRequest or undoChangeRef is given.
   * Processing: Refuses when the caller is not a company admin (behaviorChangeByAdminOnly). Refuses when expectVersion no longer matches the current behavior. Calls the cm to update the behavior from the request, or to undo the referenced change, which restores the behavior from before that change and marks it undone (undoRestoresPreviousBehavior). Nothing is stored in this module (agentBehaviorChangedOnlyThroughCm).
   * Output: The agent’s behavior in its new state: agent, new one-line summary and new full behavior text.
   */
  'agents.agent_behavior.requestBehaviorChange': {
    kind: 'cmd';
    writes: 'AgentBehavior.update';
    input: { agentId: string; expectVersion: number; changeRequest?: string; undoChangeRef?: string };
    output: { behavior: AgentBehaviorDetail };
    rules: ['agentBehaviorChangedOnlyThroughCm', 'behaviorChangeByAdminOnly', 'undoRestoresPreviousBehavior'];
    access: { actors: ['companyAdmin']; grants: ['adminManageAgents']; scope: 'organization' };
  };
}
