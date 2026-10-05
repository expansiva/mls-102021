/// <mls fileReference="_102021_/l2/helpers/l1Defs/disclosure.ts" enhancement="_blank"/>

/**
 * The one disclosure rule for a projected path (t1_10 r2, d1_63), read by the D1 controller plan
 * (controllers60) and by the M1 request service (emit.ts) through `nodeDisclosure`. Every entity path rule lives in
 * `pathDisclosure`.
 */

export interface DisclosureGrant {
  disclosure: string;
  /** `Entity.path` entries. `Entity` alone is the whole record. */
  allowedFields: readonly string[];
  /** Entities the grant is about. Empty: the grant is about every entity of the route. */
  entityRefs: readonly string[];
}

/** `disclosed`; `carrier` = a grant names a sub-path of it (the container is not released); `blocked`. */
export type PathDisclosure = 'disclosed' | 'carrier' | 'blocked';

/** Grants that speak for one entity's output: `entityRefs` names it, or the grant has no `entityRefs`. */
export function coveringGrants<T extends DisclosureGrant>(grants: readonly T[], entity: string): T[] {
  return grants.filter(grant => grant.entityRefs.length === 0 || grant.entityRefs.includes(entity));
}

/**
 * A path leaves only when every covering grant discloses it. No covering grant is `blocked`
 * (fail closed). `fullRecord` discloses all; `fieldsOnly`/`summaryOnly` the `<entity>.` allowed
 * fields and what is under them; any other mode nothing.
 * The entity's system paths (primary key and declared concurrency field) leave with any covering
 * grant. They are not business data, so `allowedFields` does not have to name them. A grant that
 * does not cover the entity still discloses nothing.
 */
export function pathDisclosure(
  grants: readonly DisclosureGrant[],
  entity: string,
  path: string,
  entityDefinition?: unknown,
): PathDisclosure {
  const covering = coveringGrants(grants, entity);
  if (covering.length === 0) return 'blocked';
  if (systemFieldPaths(entityDefinition).includes(path)) return 'disclosed';
  const refusing = covering.filter(grant => !grantDiscloses(grant, entity, path));
  if (refusing.length === 0) return 'disclosed';
  return refusing.every(grant => allowedOf(grant, entity).some(item => item.startsWith(`${path}.`))) ? 'carrier' : 'blocked';
}

/**
 * One projected contract path, classified by what it is in the ontology (d1_63). The D1 plan (controllers60) builds
 * the nodes from the derived route; the M1 request service reads the same nodes from the request service def.
 * - `entity`: a field of `entity` at the ontology `path` (direct, mapped, a field of an N:1 entity, or a field of a
 *   nested relation, whose `entity` is the related one). Checked by `pathDisclosure`.
 * - `computed`: a readonly value that is no ontology path of `entity`, the entity that owns the output.
 * - `paging`: a paging key of a list page. Not entity data.
 */
export type DisclosureNode =
  | { kind: 'entity'; field: string; entity: string; path: string }
  | { kind: 'computed'; field: string; entity: string }
  | { kind: 'paging'; field: string };

/** The nodes of one output. A def without `disclosure` (before d1_63) reads each path as a path of its entity. */
export function outputNodes(output: { entity: string; fields: readonly string[]; disclosure?: readonly DisclosureNode[] }): DisclosureNode[] {
  return output.disclosure
    ? [...output.disclosure]
    : output.fields.map(field => ({ kind: 'entity' as const, field, entity: output.entity, path: field }));
}

/** The `disclosure` of a def read back: undefined when absent, null when any node is not a node (fail closed). */
export function readDisclosureNodes(value: unknown): DisclosureNode[] | null | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;
  const nodes: DisclosureNode[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.field !== 'string' || !item.field) return null;
    if (item.kind === 'paging') nodes.push({ kind: 'paging', field: item.field });
    else if (item.kind === 'computed' && typeof item.entity === 'string' && item.entity) nodes.push({ kind: 'computed', field: item.field, entity: item.entity });
    else if (item.kind === 'entity' && typeof item.entity === 'string' && item.entity && typeof item.path === 'string' && item.path) {
      nodes.push({ kind: 'entity', field: item.field, entity: item.entity, path: item.path });
    } else return null;
  }
  return nodes;
}

