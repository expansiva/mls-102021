/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/deriveRequest.ts" enhancement="_blank"/>

import type { D2ContractV2Definition, D2ContractV2Route } from '/_102020_/l2/helpers/contractV2/types.js';
import { ontologyFieldPaths } from '/_102021_/l2/agentDefsL1/steps/controllers60/requestService.js';
import type {
  D1RequestOutput,
  D1RequestParam,
  D1RequestRelatedField,
  D1RequestUnresolved,
} from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';

/**
 * d1_60: a contract route is read from its types, the ontology and the L4 relationships. `meta` is not read.
 * Names follow the ontology keys (d2_75), so an interface is an entity when its fields are fields of that entity.
 * What the code cannot derive is returned as `unresolved` with its path and reason; nothing is guessed.
 */

/** A list page: `items: X[]` and at least one of these keys. */
const LIST_ITEMS = 'items';
const LIST_KEYS: readonly string[] = ['total', 'page', 'pageSize', 'hasMore'];
/** Paging keys rendered flat next to the list in the contracts with meta: `page<List>`, `pageSize<List>`, `hasMore<List>`. `pageSize` first: `page` is its prefix. */
const FLAT_PAGING = ['pageSize', 'page', 'hasMore'] as const;
type FlatKey = typeof FLAT_PAGING[number];

export interface D1DerivedRequest {
  outputs: D1RequestOutput[];
  params: D1RequestParam[];
  unresolved: D1RequestUnresolved[];
}

interface Member {
  name: string;
  readonly: boolean;
  type: string;
}

interface EntityLink {
  to: string;
  relationshipId: string;
  cardinality: string;
}

interface Context {
  projections: Map<string, string>;
  fields: Map<string, Set<string>>;
  links: Map<string, EntityLink[]>;
  outputs: D1RequestOutput[];
  unresolved: D1RequestUnresolved[];
  /** List id per list output: the flat suffix, or the output key. */
  listIds: Map<D1RequestOutput, string>;
}

export function deriveRequest(
  route: D2ContractV2Route,
  definition: D2ContractV2Definition,
  entities: Readonly<Record<string, unknown>>,
): D1DerivedRequest {
  const ctx: Context = {
    projections: new Map(definition.projections.map(item => [item.name, item.body])),
    fields: new Map(Object.entries(entities).map(([entityId, entity]) => [entityId, new Set(ontologyFieldPaths(entity))])),
    links: new Map(Object.entries(entities).map(([entityId, entity]) => [entityId, entityLinks(entity)])),
    outputs: [],
    unresolved: [],
    listIds: new Map(),
  };
  const root = members(route.output);
  const flat = flatPaging(root);
  const flatNames = new Set([...flat.values()].flatMap(group => Object.values(group)));
  for (const member of root) {
    if (flatNames.has(member.name)) continue;
    visit(ctx, member.name, member.type, null);
  }
  bindFlatLists(ctx, flat);
  const params = pageParams(ctx, members(route.input));
  return { outputs: ctx.outputs, params, unresolved: ctx.unresolved };
}

function visit(ctx: Context, key: string, type: string, parent: D1RequestOutput | null): void {
  const ref = interfaceRef(ctx, type);
  if (ref) {
    classify(ctx, key, ctx.projections.get(ref.name) || '', ref.many, parent, ref.name);
    return;
  }
  const trimmed = type.trim();
  if (trimmed.startsWith('{')) {
    classify(ctx, key, trimmed, false, parent, key);
    return;
  }
  unresolve(ctx, `output.${key}`, `Output ${key} is a value (${trimmed}), not an interface; no entity owns it.`);
}

function classify(ctx: Context, key: string, body: string, many: boolean, parent: D1RequestOutput | null, typeName: string): void {
  const list = members(body);
  const items = list.find(member => member.name === LIST_ITEMS);
  const paging = list.filter(member => member !== items);
  const itemRef = items ? interfaceRef(ctx, items.type) : null;
  if (itemRef?.many && paging.length > 0 && paging.every(member => LIST_KEYS.includes(member.name) && !interfaceRef(ctx, member.type))) {
    const before = ctx.outputs.length;
    classify(ctx, key, ctx.projections.get(itemRef.name) || '', true, parent, itemRef.name);
    const output = ctx.outputs[before];
    if (output && output.key === key) {
      for (const member of paging) setPaging(output, member.name, member.name);
      ctx.listIds.set(output, key);
    }
    return;
  }
  const leaves: string[] = [];
  const computed: string[] = [];
  const nested: Array<{ path: string; type: string }> = [];
  collect(ctx, list, '', leaves, computed, nested);
  if (!leaves.length) {
    if (!parent && nested.length) {
      // A group of outputs, not an entity: each member is read on its own. A readonly value of the group has no owner.
      for (const path of computed) unresolve(ctx, `output.${key}.${path}`, `Interface ${typeName} groups outputs; it is not a list page (items plus paging keys), so no entity owns its readonly ${path}.`);
      for (const item of nested) visit(ctx, `${key}.${item.path}`, item.type, null);
      return;
    }
    unresolve(ctx, `output.${key}`, `Interface ${typeName} has no field that is not readonly, so no entity owns it.`);
    return;
  }
  const match = matchEntity(ctx, leaves);
  if ('reason' in match) {
    unresolve(ctx, `output.${key}`, `Interface ${typeName}: ${match.reason}`);
    return;
  }
  const output: D1RequestOutput = { key, entity: match.entity, many };
  ctx.outputs.push(output);
  if (parent) {
    const ids = relationshipIds(ctx, parent.entity, match.entity);
    output.parent = parent.key;
    if (ids.length === 1) output.relationship = ids[0];
    else {
      unresolve(ctx, `output.${key}`, `${match.entity} inside ${parent.entity} needs one L4 relationship between them; found ${ids.length}.`);
    }
  }
  if (computed.length) output.computed = computed;
  if (match.related.length) output.related = match.related;
  for (const item of nested) visit(ctx, `${key}.${item.path}`, item.type, output);
}

