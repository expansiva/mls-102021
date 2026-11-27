/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/reportOnly.test.ts" enhancement="_blank"/>

// d1_343: the report alone and the dry run. Built on the fake stor of orphanTarget.test.ts: one module with a process def and no receipt.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent as finalizeAgent } from '/_102021_/l2/agentMaterializeL1/steps/finalize80/agentM12Finalize.js';
import { buildM12PlannedSteps } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { planModules, planReport } from '/_102021_/l2/agentMaterializeL1/agentMaterializeL1.js';
import { M1_DEFINITION_SCHEMA, renderDefinition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { orphanOfTarget } from '/_102021_/l2/agentMaterializeL1/helpers/m12Orphans.js';
import { sha256Text } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { loadModuleUnits, storEntries } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import type { M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';

import { reportScope } from '/_102021_/l2/agentMaterializeL1/steps/finalize80/agentM12Finalize.js';
import { pendingScope } from '/_102021_/l2/agentMaterializeL1/helpers/m12Pending.js';

const PROJECT = 1;
const USECASES = 'mod/layer_2_application/usecases';
const DEF_REF = `_${PROJECT}_/l1/${USECASES}/gone.defs.ts`;
const TS_REF = `_${PROJECT}_/l1/${USECASES}/gone.ts`;
const CODE = 'export async function gone(): Promise<void> { return; }\n';

interface FakeFile extends M12FileInfo { status: string; content: string; getContent(): Promise<string>; getValueInfo(): Promise<{ content: string }> }
const keyOf = (info: M12FileInfo): string => `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;

function add(files: Record<string, FakeFile>, folder: string, shortName: string, extension: string, content: string): FakeFile {
  const info = { project: PROJECT, level: 1, folder, shortName, extension };
  const stored: FakeFile = { ...info, status: 'changed', content, getContent: async () => stored.content, getValueInfo: async () => ({ content: stored.content }) };
  files[keyOf(info)] = stored;
  return stored;
}

function processDef(): string {
  const rendered = renderDefinition({
    schemaVersion: M1_DEFINITION_SCHEMA, artifactType: 'workflowProcess', artifactId: 'proc', moduleName: 'mod', status: 'pending',
    data: { processId: 'proc', trigger: { kind: 'manual', actorRef: 'user' }, functions: ['run'], operations: [] },
    dependencies: [],
  } as never, `_${PROJECT}_/l1/mod/layer_2_application/workflows/proc.defs.ts`);
  assert.ok('source' in rendered, JSON.stringify(rendered));
  return rendered.source;
}

/** A module with one live def, and the unit `gone` the materializer wrote whose def is no longer there. */
async function install(written: string = CODE): Promise<{ files: Record<string, FakeFile>; ts: FakeFile; status: FakeFile }> {
  const files: Record<string, FakeFile> = {};
  add(files, 'mod/layer_2_application/workflows', 'proc', '.defs.ts', processDef());
  const ts = add(files, USECASES, 'gone', '.ts', CODE);
  const record = { schemaVersion: '2026-10-05-m12-unit-v1', layer: 'usecases', unitId: 'gone', defRef: DEF_REF, status: 'done', code: '', attempt: 1, diagnostic: '', inputHash: 'x', outputs: { [TS_REF]: await sha256Text(written) }, updatedAt: 't' };
  const status = add(files, 'mod/pipeline/agentMaterializeL1/usecases', 'gone', '.json', `${JSON.stringify(record, null, 2)}\n`);
  (globalThis as { mls: unknown }).mls = {
    actualProject: PROJECT,
    stor: {
      files,
      getKeyToFile: keyOf,
      addOrUpdateFile: async (info: M12FileInfo) => files[keyOf(info)] ?? add(files, info.folder, info.shortName, info.extension, ''),
      localStor: { setContent: async (file: FakeFile, value: { content?: string | null }) => { file.content = value.content ?? ''; return true; } },
      server: { loadProjectInfoIfNeeded: async () => undefined },
    },
  };
  return { files, ts, status };
}


void test('d1_343: `{"report":true}` rewrites the report from the receipts and generates nothing; the dry run lists what a scope would generate', async () => {
  const { files } = await install();
  const before = Object.keys(files).sort();
  const text = await reportScope(PROJECT, 'mod');
  assert.match(text, /^report — mod \(nothing generated\)/u);
  assert.match(text, /## mod: partial/u, 'the process has no receipt: the report says so');
  const after = Object.keys(files).sort();
  assert.deepEqual(after.filter(key => !before.includes(key)), [`${PROJECT}_1_mod/pipeline/agentMaterializeL1/report.json`], 'only the report file is new');
  assert.ok(!after.some(key => key.includes('/layer_2_application/workflows/proc.ts')), 'no unit file was written');

  const dry = await pendingScope(PROJECT, { scope: 'mod', target: '', force: false });
  assert.match(dry, /dry — mod: nothing is generated/u);
  assert.match(dry, /model units this run will generate 1 \(workflows\/proc\)/u);
  assert.match(dry, /Model calls: 1 unit\(s\) from scratch/u);
  assert.ok(!Object.keys(files).some(key => key.includes('/layer_2_application/workflows/proc.ts')), 'dry wrote no unit file');
});

void test('d1_349 s2: the dry run of a scope over every process says which ones are kept or repaired against a stale engine (no call), and puts the engine back', async () => {
  const { files } = await install();
  const proc = add(files, 'mod/layer_2_application/workflows', 'proc', '.ts', CODE);
  const engineInfo = { project: PROJECT, level: 1, folder: 'mod/layer_1_external/adapters/workflow', shortName: 'engine', extension: '.ts' };
  const stale = 'export const stale = 1;\n';
  const engine = add(files, engineInfo.folder, engineInfo.shortName, engineInfo.extension, stale);
  const dry = await pendingScope(PROJECT, { scope: 'mod/layer_2_application/workflows', target: '', force: false });
  assert.match(dry, /model units this run will generate 0; keep-or-repair \d/u, dry);
  assert.match(dry, /workflows\/proc/u);
  assert.doesNotMatch(dry, /will generate 1/u);
  assert.equal(engine.content, stale, 'the engine on disk is the one it was');
  assert.equal(proc.content, CODE, 'the process file is untouched');
  // A target is the old behavior: the engine does not move, and the file is only kept or repaired when a dependency moves.
  const target = await pendingScope(PROJECT, { scope: '', target: DEF_REF.replace('usecases/gone', 'workflows/proc'), force: true });
  assert.doesNotMatch(target, /rewritten engine/u);
  // d1_347 s7: a target on a unit with its file says which it keeps and which it repairs (the check of the run, no model, the file is not touched).
  assert.match(target, /kept \(compiles and passes the gate as it is\) 1 \(workflows\/proc\)|keep-or-repair 1 \(workflows\/proc \(repair, a call; \d+ problem\(s\)/u, target);
  assert.equal(proc.content, CODE, 'the process file is untouched');
});

void test('d1_343: the invocations `report` and `dry` are parsed, and refused where they do not belong', async () => {
  const { parseM12MessageInvocation } = await import('/_102021_/l2/agentMaterializeL1/helpers/m12Core.js');
  assert.deepEqual(parseM12MessageInvocation('@@agentMaterializeL1 {"report":true,"scope":"agents"}', 102047), { kind: 'report', project: 102047, scope: 'agents' });
  for (const bad of ['{"report":true,"target":"x"}', '{"report":true,"force":true}', '{"report":true,"dry":true}', '{"dry":true}', '{"dry":false,"scope":"a"}']) {
    assert.equal(parseM12MessageInvocation(`@@agentMaterializeL1 ${bad}`, 102047).kind, 'refusal', bad);
  }
  assert.deepEqual(parseM12MessageInvocation('@@agentMaterializeL1 {"scope":"agents","dry":true}', 102047), { kind: 'pending', project: 102047, scope: 'agents', target: '', force: false, scratch: false });
  const target = parseM12MessageInvocation('@@agentMaterializeL1 {"target":"_102047_/l1/agents/layer_2_application/usecases/a.defs.ts","dry":true}', 102047);
  assert.equal(target.kind, 'pending');
  assert.equal(parseM12MessageInvocation('@@agentMaterializeL1 {"stamp":true,"scope":"telegram","dry":true}', 102047).kind, 'stamp');
});
