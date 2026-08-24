/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-seeds/agentCbSeeds.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { callToolProvider, liveTestsEnabled, parseEnvFile } from '/_102025_/l2/testLlmClient.js';
import { createPlannerToolSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbPlanner.js';
import { seedPlanResultSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbSchemas.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../..');
const TOOL_NAME = 'submitSeedScenario';
const MODEL_TYPES = ['code', 'design'] as const;

void test('seed give-up publishes skipped MDM tags via skippedMdmEntityIds', () => {
  const src = readFileSync(path.join(HERE, 'agentCbSeeds.ts'), 'utf8');
  assert.match(src, /skippedMdmEntityIds\(input, seededMdmIds\)/);
  assert.match(src, /normalizeSeedPlan\(parseSeedPlan\(out\.result\), waveInput\.tablePlans, waveInput\.moduleName\)/);
});

void test('mdmRequiredTags come from ALL_STATUSES, not the pending-work scan', () => {
  const src = readFileSync(path.join(HERE, 'agentCbSeeds.ts'), 'utf8');
  assert.match(src, /seedScanStatuses\(context\)/);
  assert.match(src, /readBackendScan\(ALL_STATUSES, context\)/);
  assert.match(src, /propertyScan\.owners\.filter\(owner => owner\.mdm\)/);
});

void test('agentCbSeeds declares the LLM seed planner step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCbSeeds.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCbSeeds/);
  assert.match(src, /createPromptReadyIntent/);
  assert.match(src, /afterPromptStep/);
  assert.match(flow, /"agentName": "agentCbSeeds"/);
});

void test('agentCbSeeds tool schema is provider-clean', () => {
  const errs = lintToolSchema(JSON.stringify(tool().function.parameters));
  assert.equal(errs, null, errs?.join(' | '));
});

for (const modelType of MODEL_TYPES) {
  void test(`agentCbSeeds live @ ${modelType}: schema accepted + result has seed plan`, { skip: !liveTestsEnabled() }, async () => {
    const r = await callToolProvider(config(), { modelType, system: system(modelType), human: human({ summary: 'empty deterministic seed plan', localTables: [], mdmEntities: [] }), tool: tool() });
    assertLiveResponse(r);
    assert.ok(isRecord(r.args) && Array.isArray(r.args.localTables) && Array.isArray(r.args.mdmEntities), `${modelType}: seed plan missing`);
  });
}

function tool(): any {
  return createPlannerToolSchema(TOOL_NAME, 'Submit the deterministic seed scenario plan.', seedPlanResultSchema as Record<string, unknown>);
}

function system(modelType: string): string {
  return ['<!-- modelType: code -->', '<!-- x-tool-strict: true -->', `Return only one valid ${TOOL_NAME} tool call for model ${modelType}.`].join('\n');
}

function human(result: unknown): string {
  return `Call ${TOOL_NAME} with exactly this arguments JSON:\n${JSON.stringify({ status: 'ok', result, questions: [], trace: ['schema-test'] }, null, 2)}`;
}

function config() {
  return parseEnvFile(readFileSync(path.join(MLS_BASE, '.env'), 'utf8'));
}

function assertLiveResponse(r: { modelType: string; status: number; text: string; args: unknown; schemaReject: boolean }) {
  const sample = r.text.replace(/\s+/g, ' ').slice(0, 200);
  assert.ok(!r.schemaReject, `${r.modelType}: schema rejected (${r.status}): ${sample}`);
  assert.equal(r.status, 200, `${r.modelType}: expected 200, got ${r.status}: ${sample}`);
  assert.ok(r.args, `${r.modelType}: no tool_call result`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// ── seeds.ts is written by THIS agent, so a module that does not resolve is the environment ─────
// Round 1 of this fix classified as infra only what `mls.stor.files` already knew about — which
// measures whether the session indexed the other project, not whether the plan is wrong. On the run
// of 2026-08-17 the session had not indexed 102034, the TS2792 was routed to the plan repair budget,
// and the task died with "failed to compile seeds.ts" over a file the agent itself wrote.

void test('a module-resolution error on an alias import is environment, by construction', () => {
  const src = readFileSync(path.join(HERE, 'agentCbSeeds.ts'), 'utf8');
  // Classification does NOT consult the storage — the import comes from the fixed template.
  assert.match(src, /function seedEnvironmentErrors\(saved: \{ compileErrors: string\[\]; infraErrors: string\[\] \}\): string\[\]/);
  assert.match(src, /saved\.compileErrors\.filter\(error => !!aliasModuleResolutionPathOf\(error\)\)/);
  assert.doesNotMatch(src, /seedEnvironmentErrors[\s\S]{0,400}mls\.stor\.files/);
  // Both compile points of the seeds go through it (the partial persist and the final build).
  assert.equal((src.match(/seedEnvironmentErrors\(saved\)/g) || []).length, 2);
});

void test('gen-seeds applies deterministic operated-state + MDM-tag repair before giving up a wave', () => {
  const src = readFileSync(path.join(HERE, 'agentCbSeeds.ts'), 'utf8');
  assert.match(src, /repairSeedPlanDeterministically/);
  assert.match(src, /collectRequiredMdmTags/);
  const prompt = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  assert.match(prompt, /operatedStates/);
  assert.match(prompt, /ctx\.mdm/);
});

void test('HELP documents /rebuild seeds as the post-publish data iteration cycle', () => {
  const help = readFileSync(path.join(HERE, '..', '..', 'agentChangeBackend.ts'), 'utf8');
  assert.match(help, /ciclo NORMAL de refinar dados DEPOIS do app no ar/);
  assert.match(help, /passed-degraded \/ seeds: degraded/);
  assert.match(help, /inconclusive/);
});

void test('a seeds-phase failure degrades and continues the run (never fails the task)', () => {
  const src = readFileSync(path.join(HERE, 'agentCbSeeds.ts'), 'utf8');
  assert.match(src, /function continueSeedsDegraded\(/);
  assert.match(src, /seeds: 'degraded'/);
  assert.match(src, /SEEDS DEGRADED \(run continues to register\/validate-all\/finalize\)/);
  assert.equal((src.match(/continueSeedsDegraded\(context, parentStep, step, hookSequential, message\)/g) || []).length, 2);
  // The two catch blocks used to fail the step — that is the loop this spec closes.
  assert.doesNotMatch(src, /createUpdateStatusIntent\(context, parentStep, step, hookSequential, 'failed'/);
});

void test('an environment failure retries the compile once, without spending the replan budget', () => {
  const src = readFileSync(path.join(HERE, 'agentCbSeeds.ts'), 'utf8');
  // First occurrence: the SAME step is rescheduled with the flag; seedAttempt is carried over, never
  // incremented (it counts replans, which are a different budget).
  assert.match(src, /if \(!args\?\.infraRetry\) \{[\s\S]{0,400}seedAttempt: args\?\.seedAttempt \?\? 1, seedFindings: \[\], infraRetry: true/);
  // Second: the actionable message, and no plan is thrown away (the partial seeds.ts stays on disk).
  assert.match(src, /throw new Error\(seedInfraFailure\(environment\)\)/);
  assert.match(src, /SEEDS-ENVIRONMENT-FAILURE[\s\S]{0,200}no seed replan can fix it/);
  // The retry step says what it is.
  assert.match(src, /'Recompilar seeds \(falha de ambiente\)'/);
});

void test('the materialize keeps the storage-based distinction (there the LLM writes the imports)', () => {
  const materialize = readFileSync(path.join(HERE, '..', 'materialize', 'agentCbMaterialize.ts'), 'utf8');
  const io = readFileSync(path.join(HERE, '..', '..', 'helpers', 'cbMaterializeIo.ts'), 'utf8');
  // An import invented by the model IS a plan defect there, so infra means "exists on disk".
  assert.match(io, /function phantomModuleErrors[\s\S]{0,600}mls\.stor\.files/);
  assert.match(materialize, /saved\.compileErrors\.filter\(error => !saved\.infraErrors\.includes\(error\)\)/);
  assert.doesNotMatch(materialize, /aliasModuleResolutionPathOf/);
});

void test('a cross-project import missing from the session index is loaded before being skipped', () => {
  const io = readFileSync(path.join(HERE, '..', '..', 'helpers', 'cbMaterializeIo.ts'), 'utf8');
  // Read-only: the same call libModel makes before creating a model for another project's file.
  assert.match(io, /await loadProjectIndexOnce\(importProject\)/);
  assert.match(io, /mls\.stor\.server\.loadProjectInfoIfNeeded\(project\)/);
  // And once it is still absent, it says so instead of skipping in silence.
  assert.match(io, /is not in this session's storage; its types cannot be loaded/);
  // Nothing is ever written into the other project.
  assert.doesNotMatch(io, /loadProjectIndexOnce[\s\S]{0,300}createStorFile/);
});
