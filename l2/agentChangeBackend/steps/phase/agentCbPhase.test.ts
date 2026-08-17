/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/phase/agentCbPhase.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CB_PHASES } from '/_102021_/l2/agentChangeBackend/helpers/cbScope.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AGENT_ROOT = path.join(HERE, '..', '..');

// A run used to append ~44 technical steps flat at the task root. The engine groups for free when a
// step is created under a phase step; only the phase TRANSITIONS need to know about phases.
void test('the phase opens with its first step inside it, never empty', () => {
  const src = readFileSync(path.join(HERE, 'agentCbPhase.ts'), 'utf8');
  // The child hangs from the phase step itself — that is what makes it a branch.
  assert.match(src, /createAddStepIntent\(context, step, child\)/);
  // No LLM and no afterPrompt: a phase is structure, not work.
  assert.doesNotMatch(src, /createPromptReadyIntent|afterPromptStep/);
});

void test('a phase is created lazily, under the root, and reused while it is open', () => {
  const shared = readFileSync(path.join(AGENT_ROOT, 'helpers', 'cbShared.ts'), 'utf8');
  // Reuse: an OPEN phase receives the next step; a completed one would throw on add.
  assert.match(shared, /const open = findOpenStepByPlanId\(context, phasePlanId\)/);
  assert.match(shared, /step\.status !== 'completed' && step\.status !== 'failed'/);
  // Creation: the phase belongs to the run, so it hangs from the task root (stepId 1) with its first
  // child inside — never pre-created empty (a completed empty phase makes every later child throw).
  assert.match(shared, /parentStepId: 1, step: phaseStep/);
  assert.match(shared, /\{ planId: phasePlanId, first: child \}/);
});

void test('every phase transition of the pipeline names its phase', () => {
  const stepsRoot = path.join(AGENT_ROOT, 'steps');
  const sources = readdirSync(stepsRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .flatMap(entry => readdirSync(path.join(stepsRoot, entry.name))
      .filter(name => name.endsWith('.ts') && !name.endsWith('.test.ts'))
      .map(name => readFileSync(path.join(stepsRoot, entry.name, name), 'utf8')))
    .join('\n');
  const bootstrap = readFileSync(path.join(AGENT_ROOT, 'agentChangeBackend.ts'), 'utf8');

  // The run opens inside its first phase.
  assert.match(bootstrap, /CB_PHASES\.preparation/);
  assert.match(bootstrap, /'agentCbPhase'/);
  // Each downstream phase is entered by a transition (the steps INSIDE a phase keep enqueueNext:
  // their parent already is the phase).
  for (const phase of ['generation', 'materialization', 'seeds', 'finalization'] as const) {
    assert.ok(new RegExp(`enqueueNextInPhase\\(context, step, '${phase}'`).test(sources)
      || new RegExp(`\\? '${phase}' :|: '${phase}',`).test(sources), `no transition into ${phase}`);
  }
  // The judge phase is opened by the usecase fan-out that schedules cb-judge.
  assert.ok(CB_PHASES.judge.planId === 'cb-phase-judge');
});
