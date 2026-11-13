/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/catalog75/assistantCatalogBuild.ts" enhancement="_blank"/>

// Pure assembly of one module's assistant catalog. `journeys` must already be in module order
// (l4 journeys/index.defs.ts, then any journey file missing from that index, A to Z).

import { asArray, asRecord, asString, buildCatalog } from '/_102020_/l2/helpers/assistantCatalog/asCatalog.js';
import { extractExportedObject, parseContractSource } from '/_102020_/l2/helpers/assistantCatalog/asSource.js';
import type { AsCommand, AsEntity, AsInputField, AsLookup } from '/_102020_/l2/helpers/assistantCatalog/asTypes.js';
import { accessOfRoute, optionsOnly, pageOfRoute, titleOfCommand, titleOfQuery, type CatalogPage } from '/_102021_/l2/agentMaterializeL1/steps/catalog75/describe.js';
import { riskOfCommand, riskOfQuery, type AssistantRisk } from '/_102021_/l2/agentMaterializeL1/steps/catalog75/risk.js';

export const ASSISTANT_CATALOG_SCHEMA = 'assistant-catalog-v1';

export interface AssistantCatalogInputs {
  project: string;
  module: string;
  routeKeys: readonly string[];
  requests: readonly string[];
  contracts: readonly string[];
  ontology: readonly string[];
  usecases: readonly string[];
  journeys: readonly string[];
  integration: string | null;
  workflows: string | null;
  workflowOperations: readonly string[];
  sharedPages: readonly string[];
  config: string;
}

export interface AssistantCatalogAction {
  route: string;
  module: string;
  kind: 'cmd' | 'qry';
  purpose: string;
  writes: string;
  entity: string;
  inputs: AsInputField[];
  pageParam: string;
  pageSizeParam: string;
  actionId: string;
  routes: string[];
  title: string;
  actors: string[];
  rules: string[];
  assistant: 'included' | 'excluded';
  risk: AssistantRisk;
  page?: CatalogPage;
}

export interface AssistantCatalog {
  schemaVersion: typeof ASSISTANT_CATALOG_SCHEMA;
  module: string;
  commands: AssistantCatalogAction[];
  queries: AssistantCatalogAction[];
  lookups: AsLookup[];
  entities: AsEntity[];
  issues: string[];
}

const EMPTY_SHARED = 'export const definition = { "journeys": [] };';

export function buildAssistantCatalog(inputs: AssistantCatalogInputs): { catalog: AssistantCatalog; text: string } {
  const catalog = assemble(inputs);
  return { catalog, text: renderAssistantCatalog(inputs.project, inputs.module, catalog) };
}

export function renderAssistantCatalog(project: string, moduleName: string, catalog: AssistantCatalog): string {
  const reference = `_${project}_/l1/${moduleName}/layer_2_application/assistant/assistantCatalog.ts`;
  const body = JSON.stringify(catalog, null, 2);
  return `/// <mls fileReference="${reference}" enhancement="_blank"/>\n\nexport const assistantCatalog = ${body} as const;\n`;
}

function assemble(inputs: AssistantCatalogInputs): AssistantCatalog {
  if (inputs.routeKeys.length === 0) return emptyCatalog(inputs.module);
  const built = buildCatalog([{
    module: inputs.module,
    routeKeys: [...inputs.routeKeys],
    requests: [...inputs.requests],
    contracts: [...inputs.contracts],
    ontology: [...inputs.ontology],
  }]);
  const requestByRoute = indexRequests(inputs.requests);
  const usecaseById = indexUsecases(inputs.usecases);
  const sharedByPage = indexSharedPages(inputs.sharedPages);
  const order = new Map(inputs.routeKeys.map((route, index) => [route, index]));
  const issues = [...built.issues];

  const commands = groupCommands(inputs, built.commands, requestByRoute, usecaseById, sharedByPage, order, issues);
  const queries = built.queries
    .map(query => describeQuery(inputs, query, requestByRoute, sharedByPage, issues))
    .sort((a, b) => (order.get(a.route) ?? 0) - (order.get(b.route) ?? 0));

  return {
    schemaVersion: ASSISTANT_CATALOG_SCHEMA,
    module: inputs.module,
    commands,
    queries,
    lookups: built.lookups,
    entities: built.entities,
    issues,
  };
}

function emptyCatalog(moduleName: string): AssistantCatalog {
  return {
    schemaVersion: ASSISTANT_CATALOG_SCHEMA,
    module: moduleName,
    commands: [],
    queries: [],
    lookups: [],
    entities: [],
    issues: [],
  };
}

