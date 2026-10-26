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
  type ReleaseRunPhaseLine,
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
const RUN_JSON = 'l1/tarefas/pipeline/agentNewReleaseL1/run.json';
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
  assert.equal(failed.status, 'completed');
  assert.equal(failed.mode, 'manual_later');
  assert.match(failed.title, /^failed: /u);
  assert.match(failed.message, /^failed: failed to delete l1\/tarefas\/layer_2_application\/usecases\/createTarefa\.ts: disk full/u);
  assert.match(failed.message, /Already deleted:\nl1\/tarefas\/layer_2_application\/requests\/minhas_tarefas\.ts/u);
  assert.equal(failed.files[keyOf(infoOf(REQUEST_TS))].status, 'deleted');
  assert.notEqual(failed.files[keyOf(infoOf(USECASE_TS))].status, 'deleted');
  assert.notEqual(failed.files[keyOf(infoOf(REQUEST_DEFS))].status, 'deleted');
  assert.notEqual(failed.files[keyOf(infoOf(USECASE_DEFS))].status, 'deleted');
  const log = JSON.parse(failed.files[keyOf(infoOf(RUN_JSON))].content) as { phases: ReleaseRunPhaseLine[] };
  assert.equal(log.phases.at(-1)?.phase, 'sources');
  assert.equal(log.phases.at(-1)?.status, 'failed');
  assert.equal(log.phases[0]?.phase, 'effort');
});

test('a missing effort refuses on a completed step and the next run replaces run.json', async () => {
  const first = await runRelease('', [], undefined, { effort: false, staleRun: true });
  assert.equal(first.status, 'completed');
  assert.equal(first.mode, 'manual_later');
  assert.match(first.message, /^refused: changeEffort\.json not found: /u);
  assert.match(first.title, /^refused: /u);
  const again = await runRelease('', [], undefined, { effort: false, reuse: first.files });
  const log = JSON.parse(again.files[keyOf(infoOf(RUN_JSON))].content) as { phases: ReleaseRunPhaseLine[] };
  assert.deepEqual(log.phases.map(line => line.phase), ['effort']);
  assert.equal(log.phases[0]?.status, 'refused');
  assert.equal(log.phases.some(line => line.note === 'stale'), false);
});

