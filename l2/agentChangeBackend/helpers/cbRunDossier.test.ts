/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbRunDossier.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { collectRunStepRecords } from '/_102021_/l2/agentChangeBackend/helpers/cbRunDossier.js';

test('collectRunStepRecords walks nextSteps and payload and keeps the last trace line', () => {
  const records = collectRunStepRecords([
    {
      stepId: 1, type: 'agent', stepTitle: 'Validate l1 artifacts', status: 'completed', agentName: 'agentCbValidateAll',
      interaction: { trace: ['start', 'compile 132 files'], payload: [
        { stepId: 2, type: 'agent', stepTitle: 'Materialize', status: 'completed', agentName: 'agentCbMaterialize', interaction: { trace: ['Agent build: 102021@abc'] } },
      ] },
      nextSteps: [
        { stepId: 3, type: 'agent', stepTitle: 'Summary', status: 'in_progress', agentName: 'agentCbFinalSummary' },
      ],
    },
  ]);
  assert.equal(records.length, 3);
  assert.equal(records[0].lastTrace, 'compile 132 files');
  const materialize = records.find(r => r.title === 'Materialize');
  const summary = records.find(r => r.title === 'Summary');
  assert.equal(materialize?.lastTrace, 'Agent build: 102021@abc');
  assert.equal(summary?.lastTrace, undefined);
});
