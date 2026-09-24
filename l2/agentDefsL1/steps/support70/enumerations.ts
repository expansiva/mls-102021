/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/enumerations.ts" enhancement="_blank"/>

import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { readContractAst } from '/_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.js';
import {
  ENUMERATION_CONSUMED_REASON,
  ENUMERATION_PROVED_REASON,
  ENUMERATION_REASON,
  ENUMERATION_SOURCE,
  type D1EnumOrigin,
  type D1EnumRow,
  type D1EnumUse,
  type D1SeedCitation,
} from '/_102021_/l2/agentDefsL1/steps/support70/contracts.js';
import type { MdmOntology, MdmSubtypeName } from '/_102034_/l1/mdm/defs/ontologyTypes.js';
import {
  resolveModuleEntity,
  resolvePlatformEntity,
  type OntologyNode,
  type OntologyTreeView,
} from '/_102034_/l2/mdm/resolveMdmEntity.js';
import type {
  Ns5OntologyEntityV3,
  Ns5OntologyIndexV3,
  Ns5RulesAny,
} from '/_102035_/l2/solution/types.js';

/** What the report looked at. A union or an owner is not runtime enforcement. */
export const ENUMERATION_LIMITS = 'Covered uses are a seed scenario that names this entity and path, a route-contract union, and a domain or usecase def whose type names this path with those literals. A TypeScript union is not runtime enforcement. Ownership is not consumption. No seed, catalog or table is created here.' as const;

export interface D1EnumSnapshot {
  sources: Record<string, string>;
  definitions: string[];
  contracts: Array<{ path: string; text: string }>;
  tables: Array<{ tableId: string; entityId: string }>;
}

export interface D1EnumInput {
  enumerations: ReadonlyArray<{ entityId: string; path: string; values: readonly string[] }>;
  snapshot?: D1EnumSnapshot;
  seedCitations?: readonly D1SeedCitation[];
}

interface ParsedBody {
  entities: Record<string, unknown>;
  index: unknown;
  rules: unknown;
  catalogs: Record<string, unknown>;
}

/**
 * Projects origin, restriction and proved uses for each enumeration.
 * Does not read the filesystem and does not invent a seed, a catalog or a table.
 */
export function projectEnumerations(input: D1EnumInput): D1EnumRow[] {
  const snapshot = input.snapshot;
  const bodies = bodiesOf(snapshot?.sources || {});
  const tables = new Map((snapshot?.tables || []).map(table => [table.tableId, table.entityId]));
  const fromDefs = usesFromTexts(snapshot?.definitions || [], snapshot?.contracts || [], input.enumerations, tables);
  const fromSeeds = (input.seedCitations || []).map(citation => useOf(
    'seedScenario',
    citation.scenarioId,
    citation.entityId,
    citation.path,
    citation.values,
    true,
  ));
  const byKey = new Map<string, D1EnumUse[]>();
  for (const use of [...fromSeeds, ...fromDefs]) {
    const key = `${use.entityId}\u0000${use.path}`;
    const list = byKey.get(key) || [];
    const id = `${use.purpose}\u0000${use.consumer}\u0000${use.entityId}\u0000${use.path}`;
    if (!list.some(item => `${item.purpose}\u0000${item.consumer}\u0000${item.entityId}\u0000${item.path}` === id)) list.push(use);
    byKey.set(key, list);
  }
  return input.enumerations.map(item => {
    const values = [...item.values];
    const origin = originOf(item.entityId, item.path, values, bodies);
    const uses = (byKey.get(`${item.entityId}\u0000${item.path}`) || [])
      .map(use => ({ ...use, editable: use.editable && !origin.derived && !origin.roleBinding }))
      .sort((left, right) => `${left.purpose}\u0000${left.consumer}`.localeCompare(`${right.purpose}\u0000${right.consumer}`));
    const seeded = new Set(uses.filter(use => use.purpose === 'seedScenario').flatMap(use => use.values));
    const fullySeeded = values.length > 0 && values.every(value => seeded.has(value));
    return {
      entityId: item.entityId,
      path: item.path,
      values,
      consumed: uses.length > 0,
      source: ENUMERATION_SOURCE,
      reason: fullySeeded ? ENUMERATION_CONSUMED_REASON : uses.length ? ENUMERATION_PROVED_REASON : ENUMERATION_REASON,
      origin,
      uses,
      limits: ENUMERATION_LIMITS,
    };
  });
}

