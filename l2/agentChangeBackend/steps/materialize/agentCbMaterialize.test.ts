/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/materialize/agentCbMaterialize.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { callToolProvider, liveTestsEnabled, parseEnvFile } from '/_102025_/l2/testLlmClient.js';
import { GEN_TOOL, buildSystemPrompt, type PipelineItem } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeCore.js';
import { entryIsStale } from '/_102021_/l2/agentChangeBackend/steps/materialize/agentCbMaterialize.js';
import { removeWipedKey } from '/_102021_/l2/agentChangeBackend/helpers/cbArchive.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../..');
const MODEL_TYPES = ['code', 'design'] as const;

void test('agentCbMaterialize declares the LLM materialization step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCbMaterialize.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCbMaterialize/);
  assert.match(src, /GEN_TOOL/);
  assert.match(src, /afterPromptStep/);
  assert.match(flow, /"agentName": "agentCbMaterialize"/);
});

void test('materialize flushes borrowed Monaco models between workers and layers', () => {
  const src = readFileSync(path.join(HERE, 'agentCbMaterialize.ts'), 'utf8');
  assert.match(src, /await flushBorrowedModels\(\);/);
  assert.ok((src.match(/flushBorrowedModels/g) || []).length >= 2, 'worker + dispatcher');
});

void test('the materialize dispatcher does not LLM-generate persistenceSeeds', () => {
  const src = readFileSync(path.join(HERE, 'agentCbMaterialize.ts'), 'utf8');
  assert.match(src, /isDeterministicMaterializeType\(e\.item\.type\)/);
  assert.match(src, /isDeterministicMaterializeType\(parsed\.item\.type\)/);
  assert.match(src, /compiled by agentCbSeeds/);
});

