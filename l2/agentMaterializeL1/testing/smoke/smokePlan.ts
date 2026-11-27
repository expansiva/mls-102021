/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/smoke/smokePlan.ts" enhancement="_blank"/>

// d1_321 (parte B, tempo 1): the plan of the smoke of one module, by code, from the files of the module (a tree with `l1`, `l2`, `l4`, `l5`, as a `git archive` leaves it):
// one case per route of its contracts (the smallest input the contract type allows, the ids of the params that point at an entity left to the seed), and the answers of
// each connection gateway the module calls, made from the types of the catalog (one happy answer and one failure answer per operation). No model, nothing written.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import { moduleAdapterIds } from '/_102021_/l2/agentMaterializeL1/testing/smoke/smokePort.js';
import { hasUnresolved, sampleOf, typeNodeOf, typeTableOf, type TypeTable } from '/_102021_/l2/agentMaterializeL1/testing/smoke/typeModel.js';

export interface SmokeRoute {
  page: string;
  route: string;
  kind: string;
  /** The first actor the contract says may call it ('' when none). */
  actor: string;
  /** The minimal valid input, with `<seed:Entity.field>` where a param points at a stored record. */
  input: Record<string, unknown>;
  inputType: string;
  outputType: string;
  /** d1_330: an operation the module serves (an arrival), not a route of a page contract. */
  arrival?: boolean;
  /** d1_330: which member of a union input this case calls ('' when the input has one shape): the leaf paths of the input. */
  variant?: string;
  /** d1_336: a seed (`Entity.id`) whose id the delivery address of the arrival carries (`connection.context.hookParams`), when the declaration says the operation is delivered to one of that entity. */
  hookSeed?: string;
  /** d1_347 s2: the connection and operation an arrival serves (`cm.sendChannelMessage`): the cm of the script calls it through `connectionServe`. */
  connection?: string;
  operation?: string;
}

export interface SmokeGatewayMethod {
  name: string;
  success: unknown;
  /** The failure member sampled, or null when the output has none (the stub then throws `unavailable`). */
  failure: unknown;
  /** d1_333: the output type names a type the catalog files do not declare: the stub cannot make a value of it, the case is skipped, never run on `{}`. */
  unresolved?: boolean;
  outputType: string;
}

export interface SmokeGateway {
  name: string;
  methods: SmokeGatewayMethod[];
  /** d1_336: the module declares this system and writes its adapter: in the failure pass the REAL gateway and adapter run, on an HTTP 401 with a body. */
  real?: boolean;
}

export interface SmokePlan {
  module: string;
  routes: SmokeRoute[];
  gateways: SmokeGateway[];
  /** d1_336: the repositories the module registers (names): the smoke counts their rows before and after a process. */
  repositories: string[];
  /** Where the types of the outputs live, for the check of the answers: the declarations of every contract page. */
  typeSources: Record<string, string>;
  /** d1_347 s2: the platform has the cm of the script (`installCmBench`) and the module serves an operation of the cm: the arrivals of the cm go through the real `connectionServe` and the calls to the cm through the script. */
  cmEdge: boolean;
}

function readIf(file: string): string | null {
  return existsSync(file) ? readFileSync(file, 'utf8') : null;
}

function filesUnder(dir: string, endsWith: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(name => name.endsWith(endsWith)).sort().map(name => path.join(dir, name));
}

/** `/_<project>_/rest.js` to a file under the tree (the module's project) or under `base` (the platform). */
function specifierFile(specifier: string, tree: string, project: number, base: string): string | null {
  const match = /^\/_(\d+)_\/(.+)\.js$/u.exec(specifier);
  if (!match) return null;
  const root = Number(match[1]) === project ? tree : path.join(base, `mls-${match[1]}`);
  const file = path.join(root, `${match[2]}.ts`);
  return existsSync(file) ? file : null;
}

function importsOf(source: string): string[] {
  return [...source.matchAll(/^\s*import\s+(?:type\s+)?[^;]*?from\s+['"]([^'"]+)['"]/gmu)].map(match => match[1]);
}

