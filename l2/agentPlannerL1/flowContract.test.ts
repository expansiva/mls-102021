/// <mls fileReference="_102021_/l2/agentPlannerL1/flowContract.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { P1_STEP_HOOKS } from '/_102021_/l2/agentPlannerL1/helpers/p1Dispatch.js';
import {
  P1_FLOW_ID,
  P1_FLOW_LAST_STEP_ID,
  P1_FLOW_STEP_IDS,
  P1_FLOW_VERSION,
  P1_STEP_DEPENDS_ON,
} from '/_102021_/l2/agentPlannerL1/helpers/p1Core.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FLOW_PATH = path.join(HERE, 'docs/flow.json');
const STEPS_ROOT = path.join(HERE, 'steps');

interface FlowStep {
  id: string;
  kind: string;
  status?: string;
  dependsOn: string[];
  doneAnchor: string;
  modelAlias?: string;
  artifact: string;
}

interface FlowDoc {
  flowId: string;
  schemaVersion: string;
  artifacts: Record<string, string>;
  steps: FlowStep[];
}

const EXPECTED_ARTIFACTS: Record<string, string> = {
  pipeline: 'l1/{module}/pipeline/pipeline.json',
  needs: 'l4/{module}/pool/l1/web/needs.json',
  backend: 'l4/{module}/pool/l2/web/backend.json',
};

const WAITING_STEPS: readonly string[] = [];

function loadFlow(): FlowDoc {
  return JSON.parse(readFileSync(FLOW_PATH, 'utf8')) as FlowDoc;
}

void test('flow has exactly two steps in declared order with declared dependencies', () => {
  const flow = loadFlow();
  assert.equal(flow.flowId, P1_FLOW_ID);
  assert.equal(flow.schemaVersion, P1_FLOW_VERSION);
  assert.equal(flow.steps.length, 2);
  assert.deepEqual(flow.steps.map(step => step.id), [...P1_FLOW_STEP_IDS]);

  for (const step of flow.steps) {
    assert.deepEqual(step.dependsOn, [...P1_STEP_DEPENDS_ON[step.id as keyof typeof P1_STEP_DEPENDS_ON]]);
    assert.equal(step.doneAnchor, `${step.id}-done`);
    assert.ok(step.artifact, `${step.id} missing artifact`);
  }

  const entry = flow.steps.find(step => step.id === 'entry10');
  assert.equal(entry?.kind, 'deterministic');
  assert.equal(entry?.modelAlias, undefined);
  assert.equal(entry?.status, undefined);

  const plan = flow.steps.find(step => step.id === 'plan20');
  assert.equal(plan?.kind, 'agent-checkpoint');
  assert.equal(plan?.modelAlias, 'reasoning');
  assert.equal(plan?.status, undefined);
  assert.equal(plan?.artifact, 'l4/{module}/pool/l2/web/backend.json');

  for (const id of WAITING_STEPS) {
    const step = flow.steps.find(item => item.id === id);
    assert.equal(step?.status, 'waiting', `${id} must stay declared as waiting until its spec lands`);
  }
});

void test('flow artifacts match the l1 table', () => {
  const flow = loadFlow();
  assert.deepEqual(flow.artifacts, EXPECTED_ARTIFACTS);
});

void test('each step folder that exists implements beforePromptStep and is on the dispatch table', async () => {
  if (!existsSync(STEPS_ROOT)) return;
  for (const stepId of P1_FLOW_STEP_IDS) {
    const folder = path.join(STEPS_ROOT, stepId);
    if (!existsSync(folder)) continue;
    const agentFiles = readdirSync(folder).filter(name => /^agentP1\w+\.ts$/.test(name) && !name.endsWith('.test.ts'));
    assert.ok(agentFiles.length > 0, `${stepId} has a folder but no agentP1*.ts`);
    const source = readFileSync(path.join(folder, agentFiles[0]), 'utf8');
    assert.match(source, /export async function beforeP1\w+PromptStep/, `${agentFiles[0]} must export beforePromptStep`);
    await import(`/_102021_/l2/agentPlannerL1/steps/${stepId}/${agentFiles[0].replace(/\.ts$/, '.js')}`);
    assert.equal(typeof P1_STEP_HOOKS[stepId]?.beforePromptStep, 'function', `${stepId} folder exists but is missing from P1_STEP_HOOKS`);
  }
});

void test('waiting steps have no folder yet', () => {
  for (const id of WAITING_STEPS) {
    assert.equal(existsSync(path.join(STEPS_ROOT, id)), false, `${id} folder must wait for its spec`);
  }
});

function agentSourceOf(stepId: string): string {
  const folder = path.join(STEPS_ROOT, stepId);
  const agentFiles = readdirSync(folder).filter(name => /^agentP1\w+\.ts$/.test(name) && !name.endsWith('.test.ts'));
  assert.ok(agentFiles.length > 0, `${stepId} has no agentP1*.ts`);
  return readFileSync(path.join(folder, agentFiles[0]), 'utf8');
}

void test('entry10 does not close the pipeline; plan20 does', () => {
  const flow = loadFlow();
  const last = flow.steps[flow.steps.length - 1];
  assert.ok(last, 'flow.json has no steps');
  assert.equal(last.id, P1_FLOW_LAST_STEP_ID);
  assert.equal(last.status, undefined);
  assert.doesNotMatch(agentSourceOf('entry10'), /markP1Complete/, 'entry10 must not close the pipeline');
  assert.match(agentSourceOf('plan20'), /markP1Complete/, 'plan20 closes the pipeline');
});