/** The field a model's lifecycle states belong to, when exactly one enum has that value set. */
export function lifecyclePath(
  entityId: string,
  states: readonly string[],
  enumerations: ReadonlyArray<{ entityId: string; path: string; values: readonly string[] }>,
): string {
  if (!states.length) return '';
  const matches = enumerations.filter(item => item.entityId === entityId && sameSet(item.values, states));
  return matches.length === 1 ? matches[0].path : '';
}

function originOf(entityId: string, path: string, effective: readonly string[], bodies: ParsedBody): D1EnumOrigin {
  const unresolved = emptyOrigin();
  const entity = bodies.entities[entityId];
  if (!isRecord(entity)) return unresolved;
  const source = typeof entity.source === 'string' ? entity.source : '';
  const catalog = source ? bodies.catalogs[source] : undefined;
  const resolved = catalog ? resolvedNodes(entity, bodies.index, catalog, bodies.rules) : null;
  if (resolved) {
    const node = findNode(resolved.module, path);
    const platformValues = platformValuesAt(resolved.platform, path);
    return classifyNode(entity, path, effective, node, platformValues, source);
  }
  if (entity.kind === 'role') return { ...unresolved, catalogSource: source };
  const own = fieldAt(entity, path);
  if (!own) return { ...unresolved, catalogSource: source };
  const derived = own.derived === true;
  return {
    owner: 'module',
    writer: derived ? 'derived' : 'module',
    derived,
    restriction: 'own',
    catalogValues: [],
    catalogSource: source,
    roleBinding: false,
  };
}

function classifyNode(
  entity: Record<string, unknown>,
  path: string,
  effective: readonly string[],
  node: OntologyNode | null,
  platformValues: string[] | null,
  source: string,
): D1EnumOrigin {
  const writer = node?.origin === 'platform' || node?.origin === 'module' || node?.origin === 'derived'
    ? node.origin
    : 'unresolved';
  const derived = writer === 'derived' || node?.derived === true;
  const owner = writer === 'module' ? 'module' : platformValues ? 'platform' : writer === 'unresolved' ? 'unresolved' : 'module';
  const roleBinding = entity.kind === 'role'
    && path === 'details.identification.subtype'
    && effective.length === 1
    && effective[0] === entity.subtype;
  let restriction: D1EnumOrigin['restriction'] = 'unresolved';
  if (writer === 'module' || !platformValues) restriction = writer === 'unresolved' ? 'unresolved' : 'own';
  else if (effective.some(value => !platformValues.includes(value))) restriction = 'invalid';
  else if (sameSet(effective, platformValues)) restriction = 'inherited';
  else restriction = 'subset';
  return {
    owner,
    writer: derived && writer === 'platform' ? 'derived' : writer,
    derived,
    restriction,
    catalogValues: platformValues ? [...platformValues] : [],
    catalogSource: source,
    roleBinding,
  };
}

function resolvedNodes(
  entity: Record<string, unknown>,
  index: unknown,
  catalog: unknown,
  rules: unknown,
): { module: OntologyTreeView; platform: OntologyTreeView | null } | null {
  if (!isModuleEntity(entity) || !isIndex(index) || !isCatalog(catalog) || !isRules(rules)) return null;
  if (!isRecord(catalog) || !isRecord(catalog.subtypes)) return null;
  const moduleName = typeof entity.moduleName === 'string' ? entity.moduleName : '';
  const subtype = entity.kind === 'role' && typeof entity.subtype === 'string' ? entity.subtype : undefined;
  if (subtype && !Object.prototype.hasOwnProperty.call(catalog.subtypes, subtype)) return null;
  const module = resolveModuleEntity(
    entity as unknown as Ns5OntologyEntityV3,
    index as unknown as Ns5OntologyIndexV3,
    catalog as unknown as MdmOntology,
    rules as unknown as Ns5RulesAny,
  );
  const platform = subtype
    ? resolvePlatformEntity(catalog as unknown as MdmOntology, subtype as MdmSubtypeName, moduleName)
    : null;
  return { module, platform };
}

