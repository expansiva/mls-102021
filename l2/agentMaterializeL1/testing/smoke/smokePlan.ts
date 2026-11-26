/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/smoke/smokePlan.ts" enhancement="_blank"/>

// d1_321 (parte B, tempo 1): the plan of the smoke of one module, by code, from the files of the module (a tree with `l1`, `l2`, `l4`, `l5`, as a `git archive` leaves it):
// one case per route of its contracts (the smallest input the contract type allows, the ids of the params that point at an entity left to the seed), and the answers of
// each connection gateway the module calls, made from the types of the catalog (one happy answer and one failure answer per operation). No model, nothing written.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import { sampleOf, typeNodeOf, typeTableOf, type TypeTable } from '/_102021_/l2/agentMaterializeL1/testing/smoke/typeModel.js';

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
}

export interface SmokeGatewayMethod {
  name: string;
  success: unknown;
  /** The failure member sampled, or null when the output has none (the stub then throws `unavailable`). */
  failure: unknown;
  outputType: string;
}

export interface SmokeGateway {
  name: string;
  methods: SmokeGatewayMethod[];
}

export interface SmokePlan {
  module: string;
  routes: SmokeRoute[];
  gateways: SmokeGateway[];
  /** Where the types of the outputs live, for the check of the answers: the declarations of every contract page. */
  typeSources: Record<string, string>;
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
function gatewaysOf(tree: string, project: number, module: string, base: string): SmokeGateway[] {
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
      const marked = (flag: 'success' | 'failure') => sampleOf(output, table, { prefer: flag });
      const success = marked('success');
      const failure = marked('failure');
      methods.push({ name: member.name.text, success, failure: JSON.stringify(failure) === JSON.stringify(success) ? null : failure, outputType: output.getText(parsed) });
    }
    gateways.push({ name: statement.name.text, methods });
  }
  return gateways;
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
  return { module, routes, gateways: gatewaysOf(tree, project, module, base), typeSources };
}