function groupCommands(
  inputs: AssistantCatalogInputs,
  commands: AsCommand[],
  requestByRoute: Map<string, Record<string, unknown>>,
  usecaseById: Map<string, string>,
  sharedByPage: Map<string, string>,
  order: Map<string, number>,
  issues: string[],
): AssistantCatalogAction[] {
  const alone: AsCommand[] = [];
  const byUsecase = new Map<string, AsCommand[]>();
  for (const command of commands) {
    const request = requestByRoute.get(command.route);
    if (!request) throw new Error(`${command.route}: catalog command has no request`);
    const writeIds = writeUsecaseIds(request, usecaseById);
    if (writeIds.length !== 1) {
      alone.push(command);
      issues.push(`ACTION_WRITE_USECASE_UNCLEAR: ${command.route}`);
      continue;
    }
    const list = byUsecase.get(writeIds[0]) ?? [];
    list.push(command);
    byUsecase.set(writeIds[0], list);
  }

  const described: AssistantCatalogAction[] = alone.map(command => describeCommand(inputs, [command], null, requestByRoute, usecaseById, sharedByPage, issues));
  for (const [usecaseId, group] of byUsecase) {
    const partitions = new Map<string, AsCommand[]>();
    for (const command of group) {
      const signature = inputSignature(command);
      const list = partitions.get(signature) ?? [];
      list.push(command);
      partitions.set(signature, list);
    }
    for (const partition of partitions.values()) {
      if (partition.length === 1 && group.length > 1) {
        const route = partition[0].route;
        const others = group.map(command => command.route).filter(item => item !== route).sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
        issues.push(`ACTION_NOT_MERGED: ${route} shares the write usecase ${usecaseId} with ${others.join(', ')} but the inputs differ`);
      }
      described.push(describeCommand(
        inputs,
        partition,
        partition.length > 1 ? usecaseId : null,
        requestByRoute,
        usecaseById,
        sharedByPage,
        issues,
      ));
    }
  }
  return described.sort((a, b) => (order.get(a.route) ?? 0) - (order.get(b.route) ?? 0));
}

function describeCommand(
  inputs: AssistantCatalogInputs,
  members: AsCommand[],
  mergedUsecaseId: string | null,
  requestByRoute: Map<string, Record<string, unknown>>,
  usecaseById: Map<string, string>,
  sharedByPage: Map<string, string>,
  issues: string[],
): AssistantCatalogAction {
  const sorted = [...members].sort((a, b) => inputs.routeKeys.indexOf(a.route) - inputs.routeKeys.indexOf(b.route));
  const first = sorted[0];
  const routes = sorted.map(command => command.route);
  const request = requestByRoute.get(first.route);
  if (!request) throw new Error(`${first.route}: catalog command has no request`);
  const writeIds = writeUsecaseIds(request, usecaseById);
  const usecaseText = writeIds.length === 1 ? usecaseById.get(writeIds[0]) ?? '' : '';
  const shared = sharedByPage.get(pageIdOf(first.route)) ?? '';
  const title = usecaseText
    ? titleOfCommand({ usecaseText, journeyTexts: inputs.journeys, sharedPageText: shared || EMPTY_SHARED, purpose: first.purpose })
    : first.purpose;
  const access = routes.map(route => routeAccess(inputs.contracts, route, requestByRoute.get(route)));
  const page = pageOfRoute({
    route: first.route,
    project: inputs.project,
    module: inputs.module,
    configText: inputs.config,
    sharedPageText: shared || undefined,
  });
  if (!page) issues.push(`PAGE_UNRESOLVED: ${first.route}`);
  const risk = highest(sorted.map(command => riskOfCommand({
    usecases: usecaseTexts(requestByRoute.get(command.route), usecaseById),
    ontologies: inputs.ontology,
    integration: inputs.integration,
    workflows: inputs.workflows,
    workflowOperations: inputs.workflowOperations,
  })));
  return actionFrom(first, {
    actionId: mergedUsecaseId ? `${inputs.module}.${mergedUsecaseId}` : first.route,
    routes,
    title,
    actors: union(access.map(item => item.actors)),
    rules: union(access.map(item => item.rules)),
    assistant: 'included',
    risk,
    page,
  });
}

