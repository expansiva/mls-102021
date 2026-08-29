/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbFastHandoff.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CB_FAST_HANDOFF_PLAN_ID,
  buildCbChangeFrontendHandoffMessage,
  decideCbFastHandoff,
  hasCbFastHandoff,
  isCbFastMode,
} from './cbFastHandoff.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

test('CB /fast success emits the changeFrontend intent once; other cases emit nothing', () => {
  assert.equal(isCbFastMode({ fastMode: 'true' }), true);
  assert.equal(isCbFastMode({}), false);
  assert.equal(
    buildCbChangeFrontendHandoffMessage('petShop'),
    '@@agentChangeFrontend /fast /rebuild all petShop',
  );
  assert.deepEqual(
    decideCbFastHandoff({ fast: true, success: true, alreadyDispatched: false, moduleName: 'petShop' }),
    { dispatch: true, message: '@@agentChangeFrontend /fast /rebuild all petShop' },
  );
  assert.deepEqual(
    decideCbFastHandoff({ fast: false, success: true, alreadyDispatched: false, moduleName: 'petShop' }),
    { dispatch: false, message: '' },
  );
  assert.deepEqual(
    decideCbFastHandoff({ fast: true, success: false, alreadyDispatched: false, moduleName: 'petShop' }),
    { dispatch: false, message: '' },
  );
  assert.deepEqual(
    decideCbFastHandoff({ fast: true, success: true, alreadyDispatched: true, moduleName: 'petShop' }),
    { dispatch: false, message: '' },
  );
});

test('hasCbFastHandoff sees the recorded result step and ignores other steps', () => {
  assert.equal(hasCbFastHandoff(undefined), false);
  assert.equal(hasCbFastHandoff([{ planning: { planId: 'cb-final-summary' }, nextSteps: [] }]), false);
  assert.equal(hasCbFastHandoff([{
    planning: { planId: 'cb-final-summary' },
    nextSteps: [{ planning: { planId: CB_FAST_HANDOFF_PLAN_ID } }],
  }]), true);
});

test('final summary wires the /fast handoff and records the plan id', () => {
  const src = readFileSync(path.join(HERE, '..', 'steps', 'finalize', 'agentCbFinalSummary.ts'), 'utf8');
  assert.match(src, /decideCbFastHandoff/);
  assert.match(src, /CB_FAST_HANDOFF_PLAN_ID/);
  assert.equal(CB_FAST_HANDOFF_PLAN_ID, 'fast-handoff-changeFrontend');
});
