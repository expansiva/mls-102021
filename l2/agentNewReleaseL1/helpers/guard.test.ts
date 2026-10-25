/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/guard.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { checkAfterDefs, snapshotOf } from '/_102021_/l2/agentNewReleaseL1/helpers/guard.js';

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

test('a deleted product def outside the allow-list is outside', async () => {
  const before = await snapshotOf({ [OTHER]: 'gone', [REQUEST]: 'same' });
  const after = await snapshotOf({ [REQUEST]: 'same' });
  const check = checkAfterDefs(before, after, [REQUEST]);
  assert.deepEqual(check.changed, [OTHER]);
  assert.deepEqual(check.outside, [OTHER]);
});