function describeQuery(
  inputs: AssistantCatalogInputs,
  query: AsCommand,
  requestByRoute: Map<string, Record<string, unknown>>,
  sharedByPage: Map<string, string>,
  issues: string[],
): AssistantCatalogAction {
  const shared = sharedByPage.get(pageIdOf(query.route)) ?? '';
  const title = titleOfQuery({
    entity: query.entity,
    journeyTexts: inputs.journeys,
    sharedPageText: shared || EMPTY_SHARED,
    purpose: query.purpose,
  });
  const access = routeAccess(inputs.contracts, query.route, requestByRoute.get(query.route));
  const page = pageOfRoute({
    route: query.route,
    project: inputs.project,
    module: inputs.module,
    configText: inputs.config,
    sharedPageText: shared || undefined,
  });
  if (!page) issues.push(`PAGE_UNRESOLVED: ${query.route}`);
  const contract = contractSource(inputs.contracts, query.route);
  return actionFrom(query, {
    actionId: query.route,
    routes: [query.route],
    title,
    actors: access.actors,
    rules: access.rules,
    assistant: contract && optionsOnly(contract, query.route) ? 'excluded' : 'included',
    risk: riskOfQuery(),
    page,
  });
}

function actionFrom(
  base: AsCommand,
  extra: Omit<AssistantCatalogAction, keyof AsCommand | 'page'> & { page?: CatalogPage },
): AssistantCatalogAction {
  const action: AssistantCatalogAction = {
    route: base.route,
    module: base.module,
    kind: base.kind,
    purpose: base.purpose,
    writes: base.writes,
    entity: base.entity,
    inputs: base.inputs,
    pageParam: base.pageParam,
    pageSizeParam: base.pageSizeParam,
    actionId: extra.actionId,
    routes: extra.routes,
    title: extra.title,
    actors: extra.actors,
    rules: extra.rules,
    assistant: extra.assistant,
    risk: extra.risk,
  };
  if (extra.page) action.page = extra.page;
  return action;
}

function routeAccess(
  contracts: readonly string[],
  route: string,
  request: Record<string, unknown> | undefined,
): { actors: string[]; rules: string[] } {
  const source = contractSource(contracts, route);
  if (!source) {
    return { actors: [], rules: asArray(request?.rules).map(asString).filter(Boolean) };
  }
  return accessOfRoute(source, route);
}

function contractSource(contracts: readonly string[], route: string): string {
  return contracts.find(text => parseContractSource(text).routes.some(item => item.route === route)) ?? '';
}

function usecaseTexts(request: Record<string, unknown> | undefined, usecaseById: Map<string, string>): Array<string | null> {
  if (!request) return [null];
  const ids = writeUsecaseIds(request, usecaseById);
  if (ids.length === 0) return [null];
  return ids.map(id => usecaseById.get(id) ?? null);
}

function writeUsecaseIds(request: Record<string, unknown>, usecaseById: Map<string, string>): string[] {
  const ids: string[] = [];
  for (const id of asArray(request.uses).map(asString).filter(Boolean)) {
    const text = usecaseById.get(id);
    if (!text) {
      ids.push(id);
      continue;
    }
    const operation = asString(asRecord(asRecord(extractExportedObject(text)).data).operation);
    if (operation !== 'list' && operation !== 'get') ids.push(id);
  }
  return ids;
}

function inputSignature(command: AsCommand): string {
  return command.inputs
    .map(field => `${field.path}\u0000${field.wireType}\u0000${field.required ? '1' : '0'}`)
    .sort()
    .join('\n');
}

function pageIdOf(route: string): string {
  return route.split('.')[1] ?? '';
}

function union(lists: string[][]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const item of list) {
      if (!item || seen.has(item)) continue;
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

function highest(risks: Array<'write' | 'sensitive'>): 'write' | 'sensitive' {
  return risks.includes('sensitive') ? 'sensitive' : 'write';
}

function indexRequests(texts: readonly string[]): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const text of texts) {
    const data = asRecord(asRecord(extractExportedObject(text)).data);
    for (const raw of asArray(data.requests)) {
      const request = asRecord(raw);
      const route = asString(request.route);
      if (!route || map.has(route)) continue;
      map.set(route, request);
    }
  }
  return map;
}

function indexUsecases(texts: readonly string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const text of texts) {
    const id = asString(asRecord(asRecord(extractExportedObject(text)).data).usecaseId);
    if (!id) throw new Error('usecase is missing usecaseId');
    if (map.has(id)) throw new Error(`usecase ${id} is declared twice`);
    map.set(id, text);
  }
  return map;
}

function indexSharedPages(texts: readonly string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const text of texts) {
    const match = /\/shared\/([^/"']+)\.defs\.ts/.exec(text);
    const pageId = match?.[1] ?? '';
    if (!pageId) throw new Error('shared page text has no fileReference page id');
    if (map.has(pageId)) throw new Error(`shared page ${pageId} is declared twice`);
    map.set(pageId, text);
  }
  return map;
}
