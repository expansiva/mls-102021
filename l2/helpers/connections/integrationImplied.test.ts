/// <mls fileReference="_102021_/l2/helpers/connections/integrationImplied.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { integrationImplied, operationMatchesEffect, operationsOfEffect } from '/_102021_/l2/helpers/connections/integrationImplied.js';

void test('d1_259: an effect of the L4 stands for the usecase operation it names', () => {
  assert.deepEqual(operationsOfEffect('read'), ['get']);
  assert.deepEqual(operationsOfEffect('remove'), ['delete']);
  assert.deepEqual(operationsOfEffect('update'), ['update']);
  assert.deepEqual(operationsOfEffect(''), []);
  assert.equal(operationMatchesEffect('get', 'read'), true);
  assert.equal(operationMatchesEffect('delete', 'remove'), true);
  assert.equal(operationMatchesEffect('list', 'list'), true);
  assert.equal(operationMatchesEffect('get', 'list'), false);
});

void test('d1_259: the integration implies what its calls and serves name, and nothing else', () => {
  const implied = integrationImplied([
    { connectionId: 'cm', operationId: 'readAgent', direction: 'call', effect: 'read', entityRefs: ['Agent', 'AgentBehavior'] },
    { connectionId: 'platform', operationId: 'releaseCatalogChanged', direction: 'serve', entityEffects: [{ entityId: 'Tool', effects: ['create', 'update'] }] },
    { connectionId: 'cm', operationId: 'nothing', direction: 'call' },
    { connectionId: 'cm', operationId: 'odd', direction: 'other', effect: 'read', entityRefs: ['X'] },
    'not a row',
  ]);
  assert.deepEqual(implied.map(item => `${item.direction} ${item.entity}.${item.operation} via ${item.via}`), [
    'call Agent.get via cm.readAgent',
    'call AgentBehavior.get via cm.readAgent',
    'serve Tool.create via platform.releaseCatalogChanged',
    'serve Tool.update via platform.releaseCatalogChanged',
  ]);
  assert.deepEqual(integrationImplied([]), []);
});