function collect(
  ctx: Context,
  list: readonly Member[],
  prefix: string,
  leaves: string[],
  computed: string[],
  nested: Array<{ path: string; type: string }>,
): void {
  for (const member of list) {
    const path = prefix ? `${prefix}.${member.name}` : member.name;
    if (interfaceRef(ctx, member.type)) {
      nested.push({ path, type: member.type });
      continue;
    }
    if (member.readonly) {
      computed.push(path);
      continue;
    }
    const type = member.type.trim();
    if (type.startsWith('{')) collect(ctx, members(type), path, leaves, computed, nested);
    else leaves.push(path);
  }
}

type EntityMatch = { entity: string; related: D1RequestRelatedField[] } | { reason: string };

/**
 * The one entity whose fields are all the leaves. When none, the one entity that owns some leaves and whose
 * other leaves each belong to exactly one entity linked to it by an N:1 relationship.
 */
function matchEntity(ctx: Context, leaves: readonly string[]): EntityMatch {
  const entityIds = [...ctx.fields.keys()].sort();
  const own = entityIds.filter(entityId => leaves.every(leaf => ctx.fields.get(entityId)?.has(leaf)));
  if (own.length === 1) return { entity: own[0], related: [] };
  if (own.length > 1) return { reason: `fields ${leaves.join(', ')} are fields of ${own.join(', ')}; the types do not say which.` };
  const found: Array<{ entity: string; related: D1RequestRelatedField[] }> = [];
  for (const entityId of entityIds) {
    const fields = ctx.fields.get(entityId) || new Set<string>();
    const missing = leaves.filter(leaf => !fields.has(leaf));
    if (missing.length === leaves.length) continue;
    const related: D1RequestRelatedField[] = [];
    for (const leaf of missing) {
      const owners = (ctx.links.get(entityId) || []).filter(link => link.cardinality === 'N:1' && ctx.fields.get(link.to)?.has(leaf));
      if (owners.length !== 1) break;
      related.push({ field: leaf, entity: owners[0].to, relationship: owners[0].relationshipId });
    }
    if (related.length === missing.length) found.push({ entity: entityId, related });
  }
  if (found.length === 1) return found[0];
  if (found.length > 1) {
    return { reason: `fields ${leaves.join(', ')} fit ${found.map(item => item.entity).join(', ')} through N:1 relationships; the types do not say which.` };
  }
  const orphan = leaves.filter(leaf => !entityIds.some(entityId => ctx.fields.get(entityId)?.has(leaf)));
  return {
    reason: orphan.length
      ? `fields ${orphan.join(', ')} are not fields of any entity.`
      : `fields ${leaves.join(', ')} are not all fields of one entity or of one entity linked to it by an N:1 relationship.`,
  };
}

function relationshipIds(ctx: Context, left: string, right: string): string[] {
  const ids = new Set<string>();
  for (const link of ctx.links.get(left) || []) if (link.to === right) ids.add(link.relationshipId);
  for (const link of ctx.links.get(right) || []) if (link.to === left) ids.add(link.relationshipId);
  return [...ids].sort();
}

function flatPaging(root: readonly Member[]): Map<string, Partial<Record<FlatKey, string>>> {
  const groups = new Map<string, Partial<Record<FlatKey, string>>>();
  for (const member of root) {
    const prefix = FLAT_PAGING.find(item => member.name.startsWith(item) && /^[A-Z]/u.test(member.name.slice(item.length)));
    if (!prefix) continue;
    const suffix = member.name.slice(prefix.length);
    const group = groups.get(suffix) || {};
    group[prefix] = member.name;
    groups.set(suffix, group);
  }
  return groups;
}

