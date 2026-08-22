/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbLocalStepTitle.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { localStepTitle, startLocalStepTick } from '/_102021_/l2/agentChangeBackend/helpers/cbLocalStepTitle.js';

test('localStepTitle and startLocalStepTick are no-ops without a task PK and without window', () => {
  const step = { stepId: 4 };
  const context = { task: undefined } as unknown as mls.msg.ExecutionContext;
  assert.doesNotThrow(() => localStepTitle(context, step, 'x'));
  const stop = startLocalStepTick(context, step, (sec) => `${sec}s`);
  assert.doesNotThrow(() => stop());

  const withPk = { task: { PK: 'task/1' } } as unknown as mls.msg.ExecutionContext;
  assert.doesNotThrow(() => localStepTitle(withPk, step, 'compiling'));
  assert.doesNotThrow(() => startLocalStepTick(withPk, step, (sec) => `${sec}s`)());
});