function platformValuesAt(view: OntologyTreeView | null, path: string): string[] | null {
  if (!view) return null;
  const node = findNode(view, path);
  if (!node?.values) return null;
  return node.values.map(item => item.value);
}

function findNode(view: OntologyTreeView, path: string): OntologyNode | null {
  const walk = (nodes: readonly OntologyNode[] | undefined): OntologyNode | null => {
    for (const node of nodes || []) {
      if (node.path === path) return node;
      const child = walk(node.children);
      if (child) return child;
    }
    return null;
  };
  return walk(view.columns) || walk(view.details);
}

function usesFromTexts(
  definitions: readonly string[],
  contracts: ReadonlyArray<{ path: string; text: string }>,
  enumerations: ReadonlyArray<{ entityId: string; path: string; values: readonly string[] }>,
  tables: ReadonlyMap<string, string>,
): D1EnumUse[] {
  const uses: D1EnumUse[] = [];
  const routes = new Map<string, string>();
  for (const text of definitions) {
    const parsed = parseD1Source(text, 'defs');
    if (!isRecord(parsed) || !isRecord(parsed.data)) continue;
    const data = parsed.data;
    if (parsed.artifactType === 'usecase') uses.push(...usecaseUses(data, enumerations, routes));
    else if (parsed.artifactType === 'domainEntity') uses.push(...domainUses(data, enumerations));
    else if (parsed.artifactType === 'persistenceSeeds') uses.push(...seedUses(data, enumerations, tables));
  }
  for (const contract of contracts) {
    if (!contract.text) continue;
    uses.push(...contractUses(contract.text, contract.path, enumerations, routes));
  }
  return uses;
}

function usecaseUses(
  data: Record<string, unknown>,
  enumerations: ReadonlyArray<{ entityId: string; path: string; values: readonly string[] }>,
  routes: Map<string, string>,
): D1EnumUse[] {
  const entityId = typeof data.entityId === 'string' ? data.entityId : '';
  const usecaseId = typeof data.usecaseId === 'string' ? data.usecaseId : '';
  if (!entityId || !usecaseId) return [];
  const uses: D1EnumUse[] = [];
  for (const fn of arrayOf(data.functions)) {
    if (!isRecord(fn)) continue;
    for (const ref of arrayOf(fn.contractRefs)) {
      if (isRecord(ref) && typeof ref.route === 'string' && ref.route) routes.set(ref.route, entityId);
    }
    uses.push(...slotUses(entityId, usecaseId, 'input', fn.input, enumerations));
    uses.push(...slotUses(entityId, usecaseId, 'output', fn.output, enumerations));
  }
  for (const projection of arrayOf(data.routeProjections)) {
    if (isRecord(projection) && typeof projection.route === 'string' && projection.route) routes.set(projection.route, entityId);
  }
  return uses;
}

function slotUses(
  entityId: string,
  usecaseId: string,
  slot: 'input' | 'output',
  fields: unknown,
  enumerations: ReadonlyArray<{ entityId: string; path: string; values: readonly string[] }>,
): D1EnumUse[] {
  const uses: D1EnumUse[] = [];
  for (const field of arrayOf(fields)) {
    if (!isRecord(field) || typeof field.fieldRef !== 'string' || typeof field.type !== 'string') continue;
    const prefix = `${entityId}.`;
    if (!field.fieldRef.startsWith(prefix)) continue;
    const base = field.fieldRef.slice(prefix.length);
    for (const leaf of leavesOf(field.type, base)) {
      const match = enumerations.find(item => item.entityId === entityId && item.path === leaf.path);
      const values = match ? provedValues(leaf.literals, match.values) : null;
      if (!match || !values) continue;
      uses.push(useOf('usecaseDef', `${usecaseId}#${slot}`, entityId, leaf.path, values, slot === 'input'));
    }
  }
  return uses;
}

