/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/tests60/context.ts" enhancement="_blank"/>

// What the model sees to propose the monitor cases of one page: the page contract (routes, JSDoc, types,
// rules, access), the request service def, the rule texts, the entities and the seed plan.

import { isRecord } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { readOptional } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { contractFile, fileRef, rulesFile, type M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import type { M12Context } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { ruleTexts } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';
import { arrivalInputOf } from '/_102021_/l2/agentMaterializeL1/helpers/arrivalInput.js';
import { withoutComments } from '/_102021_/l2/agentMaterializeL1/helpers/codeTokens.js';
import { processReceives } from '/_102021_/l2/agentMaterializeL1/helpers/workflowReach.js';
import { serveRowOf } from '/_102021_/l2/agentMaterializeL1/steps/requests50/serveSource.js';
import { functionProse, l4Process } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/context.js';

export const M12_TESTS_TOOL = 'proposeMonitorCases' as const;

/** A connection serve route has no L2 page, so the monitor does not propose cases for it, unless a function of a process receives the arrival (d1_289). */
export const SERVE_ROUTE_NO_PAGE_TEST = 'SERVE_ROUTE_NO_PAGE_TEST' as const;

/** True when a request-service def has a row that serves a connection operation. */
export function requestServiceServes(data: Record<string, unknown> | undefined): boolean {
  const requests = Array.isArray(data?.requests) ? data.requests : [];
  // A page that receives module events (`consumes`, d1_217) has no L2 contract either: no page test.
  return requests.some(row => isRecord(row) && ((typeof row.serves === 'string' && row.serves !== '') || (typeof row.consumes === 'string' && row.consumes !== '')));
}

export const M12_TESTS_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['cases'],
  properties: {
    cases: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'routine', 'params', 'expect', 'mutating'],
        properties: {
          id: { type: 'string' },
          routine: { type: 'string' },
          params: { type: 'object' },
          paramFieldRefs: { type: 'object', additionalProperties: { type: 'string' } },
          expect: {
            type: 'object',
            additionalProperties: false,
            required: ['ok'],
            properties: {
              ok: { type: 'boolean' },
              errorCode: { type: 'string' },
              minItems: { type: 'integer' },
              shape: { type: 'string', enum: ['object', 'array', 'paginated'] },
              itemsKey: { type: 'string' },
            },
          },
          mutating: { type: 'boolean' },
        },
      },
    },
  },
};

export interface M12ContractRoute {
  route: string;
  kind: 'qry' | 'cmd';
  /** Top-level input member names (`details` for `details: { … }`), the `.required` vocabulary. */
  inputFields: string[];
  actors: string[];
  rules: string[];
}

/** The text of the `{ … }` that starts at `open` (an index of `{`), braces balanced; null when unbalanced. */
function balanced(source: string, open: number): string | null {
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open, index + 1);
    }
  }
  return null;
}

function topLevelMembers(body: string): string[] {
  const inner = body.slice(1, -1);
  const out: string[] = [];
  let depth = 0;
  let segment = '';
  for (const char of inner) {
    if (char === '{' || char === '[' || char === '(') depth += 1;
    if (char === '}' || char === ']' || char === ')') depth -= 1;
    if (char === ';' && depth === 0) { out.push(segment); segment = ''; continue; }
    segment += char;
  }
  out.push(segment);
  return out.map(item => /^\s*(?:readonly\s+)?([A-Za-z_][A-Za-z0-9_]*)\??\s*:/u.exec(item)?.[1] ?? '').filter(Boolean);
}

function literalList(clause: string, key: string): string[] {
  const match = new RegExp(`${key}\\s*:\\s*\\[([^\\]]*)\\]`, 'u').exec(clause);
  return match ? [...match[1].matchAll(/'([^']+)'/gu)].map(item => item[1]) : [];
}

/** The routes of a v2 page contract, read from its text (`'<route>': { kind; input; output; rules; access }`). */
export function contractRoutes(source: string, moduleName: string, pageId: string): M12ContractRoute[] {
  const routes: M12ContractRoute[] = [];
  const pattern = new RegExp(`'(${moduleName}\\.${pageId}\\.[A-Za-z0-9_]+)'\\s*:\\s*\\{`, 'gu');
  for (const match of source.matchAll(pattern)) {
    const open = (match.index ?? 0) + match[0].length - 1;
    const clause = balanced(source, open);
    if (!clause) continue;
    const kind = /kind\s*:\s*'(qry|cmd)'/u.exec(clause)?.[1] as 'qry' | 'cmd' | undefined;
    const inputAt = /input\s*:\s*\{/u.exec(clause);
    const input = inputAt ? balanced(clause, (inputAt.index ?? 0) + inputAt[0].length - 1) : null;
    const access = /access\s*:\s*\{[^}]*\}/u.exec(clause)?.[0] ?? '';
    routes.push({
      route: match[1],
      kind: kind ?? 'qry',
      inputFields: input ? topLevelMembers(input) : [],
      actors: literalList(access, 'actors'),
      rules: literalList(clause.replace(access, ''), 'rules'),
    });
  }
  return routes;
}

