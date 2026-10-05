/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/requestService.ts" enhancement="_blank"/>

import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { parseD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import type { D2ContractV2Definition, D2ContractV2Route } from '/_102020_/l2/helpers/contractV2/types.js';
import type { D1SelectedRequest } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import type {
  D1ControllerProblem,
  D1ControllerRequest,
  D1ServiceParam,
  D1ServiceRequestSource,
  D1ServiceRow,
} from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';
import type { RequestDoc, RequestOutputNode, RequestTreeField } from '/_102021_/l2/helpers/l1Defs/requestTree.js';

export interface RequestServiceCheck {
  pageId: string;
  contractRoutes: readonly string[];
  requests: readonly D1ServiceRow[];
  usecaseIds: ReadonlySet<string>;
  fieldsByEntity: ReadonlyMap<string, ReadonlySet<string>>;
  /** Selected rows per route. Defaults to the built rows. */
  selectedCounts?: ReadonlyMap<string, number>;
  /**
   * `fields` checks the rows already built. `handlers` checks route coverage and dispenses a route
   * gap (s0b), so it runs after authority has marked those rows. Default `all`.
   */
  part?: 'fields' | 'handlers' | 'all';
}

/** The controllers60 view of one selected request: the derived outputs with their classification, and the params. */
export function serviceSourceOf(request: D1SelectedRequest): D1ServiceRequestSource {
  return {
    route: request.route,
    pageId: request.pageId,
    kind: request.kind,
    uses: [...request.uses],
    outputs: request.outputs.map(output => {
      const out: D1ServiceRequestSource['outputs'][number] = { key: output.key, entity: output.entity, many: output.many };
      for (const key of ['parent', 'relationship', 'page', 'pageSize', 'hasMore', 'total'] as const) if (output[key]) out[key] = output[key];
      if (output.computed?.length) out.computed = [...output.computed];
      if (output.related?.length) out.related = output.related.map(item => ({ ...item }));
      if (output.mapped?.length) out.mapped = output.mapped.map(item => ({ ...item }));
      return out;
    }),
    params: request.params.map(param => ({
      name: param.name,
      target: param.target,
      ...(param.field ? { field: param.field } : {}),
      ...(param.pages ? { pages: param.pages } : {}),
    })),
    ...(request.computedBy?.length ? { computedBy: request.computedBy.map(item => ({ ...item })) } : {}),
    ...(request.unresolved?.length ? { unresolved: request.unresolved.map(item => ({ path: item.path, reason: item.reason })) } : {}),
  };
}

/**
 * A route the controller must not handle (s0b): authority or access failed, so the request service
 * carries one `unresolved` node whose path is the route. The handler check dispenses that route.
 */
export function isRouteGap(row: { route: string; output: readonly { kind: string; path: string }[] }): boolean {
  return row.output.length === 1 && row.output[0]?.kind === 'unresolved' && row.output[0].path === row.route;
}

/** Leaf paths of a contract interface body. Containers are not paths. */
export function interfaceFieldPaths(body: string): string[] | null {
  const paths: string[] = [];
  const end = scanFields(body, 0, '', paths);
  if (end < 0) return null;
  return paths;
}

/** Dotted paths of an ontology entity, including object nodes. */
export function ontologyFieldPaths(entity: unknown): string[] {
  const record = isRecord(entity) && isRecord(entity.record) ? entity.record : entity;
  const fields = isRecord(record) && isRecord(record.fields) ? record.fields : null;
  if (!fields) return [];
  const out: string[] = [];
  collectFields(fields, '', out);
  return out;
}

/**
 * Each contract route has one request. Every `uses` id is a usecase def.
 * Each projected path is a field of that output's entity. A command is `single`.
 */
export function requestServiceProblems(input: RequestServiceCheck): D1ControllerProblem[] {
  const problems: D1ControllerProblem[] = [];
  const part = input.part || 'all';
  if (part !== 'fields') {
    const gaps = new Set(input.requests.filter(isRouteGap).map(row => row.route));
    const byRoute = new Map<string, number>();
    if (input.selectedCounts) {
      for (const [route, count] of input.selectedCounts) if (!gaps.has(route)) byRoute.set(route, count);
    } else {
      for (const row of input.requests) {
        if (gaps.has(row.route)) continue;
        byRoute.set(row.route, (byRoute.get(row.route) || 0) + 1);
      }
    }
    const contract = new Set(input.contractRoutes);
    for (const route of [...input.contractRoutes].sort()) {
      if (gaps.has(route)) continue;
      const found = byRoute.get(route) || 0;
      if (found !== 1) {
        error(problems, 'REQUEST_HANDLER', route, `Route ${route} has ${found} request handlers. The contract route needs one.`);
      }
    }
    for (const route of [...byRoute.keys()].sort()) {
      if (!contract.has(route)) {
        error(problems, 'REQUEST_HANDLER', route, `Route ${route} is not a contract route.`);
      }
    }
  }
  if (part === 'handlers') return problems;
  for (const row of input.requests) {
    const expected = row.kind === 'cmd' ? 'single' : 'none';
    if (row.transaction !== expected) {
      const role = row.kind === 'cmd' ? 'command' : 'query';
      error(problems, 'TRANSACTION_REQUIRED', row.route, `${role} ${row.route} transaction is ${row.transaction}. A ${role} is ${expected}.`);
    }
    for (const usecaseId of row.uses) {
      if (!input.usecaseIds.has(usecaseId)) {
        error(problems, 'INVALID_REF', row.route, `Route ${row.route} uses ${usecaseId}, which has no usecase def.`);
      }
    }
    // The fields of an entity or list node, by the ontology path each stands for. Computed, related, paging and nested
    // relation paths are other nodes, checked by their classification.
    // A field the ontology does not have is not projected (s0b). The route stays; the field is a declared gap.
    for (const node of row.output) {
      if (node.kind !== 'entity' && node.kind !== 'list' && node.kind !== 'related') continue;
      const known = input.fieldsByEntity.get(node.entity);
      const prefix = node.kind === 'list' && node.items ? `${node.path}.${node.items}` : node.path;
      node.fields = node.fields.filter(field => {
        if (known?.has(field.path)) return true;
        const message = `Route ${row.route} projects ${node.entity}.${field.path}, which is not a field of the ontology.`;
        review(problems, 'PROJECTION_FIELD_UNKNOWN', row.route, message);
        row.output.push({ kind: 'unresolved', path: `${prefix}.${field.field}`, reason: `PROJECTION_FIELD_UNKNOWN: ${message}` });
        return false;
      });
    }
  }
  return problems;
}

export function serviceRowsFor(
  pageId: string,
  definition: D2ContractV2Definition,
  selected: readonly D1ServiceRequestSource[],
): { routes: string[]; rows: D1ServiceRow[]; problems: D1ControllerProblem[] } {
  const problems: D1ControllerProblem[] = [];
  const routes = definition.routes.map(route => route.route);
  const rows: D1ServiceRow[] = [];
  for (const route of definition.routes) {
    const matches = selected.filter(item => item.route === route.route);
    if (matches.length !== 1) continue;
    const source = matches[0];
    const output = outputTree(route, source, definition, problems);
    const params: D1ServiceParam[] = [];
    for (const param of source.params) {
      if (!param.field && !param.pages) {
        // d1_62: a filter input left without a field (resolve25 answered none) is not applied. Said, not dropped silently.
        review(problems, 'FILTER_UNRESOLVED', route.route, `Route ${route.route} input ${param.name} filters no derived field. The request service does not apply it.`);
        continue;
      }
      params.push(copyParam(param));
    }
    const doc = docOf(route);
    rows.push({
      route: route.route,
      kind: route.kind,
      uses: [...source.uses],
      transaction: route.kind === 'cmd' ? 'single' : 'none',
      output,
      params,
      rules: [...(route.rules || [])],
      ...(doc ? { doc } : {}),
    });
  }
  return { routes, rows, problems };
}

/**
 * The classified output of one route (d1_61), from the derived outputs (input20 + resolve25, d1_62) and the contract
 * types: one node per output, at its contract path (`contextoAtendimento.comandasAbertas` when an output sits in a
 * group of outputs; the item array of its parent for a nested relation). The fields of an output split by what the
 * derivation says they are: its own (direct or mapped, d1_63), N:1 fields of a related entity, readonly values that are
 * no ontology path. A value tied to a rule in a group and every `output.` gap left open are nodes too. Nothing is
 * classified here a second time.
 */
function outputTree(
  route: D2ContractV2Route,
  source: D1ServiceRequestSource,
  definition: D2ContractV2Definition,
  problems: D1ControllerProblem[],
): RequestOutputNode[] {
  const nodes: RequestOutputNode[] = [];
  const elements = new Map<string, { path: string; body: string }>();
  for (const derived of source.outputs) {
    const parent = derived.parent ? elements.get(derived.parent) : undefined;
    if (derived.parent && !parent) continue;
    const relative = parent ? derived.key.slice((derived.parent || '').length + 1) : derived.key;
    const path = parent ? `${parent.path}.${relative}` : derived.key;
    const body = memberBody(parent ? parent.body : route.output, relative, definition);
    const page = body !== null && isPage(derived) ? pageItems(body, definition) : null;
    const element = page ? { path: `${path}.${page.name}`, body: page.body } : body === null ? null : { path, body };
    const leaves = element ? interfaceFieldPaths(element.body) : null;
    if (!element || !leaves) {
      // One output node that does not assemble is a declared gap (s0b). The rest of the route continues.
      const message = parent
        ? `Route ${route.route} output ${path} nests a relation with no readable interface.`
        : `Route ${route.route} output ${path} has no readable interface.`;
      review(problems, 'CONTRACT_UNPARSED', route.route, message);
      nodes.push({ kind: 'unresolved', path, reason: `CONTRACT_UNPARSED: ${message}` });
      continue;
    }
    elements.set(derived.key, element);
    const nested = source.outputs.filter(item => item.parent === derived.key).map(item => item.key.slice(derived.key.length + 1));
    const computed = derived.computed || [];
    const related = new Map((derived.related || []).map(item => [item.field, item]));
    const mapped = new Map((derived.mapped || []).map(item => [item.field, item.path]));
    const own: RequestTreeField[] = [];
    const byRelation = new Map<string, Extract<RequestOutputNode, { kind: 'related' }>>();
    for (const field of leaves) {
      if (nested.some(child => field === child || field.startsWith(`${child}.`))) continue;
      if (computed.some(item => field === item || field.startsWith(`${item}.`))) continue;
      const leaf = { field, path: mapped.get(field) ?? field };
      const link = related.get(field);
      if (!link) {
        own.push(leaf);
        continue;
      }
      const groupKey = `${link.entity}\n${link.relationship}`;
      const group = byRelation.get(groupKey) ?? { kind: 'related', path: element.path, entity: link.entity, relationship: link.relationship, fields: [] };
      group.fields.push(leaf);
      byRelation.set(groupKey, group);
    }
    if (parent) {
      nodes.push({ kind: 'related', path, entity: derived.entity, ...(derived.relationship ? { relationship: derived.relationship } : {}), fields: own });
    } else if (derived.many || isPage(derived)) {
      // Inside a page wrapper the paging keys are its members; flat paging keys are members of the route output.
      const paging: Partial<Record<'page' | 'pageSize' | 'hasMore' | 'total', string>> = {};
      for (const key of ['page', 'pageSize', 'hasMore', 'total'] as const) {
        const name = derived[key];
        if (name) paging[key] = page ? `${path}.${name}` : name;
      }
      nodes.push({ kind: 'list', path, entity: derived.entity, items: page ? page.name : '', ...paging, fields: own });
    } else {
      nodes.push({ kind: 'entity', path, entity: derived.entity, fields: own });
    }
    nodes.push(...byRelation.values());
    for (const item of computed) nodes.push({ kind: 'computed', path: `${element.path}.${item}`, entity: derived.entity, rules: [...(route.rules || [])] });
  }
  for (const item of source.computedBy || []) {
    if (!nodes.some(node => node.path === item.path)) nodes.push({ kind: 'computed', path: item.path, rules: [item.rule] });
  }
  for (const gap of source.unresolved || []) {
    if (gap.path.startsWith('output.')) nodes.push({ kind: 'unresolved', path: gap.path.slice('output.'.length), reason: gap.reason });
  }
  return nodes;
}

/** The route JSDoc as the parser read it: the raw text and the sections it recognized. */
function docOf(route: D2ContractV2Route): RequestDoc | null {
  const jsdoc = route.jsdoc;
  if (!jsdoc || !jsdoc.raw) return null;
  const doc: RequestDoc = { raw: jsdoc.raw };
  for (const key of ['purpose', 'input', 'processing', 'output'] as const) if (jsdoc[key]) doc[key] = jsdoc[key];
  return doc;
}

/**
 * The interface body of the member at `path` (dotted) inside `body`: each segment names an interface, or an inline
 * object whose members stay in the same text. Null when a segment is neither.
 */
function memberBody(body: string, path: string, definition: D2ContractV2Definition): string | null {
  let current = body;
  for (const segment of path.split('.')) {
    // An optional member (`selectedComanda?: ComandaForClosing`) is read as a required one.
    const typeName = new RegExp(`\\b${segment}\\s*\\??\\s*:\\s*([A-Z][A-Za-z0-9]*)`, 'u').exec(current)?.[1] || '';
    if (typeName) {
      const projection = definition.projections.find(item => item.name === typeName);
      if (!projection) return null;
      current = projection.body;
      continue;
    }
    if (!new RegExp(`\\b${segment}\\s*\\??\\s*:\\s*\\{`, 'u').test(current)) return null;
  }
  return current;
}

/** The one interface array of a list page wrapper, or null when the wrapper has not exactly one. */
function pageItems(body: string, definition: D2ContractV2Definition): { name: string; body: string } | null {
  const arrays = [...body.matchAll(/(?:^|[;\n{])\s*(?:readonly\s+)?([A-Za-z_][A-Za-z0-9_]*)\??\s*:\s*([A-Z][A-Za-z0-9]*)\[\]/gu)]
    .map(match => ({ name: match[1], projection: definition.projections.find(item => item.name === match[2]) }))
    .filter((item): item is { name: string; projection: D2ContractV2Definition['projections'][number] } => Boolean(item.projection));
  return arrays.length === 1 ? { name: arrays[0].name, body: arrays[0].projection.body } : null;
}

function isPage(output: D1ServiceRequestSource['outputs'][number]): boolean {
  return Boolean(output.page || output.pageSize || output.hasMore || output.total);
}

export function fieldsByEntity(ontology: Readonly<Record<string, unknown>>): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const [entityId, entity] of Object.entries(ontology)) {
    out.set(entityId, new Set(ontologyFieldPaths(entity)));
  }
  return out;
}

