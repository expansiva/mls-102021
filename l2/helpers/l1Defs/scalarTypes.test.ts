/// <mls fileReference="_102021_/l2/helpers/l1Defs/scalarTypes.test.ts" enhancement="_blank"/>

// d1_346 s1: the table of scalars has exactly the scalars of the platform (a new one is a failing test here and a compile error in the table), and says what each place produced before it.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { SCALAR_FORMS, scalarForm } from '/_102021_/l2/helpers/l1Defs/scalarTypes.js';

const PLATFORM = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../mls-102034/l1/mdm/defs/ontologyTypes.ts');

void test('d1_346 s1: the table has exactly the scalars of MdmScalarKind', { skip: !existsSync(PLATFORM) && 'needs mls-102034' }, () => {
  const source = readFileSync(PLATFORM, 'utf8');
  const block = /export type MdmScalarKind\s*=([^;]+);/u.exec(source)?.[1] ?? '';
  const platform = [...block.matchAll(/'([a-z]+)'/gu)].map(match => match[1]).sort();
  assert.ok(platform.length >= 9, `read ${platform.join(',')}`);
  assert.deepEqual(Object.keys(SCALAR_FORMS).sort(), platform);
});

void test('d1_346 s1: each scalar gives what fieldTs, postgresType and the seed gave before (number: NUMERIC, no longer INTEGER)', () => {
  const rows = Object.entries(SCALAR_FORMS).map(([name, form]) => `${name}:${form.ts}:${form.sql}:${form.seed}`);
  assert.deepEqual(rows, [
    'string:string:TEXT:string',
    'text:string:TEXT:string',
    'integer:number:INTEGER:integer',
    'number:number:NUMERIC:number',
    'money:string:TEXT:number',
    'boolean:boolean:BOOLEAN:boolean',
    'date:string:TEXT:string',
    'timestamp:string:TIMESTAMPTZ:timestamp',
    'uuid:string:TEXT:uuid',
  ]);
  for (const other of ['enum', 'object', 'record', 'json', 'toString', 'constructor', '']) assert.equal(scalarForm(other), undefined, other);
});
