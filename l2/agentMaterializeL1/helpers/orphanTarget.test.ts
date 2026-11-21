/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/orphanTarget.test.ts" enhancement="_blank"/>

// d1_252: `target` of a def that no longer exists removes the output the materializer wrote for it (the usecase `listPersonalConduct` of the agents
// module: its def left the module and the `.ts` stayed). Only the bytes the status file recorded are removed; a hand edit stays.

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

const run = (target: string) => ({ scope: '', target, force: true });

type Hook = (a: IAgentMeta, c: mls.msg.ExecutionContext, p: mls.msg.AIAgentStep, s: mls.msg.AIAgentStep, h: number, args?: string) => Promise<Array<Record<string, any>>>;

async function runFinalize(target: string): Promise<Array<Record<string, any>>> {
  const plan = await planModules(PROJECT, run(target));
  const steps = buildM12PlannedSteps(PROJECT, run(target), plan.modules.map(item => ({ module: item.module, layers: item.layers, register: item.register })));
  assert.deepEqual(steps.map(item => item.agentName), ['agentM12Finalize'], 'the plan is the finalize step alone');
  const step = steps[0] as mls.msg.AIAgentStep;
  const meta = { agentName: 'x', agentDescription: 'x', visibility: 'private' } as IAgentMeta;
  const context = { message: { orderAt: 'm', threadId: 't', content: '' }, task: { PK: 'task' } } as unknown as mls.msg.ExecutionContext;
  return ((finalizeAgent().beforePromptStep as unknown) as Hook)(meta, context, { stepId: 1 } as mls.msg.AIAgentStep, { ...step, stepId: 10 } as mls.msg.AIAgentStep, 1, step.prompt);
}

const resultText = (out: Array<Record<string, any>>): string => out.filter(item => item.type === 'add-step').map(item => String(item.step?.result ?? '')).join('\n');

void test('d1_252: the target of a gone def (its .defs.ts or its .ts) plans the orphan and says so in the report; a live def and an unknown name are not orphans', async () => {
  await install();
  for (const target of [DEF_REF, TS_REF]) {
    const plan = await planModules(PROJECT, run(target));
    assert.equal(plan.refusal, '');
    assert.equal(plan.modules.length, 1);
    assert.deepEqual(plan.modules[0].layers, []);
    assert.equal(plan.modules[0].orphan?.unitId, 'gone');
    assert.equal(plan.modules[0].orphan?.layer, 'usecases');
    assert.match(planReport(run(target), plan.modules), /- orphan: usecases\/gone/u);
  }
  const loaded = await loadModuleUnits(PROJECT, 'mod', storEntries());
  assert.equal(await orphanOfTarget(PROJECT, 'mod', `_${PROJECT}_/l1/mod/layer_2_application/workflows/proc.defs.ts`, loaded.units), null, 'the def exists');
  assert.equal(await orphanOfTarget(PROJECT, 'mod', `_${PROJECT}_/l1/${USECASES}/never.defs.ts`, loaded.units), null, 'no status file names it');
  assert.equal(await orphanOfTarget(PROJECT, 'other', DEF_REF, loaded.units), null, 'another module');
});

void test('d1_252: the finalize step of that plan removes the .ts the materializer wrote and its status file, and says which', async () => {
  const { ts, status } = await install();
  const out = await runFinalize(DEF_REF);
  assert.equal(ts.status, 'deleted');
  assert.equal(status.status, 'deleted');
  const text = resultText(out);
  assert.match(text, /gone\.ts: removed/u);
  assert.match(text, /status usecases\/gone: removed/u);
  assert.equal(out.some(item => item.type === 'update-status' && /failed/u.test(JSON.stringify(item))), false);
});

void test('d1_252: a .ts edited by hand stays, with ORPHAN_EDITED, and so does the status file that owns it', async () => {
  const { ts, status } = await install();
  ts.content = `${CODE}// edited by hand\n`;
  const out = await runFinalize(TS_REF);
  assert.equal(ts.status, 'changed');
  assert.equal(ts.content, `${CODE}// edited by hand\n`);
  assert.equal(status.status, 'changed');
  assert.match(resultText(out), /kept, edited by hand .*ORPHAN_EDITED/u);
});

