/// <mls fileReference="_102021_/l2/agentDefsL1/flowContract.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createAgent } from '/_102021_/l2/agentDefsL1/agentDefsL1.js';
import {
  D1_CHILDREN_MAY_ADD_STEPS,
  D1_CHILDREN_MAY_CREATE_TASK,
  D1_FINALIZE_REPAIR,
  D1_FLOW_ID,
  D1_FLOW_STEP_IDS,
  D1_FLOW_VERSION,
  D1_IMPLEMENTED_STEP_IDS,
  D1_INTERACTION_CLEANER,
  D1_MAX_PARALLEL,
  D1_NEVER_DISPATCH,
  D1_PIPELINE_SCHEMA,
  D1_REPAIR_GLOBAL_MAX,
  D1_REPAIR_PER_UNIT,
  D1_STEP_DEPENDS_ON,
  successorUnlocked,
} from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { D1_STEP_HOOKS } from '/_102021_/l2/agentDefsL1/helpers/d1Dispatch.js';
import { PIPELINE_KEYS, PIPELINE_REQUIRED } from '/_102021_/l2/agentDefsL1/helpers/d1Schema.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');

interface FlowStep {
  id: string;
  kind: string;
  implemented: boolean;
  dependsOn: string[];
  doneAnchor: string;
  modelAlias?: string;
  artifact: string;
}

interface FlowDoc {
  flowId: string;
  schemaVersion: string;
  dynamicPlanIds: { doneAnchor: string; fanout: string; worker: string; repair: string };
  repair: { perUnit: number; globalMax: number; finalizeRepair: boolean };
  interactionCleanup: string;
  parallelism: { maxParallel: number; childrenNeverAddSteps: boolean; childrenNeverCreateTask: boolean };
  neverDispatch: string[];
  steps: FlowStep[];
}

function regexLine(source: string, name: string): string {
  const match = source.match(new RegExp(`const ${name} = (\\/.*\\/[a-z]*);`));
  assert.ok(match, `${name} not found`);
  return match[1];
}

void test('flow steps, anchors, repair and cleanup match the code', () => {
  const flow = JSON.parse(readFileSync(path.join(HERE, 'docs/flow.json'), 'utf8')) as FlowDoc;
  assert.equal(flow.flowId, D1_FLOW_ID);
  assert.equal(flow.schemaVersion, D1_FLOW_VERSION);
  assert.deepEqual(flow.steps.map(step => step.id), [...D1_FLOW_STEP_IDS]);
  assert.equal(flow.repair.perUnit, D1_REPAIR_PER_UNIT);
  assert.equal(flow.repair.globalMax, D1_REPAIR_GLOBAL_MAX);
  assert.equal(flow.repair.finalizeRepair, D1_FINALIZE_REPAIR);
  assert.equal(flow.interactionCleanup, D1_INTERACTION_CLEANER);
  assert.equal(flow.parallelism.maxParallel, D1_MAX_PARALLEL);
  assert.equal(flow.parallelism.childrenNeverAddSteps, !D1_CHILDREN_MAY_ADD_STEPS);
  assert.equal(flow.parallelism.childrenNeverCreateTask, !D1_CHILDREN_MAY_CREATE_TASK);
  assert.deepEqual(flow.neverDispatch, [...D1_NEVER_DISPATCH]);
  assert.equal(flow.dynamicPlanIds.doneAnchor, '{stepId}-done');
  assert.equal(flow.dynamicPlanIds.fanout, '{stepId}-fanout');
  assert.equal(flow.dynamicPlanIds.worker, '{stepId}-worker-{itemId}');
  assert.equal(flow.dynamicPlanIds.repair, '{stepId}-repair-{n}');

  for (const step of flow.steps) {
    assert.deepEqual(step.dependsOn, [...D1_STEP_DEPENDS_ON[step.id as keyof typeof D1_STEP_DEPENDS_ON]]);
    assert.equal(step.doneAnchor, `${step.id}-done`);
    assert.equal(step.dependsOn.some(dep => dep.includes('draft')), false, step.id);
    assert.equal(step.implemented, (D1_IMPLEMENTED_STEP_IDS as readonly string[]).includes(step.id));
    const folder = path.join(HERE, 'steps', step.id);
    assert.equal(existsSync(folder), step.implemented, step.id);
  }

  const anchors = new Set(['entry10-done']);
  assert.equal(successorUnlocked(flow.steps.find(step => step.id === 'input20')!.dependsOn, anchors), true);
  assert.equal(successorUnlocked(flow.steps.find(step => step.id === 'domain30')!.dependsOn, anchors), false);
  assert.equal(successorUnlocked(['drafts/input20.json'], anchors), false);
});

void test('candidate and rebuild spellings match the agents that already own those flags', () => {
  const core = readFileSync(path.join(HERE, 'helpers/d1Core.ts'), 'utf8');
  const planner = readFileSync(path.join(HERE, '../agentPlannerL1/helpers/p1Core.ts'), 'utf8');
  const ns5 = readFileSync(path.join(ROOT, 'mls-102035/l2/agentNewSolution5/helpers/ns5Core.ts'), 'utf8');
  assert.equal(regexLine(core, 'CANDIDATE_RE'), regexLine(planner, 'CANDIDATE_RE'));
  assert.equal(regexLine(core, 'REBUILD_ALL_RE'), regexLine(ns5, 'REBUILD_ALL_RE'));
});

void test('the pipeline schema is the document the writer enforces', () => {
  const schema = JSON.parse(readFileSync(path.join(HERE, 'schemas/pipeline-v1.schema.json'), 'utf8')) as {
    $id: string;
    additionalProperties: boolean;
    required: string[];
    properties: Record<string, unknown>;
  };
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.$id, `https://collab.codes/schemas/agentDefsL1/pipeline/${D1_PIPELINE_SCHEMA}`);
  assert.match(schema.$id, /^https:/);
  assert.deepEqual(schema.required, [...PIPELINE_REQUIRED]);
  assert.deepEqual(Object.keys(schema.properties), [...PIPELINE_KEYS]);
});

void test('implemented steps are registered, and only usecases50 calls a model', () => {
  createAgent();
  for (const id of D1_IMPLEMENTED_STEP_IDS) {
    assert.equal(typeof D1_STEP_HOOKS[id]?.beforePromptStep, 'function', id);
  }
  for (const id of D1_FLOW_STEP_IDS) {
    if ((D1_IMPLEMENTED_STEP_IDS as readonly string[]).includes(id)) continue;
    assert.equal(D1_STEP_HOOKS[id], undefined, id);
  }
  const llmSteps = new Set(['usecases50']);
  for (const id of D1_IMPLEMENTED_STEP_IDS) {
    const folder = path.join(HERE, 'steps', id);
    const names = readdirSync(folder);
    assert.equal(names.includes('prompt.md'), llmSteps.has(id), id);
    assert.equal(names.includes('gate.ts'), true, id);
    const agentFile = names.find(name => name.startsWith('agent') && name.endsWith('.ts') && !name.endsWith('.test.ts'));
    assert.ok(agentFile, id);
    const source = readFileSync(path.join(folder, agentFile), 'utf8');
    assert.equal(source.includes('add-message-ai'), false, id);
    assert.equal(source.includes('prompt_ready'), llmSteps.has(id), id);
    assert.equal(source.includes('agentChangeBackend'), false, id);
    assert.equal(source.includes('agentChangeFrontend'), false, id);
    assert.equal(source.includes('agentCbMaterialize'), false, id);
  }
});
