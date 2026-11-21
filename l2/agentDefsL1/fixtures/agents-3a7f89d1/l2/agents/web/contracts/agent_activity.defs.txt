/// <mls fileReference="_102047_/l2/agents/web/contracts/agent_activity.defs.ts" enhancement="_blank"/>

/** The agent whose activity is listed, by its readable name. */
export interface AgentHeader {
  name: string;
}

/** One action the agent performed during an execution, with its result and a short note. */
export interface ExecutionAction {
  toolName: string;
  result: 'succeeded' | 'failed' | 'refused';
  resultNote?: string;
}

/** Duration, cost, takeover, conversation link and actions of one finished execution. */
export interface ExecutionDetails {
  durationMs: number;
  cost?: string;
  tookOver: boolean;
  conversationLink?: string;
  actions: ExecutionAction[];
}

/** The readable identification of the person who called the agent. */
export interface CallerIdentification {
  name: string;
}

/** Details of the organization user who called the agent. */
export interface CallerDetails {
  identification: CallerIdentification;
}

/** The organization user who called the agent in an execution. */
export interface ExecutionCaller {
  details: CallerDetails;
}

/** One finished execution of an agent: when it started, its details with actions and results, and the person who called it when known. */
export interface ExecutionEntry {
  id: string;
  startedAt: string;
  details: ExecutionDetails;
  organizationUser?: ExecutionCaller;
}

export interface Agent_activityContracts {
  /**
   * Purpose: Opens the activity page of the chosen agent: its name and the first page of its executions, newest first, each with its actions and results.
   * Input: agentId: the agent chosen in the URL (cm id of the agent). page, pageSize: the page of executions to load.
   * Processing: Reads the agent name from the cm. Lists the ExecutionSummary records whose agentId is the chosen agent, ordered by startedAt descending (activityNewestFirst), paged by page and pageSize. For each execution, includes its actions with result and note, and resolves personId to the organization user’s name through read.byId of OrganizationUser so no technical id is shown (noTechnicalIdsOnScreen); executionRef is never returned. Visible to every organization member within the organization.
   * Output: agent: the agent’s @name. executions: { items, page, pageSize, hasMore } of executions newest first, each with start time, duration, cost, whether a person took over, conversation link, the caller’s name when known, and its actions with result and note.
   */
  'agents.agent_activity.getAgentActivity': {
    kind: 'qry';
    input: { agentId: string; page: number; pageSize: number };
    output: { agent: AgentHeader; executions: { items: ExecutionEntry[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['activityNewestFirst', 'noTechnicalIdsOnScreen'];
    access: { actors: ['companyAdmin', 'organizationMember']; grants: ['adminManageAgents', 'adminChoosePeople', 'adminReadActivity', 'memberSeeAgents', 'memberReadActivity', 'memberSeePeopleNames']; scope: 'organization' };
  };
  /**
   * Purpose: Loads a further page of the chosen agent’s executions, newest first.
   * Input: agentId: the agent chosen in the URL. page, pageSize: the page of executions requested.
   * Processing: Same listing as getAgentActivity: ExecutionSummary filtered by agentId, ordered by startedAt descending (activityNewestFirst), paged; actions included; caller resolved to a readable name, never an id (noTechnicalIdsOnScreen); executionRef never returned.
   * Output: executions: { items, page, pageSize, hasMore } for the requested page, each execution with its details, actions and caller name.
   */
  'agents.agent_activity.listAgentExecutions': {
    kind: 'qry';
    input: { agentId: string; page: number; pageSize: number };
    output: { executions: { items: ExecutionEntry[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['activityNewestFirst', 'noTechnicalIdsOnScreen'];
    access: { actors: ['companyAdmin', 'organizationMember']; grants: ['adminManageAgents', 'adminChoosePeople', 'adminReadActivity', 'memberSeeAgents', 'memberReadActivity', 'memberSeePeopleNames']; scope: 'organization' };
  };
}
