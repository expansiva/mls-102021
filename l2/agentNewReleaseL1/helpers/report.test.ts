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
  reportNewRelease,
  reportOutside,
} from '/_102021_/l2/agentNewReleaseL1/helpers/report.js';
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

test('R1 report names both edits and both materialize commands', () => {
  const effort = JSON.parse(readFileSync(join(HERE, 'fixtures', 'R1.changeEffort.json'), 'utf8')) as ChangeEffortFile;
  const defs = loadTarefas();
  const plan = planNewReleaseL1(effort, MASTER, defs);
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  const message = reportNewRelease(editNotes(effort, MASTER, plan.edits.map(edit => edit.path)), plan.targets);
  assert.match(message, /l1\/tarefas\/layer_2_application\/requests\/minhas_tarefas\.defs\.ts: added novaTarefaPrioridadeMedia/u);
  assert.match(message, /l1\/tarefas\/layer_2_application\/usecases\/createTarefa\.defs\.ts: added novaTarefaPrioridadeMedia/u);
  assert.match(message, /@@agentMaterializeL1 \{"target":"l1\/tarefas\/layer_2_application\/requests\/minhas_tarefas\.defs\.ts"\}/u);
  assert.match(message, /@@agentMaterializeL1 \{"target":"l1\/tarefas\/layer_2_application\/usecases\/createTarefa\.defs\.ts"\}/u);
  assert.equal(message.trim().split('\n').length, 4);
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