export function usecaseIdsWithDef(request: D1ControllerRequest): Set<string> {
  return new Set(request.usecases.filter(item => item.usecaseId && item.defPath).map(item => item.usecaseId));
}

export function readContractV2(source: string): D2ContractV2Definition | null {
  if (!source.trim()) return null;
  try {
    return parseD2ContractV2(source);
  } catch {
    return null;
  }
}

/** The one `export interface <Page>Contracts` in a v2 file. Empty when it is missing or repeated. */
export function contractInterfaceName(source: string): string {
  const found: string[] = [];
  const pattern = /export interface ([A-Za-z_][A-Za-z0-9_]*)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    if (match[1].endsWith('Contracts')) found.push(match[1]);
  }
  return found.length === 1 ? found[0] : '';
}

function outputTypeName(output: string, key: string): string {
  const pattern = new RegExp(`\\b${key}\\s*:\\s*([A-Z][A-Za-z0-9]*)`, 'u');
  return pattern.exec(output)?.[1] || '';
}

function copyParam(param: D1ServiceRequestSource['params'][number]): D1ServiceParam {
  const out: D1ServiceParam = { name: param.name, target: param.target };
  if (param.field) out.field = param.field;
  if (param.pages) out.pages = param.pages;
  return out;
}

function collectFields(fields: Record<string, unknown>, prefix: string, out: string[]): void {
  for (const [name, value] of Object.entries(fields)) {
    if (!isRecord(value) || typeof value.type !== 'string') continue;
    const path = prefix ? `${prefix}.${name}` : name;
    out.push(path);
    if (value.type === 'object' && isRecord(value.fields)) collectFields(value.fields, path, out);
  }
}

