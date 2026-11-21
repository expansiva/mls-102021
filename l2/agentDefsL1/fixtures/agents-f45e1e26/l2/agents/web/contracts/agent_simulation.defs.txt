/// <mls fileReference="_102047_/l2/agents/web/contracts/agent_simulation.defs.ts" enhancement="_blank"/>

/** The agent being simulated, identified by its @name. */
export interface AgentHeader {
  name: string;
}

/** Identification of an organization user: the readable name. */
export interface PersonIdentification {
  name: string;
}

/** Details of an organization user. */
export interface PersonDetails {
  identification: PersonIdentification;
}

/** An active organization user a simulation can be run for, with a reference and a readable name. */
export interface SimulatedPerson {
  id: string;
  details: PersonDetails;
}

/** One tool of the catalog judged for the simulated person or role: where it sits in the module / subject / action tree, whether it can be used and why. */
export interface ToolVerdict {
  tool: string;
  moduleName: string;
  subjectName: string;
  actionName: string;
  canUse: boolean;
  reason: 'allowed' | 'restrictedForPerson' | 'notPermittedForRole' | 'removedFromRelease';
  reasonText?: string;
}

/** The ’what it can’ simulation of an agent for one person or role: who it was run for and the verdict for each tool. */
export interface WhatItCanResult {
  agent: string;
  level: 'whatItCan' | 'whatItUnderstands';
  subjectKind: 'person' | 'role';
  person?: SimulatedPerson;
  roleName?: string;
  toolVerdicts: ToolVerdict[];
}

/** One action the agent would take for the sentence, tied to a catalog tool. */
export interface UnderstoodAction {
  tool: string;
  actionName: string;
}

/** How the agent reads a sentence: whether it asks for an action, the module and subject it leads to, the actions and a short explanation. */
export interface Understanding {
  asksForAction: boolean;
  moduleName?: string;
  subjectName?: string;
  actions: UnderstoodAction[];
  explanation?: string;
}

/** The ’what it understands’ simulation of an agent for one sentence. */
export interface WhatItUnderstandsResult {
  agent: string;
  level: 'whatItCan' | 'whatItUnderstands';
  sentence: string;
  understanding: Understanding;
}