/** `computed`: a calculated value without a `fullRecord` grant of its entity (`COMPUTED_NOT_DISCLOSED`). */
export type NodeDisclosure = PathDisclosure | 'computed';

/**
 * The one rule for a classified path. An entity path goes through `pathDisclosure` on its ontology path. A paging key
 * leaves. A calculated value leaves only when every grant that covers its entity is `fullRecord`, and there is one:
 * an aggregate of records may reveal what the fields do not, so it is closed by default.
 */
export function nodeDisclosure(
  grants: readonly DisclosureGrant[],
  node: DisclosureNode,
  entityDefinition: (entity: string) => unknown,
): NodeDisclosure {
  if (node.kind === 'paging') return 'disclosed';
  if (node.kind === 'entity') return pathDisclosure(grants, node.entity, node.path, entityDefinition(node.entity));
  const covering = coveringGrants(grants, node.entity);
  return covering.length > 0 && covering.every(grant => grant.disclosure === 'fullRecord') ? 'disclosed' : 'computed';
}

/**
 * Primary key and concurrency field of one entity, for a domain def or an ontology entity.
 * The identity is the derived `uuid`, else the first derived field; the concurrency field is the
 * single other derived integer or number. A field that is not marked is not included. Not a name list.
 * `domainOptional` reads these two; it does not keep a second copy of the marks.
 */
export function systemIdentity(entityDefinition: unknown): string {
  const fields = markedFields(entityDefinition);
  const uuid = fields.find(field => field.derived && field.type === 'uuid');
  const identity = uuid ?? fields.find(field => field.derived);
  return identity && isIdent(identity.name) ? identity.name : '';
}

/** The single other derived integer or number, or '' when the entity does not declare exactly one. */
export function systemVersion(entityDefinition: unknown, identity: string): string {
  const versions = markedFields(entityDefinition).filter(field => field.derived && field.name !== identity && (field.type === 'integer' || field.type === 'number'));
  return versions.length === 1 && isIdent(versions[0].name) ? versions[0].name : '';
}

export function systemFieldPaths(entityDefinition: unknown): string[] {
  const identity = systemIdentity(entityDefinition);
  return [identity, systemVersion(entityDefinition, identity)].filter(name => name.length > 0);
}

interface MarkedField {
  name: string;
  type: string;
  derived: boolean;
}

function markedFields(entityDefinition: unknown): MarkedField[] {
  const data = recordData(entityDefinition);
  if (!data) return [];
  if (Array.isArray(data.fields)) {
    return data.fields.filter(isRecord).map(field => ({
      name: typeof field.name === 'string' ? field.name : '',
      type: typeof field.type === 'string' ? field.type : '',
      derived: field.derived === true,
    })).filter(field => field.name.length > 0 && !field.name.includes('.'));
  }
  const record = isRecord(data.record) ? data.record : data;
  const map = isRecord(record.fields) ? record.fields : null;
  if (!map) return [];
  return Object.entries(map).filter((entry): entry is [string, Record<string, unknown>] => isRecord(entry[1])).map(([name, field]) => ({
    name,
    type: typeof field.type === 'string' ? field.type : '',
    derived: field.derived === true,
  })).filter(field => field.name.length > 0 && !field.name.includes('.'));
}

function recordData(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  return isRecord(value.data) ? value.data : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIdent(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function grantDiscloses(grant: DisclosureGrant, entity: string, path: string): boolean {
  if (grant.disclosure === 'fullRecord') return true;
  if (grant.disclosure !== 'fieldsOnly' && grant.disclosure !== 'summaryOnly') return false;
  return allowedOf(grant, entity).some(item => item === '' || item === path || path.startsWith(`${item}.`));
}

/** Allowed fields relative to the entity; `''` is the whole record. */
function allowedOf(grant: DisclosureGrant, entity: string): string[] {
  const prefix = `${entity}.`;
  const out: string[] = [];
  for (const item of grant.allowedFields) {
    if (item === entity) out.push('');
    else if (entity && item.startsWith(prefix)) out.push(item.slice(prefix.length));
  }
  return out;
}
