/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/arrivalFixture.test.ts" enhancement="_blank"/>

// d1_232 s0: the 7 cases of the arrival that says its effect per entity (and the one that writes nothing), as a fixture. This test fixes what the
// single reader (`ns5ArrivalEffects`) gives for the line of today and for the new form, so s1 starts from known pairs.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ns5ArrivalEffects, type Ns5ArrivalEffectsItem } from '/_102035_/l2/solution/arrivalEffects.js';

interface Case {
  name: string;
  kind: 'inbound' | 'serve';
  today: Ns5ArrivalEffectsItem;
  entityEffects: Array<{ entityId: string; effects: string[] }>;
  expect: { usecases: string[]; portOperations: Record<string, string[]> };
}

const FIXTURE = JSON.parse(readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/arrivalEffects.recorded.json'), 'utf8')) as { cases: Case[] };

void test('d1_232 s0: the fixture has the 7 cases and the one that writes nothing', () => {
  assert.equal(FIXTURE.cases.length, 8);
  assert.deepEqual(FIXTURE.cases.map(item => item.kind), ['serve', 'serve', 'inbound', 'inbound', 'inbound', 'inbound', 'serve', 'inbound']);
});

void test('d1_232 s0: the reader gives the new form as written, and the line of today as one effect for every entity', () => {
  for (const item of FIXTURE.cases) {
    assert.deepEqual(ns5ArrivalEffects({ entityEffects: item.entityEffects }, item.kind), item.entityEffects, item.name);
    const old = ns5ArrivalEffects(item.today, item.kind);
    const effect = item.today.effect as string;
    assert.deepEqual(old, (item.kind === 'inbound' ? item.today.writes : item.today.entityRefs)!.map(entityId => ({ entityId, effects: [effect] })), item.name);
  }
});

void test('d1_232 s0: the new form only adds an effect to the entity the line already named (nothing else moves)', () => {
  for (const item of FIXTURE.cases) {
    const before = ns5ArrivalEffects(item.today, item.kind);
    const after = ns5ArrivalEffects({ entityEffects: item.entityEffects }, item.kind);
    if (before.length === 0) { assert.deepEqual(after, [], item.name); continue; }
    assert.deepEqual(after.map(entry => entry.entityId), before.map(entry => entry.entityId), item.name);
    for (const entry of after) {
      const prior = before.find(row => row.entityId === entry.entityId)!;
      for (const effect of prior.effects) assert.equal(entry.effects.includes(effect as never), true, `${item.name}: ${entry.entityId} keeps ${effect}`);
    }
  }
});
