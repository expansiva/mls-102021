/// <mls fileReference="_102047_/l2/agents/web/contracts/agents.defs.ts" enhancement="_blank"/>

/** An agent draft that is waiting for the admin: either ready for review or still being prepared by the cm from the admin’s description. */
export interface DraftInboxItem {
  id: string;
  name?: string;
  status: 'preparing' | 'ready' | 'refused' | 'activated' | 'discarded';
  summary?: string;
  prompt: string;
  requestedAt: string;
  requestedBy: string;
  draftId: string;
}

/** A company agent as the cm keeps it: its @name, who it talks to, whether it is on and the readable name of the person responsible for it. */
export interface AgentCard {
  name: string;
  talksTo?: string;
  isOn: boolean;
  readonly responsibleName?: string;
  agentId: string;
}

/** An agent draft with its name, its situation and, when refused, the reason the cm gave. */
export interface DraftCard {
  id: string;
  name?: string;
  status: 'preparing' | 'ready' | 'refused' | 'activated' | 'discarded';
  refusalReason?: string;
  draftId: string;
}

/** One entry of the company’s virtual employees: either an agent or a draft, exactly one of the two filled. */
export interface AgentsCollectionEntry {
  agent?: AgentCard;
  draft?: DraftCard;
}

/** A request for a new agent and what happened to it: sent, ready with the suggested tools turned on, refused with the reason, activated or discarded. */
export interface RequestEvent {
  id: string;
  name?: string;
  status: 'preparing' | 'ready' | 'refused' | 'activated' | 'discarded';
  requestedAt: string;
  refusalReason?: string;
  suggestedTools?: string[];
  draftId: string;
}