function domainUses(
  data: Record<string, unknown>,
  enumerations: ReadonlyArray<{ entityId: string; path: string; values: readonly string[] }>,
): D1EnumUse[] {
  const entityId = typeof data.entityId === 'string' ? data.entityId : '';
  if (!entityId) return [];
  const uses: D1EnumUse[] = [];
  for (const field of arrayOf(data.fields)) {
    if (!isRecord(field) || typeof field.name !== 'string' || typeof field.type !== 'string') continue;
    const match = enumerations.find(item => item.entityId === entityId && item.path === field.name);
    const literals = closedLiterals(field.type);
    const values = match && literals ? provedValues(literals, match.values) : null;
    if (!match || !values) continue;
    uses.push(useOf('domainDef', entityId, entityId, field.name, values, field.derived !== true));
  }
  return uses;
}

function seedUses(
  data: Record<string, unknown>,
  enumerations: ReadonlyArray<{ entityId: string; path: string; values: readonly string[] }>,
  tables: ReadonlyMap<string, string>,
): D1EnumUse[] {
  const scenarios = arrayOf(data.scenarios).filter(isRecord);
  const inferred = new Map<string, string>();
  const pending = new Map<string, string[]>();
  for (const scenario of scenarios) {
    if (typeof scenario.stateField === 'string' && scenario.stateField) continue;
    const entityId = scenarioEntity(scenario, tables);
    if (!entityId) continue;
    const states = stringList(scenario.states);
    pending.set(entityId, [...(pending.get(entityId) || []), ...states]);
  }
  for (const [entityId, states] of pending) {
    const path = lifecyclePath(entityId, [...new Set(states)], enumerations);
    if (path) inferred.set(entityId, path);
  }
  const uses: D1EnumUse[] = [];
  for (const scenario of scenarios) {
    const scenarioId = typeof scenario.scenarioId === 'string' ? scenario.scenarioId : '';
    const entityId = scenarioEntity(scenario, tables);
    const path = typeof scenario.stateField === 'string' && scenario.stateField
      ? scenario.stateField
      : entityId ? inferred.get(entityId) || '' : '';
    if (!scenarioId || !entityId || !path) continue;
    const match = enumerations.find(item => item.entityId === entityId && item.path === path);
    const values = match ? provedValues(stringList(scenario.states), match.values) : null;
    if (!match || !values) continue;
    uses.push(useOf('seedScenario', scenarioId, entityId, path, values, true));
  }
  return uses;
}

function scenarioEntity(scenario: Record<string, unknown>, tables: ReadonlyMap<string, string>): string {
  if (typeof scenario.entityId === 'string' && scenario.entityId) return scenario.entityId;
  const tableId = typeof scenario.tableId === 'string' ? scenario.tableId : '';
  return tableId ? tables.get(tableId) || '' : '';
}

function contractUses(
  text: string,
  filePath: string,
  enumerations: ReadonlyArray<{ entityId: string; path: string; values: readonly string[] }>,
  routes: ReadonlyMap<string, string>,
): D1EnumUse[] {
  const ast = readContractAst(text, filePath);
  const uses: D1EnumUse[] = [];
  for (const binding of ast.bindings) {
    const entityId = routes.get(binding.route);
    if (!entityId) continue;
    uses.push(...symbolUses(ast, binding.input, binding.route, entityId, true, enumerations));
    uses.push(...symbolUses(ast, binding.output, binding.route, entityId, false, enumerations));
  }
  return uses;
}