/** A flat list pages the one array output of the route root. With more than one, the types do not say which. */
function bindFlatLists(ctx: Context, flat: Map<string, Partial<Record<FlatKey, string>>>): void {
  const arrays = ctx.outputs.filter(output => output.many && !output.parent && !output.key.includes('.') && !ctx.listIds.has(output));
  for (const [suffix, group] of flat) {
    const names = Object.values(group).join(', ');
    if (arrays.length !== 1) {
      unresolve(ctx, `output.${names}`, `Paging keys ${names} page one of ${arrays.length} list outputs; the types do not say which.`);
      continue;
    }
    const output = arrays[0];
    for (const key of FLAT_PAGING.slice().sort(pagingOrder)) {
      const name = group[key];
      if (name) setPaging(output, key, name);
    }
    ctx.listIds.set(output, suffix.charAt(0).toLowerCase() + suffix.slice(1));
  }
}

/** `page`/`pageSize` page the one list of the route; `<list>Page`/`<list>PageSize` page the list whose key ends in `<list>`. Other inputs stay inputs. */
function pageParams(ctx: Context, input: readonly Member[]): D1RequestParam[] {
  const params: D1RequestParam[] = [];
  const lists = [...ctx.listIds.keys()];
  for (const member of input) {
    const stem = pageStem(member.name);
    if (stem === null) continue;
    const found = stem === '' ? lists : lists.filter(output => output.key.split('.').pop() === stem);
    if (found.length !== 1) {
      unresolve(ctx, `input.${member.name}`, stem === ''
        ? `Page input ${member.name} pages one of ${found.length} lists; the types do not say which.`
        : `Page input ${member.name} names list ${stem}, and no list output has that key.`);
      continue;
    }
    params.push({ name: member.name, target: found[0].key, pages: ctx.listIds.get(found[0]) || found[0].key });
  }
  return params;
}

function pageStem(name: string): string | null {
  if (name === 'page' || name === 'pageSize') return '';
  if (name.endsWith('PageSize')) return name.slice(0, -'PageSize'.length);
  if (name.endsWith('Page')) return name.slice(0, -'Page'.length);
  return null;
}

function setPaging(output: D1RequestOutput, key: string, name: string): void {
  if (key === 'page') output.page = name;
  else if (key === 'pageSize') output.pageSize = name;
  else if (key === 'hasMore') output.hasMore = name;
  else if (key === 'total') output.total = name;
}

function pagingOrder(left: string, right: string): number {
  return LIST_KEYS.indexOf(left) - LIST_KEYS.indexOf(right);
}

function interfaceRef(ctx: Context, type: string): { name: string; many: boolean } | null {
  const found = /^([A-Z][A-Za-z0-9]*)(\[\])?$/u.exec(type.trim());
  if (!found || !ctx.projections.has(found[1])) return null;
  return { name: found[1], many: Boolean(found[2]) };
}

function entityLinks(entity: unknown): EntityLink[] {
  const relationships = isRecord(entity) && isRecord(entity.relationships) ? entity.relationships : {};
  const out: EntityLink[] = [];
  for (const value of Object.values(relationships)) {
    if (!isRecord(value) || typeof value.to !== 'string' || typeof value.relationshipId !== 'string') continue;
    out.push({ to: value.to, relationshipId: value.relationshipId, cardinality: typeof value.cardinality === 'string' ? value.cardinality : '' });
  }
  return out;
}

function unresolve(ctx: Context, path: string, reason: string): void {
  ctx.unresolved.push({ path, reason });
}

/** Members of an interface body or of an inline object type, in order. */
function members(source: string): Member[] {
  let text = source.trim();
  if (text.startsWith('{') && text.endsWith('}')) text = text.slice(1, -1);
  const out: Member[] = [];
  let i = 0;
  while (i < text.length) {
    while (i < text.length && /[\s;]/u.test(text[i])) i += 1;
    if (i >= text.length) break;
    let readonly = false;
    if (text.startsWith('readonly ', i)) {
      readonly = true;
      i += 'readonly '.length;
    }
    const name = /^[A-Za-z_][A-Za-z0-9_]*/u.exec(text.slice(i))?.[0];
    if (!name) break;
    i += name.length;
    if (text[i] === '?') i += 1;
    while (text[i] === ' ') i += 1;
    if (text[i] !== ':') break;
    i += 1;
    const start = i;
    let depth = 0;
    let quote = '';
    while (i < text.length) {
      const ch = text[i];
      if (quote) {
        if (ch === quote) quote = '';
      } else if (ch === '\'' || ch === '"') quote = ch;
      else if (ch === '{' || ch === '(' || ch === '[' || ch === '<') depth += 1;
      else if (ch === '}' || ch === ')' || ch === ']' || ch === '>') depth -= 1;
      else if (depth === 0 && (ch === ';' || ch === '\n')) break;
      i += 1;
    }
    out.push({ name, readonly, type: text.slice(start, i).trim() });
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