function scanFields(source: string, index: number, prefix: string, paths: string[]): number {
  let i = index;
  while (i < source.length) {
    i = skip(source, i);
    if (i >= source.length) return i;
    if (source[i] === '}') return i + 1;
    if (source.startsWith('readonly ', i)) i += 'readonly '.length;
    const name = /^[A-Za-z_][A-Za-z0-9_]*/u.exec(source.slice(i));
    if (!name) return -1;
    i = skip(source, i + name[0].length);
    if (source[i] === '?') i = skip(source, i + 1);
    if (source[i] !== ':') return -1;
    i = skip(source, i + 1);
    const path = prefix ? `${prefix}.${name[0]}` : name[0];
    if (source[i] === '{') {
      i = scanFields(source, i + 1, path, paths);
      if (i < 0) return -1;
      i = skip(source, i);
      if (source[i] === ';') i += 1;
      continue;
    }
    let depth = 0;
    let quote = '';
    while (i < source.length) {
      const ch = source[i];
      if (quote) {
        if (ch === quote) quote = '';
        i += 1;
        continue;
      }
      if (ch === '\'' || ch === '"') {
        quote = ch;
        i += 1;
        continue;
      }
      if (ch === '{' || ch === '(' || ch === '[') {
        depth += 1;
        i += 1;
        continue;
      }
      if (ch === '}' || ch === ')' || ch === ']') {
        if (depth === 0) break;
        depth -= 1;
        i += 1;
        continue;
      }
      if (ch === ';' && depth === 0) {
        i += 1;
        break;
      }
      i += 1;
    }
    paths.push(path);
  }
  return i;
}

function skip(source: string, index: number): number {
  let i = index;
  while (i < source.length && (source[i] === ' ' || source[i] === '\n' || source[i] === '\r' || source[i] === '\t')) i += 1;
  return i;
}

function error(problems: D1ControllerProblem[], code: string, path: string, message: string): void {
  problems.push({ severity: 'error', code, path, message });
}

function review(problems: D1ControllerProblem[], code: string, path: string, message: string): void {
  problems.push({ severity: 'review', code, path, message });
}
