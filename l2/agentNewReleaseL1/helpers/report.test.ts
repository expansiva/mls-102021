/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/report.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { planNewReleaseL1 } from '/_102021_/l2/agentNewReleaseL1/helpers/plan.js';
import {
  editNotes,
  generatorUnits,
  parseNewReleaseInvocation,
  reportGeneratorStart,
  reportMaterialize,
  reportNewRelease,
  reportOutside,
} from '/_102021_/l2/agentNewReleaseL1/helpers/report.js';
import { createAgent } from '/_102021_/l2/agentNewReleaseL1/agentNewReleaseL1.js';
import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { changeEffortFileStatus, mergeChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';
import type { ChangeEffortFile, EffortAnswer, EffortUnitRef } from '/_102035_/l2/solution/poolPlan.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const MASTER = '102021';

test('invocation accepts one module or /check and refuses an unknown flag', () => {
  assert.deepEqual(parseNewReleaseInvocation('@@agentNewReleaseL1 tarefas'), { ok: true, module: 'tarefas', check: false });
  assert.deepEqual(parseNewReleaseInvocation('tarefas'), { ok: true, module: 'tarefas', check: false });
  assert.deepEqual(parseNewReleaseInvocation('@@agentNewReleaseL1 tarefas /check'), { ok: true, module: 'tarefas', check: true });
  assert.deepEqual(parseNewReleaseInvocation('tarefas /check'), { ok: true, module: 'tarefas', check: true });
  const help = 'Usage: @@agentNewReleaseL1 <module> [/check]';
  assert.deepEqual(parseNewReleaseInvocation('@@agentNewReleaseL1'), { ok: false, help });
  assert.deepEqual(parseNewReleaseInvocation(''), { ok: false, help });
  assert.deepEqual(parseNewReleaseInvocation('@@agentNewReleaseL1 tarefas extra'), { ok: false, help });
  assert.deepEqual(parseNewReleaseInvocation('@@agentNewReleaseL1 tarefas /run'), { ok: false, help });
});

test('R1 report names both edits, the deleted sources, and one scope command', () => {
  const effort = JSON.parse(readFileSync(join(HERE, 'fixtures', 'R1.changeEffort.json'), 'utf8')) as ChangeEffortFile;
  const defs = loadTarefas();
  const plan = planNewReleaseL1(effort, MASTER, defs);
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  const deleted = [
    'l1/tarefas/layer_2_application/requests/minhas_tarefas.ts',
    'l1/tarefas/layer_2_application/usecases/createTarefa.ts',
  ];
  const message = reportNewRelease(editNotes(effort, MASTER, plan.edits.map(edit => edit.path)), 'tarefas', deleted);
  assert.match(message, /l1\/tarefas\/layer_2_application\/requests\/minhas_tarefas\.defs\.ts: added novaTarefaPrioridadeMedia/u);
  assert.match(message, /l1\/tarefas\/layer_2_application\/usecases\/createTarefa\.defs\.ts: added novaTarefaPrioridadeMedia/u);
  assert.match(message, /l1\/tarefas\/layer_2_application\/requests\/minhas_tarefas\.ts/u);
  assert.match(message, /l1\/tarefas\/layer_2_application\/usecases\/createTarefa\.ts/u);
  assert.match(message, /@@agentMaterializeL1 \{"scope":"tarefas"\}/u);
  assert.equal(message.includes('"target"'), false);
  assert.equal(message.match(/@@agentMaterializeL1/gu)?.length, 1);
  assert.equal(message.trim().split('\n').length, 5);
  assert.equal(reportNewRelease([], 'tarefas', []), '@@agentMaterializeL1 {"scope":"tarefas"}');
});

test('a check that changed a path names the deleted source and one scope command', () => {
  const message = reportMaterialize('tarefas', ['l1/tarefas/layer_2_application/usecases/createTarefa.defs.ts'], [
    'l1/tarefas/layer_2_application/usecases/createTarefa.ts',
  ]);
  assert.match(message, /l1\/tarefas\/layer_2_application\/usecases\/createTarefa\.ts/u);
  assert.equal(message.trim().split('\n').at(-1), '@@agentMaterializeL1 {"scope":"tarefas"}');
  assert.equal(reportMaterialize('tarefas', [], []), 'nothing to materialize');
});

test('R4 first call names the effort units and the defs run followed by /check', () => {
  const base = JSON.parse(readFileSync(join(HERE, 'fixtures', 'R1.changeEffort.json'), 'utf8')) as ChangeEffortFile;
  const effort = reseal(mutate(base, answer => {
    answer.create = [
      unit('route', 'exportarTarefas', 'l1/tarefas/layer_2_application/requests/tarefas_equipe.defs.ts'),
      unit('usecase', 'exportarTarefas', 'l1/tarefas/layer_2_application/usecases/exportarTarefas.defs.ts'),
    ];
    answer.regenerateDefs = [
      unit('request', 'tarefas_equipe', 'l1/tarefas/layer_2_application/requests/tarefas_equipe.defs.ts'),
    ];
    answer.materialize = [];
  }));
  const defs = loadTarefas();
  const plan = planNewReleaseL1(effort, MASTER, defs);
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.equal(plan.path, 'generator');
  const message = reportGeneratorStart('tarefas', generatorUnits(effort, MASTER));
  assert.match(message, /route exportarTarefas l1\/tarefas\/layer_2_application\/requests\/tarefas_equipe\.defs\.ts/u);
  assert.match(message, /usecase exportarTarefas l1\/tarefas\/layer_2_application\/usecases\/exportarTarefas\.defs\.ts/u);
  assert.match(message, /@@agentDefsL1 tarefas \/run/u);
  assert.match(message, /@@agentNewReleaseL1 tarefas \/check/u);
  const lines = message.trim().split('\n');
  assert.equal(lines[lines.length - 2], '@@agentDefsL1 tarefas /run');
  assert.equal(lines[lines.length - 1], '@@agentNewReleaseL1 tarefas /check');
});

test('a check with outside lists the path and no materialize command', () => {
  const outside = ['l1/tarefas/layer_2_application/usecases/createTarefa.defs.ts'];
  const message = reportOutside(outside);
  assert.match(message, /l1\/tarefas\/layer_2_application\/usecases\/createTarefa\.defs\.ts/u);
  assert.equal(message.includes('@@agentMaterializeL1'), false);
});

function reseal(file: ChangeEffortFile): ChangeEffortFile {
  return { ...file, merged: mergeChangeEffort(file.perItem), status: changeEffortFileStatus(file.perItem) };
}

function mutate(file: ChangeEffortFile, edit: (answer: EffortAnswer) => void): ChangeEffortFile {
  const answer = file.perItem[0]?.answers.find(row => row.master.project === MASTER);
  if (!answer) throw new Error('missing l1 answer');
  edit(answer);
  return file;
}

function unit(kind: EffortUnitRef['kind'], id: string, path: string): EffortUnitRef {
  return { kind, id, path };
}

const PROJECT = 102047;
const REQUEST_TS = 'l1/tarefas/layer_2_application/requests/minhas_tarefas.ts';
const USECASE_TS = 'l1/tarefas/layer_2_application/usecases/createTarefa.ts';
const REQUEST_DEFS = 'l1/tarefas/layer_2_application/requests/minhas_tarefas.defs.ts';
const USECASE_DEFS = 'l1/tarefas/layer_2_application/usecases/createTarefa.defs.ts';

test('R1 deletes both generated sources, leaves the defs, and returns one scope command', async () => {
  const effort = readFileSync(join(HERE, 'fixtures', 'R1.changeEffort.json'), 'utf8');
  const both = await runRelease(effort, [REQUEST_TS, USECASE_TS]);
  assert.equal(both.status, 'completed');
  assert.match(both.message, /@@agentMaterializeL1 \{"scope":"tarefas"\}/u);
  assert.equal(both.message.match(/@@agentMaterializeL1/gu)?.length, 1);
  assert.match(both.message, /minhas_tarefas\.ts/u);
  assert.match(both.message, /createTarefa\.ts/u);
  assert.equal(both.files[keyOf(infoOf(REQUEST_TS))].status, 'deleted');
  assert.equal(both.files[keyOf(infoOf(USECASE_TS))].status, 'deleted');
  assert.notEqual(both.files[keyOf(infoOf(REQUEST_DEFS))].status, 'deleted');
  assert.notEqual(both.files[keyOf(infoOf(USECASE_DEFS))].status, 'deleted');

  const missing = await runRelease(effort, [REQUEST_TS]);
  assert.equal(missing.status, 'completed');
  assert.match(missing.message, /@@agentMaterializeL1 \{"scope":"tarefas"\}/u);
  assert.equal(missing.message.includes(USECASE_TS), false);
  assert.equal(missing.files[keyOf(infoOf(REQUEST_TS))].status, 'deleted');
  assert.equal(missing.files[keyOf(infoOf(USECASE_TS))], undefined);
  assert.notEqual(missing.files[keyOf(infoOf(USECASE_DEFS))].status, 'deleted');

  const failed = await runRelease(effort, [REQUEST_TS, USECASE_TS], file => {
    if (file.shortName === 'createTarefa' && file.extension === '.ts') throw new Error('disk full');
    file.status = 'deleted';
  });
  assert.equal(failed.status, 'failed');
  assert.match(failed.message, /failed to delete l1\/tarefas\/layer_2_application\/usecases\/createTarefa\.ts: disk full/u);
  assert.match(failed.message, /Already deleted:\nl1\/tarefas\/layer_2_application\/requests\/minhas_tarefas\.ts/u);
  assert.equal(failed.files[keyOf(infoOf(REQUEST_TS))].status, 'deleted');
  assert.notEqual(failed.files[keyOf(infoOf(USECASE_TS))].status, 'deleted');
  assert.notEqual(failed.files[keyOf(infoOf(REQUEST_DEFS))].status, 'deleted');
  assert.notEqual(failed.files[keyOf(infoOf(USECASE_DEFS))].status, 'deleted');
});

interface HostFile {
  project: number;
  level: number;
  folder: string;
  shortName: string;
  extension: string;
  status: string;
  content: string;
  getValueInfo: () => Promise<{ content: string }>;
  getContent: () => Promise<string>;
}

function keyOf(info: { project: number; level: number; folder: string; shortName: string; extension: string }): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function infoOf(productPath: string, content = ''): HostFile {
  const extension = productPath.endsWith('.defs.ts') ? '.defs.ts' : productPath.endsWith('.json') ? '.json' : '.ts';
  const level = productPath.startsWith('l4/') ? 4 : 1;
  const stem = productPath.slice(`l${level}/`.length, -extension.length);
  const slash = stem.lastIndexOf('/');
  const file: HostFile = {
    project: PROJECT,
    level,
    folder: stem.slice(0, slash),
    shortName: stem.slice(slash + 1),
    extension,
    status: 'changed',
    content,
    getValueInfo: async () => ({ content: file.content }),
    getContent: async () => file.content,
  };
  return file;
}

async function runRelease(
  effort: string,
  sources: string[],
  unlink?: (file: HostFile) => void,
): Promise<{ status: string; message: string; files: Record<string, HostFile> }> {
  const files: Record<string, HostFile> = {};
  const put = (productPath: string, content: string) => {
    const file = infoOf(productPath, content);
    files[keyOf(file)] = file;
  };
  for (const [productPath, content] of Object.entries(loadTarefas())) put(productPath, content);
  put('l4/tarefas/pool/l4/changeEffort.json', effort);
  for (const source of sources) put(source, 'export {}\n');
  (globalThis as { mls: unknown }).mls = {
    actualProject: PROJECT,
    events: { fireFileAction() {} },
    stor: {
      files,
      getKeyToFile: keyOf,
      localStor: {
        setContent: async (file: HostFile, value: { content?: string | null }) => {
          file.content = value.content ?? '';
          return true;
        },
        deleteFile: async (file: HostFile) => {
          if (unlink) unlink(file);
          else file.status = 'deleted';
        },
      },
    },
  };
  const agent = createAgent();
  const prompt = '@@agentNewReleaseL1 tarefas';
  const intents = await agent.beforePromptImplicit!(releaseMeta(), releaseContext(prompt), prompt);
  const step = intents.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.ok(step);
  return { status: step.step.status, message: String(step.step.result), files };
}

function releaseMeta(): IAgentMeta {
  return {
    agentName: 'agentNewReleaseL1',
    agentProject: 102021,
    agentFolder: 'agentNewReleaseL1',
    agentDescription: 'test',
    visibility: 'public',
  };
}

function releaseContext(content: string): mls.msg.ExecutionContext {
  return {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content, senderId: 'u' },
    task: { PK: 'task-1', iaCompressed: { nextSteps: [], longMemory: {} } },
  } as mls.msg.ExecutionContext;
}

function loadTarefas(): Record<string, string> {
  const defs: Record<string, string> = {};
  const root = join(HERE, '../../helpers/effort/fixtures/tarefas');
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) {
        walk(abs);
        continue;
      }
      if (!name.endsWith('.defs.txt')) continue;
      const rel = relative(root, abs).replace(/\.txt$/u, '.ts');
      defs[`l1/tarefas/${rel}`] = readFileSync(abs, 'utf8');
    }
  };
  walk(root);
  return defs;
}
