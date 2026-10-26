/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/guard.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  checkAfterDefs,
  generatorGateReasons,
  parsePortrait,
  snapshotOf,
} from '/_102021_/l2/agentNewReleaseL1/helpers/guard.js';

const REQUEST = 'l1/mod/layer_2_application/requests/page.defs.ts';
const CONTROLLER = 'l1/mod/layer_1_external/adapters/http/controllers/page.defs.ts';
const OTHER = 'l1/mod/layer_2_application/usecases/otherPage.defs.ts';

test('the lock keeps a change inside the allow-list and reports one outside', async () => {
  const before = await snapshotOf({
    [REQUEST]: 'request-before',
    [OTHER]: 'other-before',
    'l1/mod/pipeline/drafts/x.defs.ts': 'pipeline',
    'l1/mod/materialization/out.defs.ts': 'materialized',
    'l1/mod/readme.md': 'not a def',
  });
  assert.equal(before['l1/mod/pipeline/drafts/x.defs.ts'], undefined);
  assert.equal(before['l1/mod/materialization/out.defs.ts'], undefined);
  assert.equal(before['l1/mod/readme.md'], undefined);
  assert.equal(typeof before[REQUEST], 'string');

  const after = await snapshotOf({
    [REQUEST]: 'request-after',
    [CONTROLLER]: 'controller-new',
    [OTHER]: 'other-after',
  });
  const check = checkAfterDefs(before, after, [REQUEST, CONTROLLER]);
  assert.deepEqual(check.changed, [CONTROLLER, OTHER, REQUEST].sort());
  assert.deepEqual(check.outside, [OTHER]);
});

test('the portrait envelope keeps the def map and a flat map is the older version', () => {
  const current = parsePortrait({
    defs: { [REQUEST]: 'abc' },
    generator: { pipelineUpdatedAt: '2026-10-26T12:00:00.000Z' },
  });
  assert.equal(current.ok, true);
  if (!current.ok) return;
  assert.equal(current.portrait.defs[REQUEST], 'abc');
  assert.equal(current.portrait.generator.pipelineUpdatedAt, '2026-10-26T12:00:00.000Z');
  assert.deepEqual(current.portrait.generator.allowed, []);
  const listed = parsePortrait({
    defs: { [REQUEST]: 'abc' },
    generator: { pipelineUpdatedAt: '2026-10-26T12:00:00.000Z', allowed: [REQUEST, CONTROLLER] },
  });
  assert.equal(listed.ok, true);
  if (!listed.ok) return;
  assert.deepEqual(listed.portrait.generator.allowed, [REQUEST, CONTROLLER]);
  assert.equal(parsePortrait({ [REQUEST]: 'abc' }).ok, false);
  assert.throws(() => parsePortrait(null), /snapshot is not a path map/u);
});

test('the generator gate names a held release, a pipeline that is not complete, and a finalize that is not after the portrait', () => {
  const held = generatorGateReasons({
    pipeline: completePipeline('2026-10-26T18:00:00.000Z'),
    input20: {
      consumersReleased: false,
      problems: [
        { severity: 'error', code: 'DONE_ABSENT', ownerRef: 'tarefa' },
        { severity: 'error', code: 'DONE_ABSENT', ownerRef: 'outra' },
        { severity: 'warning', code: 'NOTE' },
      ],
    },
    pipelineUpdatedAt: '2026-10-26T12:00:00.000Z',
  });
  assert.deepEqual(held, ['the defs generator did not release the consumer phases (DONE_ABSENT:2 (tarefa, outra))']);

  const missing = generatorGateReasons({ pipeline: null, input20: null, pipelineUpdatedAt: '' });
  assert.deepEqual(missing, [
    'the defs generator did not release the consumer phases',
    'the generator pipeline is missing',
    'the generator did not finish after the portrait',
  ]);

  const stale = generatorGateReasons({
    pipeline: { status: 'complete', steps: { finalize80: { status: 'approved', updatedAt: '2026-10-26T12:00:00.000Z' } } },
    input20: { consumersReleased: true, problems: [] },
    pipelineUpdatedAt: '2026-10-26T12:00:00.000Z',
  });
  assert.deepEqual(stale, ['the generator did not finish after the portrait']);

  const open = generatorGateReasons({
    pipeline: { status: 'awaitingStep', steps: { finalize80: { status: 'approved', updatedAt: '2026-10-26T18:00:00.000Z' } } },
    input20: { consumersReleased: true },
    pipelineUpdatedAt: '2026-10-26T12:00:00.000Z',
  });
  assert.deepEqual(open, ['the generator pipeline is awaitingStep']);
});

function completePipeline(finalizeAt: string): unknown {
  return { status: 'complete', steps: { finalize80: { status: 'approved', updatedAt: finalizeAt } } };
}

test('a deleted product def outside the allow-list is outside', async () => {
  const before = await snapshotOf({ [OTHER]: 'gone', [REQUEST]: 'same' });
  const after = await snapshotOf({ [REQUEST]: 'same' });
  const check = checkAfterDefs(before, after, [REQUEST]);
  assert.deepEqual(check.changed, [OTHER]);
  assert.deepEqual(check.outside, [OTHER]);
});
