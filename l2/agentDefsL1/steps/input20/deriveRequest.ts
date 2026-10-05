/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/deriveRequest.ts" enhancement="_blank"/>

import type { D2ContractV2Definition, D2ContractV2Route } from '/_102020_/l2/helpers/contractV2/types.js';
import { ontologyFieldPaths } from '/_102021_/l2/agentDefsL1/steps/controllers60/requestService.js';
import {
  D1_GAP_NONE,
  type D1RequestComputedBy,
  type D1RequestGapAnswer,
  type D1RequestGapKind,
  type D1RequestMappedField,
  type D1RequestOutput,
  type D1RequestParam,
  type D1RequestRelatedField,
  type D1RequestUnresolved,
} from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';

/**
 * d1_60: a contract route is read from its types, the ontology and the L4 relationships. `meta` is not read.
 * Names follow the ontology keys (d2_75), so an interface is an entity when its fields are fields of that entity.
 * What the code cannot derive is returned as `unresolved` with its path and reason; nothing is guessed.
 * d1_62: each gap also carries its closed candidates, computed by code from the types, the ontology and the route,
 * with `none` last. `applyResolutions` takes answers to those gaps and derives the route again through the same code:
 * there is no second selection. An answer outside the candidates, or `none`, leaves the gap open.
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
  /** Readonly values tied to a route rule by an answer (d1_62). */
  computedBy: D1RequestComputedBy[];
}

/** What `applyResolutions` derives from: the route, its contract and the module ontology. */
export interface D1DeriveSource {
  route: D2ContractV2Route;
  definition: D2ContractV2Definition;
  entities: Readonly<Record<string, unknown>>;
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
  rules: readonly string[];
  answers: ReadonlyMap<string, string>;
  outputs: D1RequestOutput[];
  unresolved: D1RequestUnresolved[];
  computedBy: D1RequestComputedBy[];
  /** List id per list output: the flat suffix, or the output key. */
  listIds: Map<D1RequestOutput, string>;
  /** Output keys that are list pages by their type, derived or not: the candidates of a page input. */
  pageKeys: Set<string>;
  /** Under an output that is still a gap: only the gaps are kept, so they all show in one pass. */
  shadow: boolean;
}

export function deriveRequest(
  route: D2ContractV2Route,
  definition: D2ContractV2Definition,
  entities: Readonly<Record<string, unknown>>,
): D1DerivedRequest {
  return applyResolutions({ route, definition, entities }, []);
}

/** The route derived again with the answers as input. The one selection the input20 uses (d1_62). */
export function applyResolutions(source: D1DeriveSource, answers: readonly D1RequestGapAnswer[]): D1DerivedRequest {
  const { route, definition, entities } = source;
  const ctx: Context = {
    projections: new Map(definition.projections.map(item => [item.name, item.body])),
    fields: new Map(Object.entries(entities).map(([entityId, entity]) => [entityId, new Set(ontologyFieldPaths(entity))])),
    links: new Map(Object.entries(entities).map(([entityId, entity]) => [entityId, entityLinks(entity)])),
    rules: route.rules || [],
    answers: new Map(answers.map(item => [item.path, item.choice])),
    outputs: [],
    unresolved: [],
    computedBy: [],
    listIds: new Map(),
    pageKeys: new Set(),
    shadow: false,
  };
  const root = members(route.output);
  const flat = flatPaging(root);
  const flatNames = new Set([...flat.values()].flatMap(group => Object.values(group)));
  for (const member of root) {
    if (flatNames.has(member.name)) continue;
    visit(ctx, member.name, member.type, null);
  }
  bindFlatLists(ctx, flat, root.filter(member => !flatNames.has(member.name) && interfaceRef(ctx, member.type)?.many).map(member => member.name));
  const params = pageParams(ctx, members(route.input));
  return { outputs: ctx.outputs, params, unresolved: ctx.unresolved, computedBy: ctx.computedBy };
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
  ask(ctx, `output.${key}`, 'value', `Output ${key} is a value (${trimmed}), not an interface; no entity owns it.`, []);
}

