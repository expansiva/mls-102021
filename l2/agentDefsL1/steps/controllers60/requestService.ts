/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/requestService.ts" enhancement="_blank"/>

import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { parseD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import type { D2ContractV2Definition } from '/_102020_/l2/helpers/contractV2/types.js';
import type {
  D1ControllerProblem,
  D1ControllerRequest,
  D1ServiceOutput,
  D1ServiceParam,
  D1ServiceRequestSource,
  D1ServiceRow,
} from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';

export interface RequestServiceCheck {
  pageId: string;
  contractRoutes: readonly string[];
  requests: readonly D1ServiceRow[];
  usecaseIds: ReadonlySet<string>;
  fieldsByEntity: ReadonlyMap<string, ReadonlySet<string>>;
  /** Selected rows per route. Defaults to the built rows. */
  selectedCounts?: ReadonlyMap<string, number>;
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
  const byRoute = new Map<string, number>();
  if (input.selectedCounts) {
    for (const [route, count] of input.selectedCounts) byRoute.set(route, count);
  } else {
    for (const row of input.requests) byRoute.set(row.route, (byRoute.get(row.route) || 0) + 1);
  }
  const contract = new Set(input.contractRoutes);
  for (const route of [...input.contractRoutes].sort()) {
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
    for (const output of row.outputs) {
      const known = input.fieldsByEntity.get(output.entity);
      for (const field of output.fields) {
        if (known?.has(field)) continue;
        error(problems, 'PROJECTION_FIELD_UNKNOWN', row.route, `Route ${row.route} projects ${output.entity}.${field}, which is not a field of the ontology.`);
      }
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
    const outputs: D1ServiceOutput[] = [];
    for (const [key, meta] of Object.entries(route.meta.output)) {
      const typeName = outputTypeName(route.output, key);
      const projection = typeName ? definition.projections.find(item => item.name === typeName) : undefined;
      const fields = projection ? interfaceFieldPaths(projection.body) : null;
      if (!typeName || !fields) {
        error(problems, 'CONTRACT_UNPARSED', route.route, `Route ${route.route} output ${key} has no readable interface.`);
        outputs.push({ key, entity: meta.entity, fields: [] });
        continue;
      }
      outputs.push({ key, entity: meta.entity, fields });
    }
    rows.push({
      route: route.route,
      kind: route.kind,
      uses: [...source.uses],
      transaction: route.kind === 'cmd' ? 'single' : 'none',
      outputs,
      params: source.params.map(copyParam),
    });
  }
  return { routes, rows, problems };
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