/** The text of the type nodes of the members of an interface or type literal: `{ route: { input, output } }`. */
function contractMembers(source: string, interfacePattern: RegExp): Array<{ route: string; kind: string; input: string; output: string; actors: string[] }> {
  const file = ts.createSourceFile('c.ts', source, ts.ScriptTarget.Latest, true);
  const out: Array<{ route: string; kind: string; input: string; output: string; actors: string[] }> = [];
  for (const statement of file.statements) {
    if (!ts.isInterfaceDeclaration(statement) || !interfacePattern.test(statement.name.text)) continue;
    for (const member of statement.members) {
      if (!ts.isPropertySignature(member) || !member.type || !ts.isTypeLiteralNode(member.type) || !(ts.isStringLiteral(member.name) || ts.isIdentifier(member.name))) continue;
      const read = (name: string): ts.TypeNode | undefined => member.type && ts.isTypeLiteralNode(member.type) ? member.type.members.find(item => ts.isPropertySignature(item) && (ts.isIdentifier(item.name) || ts.isStringLiteral(item.name)) && item.name.text === name && item.type)?.['type' as 'name'] as unknown as ts.TypeNode | undefined : undefined;
      const kind = read('kind');
      const input = read('input');
      const output = read('output');
      const access = read('access');
      const actors: string[] = [];
      if (access && ts.isTypeLiteralNode(access)) {
        const list = access.members.find(item => ts.isPropertySignature(item) && ts.isIdentifier(item.name) && item.name.text === 'actors') as ts.PropertySignature | undefined;
        if (list?.type && ts.isTupleTypeNode(list.type)) for (const element of list.type.elements) if (ts.isLiteralTypeNode(element) && ts.isStringLiteral(element.literal)) actors.push(element.literal.text);
      }
      if (!input || !output) continue;
      out.push({ route: member.name.text, kind: kind && ts.isLiteralTypeNode(kind) && ts.isStringLiteral(kind.literal) ? kind.literal.text : '', input: input.getText(file), output: output.getText(file), actors });
    }
  }
  return out;
}

/** The entities of the output tree of each route of the request service def (`entity`, `list`, `related` nodes), first one first. */
function outputEntities(tree: string, module: string, pageId: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const text = readIf(path.join(tree, 'l1', module, 'layer_2_application', 'requests', `${pageId}.defs.ts`));
  const match = text ? /=\s*(\{[\s\S]*\})\s*as const/u.exec(text) : null;
  if (!match) return out;
  try {
    const def = JSON.parse(match[1]) as { data?: { requests?: Array<{ route?: string; output?: Array<{ entity?: string }> }> } };
    for (const request of def.data?.requests ?? []) if (request.route) out.set(request.route, [...new Set((request.output ?? []).map(node => node.entity ?? '').filter(Boolean))]);
  } catch { /* none */ }
  return out;
}

/**
 * The entity a param of an id points at, by the contract and the def, with no name of any module: `id` is the first entity of the output of the route; `<stem>Id` is the
 * entity of the output whose name ends with `<Stem>`. '' when none.
 */
export function entityOfIdParam(name: string, entities: readonly string[]): string {
  if (name === 'id') return entities[0] ?? '';
  const stem = /^(.+)Id$/u.exec(name)?.[1];
  if (!stem) return '';
  return entities.find(entity => entity.toLowerCase().endsWith(stem.toLowerCase())) ?? '';
}