function classify(ctx: Context, key: string, body: string, many: boolean, parent: D1RequestOutput | null, typeName: string): void {
  const list = members(body);
  if (pageShape(ctx, key, list, parent, typeName)) return;
  const leaves: string[] = [];
  const computed: string[] = [];
  const nested: Array<{ path: string; type: string }> = [];
  collect(ctx, list, '', leaves, computed, nested);
  if (!leaves.length) {
    if (!parent && nested.length) {
      // A group of outputs, not an entity: each member is read on its own. A readonly value of the group has no owner.
      for (const path of computed) {
        const rule = ask(ctx, `output.${key}.${path}`, 'computedRule', `Interface ${typeName} groups outputs; it is not a list page (items plus paging keys), so no entity owns its readonly ${path}.`, ctx.rules);
        if (rule) ctx.computedBy.push({ path: `${key}.${path}`, rule });
      }
      for (const item of nested) visit(ctx, `${key}.${item.path}`, item.type, null);
      return;
    }
    const rule = ask(ctx, `output.${key}`, 'computedRule', `Interface ${typeName} has no field that is not readonly, so no entity owns it.`, ctx.rules);
    if (rule) ctx.computedBy.push({ path: key, rule });
    return;
  }
  // A field that is in no entity may be a flattened ontology path: the candidates are the paths with the same last segment.
  const mapped: D1RequestMappedField[] = [];
  let open = false;
  const paths = leaves.map(leaf => {
    if (ownedByAny(ctx, leaf)) return leaf;
    const choice = ask(ctx, `output.${key}.${leaf}`, 'fieldPath', `Interface ${typeName}: field ${leaf} is not a field of any entity.`, pathsEndingIn(ctx, leaf));
    if (!choice) {
      open = true;
      return leaf;
    }
    mapped.push({ field: leaf, path: choice });
    return choice;
  });
  if (open) {
    shadowNested(ctx, key, nested);
    return;
  }
  const match = matchEntity(ctx, paths);
  let chosen = match.found.length === 1 ? match.found[0] : null;
  if (!chosen) {
    const entity = ask(ctx, `output.${key}`, 'entity', `Interface ${typeName}: ${match.reason}`, match.found.map(item => item.entity));
    chosen = match.found.find(item => item.entity === entity) || null;
  }
  if (!chosen) {
    shadowNested(ctx, key, nested);
    return;
  }
  const output: D1RequestOutput = { key, entity: chosen.entity, many };
  ctx.outputs.push(output);
  if (parent && !ctx.shadow) {
    const ids = relationshipIds(ctx, parent.entity, chosen.entity);
    output.parent = parent.key;
    const relationship = ids.length === 1
      ? ids[0]
      : ask(ctx, `output.${key}`, 'relationship', `${chosen.entity} inside ${parent.entity} needs one L4 relationship between them; found ${ids.length}.`, ids);
    if (relationship) output.relationship = relationship;
  }
  if (computed.length) output.computed = computed;
  if (chosen.related.length) output.related = chosen.related;
  if (mapped.length) output.mapped = mapped;
  for (const item of nested) visit(ctx, `${key}.${item.path}`, item.type, output);
}

/**
 * The members nested in an output that is still a gap are read for their own gaps, without outputs: the answers of
 * one pass then reach them. Their relationship to the parent is asked once the parent is known.
 */
function shadowNested(ctx: Context, key: string, nested: ReadonlyArray<{ path: string; type: string }>): void {
  if (!nested.length) return;
  const shadow: Context = { ...ctx, outputs: [], computedBy: [], listIds: new Map(), shadow: true };
  const ghost: D1RequestOutput = { key, entity: '', many: false };
  for (const item of nested) visit(shadow, `${key}.${item.path}`, item.type, ghost);
}

/**
 * A list page: one interface array and paging values. `items` plus keys that are all paging keys is a list as it is.
 * When the array has another name, or a value is a readonly key outside the paging keys, each such value asks for
 * its paging key. The items are classified either way, so their own gaps show in the same pass. False when the
 * interface is not of that shape.
 */