export interface Agent_simulationContracts {
  /**
   * Purpose: Opens the simulation of an agent: its @name and the ’what it can’ simulation run for the logged-in person.
   * Input: agentId: the agent chosen in the URL.
   * Processing: Reads the agent name from the cm. Runs the ’what it can’ level for the logged-in person (memberSimulatesOnlyAsSelf): takes only the tools that are on for the agent (onlyToolsOnAreConsidered), marks removed tools as blocked with reason removedFromRelease (removedToolNotSent), and marks tools the person may not use as restrictedForPerson (personRestrictionAppliesInRequest, restrictionAppliesThroughAnyAgent). Each verdict gets readable module, subject and action names and a one-line reason; no technical id is shown (noTechnicalIdsOnScreen). Nothing is written (simulationSavesNothing).
   * Output: The agent header with its @name and the ’what it can’ result for the caller: level whatItCan, subjectKind person, the caller’s name and the verdict for each tool.
   */
  'agents.agent_simulation.getSimulationPage': {
    kind: 'qry';
    input: { agentId: string };
    output: { agent: AgentHeader; whatItCan: WhatItCanResult };
    rules: ['simulationSavesNothing', 'memberSimulatesOnlyAsSelf', 'onlyToolsOnAreConsidered', 'personRestrictionAppliesInRequest', 'restrictionAppliesThroughAnyAgent', 'removedToolNotSent', 'noTechnicalIdsOnScreen'];
    access: { actors: ['companyAdmin', 'organizationMember']; grants: ['adminManageAgents', 'adminChoosePeople', 'memberSeeAgents', 'memberSeePeopleNames', 'memberSimulateAsMyself']; scope: 'organization' };
  };
  /**
   * Purpose: Runs the ’what it can’ simulation of the agent for the person or role the actor chose.
   * Input: agentId: the agent in the URL. subjectKind: whether to simulate for a person or a role. person: the chosen person when subjectKind is person. roleName: the chosen role when subjectKind is role.
   * Processing: A company admin may simulate for any active person or any role (adminSimulatesByRole, onlyActiveUsersRestricted); an organization member is always simulated as themselves, whatever is sent (memberSimulatesOnlyAsSelf). Only tools on for the agent are considered (onlyToolsOnAreConsidered); removed tools are blocked with reason removedFromRelease (removedToolNotSent); for a person, tools restricted for that person are blocked as restrictedForPerson (personRestrictionAppliesInRequest, restrictionAppliesThroughAnyAgent); for a role, tools the role is not permitted are blocked as notPermittedForRole. Readable names only (noTechnicalIdsOnScreen). Nothing is saved (simulationSavesNothing).
   * Output: The ’what it can’ result for the chosen person or role: who it was run for and each tool with module, subject, action, whether it can be used, the reason and its one-line explanation.
   */
  'agents.agent_simulation.simulateWhatItCan': {
    kind: 'qry';
    input: { agentId: string; subjectKind: 'person' | 'role'; person?: string; roleName?: string };
    output: { whatItCan: WhatItCanResult };
    rules: ['simulationSavesNothing', 'adminSimulatesByRole', 'memberSimulatesOnlyAsSelf', 'onlyActiveUsersRestricted', 'onlyToolsOnAreConsidered', 'personRestrictionAppliesInRequest', 'restrictionAppliesThroughAnyAgent', 'removedToolNotSent', 'noTechnicalIdsOnScreen'];
    access: { actors: ['companyAdmin', 'organizationMember']; grants: ['adminManageAgents', 'adminChoosePeople', 'memberSeeAgents', 'memberSeePeopleNames', 'memberSimulateAsMyself']; scope: 'organization' };
  };
  /**
   * Purpose: Finds the people a company admin can choose to simulate the agent for.
   * Input: search: part of the person’s name typed by the admin. page and pageSize: the page of results.
   * Processing: Available to the company admin only (adminSimulatesByRole). Lists organization users with a platform login whose name contains the typed text, keeping only active users (onlyActiveUsersRestricted). Only the readable name is shown (noTechnicalIdsOnScreen).
   * Output: A page of active people, each with its reference and name.
   */
  'agents.agent_simulation.findPeopleToSimulate': {
    kind: 'qry';
    input: { search?: string; page: number; pageSize: number };
    output: { people: { items: SimulatedPerson[]; page: number; pageSize: number; hasMore: boolean } };
    rules: ['adminSimulatesByRole', 'onlyActiveUsersRestricted', 'noTechnicalIdsOnScreen'];
    access: { actors: ['companyAdmin', 'organizationMember']; grants: ['adminManageAgents', 'adminChoosePeople', 'memberSeeAgents', 'memberSeePeopleNames', 'memberSimulateAsMyself']; scope: 'organization' };
  };
  /**
   * Purpose: Asks the cm how the agent reads a sample sentence.
   * Input: agentId: the agent in the URL. sentence: the sample request typed. subjectKind, person, roleName: optional person or role the admin is simulating for; when absent, or for a member, the logged-in person.
   * Processing: Sends the sentence to the cm simulation at level whatItUnderstands. Members are always simulated as themselves (memberSimulatesOnlyAsSelf); admins may pass a person or role (adminSimulatesByRole). Only tools on for the agent are considered (onlyToolsOnAreConsidered) and tools the person may not use are left out of the actions (personRestrictionAppliesInRequest). Readable names only (noTechnicalIdsOnScreen). Nothing is saved (simulationSavesNothing).
   * Output: The sentence with its understanding: whether it asks for an action, the module and subject it leads to, the actions it would take and a short explanation.
   */
  'agents.agent_simulation.simulateWhatItUnderstands': {
    kind: 'qry';
    input: { agentId: string; sentence: string; subjectKind?: 'person' | 'role'; person?: string; roleName?: string };
    output: { whatItUnderstands: WhatItUnderstandsResult };
    rules: ['simulationSavesNothing', 'memberSimulatesOnlyAsSelf', 'adminSimulatesByRole', 'onlyToolsOnAreConsidered', 'personRestrictionAppliesInRequest', 'noTechnicalIdsOnScreen'];
    access: { actors: ['companyAdmin', 'organizationMember']; grants: ['adminManageAgents', 'adminChoosePeople', 'memberSeeAgents', 'memberSeePeopleNames', 'memberSimulateAsMyself']; scope: 'organization' };
  };
}