void test('the materialize dispatcher caps total dispatches; repair ceiling lives in forceRegenerate', () => {
  const src = readFileSync(path.join(HERE, 'agentCbMaterialize.ts'), 'utf8');
  const repair = readFileSync(path.join(HERE, '../../helpers/cbRepair.ts'), 'utf8');
  assert.match(src, /noteStaleSpawn\(e\.defRef\)/);
  assert.doesNotMatch(src, /noteStaleSpawn\(e\.defRef, e\.reason\)/);
  assert.match(src, /setComponentFindings\(/);
  assert.match(src, /hard dispatch ceiling reached/);
  assert.doesNotMatch(src, /re-spawn ceiling reached/);
  assert.match(repair, /re-spawn ceiling reached/);
  assert.match(repair, /forceRegenerate/);
  assert.match(src, /\[cb-stale\]/);
  assert.match(src, /decision=\$/);
});

void test('materialize prompt receives L4 rule title and description when the item has rulesApplied', () => {
  const src = readFileSync(path.join(HERE, 'agentCbMaterialize.ts'), 'utf8');
  assert.match(src, /appliedRulesPromptSection/);
  assert.match(src, /readRuleDefinitions\(mls\.actualProject \|\| 0\)/);
  assert.match(src, /parsed\.item\.rulesApplied/);
  // The section has to REACH the prompt. `void rulesSection` leaves every identifier assertion above
  // green and the rule text out of the call — the same inert-wiring trap paid for in am8 and in
  // cb_pos_checagem (02/09). Assert the push, not the mention.
  assert.match(src, /contextSections\.push\(rulesSection\)/);
  const skill = readFileSync(path.join(HERE, '..', '..', 'skills', 'applicationUsecase.md'), 'utf8');
  assert.match(skill, /Never assign through a callback into `let x: T \| null = null`/);
  assert.match(skill, /return next/);
});

void test('materialize applies invented-import rename and callback-null finding before save', () => {
  const src = readFileSync(path.join(HERE, 'agentCbMaterialize.ts'), 'utf8');
  assert.match(src, /applyInventedImportFixes/);
  assert.match(src, /collectNamedL1Imports/);
  assert.match(src, /collectCallbackNullAssignmentIssues/);
  assert.match(src, /renameToClosestExport/);
  assert.match(src, /materialize-invented-import/);
});

void test('materialize rewrites extensionless path imports before save and still flags any leftover', () => {
  const src = readFileSync(path.join(HERE, 'agentCbMaterialize.ts'), 'utf8');
  assert.match(src, /ensureJsImportExtensions\(applyHeader\(/);
  assert.match(src, /collectExtensionlessImportIssues/);
});

void test('the materialize dispatcher paints an ephemeral title during the stale-file scan', () => {
  const src = readFileSync(path.join(HERE, 'agentCbMaterialize.ts'), 'utf8');
  assert.match(src, /startLocalStepTick\(context, step,/);
  assert.match(src, /step\.stepTitle \|\| 'Materialize'/);
  assert.match(src, /scanning \(\$\{sec\}s\)/);
  assert.doesNotMatch(src, /step\.stepTitle\s*=/);
});

void test('agentCbMaterialize tool schema is provider-clean', () => {
  const errs = lintToolSchema(JSON.stringify(GEN_TOOL.function.parameters));
  assert.equal(errs, null, errs?.join(' | '));
});

for (const modelType of MODEL_TYPES) {
  void test(`agentCbMaterialize live @ ${modelType}: schema accepted + returns code`, { skip: !liveTestsEnabled() }, async () => {
    const r = await callToolProvider(config(), {
      modelType,
      system: buildSystemPrompt([], '/_102021_/l1/mock/layer_3_domain/entities/mock.ts', modelType),
      human: [
        '## Definition',
        '```json',
        JSON.stringify({ entityId: 'Mock', fields: [] }, null, 2),
        '```',
        '',
        'Generate a minimal TypeScript file with the required fileReference header and export class Mock.',
      ].join('\n'),
      tool: GEN_TOOL,
    });
    assertLiveResponse(r);
    assert.ok(isRecord(r.args) && typeof r.args.code === 'string' && r.args.code.includes('Mock'), `${modelType}: code missing`);
  });
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

function withMls<T>(patch: Record<string, unknown>, fn: () => T): T {
  const g = globalThis as { mls?: Record<string, unknown> };
  const prev = g.mls;
  g.mls = { ...(prev ?? {}), ...patch };
  try { return fn(); } finally { g.mls = prev; }
}

function captureInfo<T>(fn: () => T): { result: T; lines: string[] } {
  const lines: string[] = [];
  const orig = console.info;
  console.info = (...args: unknown[]) => { lines.push(args.map(String).join(' ')); };
  try { return { result: fn(), lines }; } finally { console.info = orig; }
}

void test('entryIsStale emits raw updatedAt/status from mls.stor.files without normalizing them', () => {
  const PROJECT = 102099;
  const FOLDER = 'mod/layer_3_domain/entities';
  const defsAt = '2026-09-01T16:06:00.000Z';
  const tsAt = '2026-09-01T16:00:00.000Z';
  const files: Record<string, { updatedAt?: unknown; status?: unknown }> = {
    [`${PROJECT}:1:${FOLDER}:pet:.defs.ts`]: { updatedAt: defsAt, status: 'changed' },
    [`${PROJECT}:1:${FOLDER}:pet:.ts`]: { updatedAt: tsAt, status: 'active' },
  };
  const defRef = `_102099_/l1/${FOLDER}/pet.defs.ts`;
  const item: PipelineItem = { id: 'pet', type: 'domainEntity', outputPath: `_102099_/l1/${FOLDER}/pet.ts` };
  const { result, lines } = withMls({
    actualProject: PROJECT,
    stor: {
      files,
      getKeyToFile: (info: { project: number; level: number; folder: string; shortName: string; extension: string }) =>
        `${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`,
    },
  }, () => captureInfo(() => entryIsStale(PROJECT, defRef, item)));
  assert.equal(result.stale, false);
  assert.equal(result.decision, 'skip');
  assert.equal(lines.length, 1);
  assert.match(lines[0], /\[cb-stale\] _102099_\/l1\/mod\/layer_3_domain\/entities\/pet\.defs\.ts /);
  assert.match(lines[0], new RegExp(`defs\\(ms=${Date.parse(defsAt)} updatedAt=${defsAt} status=changed\\)`));
  assert.match(lines[0], new RegExp(`ts\\(ms=${Date.parse(tsAt)} exists=true updatedAt=${tsAt} status=active\\)`));
  assert.equal(result.wipedThisRun, false);
  assert.match(lines[0], /deps\(max=\) wipedThisRun=false => stale=false decision=skip/);
});

void test('entryIsStale logs raw status=new with no updatedAt (MAX_SAFE_INTEGER path) and missing .ts', () => {
  const PROJECT = 102099;
  const FOLDER = 'mod/layer_3_domain/entities';
  const files: Record<string, { updatedAt?: unknown; status?: unknown }> = {
    [`${PROJECT}:1:${FOLDER}:order:.defs.ts`]: { status: 'new' },
  };
  const defRef = `_102099_/l1/${FOLDER}/order.defs.ts`;
  const item: PipelineItem = { id: 'order', type: 'domainEntity', outputPath: `_102099_/l1/${FOLDER}/order.ts` };
  const { result, lines } = withMls({
    actualProject: PROJECT,
    stor: {
      files,
      getKeyToFile: (info: { project: number; level: number; folder: string; shortName: string; extension: string }) =>
        `${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`,
    },
  }, () => captureInfo(() => entryIsStale(PROJECT, defRef, item)));
  assert.equal(result.stale, true);
  assert.equal(result.decision, 'generate');
  assert.equal(result.wipedThisRun, false);
  assert.match(lines[0], new RegExp(`defs\\(ms=${Number.MAX_SAFE_INTEGER} updatedAt=undefined status=new\\)`));
  assert.match(lines[0], /ts\(ms=null exists=false updatedAt=undefined status=undefined\)/);
  assert.match(lines[0], /=> stale=true decision=generate/);
});

void test('entryIsStale skips when the .ts exists even if a dependency is newer', () => {
  const PROJECT = 102099;
  const FOLDER = 'mod/layer_2_application/usecases';
  const DEP_FOLDER = 'mod/layer_3_domain/entities';
  const defsAt = '2026-09-01T16:00:00.000Z';
  const tsAt = '2026-09-01T16:10:00.000Z';
  const depAt = '2026-09-01T16:20:00.000Z';
  const files: Record<string, { updatedAt?: unknown; status?: unknown }> = {
    [`${PROJECT}:1:${FOLDER}:book:.defs.ts`]: { updatedAt: defsAt, status: 'changed' },
    [`${PROJECT}:1:${FOLDER}:book:.ts`]: { updatedAt: tsAt, status: 'active' },
    [`${PROJECT}:1:${DEP_FOLDER}:pet:.ts`]: { updatedAt: depAt, status: 'active' },
  };
  const defRef = `_102099_/l1/${FOLDER}/book.defs.ts`;
  const item: PipelineItem = {
    id: 'book',
    type: 'applicationUsecase',
    outputPath: `_102099_/l1/${FOLDER}/book.ts`,
    dependsFiles: [`_102099_/l1/${DEP_FOLDER}/pet.d.ts`],
  };
  const { result, lines } = withMls({
    actualProject: PROJECT,
    stor: {
      files,
      getKeyToFile: (info: { project: number; level: number; folder: string; shortName: string; extension: string }) =>
        `${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`,
    },
  }, () => captureInfo(() => entryIsStale(PROJECT, defRef, item)));
  assert.equal(result.stale, false);
  assert.equal(result.decision, 'skip');
  assert.equal(result.wipedThisRun, false);
  assert.match(lines[0], new RegExp(`deps\\(max=${Date.parse(depAt)}\\) wipedThisRun=false => stale=false decision=skip`));
});

void test('entryIsStale skips a present .ts even when defs and a dependency are newer', () => {
  const PROJECT = 102099;
  const FOLDER = 'mod/layer_2_application/usecases';
  const DEP_FOLDER = 'mod/layer_3_domain/entities';
  const tsAt = '2026-09-01T16:00:00.000Z';
  const newer = '2026-09-01T16:30:00.000Z';
  const files: Record<string, { updatedAt?: unknown; status?: unknown }> = {
    [`${PROJECT}:1:${FOLDER}:book:.defs.ts`]: { updatedAt: newer, status: 'changed' },
    [`${PROJECT}:1:${FOLDER}:book:.ts`]: { updatedAt: tsAt, status: 'active' },
    [`${PROJECT}:1:${DEP_FOLDER}:pet:.ts`]: { updatedAt: newer, status: 'active' },
  };
  const defRef = `_102099_/l1/${FOLDER}/book.defs.ts`;
  const item: PipelineItem = {
    id: 'book',
    type: 'applicationUsecase',
    outputPath: `_102099_/l1/${FOLDER}/book.ts`,
    dependsFiles: [`_102099_/l1/${DEP_FOLDER}/pet.d.ts`],
  };
  const { result } = withMls({
    actualProject: PROJECT,
    stor: {
      files,
      getKeyToFile: (info: { project: number; level: number; folder: string; shortName: string; extension: string }) =>
        `${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`,
    },
  }, () => captureInfo(() => entryIsStale(PROJECT, defRef, item)));
  assert.equal(result.stale, false);
  assert.equal(result.decision, 'skip');
  assert.equal(result.wipedThisRun, false);
});

void test('materialize completes requiredMethods on the port .ts; the plan post-check stays on gen-port', () => {
  const src = readFileSync(path.join(HERE, 'agentCbMaterialize.ts'), 'utf8');
  const genPort = readFileSync(path.join(HERE, '..', 'gen-port', 'agentCbRepositoryPort.ts'), 'utf8');
  assert.match(src, /ensureRequiredPortMethodsInSource/);
  assert.match(src, /item\.type === 'repositoryPort'/);
  // The completed source has to REPLACE the code that gets validated and saved, and the findings have
  // to reach the component gate. Dropping either line leaves the call in place and the check inert —
  // a mutation the identifier assertions above do not catch (proved by mutation, 02/09). The same
  // assignment is the wiring for data.methods completion (same helper, same portEnsure.source).
  assert.match(src, /code = portEnsure\.source;/);
  assert.match(src, /componentIssues\.push\(\.\.\.portEnsure\.findings\)/);
  assert.match(src, /systemDecisions: portEnsure\.decisions/);
  assert.match(genPort, /ensureRequiredPortMethods\(/);
  assert.doesNotMatch(src, /methodNamesFromPortDefsSource/);
});

void test('adapter port-method guard reads the materialized port .ts, not the defs plan', () => {
  const src = readFileSync(path.join(HERE, 'agentCbMaterialize.ts'), 'utf8');
  assert.match(src, /async function adapterPortMethodIssues/);
  assert.match(src, /extractInterfaceMethods\(src, iface\)/);
  assert.match(src, /dtsRef\(repositoryPortFileInfo/);
  assert.doesNotMatch(src, /methodNamesFromPortDefsSource/);
});

function storFiles(entries: Array<{ shortName: string; status: string; updatedAt?: string }>): Record<string, { updatedAt?: unknown; status?: unknown }> {
  const FOLDER = 'mod/layer_3_domain/entities';
  const files: Record<string, { updatedAt?: unknown; status?: unknown }> = {};
  const at = '2026-09-02T18:02:00.000Z';
  for (const entry of entries) {
    files[`102099:1:${FOLDER}:${entry.shortName}:.defs.ts`] = { updatedAt: entry.updatedAt ?? at, status: entry.status };
    files[`102099:1:${FOLDER}:${entry.shortName}:.ts`] = { updatedAt: entry.updatedAt ?? at, status: entry.status };
  }
  return files;
}

function entityItem(shortName: string): { defRef: string; item: PipelineItem; tsKey: string } {
  const FOLDER = 'mod/layer_3_domain/entities';
  return {
    defRef: `_102099_/l1/${FOLDER}/${shortName}.defs.ts`,
    item: { id: shortName, type: 'domainEntity', outputPath: `_102099_/l1/${FOLDER}/${shortName}.ts` },
    tsKey: `102099:1:${FOLDER}:${shortName}:.ts`,
  };
}

function evaluateStale(shortName: string, files: Record<string, { updatedAt?: unknown; status?: unknown }>, wiped: ReadonlySet<string>) {
  const { defRef, item } = entityItem(shortName);
  return withMls({
    actualProject: 102099,
    stor: {
      files,
      getKeyToFile: (info: { project: number; level: number; folder: string; shortName: string; extension: string }) =>
        `${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`,
    },
  }, () => captureInfo(() => entryIsStale(102099, defRef, item, wiped)));
}

void test('entryIsStale treats a present .ts as stale when this run archived it, even if the index says nochange', () => {
  const names = ['pet', 'order', 'ticket'] as const;
  const files = storFiles(names.map(shortName => ({ shortName, status: 'nochange' })));
  const wiped = new Set(names.map(name => entityItem(name).tsKey));
  for (const name of names) {
    const { result, lines } = evaluateStale(name, files, wiped);
    assert.equal(result.stale, true, name);
    assert.equal(result.decision, 'generate', name);
    assert.equal(result.wipedThisRun, true, name);
    assert.match(lines[0], /status=nochange/);
    assert.match(lines[0], /exists=true/);
    assert.match(lines[0], /wipedThisRun=true => stale=true decision=generate/);
  }
});

void test('entryIsStale drops a rematerialized key from the wiped set; the other two stay stale', () => {
  const names = ['pet', 'order', 'ticket'] as const;
  const files = storFiles(names.map(shortName => ({ shortName, status: 'nochange' })));
  const remaining = new Set(removeWipedKey(names.map(name => entityItem(name).tsKey), entityItem('order').tsKey));
  const pet = evaluateStale('pet', files, remaining);
  const order = evaluateStale('order', files, remaining);
  const ticket = evaluateStale('ticket', files, remaining);
  assert.equal(pet.result.stale, true);
  assert.equal(pet.result.wipedThisRun, true);
  assert.equal(order.result.stale, false);
  assert.equal(order.result.decision, 'skip');
  assert.equal(order.result.wipedThisRun, false);
  assert.match(order.lines[0], /wipedThisRun=false => stale=false decision=skip/);
  assert.equal(ticket.result.stale, true);
  assert.equal(ticket.result.wipedThisRun, true);
});

void test('entryIsStale without a wipe set skips a present .ts (same as /run)', () => {
  const files = storFiles([{ shortName: 'pet', status: 'nochange' }]);
  const { result, lines } = evaluateStale('pet', files, new Set());
  assert.equal(result.stale, false);
  assert.equal(result.decision, 'skip');
  assert.equal(result.wipedThisRun, false);
  assert.match(lines[0], /wipedThisRun=false => stale=false decision=skip/);
});

void test('materialize dispatcher fails the run when a wipe generated nothing; repair rounds do not', () => {
  const src = readFileSync(path.join(HERE, 'agentCbMaterialize.ts'), 'utf8');
  assert.match(src, /wipedKeysForRun\(repairState, readWipeRunId\(context\)\)/);
  assert.match(src, /materializeNoneAfterWipeFinding\(Number\(readRebuildArchived\(context\) \|\| 0\), allStale\.length\)/);
  assert.match(src, /minRank === 0 && !repairMode/);
  assert.match(src, /'failed', noneFinding/);
  assert.match(src, /markWipedKeyGenerated/);
  assert.match(src, /wipedThisRun=\$\{wipedThisRun\}/);
});
