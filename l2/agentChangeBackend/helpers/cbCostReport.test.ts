/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStepCost, accumulatePhaseCost, summarizeCost, formatCostSummary, type CbCostReport } from './cbCostReport.js';

test('parseStepCost (T7): sums cost + tokens across a multi-attempt provider trace', () => {
  // Fallback happened: a primary attempt then a retry — the run is charged for both.
  const trace = [
    'provider: xai model:grok-4.5 inputTokens:7954 outputTokens:85 cost:$0.0199 status:error',
    'provider: azureai model:gpt-4.1 inputTokens:8010 outputTokens:1200 cost:$0.0431 status:ok',
  ];
  assert.deepEqual(parseStepCost(trace), { cost: 0.0199 + 0.0431, inputTokens: 7954 + 8010, outputTokens: 85 + 1200 });
});

test('parseStepCost (T7): no cost lines -> zeros (deterministic step trace)', () => {
  assert.deepEqual(parseStepCost(['dispatch: spawned layer 0', 'saved .ts']), { cost: 0, inputTokens: 0, outputTokens: 0 });
  assert.deepEqual(parseStepCost([]), { cost: 0, inputTokens: 0, outputTokens: 0 });
});

test('accumulatePhaseCost (T7): pure, per-phase call counting', () => {
  let report: CbCostReport = {};
  report = accumulatePhaseCost(report, 'materialize', { cost: 0.05, inputTokens: 8000, outputTokens: 1000 });
  report = accumulatePhaseCost(report, 'materialize', { cost: 0.06, inputTokens: 8100, outputTokens: 1100 });
  report = accumulatePhaseCost(report, 'seeds', { cost: 0.10, inputTokens: 12000, outputTokens: 2000 });
  assert.deepEqual(report.materialize, { cost: 0.11, calls: 2, inputTokens: 16100, outputTokens: 2100 });
  assert.deepEqual(report.seeds, { cost: 0.10, calls: 1, inputTokens: 12000, outputTokens: 2000 });
});

test('summarizeCost (T7): totals + single priciest phase', () => {
  const report: CbCostReport = {
    'gen-domain': { cost: 0.20, calls: 4, inputTokens: 0, outputTokens: 0 },
    materialize: { cost: 7.45, calls: 146, inputTokens: 0, outputTokens: 0 },
    seeds: { cost: 0.98, calls: 2, inputTokens: 0, outputTokens: 0 },
  };
  const s = summarizeCost(report);
  assert.equal(Number(s.totalCost.toFixed(2)), 8.63);
  assert.equal(s.totalCalls, 152);
  assert.equal(s.topPhase, 'materialize');
  assert.equal(s.topPhaseCost, 7.45);
});

test('summarizeCost (T7): empty report -> no top phase', () => {
  assert.deepEqual(summarizeCost({}), { totalCost: 0, totalCalls: 0, topPhase: null, topPhaseCost: 0 });
});

test('formatCostSummary (T7): human line, calls per phase; empty -> ""', () => {
  assert.equal(formatCostSummary({}), '');
  const line = formatCostSummary({
    'gen-domain': { cost: 0.20, calls: 4, inputTokens: 0, outputTokens: 0 },
    materialize: { cost: 7.45, calls: 146, inputTokens: 0, outputTokens: 0 },
  });
  assert.match(line, /cost \$7\.65 in 150 call\(s\)/u);
  // "where did the 411 calls go?" is the question this line answers, so the calls are spelled out
  // and the phases are ordered by how many they took.
  assert.match(line, /by phase: materialize 146 call\(s\) \$7\.45, gen-domain 4 call\(s\) \$0\.20/u);
  assert.match(line, /priciest: materialize \$7\.45/u);
});
