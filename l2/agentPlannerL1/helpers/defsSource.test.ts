/// <mls fileReference="_102021_/l2/agentPlannerL1/helpers/defsSource.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { classifyEntityKind } from '/_102021_/l2/agentPlannerL1/helpers/defsSource.js';

void test('kind external stays external with no storage', () => {
  assert.equal(classifyEntityKind({ kind: 'external' }), 'external');
  assert.equal(classifyEntityKind({ kind: 'external' }, false), 'external');
  assert.equal(classifyEntityKind({ kind: 'external', storage: { target: 'moduleDatabase' } }), 'external');
  assert.notEqual(classifyEntityKind({ kind: 'external' }), 'core');
  assert.notEqual(classifyEntityKind({ kind: 'external' }), 'metric');
});