export interface AgentsContracts {
  /**
   * Purpose: Loads in one call everything the agents home shows when it opens: the drafts waiting for the admin, the first page of agents and drafts, and the first page of the request history.
   * Input: page: the page wanted for the agents collection and the request history (the first one when the page opens); pageSize: how many entries each of those pages brings.
   * Processing: Reads agents from the cm and drafts kept in this module for the caller’s organization. inbox: drafts with status ’ready’ (waiting for review) or ’preparing’ (requests still being prepared), newest request first, with summary, prompt, requestedAt and the readable name of the requester (read.mdmRecord). agents: agents and drafts side by side; agents carry @name, talksTo, isOn and the responsible person resolved to OrganizationUser.details.identification.name; drafts carry id, name and status among preparing, ready or refused, with refusalReason filled only when refused (refusalReasonShownWhenRefused). requests: drafts in any status, newest first, with the readable names of the suggested tools for ready drafts, which are already turned on for it (agentDraftSuggestedToolsOnWhenReady). For an organizationMember the grants cover only Agent and people names: inbox and requests come back empty and agents holds only agent entries with the allowed fields. noTechnicalIdsOnScreen: the draft id is returned for opening the review, the screen shows readable names only. Each DraftInboxItem carries draftId to open its page; the screen does not show it. Each AgentCard carries agentId to open its page; the screen does not show it. Each DraftCard carries draftId to open its page; the screen does not show it. Each RequestEvent carries draftId to open its page; the screen does not show it.
   * Output: inbox: plain list of waiting drafts; agents: page { items, page, pageSize, hasMore } of agent or draft entries; requests: page { items, page, pageSize, hasMore } of request events.
   */
  'agents.agents.loadAgentsPage': {
    kind: 'qry';
    input: { page: number; pageSize: number };
    output: { inbox: DraftInboxItem[]; agents: { items: AgentsCollectionEntry[]; page: number; pageSize: number; hasMore: boolean }; requests: { items: RequestEvent[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['refusalReasonShownWhenRefused', 'agentDraftSuggestedToolsOnWhenReady', 'noTechnicalIdsOnScreen'];
    access: { actors: ['companyAdmin', 'organizationMember']; grants: ['adminManageAgents', 'adminChoosePeople', 'memberSeeAgents', 'memberSeePeopleNames']; scope: 'organization' };
  };
  /**
   * Purpose: Brings a further page of the company’s agents and drafts.
   * Input: page: the page number wanted; pageSize: entries per page.
   * Processing: Same composition and order as loadAgentsPage.agents: agents with @name, talksTo, isOn and the responsible person’s readable name; drafts with status preparing, ready or refused and refusalReason only when refused (refusalReasonShownWhenRefused). Members receive only agent entries with their allowed fields. Readable names only on screen (noTechnicalIdsOnScreen). Each AgentCard carries agentId to open its page; the screen does not show it. Each DraftCard carries draftId to open its page; the screen does not show it.
   * Output: agents: the requested page { items, page, pageSize, hasMore }.
   */
  'agents.agents.listAgentsCollection': {
    kind: 'qry';
    input: { page: number; pageSize: number };
    output: { agents: { items: AgentsCollectionEntry[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['refusalReasonShownWhenRefused', 'noTechnicalIdsOnScreen'];
    access: { actors: ['companyAdmin', 'organizationMember']; grants: ['adminManageAgents', 'adminChoosePeople', 'memberSeeAgents', 'memberSeePeopleNames']; scope: 'organization' };
  };
  /**
   * Purpose: Brings a further page of the history of requests for new agents.
   * Input: page: the page number wanted; pageSize: events per page.
   * Processing: Drafts of the organization in any status, newest request first; refusalReason only on refused drafts (refusalReasonShownWhenRefused); suggested tools as readable names for ready drafts, which are already turned on for it (agentDraftSuggestedToolsOnWhenReady). Company admin only by grant; a member receives an empty page. Each RequestEvent carries draftId to open its page; the screen does not show it.
   * Output: requests: the requested page { items, page, pageSize, hasMore }.
   */
  'agents.agents.listRequestHistory': {
    kind: 'qry';
    input: { page: number; pageSize: number };
    output: { requests: { items: RequestEvent[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['refusalReasonShownWhenRefused', 'agentDraftSuggestedToolsOnWhenReady', 'noTechnicalIdsOnScreen'];
    access: { actors: ['companyAdmin', 'organizationMember']; grants: ['adminManageAgents', 'adminChoosePeople', 'memberSeeAgents', 'memberSeePeopleNames']; scope: 'organization' };
  };
  /**
   * Purpose: Records the admin’s plain-words description of a new virtual employee and sends it to the cm, which prepares a draft or refuses it.
   * Input: prompt: what the admin wrote describing the new agent and its functions.
   * Processing: Only the company admin may call it. agentDraftRecordedBeforeSending: first creates the AgentDraft in this module with the prompt, requestedBy = the logged-in admin, requestedAt = now and status ’preparing’, and only then sends the request to the cm. id and version are filled by the engine. The cm later reports it ready or refused through its own arrival, never through this endpoint. Each DraftInboxItem carries draftId to open its page; the screen does not show it. Each AgentCard carries agentId to open its page; the screen does not show it. Each DraftCard carries draftId to open its page; the screen does not show it. Each RequestEvent carries draftId to open its page; the screen does not show it.
   * Output: The new draft in status ’preparing’ in the three shapes it takes: request (history event), inboxItem (waiting draft with prompt, requester and date) and collectionEntry (draft card).
   */
  'agents.agents.sendNewAgentRequest': {
    kind: 'cmd';
    writes: 'AgentDraft.create';
    input: { prompt: string };
    output: { request: RequestEvent; inboxItem: DraftInboxItem; collectionEntry: AgentsCollectionEntry };
    rules: ['agentDraftRecordedBeforeSending'];
    access: { actors: ['companyAdmin', 'organizationMember']; grants: ['adminManageAgents', 'adminChoosePeople', 'memberSeeAgents', 'memberSeePeopleNames']; scope: 'organization' };
  };
}
