/// <mls fileReference="_102021_/l2/helpers/l1Defs/disclosure.ts" enhancement="_blank"/>

/**
 * The one disclosure rule for a projected entity path (t1_10 r2), read by the D1 controller plan
 * (controllers60) and by the M1 request service (emit.ts). Every path rule lives in `pathDisclosure`.
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
 * Primary key and concurrency field of one entity. Same marks the M1 domain def already uses
 * (`identityField` / `versionField` in domainOptional) and the same marks on an ontology entity:
 * the identity is the derived `uuid`, else the first derived field; the concurrency field is the
 * single other derived integer or number. A field that is not marked is not included. Not a name list.
 */
export function systemFieldPaths(entityDefinition: unknown): string[] {
  const fields = markedFields(entityDefinition);
  const uuid = fields.find(field => field.derived && field.type === 'uuid');
  const identity = uuid ?? fields.find(field => field.derived);
  const identityName = identity && isIdent(identity.name) ? identity.name : '';
  const versions = fields.filter(field => field.derived && field.name !== identityName && (field.type === 'integer' || field.type === 'number'));
  const version = versions.length === 1 && isIdent(versions[0].name) ? versions[0].name : '';
  return [identityName, version].filter(name => name.length > 0);
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