/** The params of the request service def that point at a stored record: `{ name → 'Entity.field' }` per route. */
function seedTargets(tree: string, module: string, pageId: string): Map<string, Record<string, string>> {
  const out = new Map<string, Record<string, string>>();
  const text = readIf(path.join(tree, 'l1', module, 'layer_2_application', 'requests', `${pageId}.defs.ts`));
  if (!text) return out;
  const match = /=\s*(\{[\s\S]*\})\s*as const/u.exec(text);
  if (!match) return out;
  try {
    const def = JSON.parse(match[1]) as { data?: { requests?: Array<{ route?: string; params?: Array<{ name?: string; target?: string }> }> } };
    for (const request of def.data?.requests ?? []) {
      const targets: Record<string, string> = {};
      for (const param of request.params ?? []) if (param.name && param.target && /^[A-Z]\w*\.\w+$/u.test(param.target)) targets[param.name] = param.target;
      if (request.route) out.set(request.route, targets);
    }
  } catch { /* an unreadable def gives no seed target */ }
  return out;
}

/** The gateways of `outbound.ts` with the answers made from the catalog types the file imports. */
function gatewaysOf(tree: string, project: number, module: string, base: string, adapterIds: readonly string[] = []): SmokeGateway[] {
  const file = path.join(tree, 'l1', module, 'layer_1_external', 'adapters', 'integration', 'outbound.ts');
  const source = readIf(file);
  if (!source) return [];
  const sources = importsOf(source).flatMap(specifier => {
    const target = specifierFile(specifier, tree, project, base);
    return target ? [readFileSync(target, 'utf8')] : [];
  });
  const table = typeTableOf(sources);
  const parsed = ts.createSourceFile('o.ts', source, ts.ScriptTarget.Latest, true);
  const gateways: SmokeGateway[] = [];
  for (const statement of parsed.statements) {
    if (!ts.isInterfaceDeclaration(statement) || !/Gateway$/u.test(statement.name.text)) continue;
    const methods: SmokeGatewayMethod[] = [];
    for (const member of statement.members) {
      if (!ts.isMethodSignature(member) || !ts.isIdentifier(member.name) || !member.type || !ts.isTypeReferenceNode(member.type) || !member.type.typeArguments?.[0]) continue;
      const output = member.type.typeArguments[0];
      const marked = (flag: 'success' | 'failure') => sampleOf(output, table, { prefer: flag, optional: true, filled: true });
      const success = marked('success');
      const failure = marked('failure');
      methods.push({ name: member.name.text, ...(hasUnresolved(output, table) ? { unresolved: true } : {}), success, failure: JSON.stringify(failure) === JSON.stringify(success) ? null : failure, outputType: output.getText(parsed) });
    }
    gateways.push({ name: statement.name.text, methods, ...(adapterIds.some(id => `${id.charAt(0).toUpperCase()}${id.slice(1)}Gateway` === statement.name.text) ? { real: true } : {}) });
  }
  return gateways;
}

function leafPaths(value: unknown, at = ''): string[] {
  if (value && typeof value === 'object' && !Array.isArray(value)) return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => leafPaths(item, at ? `${at}.${key}` : key));
  return [at];
}

/** A string leaf named `<stem>Id` or `<stem>Ref` points at the stored record of the entity whose name ends with the stem; `id` alone is not guessed. */
function bindRefs(value: unknown, entities: readonly string[], key = ''): unknown {
  if (typeof value === 'string') {
    const stem = /^(.+)(?:Id|Ref)$/u.exec(key)?.[1];
    const entity = stem ? entityOfIdParam(`${stem}Id`, entities) : '';
    return entity ? `<seed:${entity}.id>` : value;
  }
  if (Array.isArray(value)) return value.map(item => bindRefs(item, entities, key));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([name, item]) => [name, bindRefs(item, entities, name)]));
  return value;
}

/**
 * d1_330: the operations the module serves. A request service def line with `serves: "<connection>.<operation>"` is an arrival; its input is made from the type the catalog
 * names for the operation (the platform's file, or the declaration the module emitted), one case per way a union input can be called.
 */
