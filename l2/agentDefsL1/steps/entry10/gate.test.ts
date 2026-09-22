/// <mls fileReference="_102021_/l2/agentDefsL1/steps/entry10/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { createEntryPipeline, displayPath, pipelineFile } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { decideEntry } from '/_102021_/l2/agentDefsL1/steps/entry10/gate.js';

const AT = new Date('2026-09-21T12:00:00.000Z');
const PROJECT = 102047;
const MODULE = 'agendaClinica';

void test('a missing checkpoint is recorded on run and refused on resume', () => {
  const run = decideEntry('run', PROJECT, MODULE, null, AT);
  assert.equal(run.kind, 'record');
  if (run.kind !== 'record') return;
  assert.equal(run.state.project, PROJECT);
  assert.equal(run.state.moduleName, MODULE);
  assert.equal(run.state.steps.entry10?.status, 'approved');
  assert.equal(run.state.steps.input20, undefined);
  const resume = decideEntry('resume', PROJECT, MODULE, null, AT);
  assert.equal(resume.kind, 'refusal');
  if (resume.kind === 'refusal') assert.match(resume.refusal, /No checkpoint to resume for agendaClinica in project 102047/);
});

void test('an intact checkpoint is kept and a draft key does not unlock a step', () => {
  const state = createEntryPipeline(PROJECT, MODULE, AT);
  const raw = `${JSON.stringify(state, null, 2)}\n`;
  assert.equal(decideEntry('resume', PROJECT, MODULE, raw, AT).kind, 'keep');
  assert.equal(decideEntry('run', PROJECT, MODULE, raw, AT).kind, 'keep');
  assert.equal(state.steps.input20, undefined);

  const otherProject = decideEntry('resume', 102046, MODULE, raw, AT);
  assert.equal(otherProject.kind, 'refusal');

  const drafted = {
    ...state,
    steps: {
      ...state.steps,
      'input20-draft': { status: 'approved', updatedAt: AT.toISOString() },
    },
  };
  const rejected = decideEntry('run', PROJECT, MODULE, `${JSON.stringify(drafted)}\n`, AT);
  assert.equal(rejected.kind, 'refusal');
  assert.equal(displayPath(pipelineFile(PROJECT, MODULE)).includes(String(PROJECT)), true);
});

void test('a foreign document is a conflict and is not treated as success', () => {
  const decision = decideEntry('run', PROJECT, MODULE, '{"hello":1}\n', AT);
  assert.equal(decision.kind, 'refusal');
  if (decision.kind === 'refusal') {
    assert.match(decision.refusal, /conflicts with this run/);
    assert.doesNotMatch(decision.refusal, /not implemented yet|success/i);
  }
});
