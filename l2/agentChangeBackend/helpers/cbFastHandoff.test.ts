/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbFastHandoff.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CB_FAST_HANDOFF_PLAN_ID,
  CB_FAST_HANDOFF_MARK_SHORT,
  buildCbChangeFrontendHandoffMessage,
  decideCbFastHandoff,
  hasCbFastHandoff,
  isCbFastMode,
  sendCbFastHandoff,
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

test('final summary wires the /fast handoff without hanging a step on a completed parent', () => {
  const src = readFileSync(path.join(HERE, '..', 'steps', 'finalize', 'agentCbFinalSummary.ts'), 'utf8');
  assert.match(src, /decideCbFastHandoff/);
  assert.match(src, /sendCbFastHandoff/);
  assert.match(src, /writeCbFastHandoffMark/);
  assert.doesNotMatch(src, /createAddStepIntent/);
  assert.equal(CB_FAST_HANDOFF_PLAN_ID, 'fast-handoff-changeFrontend');
  assert.equal(CB_FAST_HANDOFF_MARK_SHORT, 'fast-handoff');
});

test('a throwing handoff send degrades and never throws', async () => {
  const result = await sendCbFastHandoff({
    threadId: 't1',
    message: '@@agentChangeFrontend /fast /rebuild all petShop',
    send: async () => { throw new Error('Parent step cannot be modified'); },
    persist: async () => { throw new Error('must not persist after send failure'); },
  });
  assert.equal(result.dispatched, false);
  assert.equal(result.degradation?.kind, 'fast-handoff-dispatch');
  assert.match(result.note, /DISPATCH FAILED/);
  assert.match(result.note, /re-send manually: @@agentChangeFrontend \/fast \/rebuild all petShop/);
});
