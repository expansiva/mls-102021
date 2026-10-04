/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/structure/domainOptional.ts" enhancement="_blank"/>

/**
 * m1_41 b1-P1: which fields a stored record may lack. The domain emitter types them with `?`, and a v2
 * usecase reads its optional input and output fields from the same place: the l4 entity `required`
 * and the fields the server assigns. Moved here from `behavior/emitBehavior.ts` so that structure and
 * behavior share one criterion.
 */

import { isRecord, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { systemIdentity, systemVersion } from '/_102021_/l2/helpers/l1Defs/disclosure.js';

/**
 * Entity field paths the domain types with `?`: on a module-database entity, the fields the l4 entity
 * does not require and the server does not assign. Empty for other storage targets or with no l4
 * entity; null when the l4 entity has no readable record fields.
 */
export function domainOptionalPaths(entity: M1Definition, ontologySource: string | null): Set<string> | null {
  if (text(entity.data.storageTarget) !== 'moduleDatabase' || ontologySource === null) return new Set();
  const requiredFields = ontologyRequired(ontologySource);
  if (!requiredFields) return null;
  const assigned = serverAssigned(entity, lifecycleStart(entity));
  const paths = (Array.isArray(entity.data.fields) ? entity.data.fields.filter(isRecord) : []).map(field => text(field.name)).filter(Boolean);
  return new Set(paths.filter(path => !requiredFields.has(path) && !assigned.has(path)));
}

/**
 * The entity path of a usecase signature row: its `fieldRef` without the `<Entity>.` prefix.
 * A row of another entity, or one with no field ref (a page param), is not an entity path: ''.
 */
export function signatureFieldPath(row: Record<string, unknown>, entityId: string): string {
  const ref = text(row.fieldRef);
  if (ref) return entityId && ref.startsWith(`${entityId}.`) ? ref.slice(entityId.length + 1) : '';
  return '';
}

/** Names of the signature rows the domain types with `?`. */
export function optionalSignatureNames(rows: readonly unknown[], entityId: string, optional: ReadonlySet<string>): Set<string> {
  const names = new Set<string>();
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const path = signatureFieldPath(row, entityId);
    if (path && optional.has(path)) names.add(text(row.name));
  }
  return names;
}

/** Server-assigned values of a new record: the identity, the version and the initial lifecycle state. */
export function serverAssigned(entity: M1Definition, lifecycle: { field: string; initial: string }): Map<string, string> {
  const assigned = new Map<string, string>();
  const identity = identityField(entity);
  if (identity) assigned.set(identity, 'ctx.idGenerator.newId()');
  const version = versionField(entity, identity);
  if (version) assigned.set(version, '1');
  // The server assigns the initial lifecycle state; a client value is never read for it.
  if (lifecycle.field) assigned.set(lifecycle.field, `'${lifecycle.initial}'`);
  return assigned;
}

/** Field paths the canonical l4 entity marks `required`, walking nested `fields`; null when unreadable. */
export function ontologyRequired(source: string): Set<string> | null {
  const match = /=\s*(\{[\s\S]*\})\s*as const/.exec(source);
  if (!match) return null;
  let value: unknown;
  try {
    value = JSON.parse(match[1]);
  } catch (error) {
    console.warn(`ontology record is not JSON: ${String(error)}`);
    return null;
  }
  const record = isRecord(value) && isRecord(value.record) ? value.record : null;
  if (!record || !isRecord(record.fields)) return null;
  const paths = new Set<string>();
  const walk = (fields: Record<string, unknown>, prefix: string): void => {
    for (const [name, meta] of Object.entries(fields)) {
      if (!isRecord(meta)) continue;
      const path = prefix ? `${prefix}.${name}` : name;
      if (meta.required === true) paths.add(path);
      if (isRecord(meta.fields)) walk(meta.fields, path);
    }
  };
  walk(record.fields, '');
  return paths;
}

export function identityField(entity: M1Definition): string {
  return systemIdentity(entity);
}

export function enumField(entity: M1Definition): string {
  const fields = topFields(entity).filter(field => field.type === 'enum');
  return fields.length === 1 && isIdent(fields[0].name) ? fields[0].name : '';
}

export function versionField(entity: M1Definition, identity: string): string {
  return systemVersion(entity, identity);
}

export function topFields(entity: M1Definition): Array<{ name: string; type: string; derived: boolean }> {
  const fields = Array.isArray(entity.data.fields) ? entity.data.fields.filter(isRecord) : [];
  return fields
    .map(field => ({ name: text(field.name), type: text(field.type), derived: field.derived === true }))
    .filter(field => field.name && !field.name.includes('.'));
}

/**
 * The lifecycle field is the single top-level enum of an entity that declares transitions.
 * Its initial state is the one declared state no transition reaches; otherwise it is ''.
 */
export function lifecycleStart(definition: M1Definition): { field: string; initial: string } {
  const lifecycle = definition.data.lifecycle;
  if (!isRecord(lifecycle) || !Array.isArray(lifecycle.transitions) || lifecycle.transitions.length === 0) return { field: '', initial: '' };
  const field = enumField(definition);
  if (!field) return { field: '', initial: '' };
  const states = Array.isArray(lifecycle.states)
    ? lifecycle.states.flatMap(item => isRecord(item) ? [text(item.state)] : []).filter(Boolean)
    : [];
  const reached = new Set(lifecycle.transitions.flatMap(item => isRecord(item) ? [text(item.to)] : []));
  const initial = states.filter(state => !reached.has(state));
  return { field, initial: initial.length === 1 && isIdent(initial[0]) ? initial[0] : '' };
}

function isIdent(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
