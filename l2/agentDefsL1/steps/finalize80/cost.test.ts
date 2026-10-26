/// <mls fileReference="_102021_/l2/agentDefsL1/steps/finalize80/cost.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { interactionPhaseCost } from '/_102021_/l2/agentDefsL1/steps/finalize80/agentD1Finalize.js';
import { D1_REPORT_VERSION, INVENTORY_NOTE, parseFinalizeReport } from '/_102021_/l2/agentDefsL1/steps/finalize80/contracts.js';

function step(planId: string, cost: number | null, nested: mls.msg.AIPayload[] = []): mls.msg.AIAgentStep {
  return {
    type: 'agent',
    stepId: 1,
    interaction: cost === null ? null : { cost } as mls.msg.AIAgentStep['interaction'],
    nextSteps: nested,
    stepTitle: planId || 'step',
    status: 'completed',
    agentName: 'agentDefsL1',
    prompt: '',
    rags: [],
    planning: { planId, dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
}

function context(steps: mls.msg.AIPayload[]): mls.msg.ExecutionContext {
  return {
    task: { iaCompressed: { nextSteps: steps } },
  } as unknown as mls.msg.ExecutionContext;
}

function bareReport(extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: D1_REPORT_VERSION,
    executableBackend: false,
    inventoryNote: INVENTORY_NOTE,
    calls: {
      finalizeCalledModel: false,
      finalizeOpenedRepair: false,
      repliesDelivered: null,
      repliesUnknown: 'absent',
      promptsAssembled: null,
      repairsScheduled: null,
      invocationReplies: null,
      invocationUnknown: 'absent',
    },
    phases: [],
    findings: [],
    enumerations: { consumed: [], notConsumed: [] },
    files: [],
    outcome: 'held',
    defsStatus: 'notRun',
    ...extra,
  });
}

void test('phase cost sums finite interaction costs and ignores a step with no interaction', () => {
  const cost = interactionPhaseCost(context([
    step('resolve25-worker-r0', 0.01),
    step('resolve25-repair-r0', 0.02),
    step('usecases50-worker-x', 0.30),
    step('input20', null),
  ]));
  assert.deepEqual(cost.byPhase.resolve25, { calls: 2, cost: 0.03 });
  assert.deepEqual(cost.byPhase.usecases50, { calls: 1, cost: 0.3 });
  assert.equal(cost.total, 0.33);
});

void test('a task with no priced step reports zero', () => {
  assert.deepEqual(interactionPhaseCost(context([step('resolve25-worker-r0', null)])), { total: 0, byPhase: {} });
});

void test('parseFinalizeReport accepts a report with and without cost and refuses a malformed cost', () => {
  assert.equal(parseFinalizeReport(bareReport())?.cost, undefined);
  const priced = parseFinalizeReport(bareReport({ cost: { total: 0.33, byPhase: { resolve25: { calls: 2, cost: 0.03 } } } }));
  assert.equal(priced?.cost?.total, 0.33);
  assert.equal(parseFinalizeReport(bareReport({ cost: { total: 1 } })), null);
  assert.equal(parseFinalizeReport(bareReport({ cost: '0.33' })), null);
  assert.equal(parseFinalizeReport(bareReport({ cost: { total: 1, byPhase: { resolve25: { calls: 1.5, cost: 1 } } } })), null);
});
