/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/columnNullable.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { columnNullable } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';

const PRIMARY = ['id', 'writtenAt'];
const UNIQUE = [['botId', 'direction', 'telegramMessageId', 'writtenAt'], ['botId', 'direction', 'cmRequestReference', 'writtenAt']];

void test('d1_339: a column of a unique key that the l4 leaves optional is nullable; the primary key, the time column and what the l4 requires stay NOT NULL', () => {
  const optional = new Set(['telegramMessageId', 'cmRequestReference']);
  const of = (name: string) => columnNullable(name, PRIMARY, UNIQUE, 'writtenAt', optional);
  assert.equal(of('telegramMessageId'), true, 'optional in the l4, in a unique key');
  assert.equal(of('cmRequestReference'), true);
  assert.equal(of('botId'), false, 'in a unique key and required by the l4');
  assert.equal(of('direction'), false);
  assert.equal(of('id'), false, 'primary key');
  assert.equal(of('writtenAt'), false, 'primary key and time column');
  assert.equal(of('anyOtherColumn'), true, 'a column outside every unique key is nullable, as before');
});

void test('d1_339: the time column of a series is NOT NULL even when it is in a unique key only and the l4 does not require it; without the l4 the old rule stays', () => {
  assert.equal(columnNullable('at', ['id'], [['id', 'at']], 'at', new Set(['at'])), false);
  assert.equal(columnNullable('ref', ['id'], [['ref']], '', new Set(['ref'])), true);
  for (const unread of [null, undefined]) assert.equal(columnNullable('ref', ['id'], [['ref']], '', unread), false, 'the l4 was not read: a unique key column is NOT NULL, as it was');
});
