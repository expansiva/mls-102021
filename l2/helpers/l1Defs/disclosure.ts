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
 */
export function pathDisclosure(grants: readonly DisclosureGrant[], entity: string, path: string): PathDisclosure {
  const covering = coveringGrants(grants, entity);
  if (covering.length === 0) return 'blocked';
  const refusing = covering.filter(grant => !grantDiscloses(grant, entity, path));
  if (refusing.length === 0) return 'disclosed';
  return refusing.every(grant => allowedOf(grant, entity).some(item => item.startsWith(`${path}.`))) ? 'carrier' : 'blocked';
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
