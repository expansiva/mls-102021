/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/emitterTarget.test.ts" enhancement="_blank"/>

// d1_246: `target` reaches a unit an emitter writes and that has no def (the module engine).

import assert from 'node:assert/strict';
import test from 'node:test';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent as workflowsAgent } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/agentM12Workflows.js';
import { buildM12PlannedSteps } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { planModules, planReport } from '/_102021_/l2/agentMaterializeL1/agentMaterializeL1.js';
import { M1_DEFINITION_SCHEMA, renderDefinition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { emitterTarget, requestModules, storEntries } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { fileRef, type M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { workflowEngineFile } from '/_102021_/l2/agentMaterializeL1/emitters/workflowEmit.js';
import { readUnitStatus } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';

const PROJECT = 1;
const ENGINE = fileRef(workflowEngineFile(PROJECT, 'mod'));

interface FakeFile extends M12FileInfo { status: string; content: string; getContent(): Promise<string>; getValueInfo(): Promise<{ content: string }> }
const keyOf = (info: M12FileInfo): string => `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;

function install(defs: Array<{ folder: string; shortName: string; content: string }>): Record<string, FakeFile> {
  const files: Record<string, FakeFile> = {};
  for (const item of defs) {
    const info = { project: PROJECT, level: 1, folder: item.folder, shortName: item.shortName, extension: '.defs.ts' };
    const stored: FakeFile = { ...info, status: 'changed', content: item.content, getContent: async () => stored.content, getValueInfo: async () => ({ content: stored.content }) };
    files[keyOf(info)] = stored;
  }
  (globalThis as { mls: unknown }).mls = {
    actualProject: PROJECT,
    stor: {
      files,
      getKeyToFile: keyOf,
      addOrUpdateFile: async (info: M12FileInfo) => {
        const key = keyOf(info);
        if (!files[key]) {
          const created: FakeFile = { ...info, status: 'new', content: '', getContent: async () => created.content, getValueInfo: async () => ({ content: created.content }) };
          files[key] = created;
        }
        return files[key];
      },
      localStor: { setContent: async (file: FakeFile, value: { content?: string | null }) => { file.content = value.content ?? ''; return true; } },
      server: { loadProjectInfoIfNeeded: async () => undefined },
    },
  };
  return files;
}

function processDef(): { folder: string; shortName: string; content: string } {
  const folder = 'mod/layer_2_application/workflows';
  const rendered = renderDefinition({
    schemaVersion: M1_DEFINITION_SCHEMA, artifactType: 'workflowProcess', artifactId: 'proc', moduleName: 'mod', status: 'pending',
    data: { processId: 'proc', trigger: { kind: 'manual', actorRef: 'user' }, functions: ['run'], operations: [] },
    dependencies: [],
  } as never, `_${PROJECT}_/l1/${folder}/proc.defs.ts`);
  assert.ok('source' in rendered, JSON.stringify(rendered));
  return { folder, shortName: 'proc', content: rendered.source };
}

const run = (target: string) => ({ scope: '', target, force: true });

test('d1_246: the engine file and <module>/engine name the emitted unit; a def or another file does not', () => {
  assert.deepEqual(emitterTarget(PROJECT, ENGINE), { module: 'mod', layer: 'workflows' });
  assert.deepEqual(emitterTarget(PROJECT, ENGINE.replace('.ts', '.defs.ts')), null);
  assert.deepEqual(emitterTarget(PROJECT, 'mod/engine'), { module: 'mod', layer: 'workflows' });
  assert.equal(emitterTarget(PROJECT, `_${PROJECT}_/l1/mod/layer_2_application/usecases/engine.ts`), null);
  assert.equal(emitterTarget(PROJECT, `_${PROJECT}_/l1/mod/layer_1_external/adapters/workflow/other.ts`), null);
  assert.equal(emitterTarget(PROJECT, `_${PROJECT}_/l1/mod/layer_2_application/usecases/createX.ts`), null);
});

test('d1_246: target = the engine file plans only the workflows layer of that module, and the report lists it', async () => {
  install([processDef()]);
  for (const target of [ENGINE, 'mod/engine']) {
    assert.deepEqual(requestModules(PROJECT, run(target), storEntries()).modules, ['mod']);
    const plan = await planModules(PROJECT, run(target));
    assert.equal(plan.refusal, '');
    assert.equal(plan.modules.length, 1);
    assert.deepEqual(plan.modules[0].layers, ['workflows']);
    assert.deepEqual(plan.modules[0].units, []);
    assert.equal(plan.modules[0].register, false);
    assert.match(planReport(run(target), plan.modules), /- workflows: engine/u);
  }
});

test('d1_246: a def target still selects its def, and a target that matches nothing is refused with the accepted forms', async () => {
  install([processDef()]);
  const byDef = await planModules(PROJECT, run(`_${PROJECT}_/l1/mod/layer_2_application/workflows/proc.defs.ts`));
  assert.equal(byDef.refusal, '');
  assert.deepEqual(byDef.modules[0].layers, ['workflows']);
  assert.deepEqual(byDef.modules[0].units.map(unit => unit.unitId), ['proc']);
  assert.equal(byDef.modules[0].emitted, undefined);

  const none = await planModules(PROJECT, run(`_${PROJECT}_/l1/mod/layer_2_application/workflows/missing.defs.ts`));
  assert.match(none.refusal, /matches no l1 def or emitted unit\. Accepted: .*engine\.ts.*<module>\/engine/u);
  const other = await planModules(PROJECT, run('_1_/l1/mod/layer_1_external/adapters/workflow/other.ts'));
  assert.match(other.refusal, /Accepted: /u);
  const foreign = requestModules(PROJECT, run('_1_/l1/ghost/layer_1_external/adapters/workflow/engine.ts'), storEntries());
  assert.match(foreign.refusal, /not in a module with defs/u);
});

test('d1_246: a module with no workflow process has no engine to name', async () => {
  install([{ folder: 'mod/layer_3_domain/entities', shortName: 'x', content: '' }]);
  const plan = await planModules(PROJECT, run('mod/engine'));
  assert.deepEqual(plan.modules, []);
  assert.match(plan.refusal, /Accepted: |matches no l1 def/u);
});

test('d1_246, d1_349 s1: the workflows step of that plan keeps the engine over an old file (ENGINE_NEEDS_PROCESSES: a target of the engine alone does not rewrite it) and dispatches no model worker', async () => {
  const files = install([processDef()]);
  const info = workflowEngineFile(PROJECT, 'mod');
  const engineFile = (): FakeFile | undefined => files[keyOf(info)];
  files[keyOf(info)] = { ...info, status: 'changed', content: '// old engine', getContent: async () => '// old engine', getValueInfo: async () => ({ content: '// old engine' }) };
  const target = ENGINE;
  const plan = await planModules(PROJECT, run(target));
  const steps = buildM12PlannedSteps(PROJECT, run(target), plan.modules.map(item => ({ module: item.module, layers: item.layers, register: item.register })));
  const step = steps.find(item => item.agentName === 'agentM12Workflows') as mls.msg.AIAgentStep;
  assert.ok(step, 'the plan has the workflows step');
  assert.equal(steps.some(item => item.agentName === 'agentM12Usecases'), false, 'only the workflows layer is planned');
  const meta = { agentName: 'x', agentDescription: 'x', visibility: 'private' } as IAgentMeta;
  const context = { message: { orderAt: 'm', threadId: 't', content: '' }, task: { PK: 'task' } } as unknown as mls.msg.ExecutionContext;
  type Hook = (a: IAgentMeta, c: mls.msg.ExecutionContext, p: mls.msg.AIAgentStep, s: mls.msg.AIAgentStep, h: number, args?: string) => Promise<Array<Record<string, any>>>;
  const out = await ((workflowsAgent().beforePromptStep as unknown) as Hook)(meta, context, { stepId: 1 } as mls.msg.AIAgentStep, { ...step, stepId: 10 } as mls.msg.AIAgentStep, 1, step.prompt);
  assert.equal(out.filter(item => item.type === 'add-step').length, 0, 'no worker');
  assert.equal(engineFile()?.content, '// old engine', 'the engine stays: every process of the module uses it and this run does not regenerate them');
  const status = await readUnitStatus(PROJECT, 'mod', 'workflows', 'engine');
  assert.equal(status?.code, 'ENGINE_NEEDS_PROCESSES');
});
