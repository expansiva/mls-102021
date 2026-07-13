/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeRepairMutation } from './cbRepairLock.js';

test('serializeRepairMutation preserves every concurrent read-modify-write', async () => {
  let repairTargets: string[] = [];
  await Promise.all(Array.from({ length: 12 }, (_, index) => serializeRepairMutation(async () => {
    const snapshot = repairTargets;
    await Promise.resolve(); // force the same interleaving as parallel worker persistence
    repairTargets = [...snapshot, `component-${index}`];
  })));

  assert.deepEqual(repairTargets.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), Array.from({ length: 12 }, (_, index) => `component-${index}`));
});