function symbolUses(
  ast: ReturnType<typeof readContractAst>,
  symbol: string,
  route: string,
  entityId: string,
  editable: boolean,
  enumerations: ReadonlyArray<{ entityId: string; path: string; values: readonly string[] }>,
): D1EnumUse[] {
  const fields = symbolFields(ast, symbol);
  if (!fields) return [];
  const uses: D1EnumUse[] = [];
  for (const field of fields) {
    for (const leaf of leavesOf(field.type, field.name)) {
      const match = enumerations.find(item => item.entityId === entityId && item.path === leaf.path);
      const values = match ? provedValues(leaf.literals, match.values) : null;
      if (!match || !values) continue;
      uses.push(useOf('routeContract', route, entityId, leaf.path, values, editable));
    }
  }
  return uses;
}

function symbolFields(
  ast: ReturnType<typeof readContractAst>,
  name: string,
  seen = new Set<string>(),
): Array<{ name: string; type: string }> | null {
  if (!name || seen.has(name)) return null;
  seen.add(name);
  const found = ast.symbols.filter(item => item.name === name);
  if (found.length !== 1) return null;
  const item = found[0];
  if (item.shape === 'array' && item.element) return symbolFields(ast, item.element, seen);
  return item.fields.map(field => ({ name: field.name, type: field.type }));
}

function useOf(
  purpose: D1EnumUse['purpose'],
  consumer: string,
  entityId: string,
  path: string,
  values: readonly string[],
  editable: boolean,
): D1EnumUse {
  return { purpose, consumer, entityId, path, values: [...values], editable };
}

function provedValues(literals: readonly string[], effective: readonly string[]): string[] | null {
  if (!literals.length) return null;
  if (literals.some(value => !effective.includes(value))) return null;
  return [...literals];
}

function leavesOf(type: string, prefix: string): Array<{ path: string; literals: string[] }> {
  const inner = objectInterior(type.trim());
  if (inner !== null) {
    const members = membersOf(inner);
    if (!members) return [];
    const out: Array<{ path: string; literals: string[] }> = [];
    for (const member of members) {
      const path = prefix ? `${prefix}.${member.name}` : member.name;
      out.push(...leavesOf(member.type, path));
    }
    return out;
  }
  const literals = closedLiterals(type);
  if (!literals || !prefix) return [];
  return [{ path: prefix, literals }];
}

function objectInterior(type: string): string | null {
  if (!type.startsWith('{')) return null;
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  for (let index = 0; index < type.length; index += 1) {
    const char = type[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) inString = false;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return type.slice(index + 1).trim() ? null : type.slice(1, index);
    }
  }
  return null;
}

function membersOf(body: string): Array<{ name: string; type: string }> | null {
  const members: Array<{ name: string; type: string }> = [];
  let index = 0;
  while (index < body.length) {
    while (index < body.length && /[\s,;]/.test(body[index])) index += 1;
    if (index >= body.length) break;
    const name = readName(body, index);
    if (!name) return null;
    index = name.end;
    while (index < body.length && /\s/.test(body[index])) index += 1;
    if (body[index] === '?') {
      index += 1;
      while (index < body.length && /\s/.test(body[index])) index += 1;
    }
    if (body[index] !== ':') return null;
    index += 1;
    const typed = readType(body, index);
    if (!typed) return null;
    index = typed.end;
    members.push({ name: name.text, type: typed.text });
  }
  return members;
}

function readName(body: string, index: number): { text: string; end: number } | null {
  const quote = body[index];
  if (quote === '"' || quote === "'") {
    let end = index + 1;
    let escaped = false;
    while (end < body.length) {
      const char = body[end];
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) return { text: body.slice(index + 1, end), end: end + 1 };
      end += 1;
    }
    return null;
  }
  const match = /^[A-Za-z_$][\w$]*/.exec(body.slice(index));
  if (!match) return null;
  return { text: match[0], end: index + match[0].length };
}

function readType(body: string, index: number): { text: string; end: number } | null {
  while (index < body.length && /\s/.test(body[index])) index += 1;
  const start = index;
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  while (index < body.length) {
    const char = body[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) inString = false;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      index += 1;
      continue;
    }
    if (char === '{' || char === '(' || char === '[') depth += 1;
    else if (char === '}' || char === ')' || char === ']') {
      if (depth === 0) break;
      depth -= 1;
    } else if (depth === 0 && (char === ';' || char === ',')) break;
    index += 1;
  }
  const text = body.slice(start, index).trim();
  return text ? { text, end: index } : null;
}