test('a thrown def read closes with failed: on a completed step', async () => {
  const effort = readFileSync(join(HERE, 'fixtures', 'R1.changeEffort.json'), 'utf8');
  const thrown = await runRelease(effort, [], undefined, {
    prepare: files => {
      const file = files[keyOf(infoOf('l1/tarefas/layer_2_application/requests/minhas_tarefas.defs.ts'))];
      file.getValueInfo = async () => {
        throw new Error('defs unreadable');
      };
      file.getContent = undefined as unknown as HostFile['getContent'];
    },
  });
  assert.equal(thrown.status, 'completed');
  assert.equal(thrown.mode, 'manual_later');
  assert.match(thrown.message, /^failed: l1\/tarefas\/.*minhas_tarefas\.defs\.ts: defs unreadable/u);
  assert.equal(thrown.steps.every(status => status !== 'failed'), true);
  const log = JSON.parse(thrown.files[keyOf(infoOf(RUN_JSON))].content) as { phases: ReleaseRunPhaseLine[] };
  assert.equal(log.phases.at(-1)?.phase, 'plan');
  assert.equal(log.phases.at(-1)?.status, 'failed');
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
  options?: { effort?: boolean; staleRun?: boolean; reuse?: Record<string, HostFile>; prepare?: (files: Record<string, HostFile>) => void; prompt?: string; failWrite?: (file: HostFile) => boolean },
): Promise<{ status: string; message: string; title: string; mode: string; steps: string[]; files: Record<string, HostFile> }> {
  const files: Record<string, HostFile> = options?.reuse ?? {};
  const put = (productPath: string, content: string) => {
    const file = infoOf(productPath, content);
    files[keyOf(file)] = file;
  };
  if (!options?.reuse) {
    for (const [productPath, content] of Object.entries(loadTarefas())) put(productPath, content);
    if (options?.effort !== false) put('l4/tarefas/pool/l4/changeEffort.json', effort);
    for (const source of sources) put(source, 'export {}\n');
    put(RUN_JSON, options?.staleRun ? JSON.stringify({ phases: [{ phase: 'plan', status: 'ok', note: 'stale' }] }) : '{}\n');
    options?.prepare?.(files);
  }
  (globalThis as { mls: unknown }).mls = {
    actualProject: PROJECT,
    events: { fireFileAction() {} },
    stor: {
      files,
      getKeyToFile: keyOf,
      localStor: {
        setContent: async (file: HostFile, value: { content?: string | null }) => {
          if (options?.failWrite?.(file)) throw new Error('run log disk full');
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
  const prompt = options?.prompt ?? '@@agentNewReleaseL1 tarefas';
  const intents = await agent.beforePromptImplicit!(releaseMeta(), releaseContext(prompt), prompt);
  const steps = intents.filter((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  const step = steps[0];
  assert.ok(step);
  return {
    status: step.step.status,
    message: String(step.step.result),
    title: String(step.step.stepTitle || ''),
    mode: String(step.step.planning?.executionMode || ''),
    steps: steps.map(item => item.step.status),
    files,
  };
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

const FLOW_DEF = 'l1/tarefas/layer_2_application/workflows/resumoDiarioTarefas.defs.ts';
const FLOW_TS = 'l1/tarefas/layer_2_application/workflows/resumoDiarioTarefas.ts';
const OTHER_DEF = 'l1/tarefas/layer_2_application/workflows/processoTarefa.defs.ts';
const OTHER_TS = 'l1/tarefas/layer_2_application/workflows/processoTarefa.ts';
const ENGINE = 'l1/tarefas/layer_1_external/adapters/workflow/engine.ts';
const TICK = 'l1/tarefas/layer_1_external/adapters/persistence/moduleTick.ts';
const SNAPSHOT = 'l1/tarefas/pipeline/agentNewReleaseL1/snapshot.json';

function workflowEffort(edit: (answer: EffortAnswer) => void): string {
  const base = JSON.parse(readFileSync(join(HERE, 'fixtures', 'R3.changeEffort.json'), 'utf8')) as ChangeEffortFile;
  const effort = reseal(mutate(base, answer => {
    answer.regenerateDefs = [];
    answer.materialize = [];
    edit(answer);
  }));
  effort.request.items[0] = {
    changeId: effort.request.items[0]!.changeId,
    kind: 'process',
    op: 'removed',
    entity: '',
    source: 'process.defs.ts',
  };
  return JSON.stringify(reseal(effort));
}

test('removing resumoDiarioTarefas deletes the flow and the generated files that cite it', async () => {
  const effort = workflowEffort(answer => {
    answer.remove.push(unit('workflow', 'resumoDiarioTarefas', FLOW_DEF));
  });
  const cited = await runRelease(effort, [FLOW_DEF, FLOW_TS, OTHER_DEF, OTHER_TS, ENGINE, TICK], undefined, {
    prepare: files => {
      files[keyOf(infoOf(ENGINE))].content = 'register(resumoDiarioTarefas)\n';
      files[keyOf(infoOf(TICK))].content = 'tick resumoDiarioTarefas\n';
      files[keyOf(infoOf(OTHER_DEF))].content = 'export const processoTarefa = {}\n';
      files[keyOf(infoOf(OTHER_TS))].content = 'export const processoTarefa = {}\n';
    },
  });
  assert.match(cited.message, /^done: /u);
  assert.equal(cited.message.trim().split('\n').at(-1), '@@agentMaterializeL1 {"scope":"tarefas"}');
  for (const path of [FLOW_DEF, FLOW_TS, ENGINE, TICK]) assert.equal(cited.files[keyOf(infoOf(path))].status, 'deleted');
  assert.notEqual(cited.files[keyOf(infoOf(OTHER_DEF))].status, 'deleted');
  assert.notEqual(cited.files[keyOf(infoOf(OTHER_TS))].status, 'deleted');

  const silent = await runRelease(effort, [FLOW_DEF, FLOW_TS, OTHER_DEF, ENGINE, TICK], undefined, {
    prepare: files => {
      files[keyOf(infoOf(ENGINE))].content = 'register(processoTarefa)\n';
      files[keyOf(infoOf(TICK))].content = 'tick processoTarefa\n';
    },
  });
  assert.equal(silent.files[keyOf(infoOf(FLOW_DEF))].status, 'deleted');
  assert.equal(silent.files[keyOf(infoOf(FLOW_TS))].status, 'deleted');
  assert.equal(silent.files[keyOf(infoOf(ENGINE))].status, 'deleted');
  assert.equal(silent.files[keyOf(infoOf(TICK))].status, 'deleted');
  assert.notEqual(silent.files[keyOf(infoOf(OTHER_DEF))].status, 'deleted');
  assert.equal(silent.message.includes(ENGINE), true);
  assert.equal(silent.message.includes(TICK), true);
  const silentLog = JSON.parse(silent.files[keyOf(infoOf(RUN_JSON))].content) as { phases: ReleaseRunPhaseLine[] };
  const silentSources = silentLog.phases.filter(line => line.phase === 'sources').at(-1);
  assert.equal(silentSources?.status, 'ok');
  assert.equal(silentSources?.note.includes(ENGINE), true);
  assert.equal(silentSources?.note.includes(TICK), true);

  const refused = await runRelease(workflowEffort(answer => {
    answer.remove.push(unit('entity', 'tarefa', 'l1/tarefas/layer_3_domain/entities/tarefa.defs.ts'));
  }), [FLOW_DEF]);
  assert.match(refused.message, /^refused: /u);
  assert.match(refused.message, /remove of entity tarefa is not applied/u);
  assert.notEqual(refused.files[keyOf(infoOf(FLOW_DEF))].status, 'deleted');

  const failed = await runRelease(effort, [FLOW_DEF, FLOW_TS, ENGINE], file => {
    if (file.shortName === 'engine') throw new Error('disk full');
    file.status = 'deleted';
  }, {
    prepare: files => {
      files[keyOf(infoOf(ENGINE))].content = 'resumoDiarioTarefas\n';
    },
  });
  assert.match(failed.message, /^failed: failed to delete l1\/tarefas\/layer_1_external\/adapters\/workflow\/engine\.ts: disk full/u);
  assert.match(failed.message, /Already deleted:\n/u);
  assert.match(failed.message, new RegExp(FLOW_DEF.replace(/[.]/gu, '\\.'), 'u'));
  assert.equal(failed.files[keyOf(infoOf(FLOW_DEF))].status, 'deleted');
  assert.equal(failed.files[keyOf(infoOf(FLOW_TS))].status, 'deleted');
  assert.notEqual(failed.files[keyOf(infoOf(ENGINE))].status, 'deleted');

  const generatorEffort = workflowEffort(answer => {
    answer.contract = 'change';
    answer.remove.push(unit('workflow', 'resumoDiarioTarefas', FLOW_DEF));
  });
  const generated = await runRelease(generatorEffort, [FLOW_DEF, FLOW_TS, ENGINE, TICK, SNAPSHOT], undefined, {
    prepare: files => {
      files[keyOf(infoOf(ENGINE))].content = 'resumoDiarioTarefas\n';
      files[keyOf(infoOf(TICK))].content = 'resumoDiarioTarefas\n';
      files[keyOf(infoOf(SNAPSHOT))].content = '{}\n';
    },
  });
  assert.match(generated.message, /@@agentDefsL1 tarefas \/run/u);
  assert.match(generated.message, /@@agentNewReleaseL1 tarefas \/check/u);
  assert.equal(generated.message.trim().split('\n').at(-2), '@@agentDefsL1 tarefas /run');
  const portrait = JSON.parse(generated.files[keyOf(infoOf(SNAPSHOT))].content) as Record<string, string>;
  assert.equal(Object.prototype.hasOwnProperty.call(portrait, FLOW_DEF), false);
  assert.equal(generated.files[keyOf(infoOf(FLOW_DEF))].status, 'deleted');
  assert.equal(generated.files[keyOf(infoOf(ENGINE))].status, 'deleted');
  assert.equal(generated.files[keyOf(infoOf(TICK))].status, 'deleted');
  assert.equal(generated.message.includes(ENGINE), true);
  assert.equal(generated.message.includes(TICK), true);
});

test('W2 and W3 go through the generator and the check deletes the module engine and clock; a rule effort deletes neither', async () => {
  const w2Effort = workflowEffort(answer => {
    answer.regenerateDefs = [unit('workflow', 'resumoDiarioTarefas', FLOW_DEF)];
    answer.materialize = [unit('workflow', 'resumoDiarioTarefas', FLOW_DEF)];
  });
  const w2Started = await runRelease(w2Effort, [FLOW_TS, ENGINE, TICK, SNAPSHOT]);
  assert.match(w2Started.message, /^done: /u);
  assert.equal(w2Started.message.includes('@@agentDefsL1'), true);
  assert.notEqual(w2Started.files[keyOf(infoOf(ENGINE))].status, 'deleted');
  const w2 = await runRelease(w2Effort, [], undefined, { reuse: w2Started.files, prompt: '@@agentNewReleaseL1 tarefas /check' });
  assert.match(w2.message, /^done: /u);
  assert.equal(w2.files[keyOf(infoOf(ENGINE))].status, 'deleted');
  assert.equal(w2.files[keyOf(infoOf(TICK))].status, 'deleted');
  assert.notEqual(w2.files[keyOf(infoOf(FLOW_DEF))].status, 'deleted');
  const w2Log = JSON.parse(w2.files[keyOf(infoOf(RUN_JSON))].content) as { phases: ReleaseRunPhaseLine[] };
  assert.equal(w2Log.phases.filter(line => line.phase === 'sources').at(-1)?.note.includes(ENGINE), true);

  const w3Effort = workflowEffort(answer => {
    answer.regenerateDefs = [unit('workflow', 'processoTarefa', OTHER_DEF)];
    answer.materialize = [unit('workflow', 'processoTarefa', OTHER_DEF)];
  });
  const w3Started = await runRelease(w3Effort, [OTHER_TS, ENGINE, SNAPSHOT]);
  const w3 = await runRelease(w3Effort, [], undefined, { reuse: w3Started.files, prompt: '@@agentNewReleaseL1 tarefas /check' });
  assert.equal(w3.files[keyOf(infoOf(ENGINE))].status, 'deleted');
  assert.equal(w3.files[keyOf(infoOf(TICK))], undefined);
  assert.equal(w3.message.includes(TICK), false);
  assert.equal(w3.message.includes(ENGINE), true);

  const rule = readFileSync(join(HERE, 'fixtures', 'R1.changeEffort.json'), 'utf8');
  const kept = await runRelease(rule, [REQUEST_TS, USECASE_TS, ENGINE, TICK]);
  assert.equal(kept.files[keyOf(infoOf(ENGINE))].status, 'changed');
  assert.equal(kept.files[keyOf(infoOf(TICK))].status, 'changed');
  assert.equal(kept.message.includes(ENGINE), false);
  assert.equal(kept.message.includes(TICK), false);
});

test('a generator check deletes the module engine and clock when the effort regenerates a workflow', async () => {
  const effort = workflowEffort(answer => {
    answer.contract = 'change';
    answer.regenerateDefs = [unit('workflow', 'resumoDiarioTarefas', FLOW_DEF)];
  });
  const started = await runRelease(effort, [ENGINE, TICK, SNAPSHOT]);
  assert.notEqual(started.files[keyOf(infoOf(ENGINE))].status, 'deleted');
  assert.notEqual(started.files[keyOf(infoOf(TICK))].status, 'deleted');
  const checked = await runRelease(effort, [], undefined, {
    reuse: started.files,
    prompt: '@@agentNewReleaseL1 tarefas /check',
  });
  assert.match(checked.message, /^done: /u);
  assert.equal(checked.files[keyOf(infoOf(ENGINE))].status, 'deleted');
  assert.equal(checked.files[keyOf(infoOf(TICK))].status, 'deleted');
  const log = JSON.parse(checked.files[keyOf(infoOf(RUN_JSON))].content) as { phases: ReleaseRunPhaseLine[] };
  assert.equal(log.phases.filter(line => line.phase === 'sources').at(-1)?.note.includes(TICK), true);
});

test('a call without a module is a refusal on a completed step', async () => {
  const usage = await runRelease('', [], undefined, { prompt: '@@agentNewReleaseL1' });
  assert.equal(usage.status, 'completed');
  assert.equal(usage.mode, 'manual_later');
  assert.match(usage.message, /^refused: Usage: @@agentNewReleaseL1 <module>/u);
});

test('a run log that cannot be written does not hide the refusal reason', async () => {
  const refused = await runRelease('', [], undefined, {
    effort: false,
    failWrite: file => file.shortName === 'run',
  });
  assert.equal(refused.status, 'completed');
  assert.match(refused.message, /^refused: changeEffort\.json not found: .*; run log: run log disk full/u);
});