void test('d1_252: a second run finds nothing to do: the status file is gone, so the target is refused as before', async () => {
  await install();
  await runFinalize(DEF_REF);
  const again = await planModules(PROJECT, run(DEF_REF));
  assert.deepEqual(again.modules, []);
  assert.match(again.refusal, /matches no l1 def or emitted unit/u);
});

// The case of the agents module (102047@f45e1e26): `listPersonalConduct` left the module, its `.ts` and its status file (as the materializer wrote them,
// byte for byte from the commit) stayed. The recorded hash is the hash of the recorded bytes.
const here = path.dirname(new URL(import.meta.url).pathname);
const recorded = (name: string): string => readFileSync(path.join(here, 'fixtures', name), 'utf8');

void test('d1_252: the recorded agents case: the target of listPersonalConduct removes its .ts and status file as the materializer wrote them', async () => {
  const project = 102047;
  const files: Record<string, FakeFile> = {};
  const put = (folder: string, shortName: string, extension: string, content: string): FakeFile => {
    const info = { project, level: 1, folder, shortName, extension };
    const stored: FakeFile = { ...info, status: 'changed', content, getContent: async () => stored.content, getValueInfo: async () => ({ content: stored.content }) };
    files[keyOf(info)] = stored;
    return stored;
  };
  const live = renderDefinition({
    schemaVersion: M1_DEFINITION_SCHEMA, artifactType: 'workflowProcess', artifactId: 'proc', moduleName: 'agents', status: 'pending',
    data: { processId: 'proc', trigger: { kind: 'manual', actorRef: 'user' }, functions: ['run'], operations: [] }, dependencies: [],
  } as never, `_${project}_/l1/agents/layer_2_application/workflows/proc.defs.ts`);
  assert.ok('source' in live, JSON.stringify(live));
  put('agents/layer_2_application/workflows', 'proc', '.defs.ts', live.source);
  const ts = put('agents/layer_2_application/usecases', 'listPersonalConduct', '.ts', recorded('listPersonalConductCodeF45e1e26.recorded.txt'));
  const status = put('agents/pipeline/agentMaterializeL1/usecases', 'listPersonalConduct', '.json', recorded('listPersonalConductStatusF45e1e26.recorded.txt'));
  (globalThis as { mls: unknown }).mls = {
    actualProject: project,
    stor: {
      files, getKeyToFile: keyOf,
      addOrUpdateFile: async (info: M12FileInfo) => files[keyOf(info)],
      localStor: { setContent: async (file: FakeFile, value: { content?: string | null }) => { file.content = value.content ?? ''; return true; } },
      server: { loadProjectInfoIfNeeded: async () => undefined },
    },
  };
  const target = `_${project}_/l1/agents/layer_2_application/usecases/listPersonalConduct.defs.ts`;
  const plan = await planModules(project, run(target));
  assert.equal(plan.modules[0]?.orphan?.unitId, 'listPersonalConduct', plan.refusal);
  const steps = buildM12PlannedSteps(project, run(target), plan.modules.map(item => ({ module: item.module, layers: item.layers, register: item.register })));
  const meta = { agentName: 'x', agentDescription: 'x', visibility: 'private' } as IAgentMeta;
  const context = { message: { orderAt: 'm', threadId: 't', content: '' }, task: { PK: 'task' } } as unknown as mls.msg.ExecutionContext;
  const out = await ((finalizeAgent().beforePromptStep as unknown) as Hook)(meta, context, { stepId: 1 } as mls.msg.AIAgentStep, { ...(steps[0] as mls.msg.AIAgentStep), stepId: 10 } as mls.msg.AIAgentStep, 1, (steps[0] as mls.msg.AIAgentStep).prompt);
  assert.equal(ts.status, 'deleted');
  assert.equal(status.status, 'deleted');
  assert.match(resultText(out), /listPersonalConduct\.ts: removed/u);
});