/** The entity the delivery address of an operation of the module's own declaration is for: the entity of the module whose name ends with a word the description of the operation uses (`bot` for `TelegramBot`). */
function hookSeedOf(operationText: string, entities: readonly string[]): string | undefined {
  const description = (/"description":\s*"((?:[^"\\]|\\.)*)"/u.exec(operationText)?.[1] ?? '').toLowerCase();
  const words = new Set(description.match(/[a-z]+/gu) ?? []);
  const entity = entities.find(name => {
    const last = (name.match(/[A-Z][a-z0-9]*/gu) ?? [name]).pop()?.toLowerCase() ?? '';
    return last.length > 2 && (words.has(last) || words.has(`${last}s`));
  });
  return entity ? `${entity}.id` : undefined;
}

function arrivalRoutes(tree: string, module: string, base: string): { routes: SmokeRoute[]; typeSources: Record<string, string> } {
  const routes: SmokeRoute[] = [];
  const typeSources: Record<string, string> = {};
  const entities = filesUnder(path.join(tree, 'l1', module, 'layer_3_domain', 'entities'), '.ts').filter(file => !file.endsWith('.defs.ts')).map(file => { const name = path.basename(file, '.ts'); return name.charAt(0).toUpperCase() + name.slice(1); });
  for (const file of filesUnder(path.join(tree, 'l1', module, 'layer_2_application', 'requests'), '.defs.ts')) {
    const match = /=\s*(\{[\s\S]*\})\s*as const/u.exec(readFileSync(file, 'utf8'));
    if (!match) continue;
    let requests: Array<{ route?: string; serves?: string }> = [];
    try { requests = (JSON.parse(match[1]) as { data?: { requests?: Array<{ route?: string; serves?: string }> } }).data?.requests ?? []; } catch { continue; }
    for (const request of requests) {
      const served = /^([a-z][A-Za-z0-9]*)\.([a-z][A-Za-z0-9]*)$/u.exec(String(request.serves ?? ''));
      if (!served || !request.route) continue;
      const [, connection, operation] = served;
      const candidates = [path.join(base, 'mls-102034', 'l2', 'shared', 'contracts', 'connections', `${connection}.ts`), path.join(tree, 'l1', module, 'layer_1_external', 'connections', `${connection}.ts`)];
      const source = candidates.map(readIf).find(text => text !== null && new RegExp(`"operationId":\\s*"${operation}"`, 'u').test(text));
      if (!source) continue;
      const start = source.search(new RegExp(`"operationId":\\s*"${operation}"`, 'u'));
      const next = source.indexOf('"operationId"', start + 10);
      const line = source.slice(start, next < 0 ? start + 1500 : next);
      const inputType = /"inputType":\s*"(\w+)"/u.exec(line)?.[1];
      const outputType = /"outputType":\s*"(\w+)"/u.exec(line)?.[1] ?? 'unknown';
      if (!inputType) continue;
      const page = `arrival:${connection}`;
      typeSources[page] = source;
      const table = typeTableOf([source]);
      const samples = new Map<string, unknown>();
      // Each way a union is called, with the optional members left out and with them in (an optional `identity` is how a process is asked to set it, and absent how it is asked to clear it).
      for (const optional of [false, true]) {
        for (let variant = 0; variant < 4; variant += 1) {
          const sample = sampleOf(typeNodeOf(inputType), table, { variant, optional });
          const input = bindRefs(sample && typeof sample === 'object' && !Array.isArray(sample) ? sample : {}, entities);
          samples.set(leafPaths(input).sort().join('+'), input);
        }
      }
      // d1_348: a system the module declares (not the platform's) sends a body that grows: the same call with a key the type does not list at the top and in every object.
      const outside = candidates[1] !== undefined && source === readIf(candidates[1]);
      if (outside) for (const [label, input] of [...samples]) samples.set(`${label}+grown`, grownBody(input));
      const hookSeed = candidates[1] === undefined || source !== readIf(candidates[1]) ? undefined : hookSeedOf(line, entities);
      for (const [label, input] of samples) routes.push({ page, route: request.route, kind: 'arrival', actor: '', input: input as Record<string, unknown>, inputType, outputType, arrival: true, connection, operation, ...(hookSeed ? { hookSeed } : {}), ...(samples.size > 1 ? { variant: label } : {}) });
    }
  }
  // d1_348: the bodies a real system sent (the file of the scenarios of the module, `realBodies`): as they came, one case each, beside the minimum.
  for (const real of realBodiesOf(module)) {
    const like = routes.find(item => item.route === real.route);
    if (like) routes.push({ ...like, input: real.input, variant: `real:${real.variant}` });
  }
  return { routes, typeSources };
}

