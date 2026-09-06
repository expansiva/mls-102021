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
  cbNochainSuppressedNote,
  decideCbFastHandoff,
  hasCbFastHandoff,
  isCbFastMode,
  isCbNochainMode,
  sendCbFastHandoff,
} from './cbFastHandoff.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

test('CB /fast success emits the changeFrontend intent once; other cases emit nothing', () => {
  assert.equal(isCbFastMode({ fastMode: 'true' }), true);
  assert.equal(isCbFastMode({}), false);
  assert.equal(isCbNochainMode({ nochainMode: 'true' }), true);
  assert.equal(isCbNochainMode({ fastMode: 'true' }), false);
  assert.equal(
    buildCbChangeFrontendHandoffMessage('petShop'),
    '@@agentChangeFrontend /fast /rebuild all petShop',
  );
  assert.deepEqual(
    decideCbFastHandoff({ fast: true, nochain: false, success: true, alreadyDispatched: false, moduleName: 'petShop' }),
    { dispatch: true, message: '@@agentChangeFrontend /fast /rebuild all petShop', suppressed: false },
  );
  assert.deepEqual(
    decideCbFastHandoff({ fast: false, nochain: false, success: true, alreadyDispatched: false, moduleName: 'petShop' }),
    { dispatch: false, message: '', suppressed: false },
  );
  assert.deepEqual(
    decideCbFastHandoff({ fast: true, nochain: false, success: false, alreadyDispatched: false, moduleName: 'petShop' }),
    { dispatch: false, message: '', suppressed: false },
  );
  assert.deepEqual(
    decideCbFastHandoff({ fast: true, nochain: false, success: true, alreadyDispatched: true, moduleName: 'petShop' }),
    { dispatch: false, message: '', suppressed: false },
  );
});

test('CB /fast /nochain suppresses the handoff and names the next command', () => {
  assert.deepEqual(
    decideCbFastHandoff({ fast: true, nochain: true, success: true, alreadyDispatched: false, moduleName: 'petShop' }),
    { dispatch: false, message: '@@agentChangeFrontend /rebuild all petShop', suppressed: true },
  );
  assert.equal(
    cbNochainSuppressedNote('petShop'),
    'handoff: suppressed by /nochain — next: @@agentChangeFrontend /rebuild all petShop',
  );
  assert.deepEqual(
    decideCbFastHandoff({ fast: false, nochain: true, success: true, alreadyDispatched: false, moduleName: 'petShop' }),
    { dispatch: false, message: '', suppressed: false },
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
  const root = readFileSync(path.join(HERE, '..', 'agentChangeBackend.ts'), 'utf8');
  assert.match(root, /nochainMode: 'true'/);
  const src = readFileSync(path.join(HERE, '..', 'steps', 'finalize', 'agentCbFinalSummary.ts'), 'utf8');
  assert.match(src, /decideCbFastHandoff/);
  assert.match(src, /sendCbFastHandoff/);
  assert.match(src, /isCbNochainMode/);
  assert.match(src, /cbNochainSuppressedNote/);
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
