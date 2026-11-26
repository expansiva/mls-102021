/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/adapterShape.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { adapterShape } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';

const FIELDS = ['id', 'details.accessKey', 'details.lastCheck.checkedAt', 'details.lastCheck.result', 'details.pause.reason', 'details.parts', 'details.base.name'];

void test('d1_325: the adapter brings back only the objects the entity requires (and the details container); an optional object stays absent; a collection is [] when absent', () => {
  const optional = new Set(['details.lastCheck', 'details.pause']);
  const shape = adapterShape(FIELDS, optional, new Set(['details.parts']));
  assert.deepEqual(shape.objects, ['details', 'details.base']);
  assert.deepEqual(shape.collections, ['details.parts']);
});

void test('d1_325: with the l4 unreadable every parent object comes back, as before; a collection path is never an object', () => {
  const shape = adapterShape(['details.parts.sequence', 'details.x.y'], null, new Set(['details.parts']));
  assert.deepEqual(shape.objects, ['details', 'details.x']);
});
