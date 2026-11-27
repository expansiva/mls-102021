/// <mls fileReference="_102021_/l2/helpers/l1Defs/scalarTypes.ts" enhancement="_blank"/>

// d1_346 s1: what each scalar of the L4 vocabulary is, in the three places of the L1 generator that read it: the TypeScript of the entity, the column of Postgres and the value of the seed. ONE table, typed by
// `MdmScalarKind` of the platform (P:l1/mdm/defs/ontologyTypes.ts): a scalar the platform adds does not compile here until this table says what it is in the three. Before it, each place had a list of its own
// (`fieldTs`, `postgresType`, the seed's `SCALAR_COLUMN`) and they differed on `money` (a number for the platform and the seed, a `string` in the entity). The values below are what each place produced before the table,
// except `number`, whose column was `INTEGER` (a decimal would be cut) and is now `NUMERIC`; `money` stays `string` in the entity and `TEXT` in the column (d1_346: product and platform choose, not the generator).

import type { MdmScalarKind } from '/_102034_/l1/mdm/defs/ontologyTypes.js';

export interface ScalarForm {
  /** The type of the field in the TypeScript of the entity. */
  ts: 'string' | 'number' | 'boolean';
  /** The type of the column when the field has a column of its own (indexed or promoted). */
  sql: 'TEXT' | 'INTEGER' | 'NUMERIC' | 'BOOLEAN' | 'TIMESTAMPTZ';
  /** The kind of value the seed writes. */
  seed: 'string' | 'integer' | 'number' | 'boolean' | 'timestamp' | 'uuid';
}

export const SCALAR_FORMS: Readonly<Record<MdmScalarKind, ScalarForm>> = {
  string: { ts: 'string', sql: 'TEXT', seed: 'string' },
  text: { ts: 'string', sql: 'TEXT', seed: 'string' },
  integer: { ts: 'number', sql: 'INTEGER', seed: 'integer' },
  number: { ts: 'number', sql: 'NUMERIC', seed: 'number' },
  money: { ts: 'string', sql: 'TEXT', seed: 'number' },
  boolean: { ts: 'boolean', sql: 'BOOLEAN', seed: 'boolean' },
  date: { ts: 'string', sql: 'TEXT', seed: 'string' },
  timestamp: { ts: 'string', sql: 'TIMESTAMPTZ', seed: 'timestamp' },
  uuid: { ts: 'string', sql: 'TEXT', seed: 'uuid' },
};

/** The form of a scalar of the platform; `undefined` for anything else (`enum`, `object`, `record`, a type name of the module). */
export function scalarForm(type: string): ScalarForm | undefined {
  return Object.prototype.hasOwnProperty.call(SCALAR_FORMS, type) ? SCALAR_FORMS[type as MdmScalarKind] : undefined;
}