/** A body with a key the type does not list at the top and inside every object (arrays keep their items). */
function grownBody(value: unknown, top = true): unknown {
  if (Array.isArray(value)) return value.map(item => grownBody(item, false));
  if (!value || typeof value !== 'object') return value;
  const grown: Record<string, unknown> = Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, grownBody(item, false)]));
  grown[top ? 'smokeUnknownTop' : 'smokeUnknown'] = 1;
  return grown;
}

/** `realBodies` of `testing/smoke/scenarios/<module>.json`: `{ route, variant, input }` each. */
function realBodiesOf(module: string): Array<{ route: string; variant: string; input: Record<string, unknown> }> {
  const file = path.join(path.dirname(new URL(import.meta.url).pathname), 'scenarios', `${module}.json`);
  try {
    const parsed = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) as { realBodies?: Array<{ route?: string; variant?: string; input?: Record<string, unknown> }> } : {};
    return (parsed.realBodies ?? []).flatMap(item => item.route && item.variant && item.input ? [{ route: item.route, variant: item.variant, input: item.input }] : []);
  } catch { return []; }
}

/** The plan of the smoke of `module` in `tree`; `base` is the root with the platform projects (`mls-102034`…). */
export function planSmoke(tree: string, project: number, module: string, base: string): SmokePlan {
  const contracts = filesUnder(path.join(tree, 'l2', module, 'web', 'contracts'), '.defs.ts');
  const routes: SmokeRoute[] = [];
  const typeSources: Record<string, string> = {};
  for (const file of contracts) {
    const pageId = path.basename(file, '.defs.ts');
    const source = readFileSync(file, 'utf8');
    const sources = [source, ...importsOf(source).flatMap(specifier => { const target = specifierFile(specifier, tree, project, base); return target ? [readFileSync(target, 'utf8')] : []; })];
    typeSources[pageId] = sources.join('\n');
    const table: TypeTable = typeTableOf(sources);
    const targets = seedTargets(tree, module, pageId);
    const entities = outputEntities(tree, module, pageId);
    for (const item of contractMembers(source, /Contracts$/u)) {
      const sample = sampleOf(typeNodeOf(item.input), table);
      const input = sample && typeof sample === 'object' && !Array.isArray(sample) ? { ...(sample as Record<string, unknown>) } : {};
      for (const name of Object.keys(input)) {
        const entity = typeof input[name] === 'string' ? entityOfIdParam(name, entities.get(item.route) ?? []) : '';
        if (entity) input[name] = `<seed:${entity}.id>`;
      }
      for (const [name, target] of Object.entries(targets.get(item.route) ?? {})) input[name] = `<seed:${target}>`;
      routes.push({ page: pageId, route: item.route, kind: item.kind, actor: item.actors[0] ?? '', input, inputType: item.input, outputType: item.output });
    }
  }
  const arrivals = arrivalRoutes(tree, module, base);
  const registered = readIf(path.join(tree, 'l1', module, 'layer_1_external', 'adapters', 'persistence', 'registerRepositories.ts')) ?? '';
  const repositories = [...registered.matchAll(/registerRepository\(\s*['"](\w+Repository)['"]/gu)].map(match => match[1]);
  return { module, routes: [...routes, ...arrivals.routes], gateways: gatewaysOf(tree, project, module, base, moduleAdapterIds(tree, module)), repositories, typeSources: { ...typeSources, ...arrivals.typeSources }, cmEdge: existsSync(path.join(base, 'mls-102034', 'l1', 'server', 'layer_1_external', 'connections', 'cm', 'cmBench.ts')) && arrivals.routes.some(route => route.connection === 'cm') };
}
