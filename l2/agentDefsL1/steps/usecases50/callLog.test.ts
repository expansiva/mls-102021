/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/callLog.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { writeJson } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { installStudio } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import {
  CALL_UNREADABLE,
  accountCalls,
  callsFolder,
  openCallDispatch,
  openCallResume,
  readCallLog,
  recordCallEvent,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/callLog.js';

const PROJECT = 102021;
const MODULE = 'callLogProbe';

void test('a second receipt for the same plan is not a second reply, and an absent payload is not one', async () => {
  installStudio(PROJECT);
  await openCallDispatch(PROJECT, MODULE);
  await recordCallEvent(PROJECT, MODULE, {
    kind: 'prompt_assembled',
    usecaseId: 'listConsulta',
    planId: 'usecases50-worker-listConsulta',
    unitAttempts: 0,
  });
  await recordCallEvent(PROJECT, MODULE, {
    kind: 'reply_absent',
    usecaseId: 'listConsulta',
    planId: 'usecases50-worker-listConsulta',
    unitAttempts: 0,
  });
  const before = accountCalls(await readCallLog(PROJECT, MODULE));
  assert.equal(before.promptsAssembled, 1);
  assert.equal(before.repliesDelivered, 0);
  await recordCallEvent(PROJECT, MODULE, {
    kind: 'reply_delivered',
    usecaseId: 'listConsulta',
    planId: 'usecases50-worker-listConsulta',
    unitAttempts: 0,
  });
  await recordCallEvent(PROJECT, MODULE, {
    kind: 'reply_delivered',
    usecaseId: 'listConsulta',
    planId: 'usecases50-worker-listConsulta',
    unitAttempts: 4,
  });
  const after = accountCalls(await readCallLog(PROJECT, MODULE));
  assert.equal(after.repliesDelivered, 1);
  assert.equal(after.invocationReplies, 1);
  const reply = (await readCallLog(PROJECT, MODULE))?.events.find(event => event.kind === 'reply_delivered');
  assert.equal(reply?.unitAttempts, 0);
  assert.notEqual(after.repliesDelivered, reply?.unitAttempts);
});

void test('an unreadable file keeps the total unknown', async () => {
  installStudio(PROJECT);
  await openCallDispatch(PROJECT, MODULE);
  await recordCallEvent(PROJECT, MODULE, {
    kind: 'reply_delivered',
    usecaseId: 'listConsulta',
    planId: 'usecases50-worker-listConsulta',
    unitAttempts: 0,
  });
  await writeJson({
    project: PROJECT,
    level: 1,
    folder: callsFolder(MODULE),
    shortName: 'i1-reply-broken',
    extension: '.json',
  }, { kind: 'reply_delivered' });
  const account = accountCalls(await readCallLog(PROJECT, MODULE));
  assert.equal(account.repliesDelivered, null);
  assert.equal(account.repliesUnknown, CALL_UNREADABLE);
  assert.equal(account.promptsAssembled, null);
  assert.equal(account.invocationReplies, null);
});

void test('resume with no observations does not invent a generation total', async () => {
  installStudio(PROJECT);
  await openCallResume(PROJECT, MODULE);
  const account = accountCalls(await readCallLog(PROJECT, MODULE));
  assert.equal(account.repliesDelivered, null);
  assert.match(account.repliesUnknown, /history is absent/);
  assert.equal(account.invocationReplies, 0);
  assert.equal(account.finalizeCalledModel, false);
  assert.equal(account.finalizeOpenedRepair, false);
});