export interface M12TestsContext {
  pageId: string;
  /** The L2 page contract; null for a page of arrivals, which has none. */
  contract: M12FileInfo | null;
  routes: M12ContractRoute[];
  actor: string;
  entities: string[];
  human: string;
  /** Every input this page's cases are derived from (hashed by the caller). */
  inputs: string[];
}

function section(title: string, body: string): string {
  return `## ${title}\n\n${body.trim()}\n`;
}

function fence(lang: string, text: string): string {
  return `\`\`\`${lang}\n${text.trim()}\n\`\`\``;
}

/** `ruleId → code` pairs a materialized request throws as `new AppError('<CODE>', …, { ruleId })`. */
export function thrownErrorCodes(source: string): Array<{ ruleId: string; code: string }> {
  const out: Array<{ ruleId: string; code: string }> = [];
  const seen = new Set<string>();
  const hits = [...source.matchAll(/new AppError\(\s*(['"])([^'"]+)\1/gu)];
  for (let index = 0; index < hits.length; index += 1) {
    const match = hits[index];
    const from = match.index ?? 0;
    const until = hits[index + 1]?.index ?? source.length;
    const ruleId = /ruleId\s*:\s*(['"])([^'"]+)\1/u.exec(source.slice(from, until))?.[2];
    if (!ruleId) continue;
    const code = match[2];
    const key = `${ruleId}\0${code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ ruleId, code });
  }
  return out;
}

/** The page of a controller unit and everything its cases are read from. */
export async function loadTestsContext(ctx: M12Context, controller: M12Unit, repair?: { problems: string[]; previous: string | null }): Promise<M12TestsContext> {
  const { project, module: moduleName } = ctx.run;
  const pageId = String(controller.definition.data.pageId ?? controller.unitId);
  const service = ctx.units.find(unit => unit.layer === 'requests' && String(unit.definition.data.pageId ?? unit.unitId) === pageId);
  if (service && requestServiceServes(service.definition.data)) {
    // d1_289: the arrival that moves a process has a contract of its own (the catalog of its connection) and a function that runs it: it gets cases. The other routes of the page, and the arrivals that come in the middle of a process, stay without.
    const arrivals = processArrivals(ctx.units, service.definition.data);
    if (arrivals.length) return arrivalTestsContext(ctx, controller, service, pageId, arrivals, repair);
    throw new Error(`${SERVE_ROUTE_NO_PAGE_TEST}: page ${pageId} serves a connection and has no page test.`);
  }
  const contract = contractFile(project, moduleName, pageId);
  const contractText = await readOptional(contract);
  if (!contractText) throw new Error(`CONTRACT_UNREAD: ${fileRef(contract)}`);
  const routes = contractRoutes(contractText, moduleName, pageId);
  if (!routes.length) throw new Error(`CONTRACT_NO_ROUTES: ${fileRef(contract)} has no route of ${moduleName}.${pageId}.`);
  const actor = routes.flatMap(route => route.actors)[0] ?? '';
  // An external entity has no seed row: it is not a <seedRef> or paramFieldRefs target.
  const entities = ctx.units.filter(unit => unit.definition.artifactType === 'domainEntity' && unit.definition.data.storageTarget !== 'external');
  const seeds = ctx.units.find(unit => unit.definition.artifactType === 'persistenceSeeds');
  const rulesSource = await readOptional(rulesFile(project, moduleName));
  const rules = ruleTexts(rulesSource, [...new Set(routes.flatMap(route => route.rules))].sort());

  const parts: string[] = [];
  parts.push(section('Task', [
    `Propose the monitor cases of page ${pageId} of module ${moduleName}: one BFF call per case, run against the generated backend in an in-memory store seeded from the definitions.`,
    `The page runs as actor \`${actor || '(none)'}\`. Cover every route below with at least one positive case, and the rules each route lists with a negative case when the rule can be broken through the route input.`,
  ].join('\n')));
  parts.push(section(`Contract ${fileRef(contract)} (the source of truth)`, fence('ts', contractText)));
  if (rules.length) parts.push(section('Rules (l4 text)', rules.map(rule => `- ${rule.ruleId}: ${rule.text}`).join('\n')));
  const requestSource = service ? await readOptional(service.output) : null;
  const thrown = requestSource ? thrownErrorCodes(requestSource) : [];
  if (service) parts.push(section(`Request service def ${service.defRef}`, fence('json', JSON.stringify(service.definition.data, null, 2))));
  if (thrown.length) {
    parts.push(section('Error codes the request throws', thrown.map(item => `- ${item.ruleId} → ${item.code}`).join('\n')));
  }
  parts.push(section('Entities of the module (for paramFieldRefs)', entities.map(unit => {
    const fields = Array.isArray(unit.definition.data.fields) ? unit.definition.data.fields.filter(isRecord).map(field => String(field.name ?? '')).filter(Boolean) : [];
    return `- ${String(unit.definition.data.entityId ?? unit.definition.artifactId)}: ${fields.join(', ')}`;
  }).join('\n')));
  if (seeds) parts.push(section(`Seed plan ${seeds.defRef}`, fence('json', JSON.stringify(seeds.definition.data, null, 2).slice(0, 20000))));
  if (repair) {
    parts.push(section('Repair', [
      'The previous answer was refused. Fix exactly these problems and return every case again:',
      ...repair.problems.map(problem => `- ${problem}`),
      repair.previous ? `\nPrevious answer:\n${fence('json', repair.previous)}` : '',
    ].join('\n')));
  }
  return {
    pageId,
    contract,
    routes,
    actor,
    entities: entities.map(unit => String(unit.definition.data.entityId ?? unit.definition.artifactId)),
    human: parts.join('\n'),
    inputs: [contractText, service?.text ?? '', requestSource ?? '', rulesSource ?? '', seeds?.text ?? '', ...entities.map(unit => unit.text)],
  };
}

/** A route of a page that serves the arrival that opens a process, received by one of its functions. */
export interface ProcessArrival {
  route: string;
  arrival: string;
  kind: 'qry' | 'cmd';
  processUnit: M12Unit;
  fn: string;
}

/**
 * The `serves` rows of a request service whose operation a process receives (`data.receives`, the L4 `functions[].receives`) AND that opens the same process (`trigger: { kind: 'event', event }`):
 * the message is the whole input of the process and a literal message is accepted (d1_290). An arrival that comes in the middle of a process (`cm.agentDraftReady`, the trigger of its process is
 * manual) names a record that has to exist already: a case with a literal message fails on correct code (`DRAFT_NOT_FOUND`), so it gets none. A `consumes` row and a `serves` row no process
 * receives are not here either.
 */
export function processArrivals(units: readonly M12Unit[], serviceData: Record<string, unknown>): ProcessArrival[] {
  const received = new Map<string, { processUnit: M12Unit; fn: string }>();
  for (const unit of units.filter(item => item.definition.artifactType === 'workflowProcess')) {
    const trigger = isRecord(unit.definition.data.trigger) ? unit.definition.data.trigger : {};
    for (const [arrival, fn] of processReceives(unit.definition.data)) {
      if (trigger.kind === 'event' && trigger.event === arrival) received.set(arrival, { processUnit: unit, fn });
    }
  }
  const rows = Array.isArray(serviceData.requests) ? serviceData.requests.filter(isRecord) : [];
  return rows.flatMap(row => {
    const hit = typeof row.serves === 'string' ? received.get(row.serves) : undefined;
    if (!hit || typeof row.route !== 'string' || !row.route) return [];
    return [{ route: row.route, arrival: String(row.serves), kind: row.kind === 'qry' ? 'qry' as const : 'cmd' as const, ...hit }];
  });
}

/** Every `AppError` code a file throws, once, in order. */
export function thrownCodes(source: string): string[] {
  return [...new Set([...withoutComments(source).matchAll(/new AppError\(\s*(['"])([^'"]+)\1/gu)].map(match => match[2]))];
}

/**
 * d1_289: the cases of a page whose routes are arrivals a process receives. No L2 contract: the input of each route is the catalog type of its arrival, the L4 says what the
 * arrival does and the process says what its function does with it. The cases are one delivery the route accepts and the same delivery again (the L4: the same release delivered
 * again changes nothing): with these two the route that always refuses cannot pass.
 */
async function arrivalTestsContext(ctx: M12Context, controller: M12Unit, service: M12Unit, pageId: string, arrivals: readonly ProcessArrival[], repair?: { problems: string[]; previous: string | null }): Promise<M12TestsContext> {
  const { project, module: moduleName } = ctx.run;
  const integration = await ctx.read(`_${project}_/l4/${moduleName}/integration.defs.ts`);
  const workflows = await ctx.read(`_${project}_/l4/${moduleName}/workflows.defs.ts`);
  const entities = ctx.units.filter(unit => unit.definition.artifactType === 'domainEntity' && unit.definition.data.storageTarget !== 'external');
  const requestSource = await readOptional(service.output);
  const parts: string[] = [];
  parts.push(section('Task', [
    `Propose the monitor cases of page ${pageId} of module ${moduleName}: one BFF call per case, run against the generated backend in an in-memory store seeded from the definitions.`,
    'This page has no L2 contract: each route below is a message another system sends, and the function of a process receives it. The page runs with no actor.',
    'For each route write two cases with the same `params`: the first with id `<route name>.accepts`, the second with id `<route name>.again`, both `expect: { ok: true }` and `mutating: true`. The `params` are a literal, the smallest message that is valid for the input type below (every required field, with real values, no seed markers, no `paramFieldRefs`). The L4 says what the same message delivered again does; the second case must hold the same.',
  ].join('\n')));
  parts.push(section('Routes of this page', arrivals.map(item => `- ${item.route} (${item.kind}): serves ${item.arrival}; the function \`${item.fn}\` of the process \`${String(item.processUnit.definition.data.processId ?? item.processUnit.unitId)}\` receives the message.`).join('\n')));
  const routes: M12ContractRoute[] = [];
  const processTexts: string[] = [];
  for (const item of arrivals) {
    const input = await arrivalInputOf(ctx.read, project, moduleName, item.arrival);
    const [connectionId, operationId] = [item.arrival.slice(0, item.arrival.indexOf('.')), item.arrival.slice(item.arrival.indexOf('.') + 1)];
    const said = String(serveRowOf(integration, connectionId, operationId)?.description ?? '');
    const processId = String(item.processUnit.definition.data.processId ?? item.processUnit.unitId);
    const prose = functionProse(l4Process(workflows, processId), item.fn);
    const processSource = await readOptional(item.processUnit.output);
    processTexts.push(processSource ?? '');
    parts.push(section(`Input of ${item.route}`, input
      ? [`The body of the route is the message: the catalog type \`${input.inputType}\` (the params of the case are the fields of this type).`, input.shapes.length ? input.shapes.map(shape => `- ${shape}`).join('\n') : '(the catalog does not declare the body of this type)'].join('\n')
      : `The catalog of the connection does not give the input type of ${item.arrival}.`));
    if (said) parts.push(section(`What the L4 says the arrival ${item.arrival} does`, said));
    if (prose) parts.push(section(`What the function ${item.fn} does (l4 process ${processId})`, prose));
    const thrown = [...new Set([...thrownErrorCodes(requestSource ?? '').map(entry => entry.code), ...thrownCodes(requestSource ?? ''), ...thrownCodes(processSource ?? '')])];
    if (thrown.length) parts.push(section(`Error codes the route and the process throw (${item.route})`, thrown.map(code => `- ${code}`).join('\n')));
    routes.push({ route: item.route, kind: item.kind, inputFields: input?.inputBody ? topLevelMembers(input.inputBody) : [], actors: [], rules: [] });
  }
  parts.push(section(`Request service def ${service.defRef} (the routes above only)`, fence('json', JSON.stringify({ ...service.definition.data, requests: (Array.isArray(service.definition.data.requests) ? service.definition.data.requests : []).filter(row => isRecord(row) && arrivals.some(item => item.route === row.route)) }, null, 2))));
  if (repair) {
    parts.push(section('Repair', [
      'The previous answer was refused. Fix exactly these problems and return every case again:',
      ...repair.problems.map(problem => `- ${problem}`),
      repair.previous ? `\nPrevious answer:\n${fence('json', repair.previous)}` : '',
    ].join('\n')));
  }
  return {
    pageId,
    contract: null,
    routes,
    actor: '',
    entities: entities.map(unit => String(unit.definition.data.entityId ?? unit.definition.artifactId)),
    human: parts.join('\n'),
    inputs: [integration ?? '', workflows ?? '', service.text, requestSource ?? '', ...processTexts, ...arrivals.map(item => item.processUnit.text)],
  };
}
