/// <mls fileReference="_102021_/l2/helpers/l1Defs/arrivalUpsert.ts" enhancement="_blank"/>

// d1_232: an arrival that says `[create, update]` on one entity is an upsert: find the record by its key, update it when it is there, create it
// when it is not. The key and the test are shared by the plan (input20, which refuses an entity with no key) and by the materializer (which tells
// the model how to find the record and checks that it does). Reads what `ns5ArrivalEffects` gives; nothing here reads a line.

import type { Ns5ArrivalEntityEffects } from '/_102035_/l2/solution/arrivalEffects.js';

/** An entity the arrival creates or updates: find it by its key, update when it is there, create when it is not. */
export interface ArrivalUpsert {
  entityId: string;
  /** Fields of the key: one of the `uniqueKeys` of the entity, or `[idField]`. */
  key: string[];
  keyKind: 'unique' | 'id';
}

/** `[create, update]` on one entity. */
export function isUpsert(entry: Ns5ArrivalEntityEffects): boolean {
  return entry.effects.includes('create') && entry.effects.includes('update');
}

/**
 * The key an upsert finds the record by: the first of the `uniqueKeys` of the entity, else its id field. `null` when the entity has neither
 * (the arrival then says ARRIVAL_UPSERT_WITHOUT_KEY). The entity is the ontology entity of the L4.
 */
export function upsertKeyOf(entity: unknown): Pick<ArrivalUpsert, 'key' | 'keyKind'> | null {
  const record = isRecord(entity) ? entity : {};
  const keys = Array.isArray(record.uniqueKeys) ? record.uniqueKeys : [];
  for (const key of keys) {
    const fields = Array.isArray(key) ? key.filter((field): field is string => typeof field === 'string' && field !== '') : [];
    if (fields.length > 0) return { key: fields, keyKind: 'unique' };
  }
  const fields = isRecord(record.record) && isRecord(record.record.fields) ? record.record.fields : {};
  const storage = isRecord(record.storage) ? record.storage : {};
  const idField = typeof storage.idField === 'string' && storage.idField ? storage.idField : Object.hasOwn(fields, 'id') ? 'id' : '';
  return idField ? { key: [idField], keyKind: 'id' } : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