function pageShape(ctx: Context, key: string, list: readonly Member[], parent: D1RequestOutput | null, typeName: string): boolean {
  const arrays = list.filter(member => interfaceRef(ctx, member.type)?.many);
  const values = list.filter(member => !interfaceRef(ctx, member.type) && !member.type.trim().startsWith('{'));
  if (arrays.length !== 1 || !values.length || arrays.length + values.length !== list.length) return false;
  const items = arrays[0];
  const named = items.name === LIST_ITEMS;
  if (!values.every(member => member.readonly || LIST_KEYS.includes(member.name))) return false;
  const roles = new Map<string, string>();
  let open = false;
  for (const member of values) {
    if (named && LIST_KEYS.includes(member.name)) {
      roles.set(member.name, member.name);
      continue;
    }
    const role = ask(ctx, `output.${key}.${member.name}`, 'pagingRole', `Interface ${typeName} pages ${items.name}; ${member.name} is not one of the paging keys ${LIST_KEYS.join(', ')} next to items, so the types do not say what it is.`, LIST_KEYS);
    if (!role || [...roles.values()].includes(role)) open = true;
    else roles.set(member.name, role);
  }
  ctx.pageKeys.add(key);
  const itemRef = interfaceRef(ctx, items.type);
  const before = ctx.outputs.length;
  if (itemRef) classify(ctx, key, ctx.projections.get(itemRef.name) || '', true, parent, itemRef.name);
  const output = ctx.outputs[before];
  if (!open && output && output.key === key) {
    for (const [name, role] of [...roles].sort((left, right) => pagingOrder(left[1], right[1]))) setPaging(output, role, name);
    ctx.listIds.set(output, key);
  }
  return true;
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

interface EntityMatch {
  /** One entry is the match. More than one is the ambiguity, and they are the candidates. */
  found: Array<{ entity: string; related: D1RequestRelatedField[] }>;
  /** Why it is not one, when it is not. */
  reason: string;
}

/**
 * The entities whose fields are all the leaves. When none, the entities that own some leaves and whose other
 * leaves each belong to exactly one entity linked to it by an N:1 relationship.
 */
function matchEntity(ctx: Context, leaves: readonly string[]): EntityMatch {
  const entityIds = [...ctx.fields.keys()].sort();
  const own = entityIds.filter(entityId => leaves.every(leaf => ctx.fields.get(entityId)?.has(leaf)));
  if (own.length) {
    return { found: own.map(entity => ({ entity, related: [] })), reason: `fields ${leaves.join(', ')} are fields of ${own.join(', ')}; the types do not say which.` };
  }
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
  if (found.length) {
    return { found, reason: `fields ${leaves.join(', ')} fit ${found.map(item => item.entity).join(', ')} through N:1 relationships; the types do not say which.` };
  }
  return { found, reason: `fields ${leaves.join(', ')} are not all fields of one entity or of one entity linked to it by an N:1 relationship.` };
}

function ownedByAny(ctx: Context, path: string): boolean {
  return [...ctx.fields.values()].some(fields => fields.has(path));
}

/** Ontology paths, of any entity of the module, whose last segment is the field name. */
function pathsEndingIn(ctx: Context, field: string): string[] {
  const out = new Set<string>();
  for (const fields of ctx.fields.values()) {
    for (const path of fields) if (path.split('.').pop() === field && path !== field) out.add(path);
  }
  return [...out];
}

/**
 * The answer to the gap at `path` when it is one of the candidates and not `none`. Otherwise the gap is recorded,
 * with the candidates sorted and `none` last, and the result is null.
 */
function ask(ctx: Context, path: string, kind: D1RequestGapKind, reason: string, candidates: readonly string[]): string | null {
  const choice = ctx.answers.get(path);
  if (choice !== undefined && choice !== D1_GAP_NONE && candidates.includes(choice)) return choice;
  gap(ctx, path, kind, reason, candidates);
  return null;
}

function gap(ctx: Context, path: string, kind: D1RequestGapKind, reason: string, candidates: readonly string[]): void {
  const closed = [...new Set(candidates)].filter(item => item !== D1_GAP_NONE).sort();
  ctx.unresolved.push({ path, reason, kind, candidates: [...closed, D1_GAP_NONE] });
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

/**
 * A flat list pages the one interface array of the route root. With more than one, the root arrays are the
 * candidates (by type, so the gap is complete before any other answer).
 */
function bindFlatLists(ctx: Context, flat: Map<string, Partial<Record<FlatKey, string>>>, arrayKeys: readonly string[]): void {
  for (const [suffix, group] of flat) {
    const names = Object.values(group).join(', ');
    const path = `output.${names}`;
    const reason = `Paging keys ${names} page one of ${arrayKeys.length} list outputs; the types do not say which.`;
    const key = arrayKeys.length === 1 ? arrayKeys[0] : ask(ctx, path, 'flatPaging', reason, arrayKeys);
    const output = key ? ctx.outputs.find(item => item.key === key && !item.parent && !ctx.listIds.has(item)) : undefined;
    if (!output) {
      // The one array, or the chosen one, is not derived: the paging keys stay a gap.
      if (key) gap(ctx, path, 'flatPaging', `${reason} Output ${key} is not derived.`, arrayKeys);
      continue;
    }
    for (const flatKey of FLAT_PAGING.slice().sort(pagingOrder)) {
      const name = group[flatKey];
      if (name) setPaging(output, flatKey, name);
    }
    ctx.listIds.set(output, suffix.charAt(0).toLowerCase() + suffix.slice(1));
    ctx.pageKeys.add(output.key);
  }
  for (const key of arrayKeys) if (flat.size) ctx.pageKeys.add(key);
}

/**
 * `page`/`pageSize` page the one list of the route; `<list>Page`/`<list>PageSize` page the list whose key ends in `<list>`.
 * Otherwise the candidates are the outputs that are list pages by type. Other inputs stay inputs.
 */
function pageParams(ctx: Context, input: readonly Member[]): D1RequestParam[] {
  const params: D1RequestParam[] = [];
  const lists = [...ctx.listIds.keys()];
  for (const member of input) {
    const stem = pageStem(member.name);
    if (stem === null) continue;
    const path = `input.${member.name}`;
    const found = stem === '' ? lists : lists.filter(output => output.key.split('.').pop() === stem);
    let target = found.length === 1 ? found[0] : undefined;
    if (!target) {
      const key = ask(ctx, path, 'pageParam', stem === ''
        ? `Page input ${member.name} pages one of ${found.length} lists; the types do not say which.`
        : `Page input ${member.name} names list ${stem}, and no list output has that key.`, [...ctx.pageKeys]);
      target = key ? lists.find(output => output.key === key) : undefined;
      // The chosen list is not derived as a list: the input stays a gap.
      if (key && !target) gap(ctx, path, 'pageParam', `Page input ${member.name}: list ${key} is not derived.`, [...ctx.pageKeys]);
    }
    if (!target) continue;
    params.push({ name: member.name, target: target.key, pages: ctx.listIds.get(target) || target.key });
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
