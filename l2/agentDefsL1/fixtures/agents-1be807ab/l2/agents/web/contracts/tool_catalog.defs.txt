/// <mls fileReference="_102047_/l2/agents/web/contracts/tool_catalog.defs.ts" enhancement="_blank"/>

/** One action of the tool catalog with its readable name, plain-language description and situation in the current release. */
export interface CatalogTool {
  name: string;
  details: {
    description: string;
  };
  status: 'available' | 'removed';
}

/** A subject inside a module of the tool catalog, with the actions it groups. */
export interface CatalogSubject {
  subject: string;
  details: {
    subjectTitle: string;
  };
  tools: CatalogTool[];
}

/** A module of the tool catalog (an app module or the cm itself), with its subjects and their actions. */
export interface CatalogModule {
  moduleName: string;
  details: {
    moduleTitle: string;
  };
  subjects: CatalogSubject[];
}

/** A tool of the catalog with the number of agents that have it turned on. */
export interface ToolUsage {
  name: string;
  details: {
    moduleTitle: string;
    subjectTitle: string;
  };
  readonly usedByAgents: number;
}

/** A tool as a catalog change: when it entered the catalog and, if it left the release, when it was marked removed. */
export interface CatalogUpdate {
  name: string;
  status: 'available' | 'removed';
  details: {
    moduleTitle: string;
    subjectTitle: string;
    addedAt?: string;
    removedAt?: string;
  };
}

export interface Tool_catalogContracts {
  /**
   * Purpose: Loads the whole tool catalog of the organization as a module / subject / action tree, together with how many agents use each tool.
   * Input: None. The organization comes from the logged-in person.
   * Processing: Reads every Tool of the catalog, including removed ones (toolNeverDeleted: a tool that left the release is kept and returned with status removed), and groups them by moduleName then subject, ordered by moduleTitle, subjectTitle and name. Returns readable names only, never ids, toolKey or catalogItem (noTechnicalIdsOnScreen). toolUsage is computed only for callers whose grant allows Tool.details.usedByAgents (companyAdmin): usedByAgents is derived per tool by counting the distinct agents with an AgentTool for that tool whose enabled is true, in one grouped query; it is computed, never stored. The list is ordered by usedByAgents descending, then name. For organizationMember toolUsage is omitted.
   * Output: modules: every module with its subjects and their actions (name, description, status). toolUsage: every tool with its module and subject titles and the number of agents that have it on, most used first; absent when the caller may not see it.
   */
  'agents.tool_catalog.getToolCatalog': {
    kind: 'qry';
    input: {};
    output: { modules: CatalogModule[]; toolUsage?: ToolUsage[] };
    rules: ['noTechnicalIdsOnScreen', 'toolNeverDeleted'];
    access: { actors: ['companyAdmin', 'organizationMember']; grants: ['adminManageTools', 'memberReadToolCatalog']; scope: 'organization' };
  };
  /**
   * Purpose: Lists the changes of the tool catalog made by the rebuilds after a new module or release: tools added and tools marked removed, newest first, page by page.
   * Input: page and pageSize: the page of changes requested and its size.
   * Processing: Reads the Tools of the organization’s catalog, which the rebuild creates, updates and marks removed (catalogRebuiltOnRelease; removed tools are kept, toolNeverDeleted). Orders them by the latest of removedAt and addedAt, newest first, and pages the result. addedAt and removedAt are returned only to callers whose grant allows them (companyAdmin). No ids are returned (noTechnicalIdsOnScreen).
   * Output: updates: a page { items, page, pageSize, hasMore } of tools with name, status, module and subject titles, the date they were added and, when removed, the date they were marked removed.
   */
  'agents.tool_catalog.listCatalogUpdates': {
    kind: 'qry';
    input: { page: number; pageSize: number };
    output: { updates: { items: CatalogUpdate[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['catalogRebuiltOnRelease', 'toolNeverDeleted', 'noTechnicalIdsOnScreen'];
    access: { actors: ['companyAdmin', 'organizationMember']; grants: ['adminManageTools', 'memberReadToolCatalog']; scope: 'organization' };
  };
}