function closedLiterals(type: string): string[] | null {
  const parts = splitTop(type.trim(), '|');
  if (!parts.length) return null;
  const values: string[] = [];
  for (const part of parts) {
    const text = part.trim();
    const match = /^"((?:\\.|[^"\\])*)"$/.exec(text) || /^'((?:\\.|[^'\\])*)'$/.exec(text);
    if (!match) return null;
    values.push(match[1].replace(/\\(["'\\])/g, '$1'));
  }
  return values;
}

function splitTop(type: string, separator: '|' | ';' | ','): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  let start = 0;
  for (let index = 0; index < type.length; index += 1) {
    const char = type[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) inString = false;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      continue;
    }
    if (char === '{' || char === '(' || char === '[') depth += 1;
    else if (char === '}' || char === ')' || char === ']') depth -= 1;
    else if (char === separator && depth === 0) {
      parts.push(type.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(type.slice(start));
  return parts;
}

function bodiesOf(sources: Readonly<Record<string, string>>): ParsedBody {
  const bodies: ParsedBody = { entities: {}, index: null, rules: null, catalogs: {} };
  for (const [path, text] of Object.entries(sources)) {
    const parsed = parseD1Source(text, 'defs');
    if (!isRecord(parsed)) continue;
    if (typeof parsed.entityId === 'string' && isRecord(parsed.record)) bodies.entities[parsed.entityId] = parsed;
    else if (isRecord(parsed.groups) && isRecord(parsed.subtypes) && isRecord(parsed.record)) bodies.catalogs[path] = parsed;
    else if (Array.isArray(parsed.entities) && Array.isArray(parsed.relationships)) bodies.index = parsed;
    else if (!parsed.entityId && isRecord(parsed.rules)) bodies.rules = parsed;
  }
  return bodies;
}

function emptyOrigin(): D1EnumOrigin {
  return {
    owner: 'unresolved',
    writer: 'unresolved',
    derived: false,
    restriction: 'unresolved',
    catalogValues: [],
    catalogSource: '',
    roleBinding: false,
  };
}

function fieldAt(entity: Record<string, unknown>, path: string): Record<string, unknown> | null {
  const record = isRecord(entity.record) ? entity.record : null;
  let cursor: unknown = record ? record.fields : null;
  const parts = path.split('.');
  for (let index = 0; index < parts.length; index += 1) {
    if (!isRecord(cursor)) return null;
    const next = cursor[parts[index]];
    if (!isRecord(next)) return null;
    if (index === parts.length - 1) return next;
    cursor = next.fields;
  }
  return null;
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const values = new Set(right);
  return left.every(value => values.has(value));
}

function arrayOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function isModuleEntity(value: Record<string, unknown>): boolean {
  return (value.kind === 'role' || value.kind === 'entity' || value.kind === 'platform')
    && typeof value.entityId === 'string'
    && typeof value.moduleName === 'string'
    && typeof value.title === 'string'
    && typeof value.description === 'string'
    && typeof value.displayField === 'string'
    && isRecord(value.record)
    && isRecord(value.relationships)
    && isRecord(value.capabilities)
    && Array.isArray(value.rules)
    && (value.kind !== 'role' || typeof value.subtype === 'string');
}

function isIndex(value: unknown): boolean {
  return isRecord(value) && Array.isArray(value.relationships);
}

function isCatalog(value: unknown): boolean {
  return isRecord(value) && isRecord(value.groups) && isRecord(value.subtypes) && isRecord(value.record)
    && isRecord(value.capabilities) && isRecord(value.rules);
}

function isRules(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (value.schemaVersion === '2026-09-10-ns5-rules-v1') return Array.isArray(value.rules);
  return isRecord(value.rules);
}
