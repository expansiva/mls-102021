/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/plan.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseDefinitionSource } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { planNewReleaseL1 } from '/_102021_/l2/agentNewReleaseL1/helpers/plan.js';
import { changeEffortFileStatus, mergeChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';
import type { ChangeEffortFile, EffortAnswer, EffortUnitRef } from '/_102035_/l2/solution/poolPlan.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFS_ROOT = join(HERE, '../../helpers/effort/fixtures/tarefas');
const MASTER = '102021';

function loadTarefas(): Record<string, string> {
  const defs: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) {
        walk(abs);
        continue;
      }
      if (!name.endsWith('.defs.txt')) continue;
      const rel = relative(DEFS_ROOT, abs).replace(/\.txt$/, '.ts');
      defs[`l1/tarefas/${rel}`] = readFileSync(abs, 'utf8');
    }
  };
  walk(DEFS_ROOT);
  return defs;
}

const DEFS = loadTarefas();

function loadEffort(name: string): ChangeEffortFile {
  return JSON.parse(readFileSync(join(HERE, 'fixtures', name), 'utf8')) as ChangeEffortFile;
}

function reseal(file: ChangeEffortFile): ChangeEffortFile {
  return {
    ...file,
    merged: mergeChangeEffort(file.perItem),
    status: changeEffortFileStatus(file.perItem),
  };
}

function l1Answer(file: ChangeEffortFile): EffortAnswer {
  const answer = file.perItem[0]?.answers.find(row => row.master.project === MASTER);
  if (!answer) throw new Error('missing l1 answer');
  return answer;
}

function dataOf(source: string): Record<string, unknown> {
  const parsed = parseDefinitionSource(source);
  if (!('definition' in parsed) || !parsed.definition || typeof parsed.definition !== 'object') {
    throw new Error('definition did not parse');
  }
  const data = (parsed.definition as { data?: unknown }).data;
  if (!data || typeof data !== 'object') throw new Error('definition has no data');
  return data as Record<string, unknown>;
}

function overlay(defs: Record<string, string>, edits: { path: string; source: string }[]): Record<string, string> {
  const next = { ...defs };
  for (const edit of edits) next[edit.path] = edit.source;
  return next;
}

test('R1 adds the rule on createTarefa and only on cmdCriarTarefa', () => {
  const plan = planNewReleaseL1(loadEffort('R1.changeEffort.json'), MASTER, DEFS);
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.equal(plan.path, 'def-edit');
  const paths = plan.edits.map(edit => edit.path);
  assert.deepEqual(paths, [
    'l1/tarefas/layer_2_application/requests/minhas_tarefas.defs.ts',
    'l1/tarefas/layer_2_application/usecases/createTarefa.defs.ts',
  ]);
  assert.deepEqual(plan.targets, paths);
  assert.equal(plan.flow, false);
  const usecase = dataOf(plan.edits[1]!.source);
  const applied = usecase.rulesApplied as string[];
  assert.equal(applied[applied.length - 1], 'novaTarefaPrioridadeMedia');
  assert.equal(applied.filter(id => id === 'novaTarefaPrioridadeMedia').length, 1);
  const requests = dataOf(plan.edits[0]!.source).requests as Array<Record<string, unknown>>;
  const touched = requests.filter(route => Array.isArray(route.rules) && (route.rules as string[]).includes('novaTarefaPrioridadeMedia'));
  assert.deepEqual(touched.map(route => route.route), ['tarefas.minhas_tarefas.cmdCriarTarefa']);
});

test('R2 rule changed edits nothing and targets the materialized units', () => {
  const plan = planNewReleaseL1(loadEffort('R2.changeEffort.json'), MASTER, DEFS);
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.deepEqual(plan.edits, []);
  assert.deepEqual(plan.targets, [
    'l1/tarefas/layer_3_domain/entities/tarefa.defs.ts',
    'l1/tarefas/layer_2_application/requests/inicio.defs.ts',
    'l1/tarefas/layer_2_application/requests/minhas_tarefas.defs.ts',
    'l1/tarefas/layer_2_application/usecases/devolver.defs.ts',
  ]);
});

test('R3 removes the rule and changes nothing else', () => {
  const plan = planNewReleaseL1(loadEffort('R3.changeEffort.json'), MASTER, DEFS);
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  const ruleId = 'devolucaoExigeMotivo';
  assert.deepEqual(plan.edits.map(edit => edit.path), [
    'l1/tarefas/layer_3_domain/entities/tarefa.defs.ts',
    'l1/tarefas/layer_2_application/requests/inicio.defs.ts',
    'l1/tarefas/layer_2_application/requests/minhas_tarefas.defs.ts',
    'l1/tarefas/layer_2_application/usecases/devolver.defs.ts',
  ]);
  const byPath = new Map(plan.edits.map(edit => [edit.path, edit.source]));
  const usecase = dataOf(byPath.get('l1/tarefas/layer_2_application/usecases/devolver.defs.ts')!);
  assert.equal((usecase.rulesApplied as string[]).includes(ruleId), false);
  const entity = dataOf(byPath.get('l1/tarefas/layer_3_domain/entities/tarefa.defs.ts')!);
  const transitions = (entity.lifecycle as { transitions: Array<Record<string, unknown>> }).transitions;
  assert.equal(JSON.stringify(entity).includes(ruleId), false);
  assert.equal(transitions.some(row => Array.isArray(row.ruleRefs) && (row.ruleRefs as string[]).includes(ruleId)), false);
  for (const path of [
    'l1/tarefas/layer_2_application/requests/inicio.defs.ts',
    'l1/tarefas/layer_2_application/requests/minhas_tarefas.defs.ts',
  ]) {
    const requests = dataOf(byPath.get(path)!).requests as Array<Record<string, unknown>>;
    assert.equal(requests.some(route => JSON.stringify(route.rules).includes(ruleId)), false);
  }
  const routes = [
    ...((dataOf(byPath.get('l1/tarefas/layer_2_application/requests/minhas_tarefas.defs.ts')!).requests) as Array<Record<string, unknown>>),
    ...((dataOf(byPath.get('l1/tarefas/layer_2_application/requests/inicio.defs.ts')!).requests) as Array<Record<string, unknown>>),
  ];
  const named = routes.filter(route => route.route === 'tarefas.minhas_tarefas.cmdDevolver' || route.route === 'tarefas.inicio.devolverTarefa');
  assert.equal(named.length, 2);
  for (const edit of plan.edits) {
    const before = JSON.parse(definitionJson(DEFS[edit.path]!)) as unknown;
    const after = JSON.parse(definitionJson(edit.source)) as unknown;
    assert.deepEqual(diffValues(before, after), []);
  }
});

test('R1 applied twice edits nothing', () => {
  const first = planNewReleaseL1(loadEffort('R1.changeEffort.json'), MASTER, DEFS);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const second = planNewReleaseL1(loadEffort('R1.changeEffort.json'), MASTER, overlay(DEFS, first.edits));
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.deepEqual(second.edits, []);
});

test('R4 new route and usecase on tarefas_equipe takes the generator and allows the page controller', () => {
  const base = loadEffort('R1.changeEffort.json');
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
  const plan = planNewReleaseL1(effort, MASTER, DEFS);
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.equal(plan.path, 'generator');
  assert.deepEqual(plan.edits, []);
  assert.deepEqual(plan.allowed, [
    'l1/tarefas/layer_2_application/requests/tarefas_equipe.defs.ts',
    'l1/tarefas/layer_2_application/usecases/exportarTarefas.defs.ts',
    'l1/tarefas/layer_1_external/adapters/http/controllers/tarefas_equipe.defs.ts',
  ]);
});

test('a contract file status takes the generator; entity create, remove, abend and a request with no route are refused', () => {
  const base = loadEffort('R1.changeEffort.json');
  const withCreate = reseal(mutate(base, answer => {
    answer.create.push(unit('entity', 'tarefa', 'l1/tarefas/layer_3_domain/entities/tarefa.defs.ts'));
  }));
  const createPlan = planNewReleaseL1(withCreate, MASTER, DEFS);
  assert.equal(createPlan.ok, false);
  if (createPlan.ok) return;
  assert.match(createPlan.reason, /create is not applied/);

  const removed = loadEffort('R3.changeEffort.json');
  const process = reseal(mutate(removed, answer => {
    answer.remove.push(unit('entity', 'tarefa', 'l1/tarefas/layer_3_domain/entities/tarefa.defs.ts'));
    answer.regenerateDefs = [];
    answer.materialize = [];
  }));
  process.request.items[0] = {
    changeId: process.request.items[0]!.changeId,
    kind: 'process',
    op: 'removed',
    entity: '',
    source: 'process.defs.ts',
  };
  const removePlan = planNewReleaseL1(reseal(process), MASTER, DEFS);
  assert.equal(removePlan.ok, false);
  if (removePlan.ok) return;
  assert.match(removePlan.reason, /remove of entity tarefa is not applied/);

  const contract = reseal(mutate(base, answer => {
    answer.contract = 'change';
  }));
  const contractPlan = planNewReleaseL1(contract, MASTER, DEFS);
  assert.equal(contractPlan.ok, true);
  if (!contractPlan.ok) return;
  assert.equal(contractPlan.path, 'generator');
  assert.equal(contract.status, 'contract');

  const abend = reseal(mutate(base, answer => {
    answer.status = 'abend';
    answer.abend = { reason: 'módulo sem defs gerados' };
    answer.regenerateDefs = [];
    answer.materialize = [];
  }));
  const abendPlan = planNewReleaseL1(abend, MASTER, DEFS);
  assert.equal(abendPlan.ok, false);
  if (abendPlan.ok) return;
  assert.match(abendPlan.reason, /status is abend/);

  const noRoute = reseal(mutate(base, answer => {
    answer.regenerateDefs = answer.regenerateDefs.filter(row => row.kind === 'request');
    answer.materialize = answer.materialize.filter(row => row.kind === 'request');
  }));
  const noRoutePlan = planNewReleaseL1(noRoute, MASTER, DEFS);
  assert.equal(noRoutePlan.ok, false);
  if (noRoutePlan.ok) return;
  assert.match(noRoutePlan.reason, /cannot tell which route takes the rule/);
});

test('a workflow remove is accepted and a remove that is not a workflow is refused', () => {
  const removed = loadEffort('R3.changeEffort.json');
  const flow = 'l1/tarefas/layer_2_application/workflows/resumoDiarioTarefas.defs.ts';
  const process = reseal(mutate(removed, answer => {
    answer.remove.push(unit('workflow', 'resumoDiarioTarefas', flow));
    answer.regenerateDefs = [];
    answer.materialize = [];
  }));
  process.request.items[0] = {
    changeId: process.request.items[0]!.changeId,
    kind: 'process',
    op: 'removed',
    entity: '',
    source: 'process.defs.ts',
  };
  const plan = planNewReleaseL1(reseal(process), MASTER, DEFS);
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.equal(plan.path, 'def-edit');
  assert.deepEqual(plan.removes, [flow]);
  assert.equal(plan.flow, true);
  assert.deepEqual(plan.edits, []);
  assert.deepEqual(plan.targets, []);

  const mixed = reseal(mutate(removed, answer => {
    answer.remove.push(unit('workflow', 'resumoDiarioTarefas', flow));
    answer.regenerateDefs = [unit('usecase', 'devolver', 'l1/tarefas/layer_2_application/usecases/devolver.defs.ts')];
  }));
  mixed.request.items[0] = {
    changeId: mixed.request.items[0]!.changeId,
    kind: 'process',
    op: 'removed',
    entity: '',
    source: 'process.defs.ts',
  };
  const stillRules = planNewReleaseL1(reseal(mixed), MASTER, DEFS);
  assert.equal(stillRules.ok, false);
  if (stillRules.ok) return;
  assert.match(stillRules.reason, /regenerateDefs is not from a rule/);

  const withRoute = reseal(mutate(removed, answer => {
    answer.contract = 'change';
    answer.remove.push(unit('workflow', 'resumoDiarioTarefas', flow));
  }));
  const generator = planNewReleaseL1(withRoute, MASTER, DEFS);
  assert.equal(generator.ok, true);
  if (!generator.ok) return;
  assert.equal(generator.path, 'generator');
  assert.deepEqual(generator.removes, [flow]);
});

test('an effort with answers only from 102020 is refused on the def edit and on the generator', () => {
  const filtered = JSON.parse(JSON.stringify(loadEffort('R1.changeEffort.json'))) as ChangeEffortFile;
  for (const row of filtered.perItem) {
    row.answers = row.answers.filter(answer => answer.master.project === '102020');
  }
  assert.ok(filtered.perItem.some(row => row.answers.length > 0));
  const defEdit = planNewReleaseL1(reseal(filtered), MASTER, DEFS);
  assert.equal(defEdit.ok, false);
  if (defEdit.ok) return;
  assert.equal(defEdit.reason, `change effort has no answer from master ${MASTER}`);

  const contract = JSON.parse(JSON.stringify(filtered)) as ChangeEffortFile;
  contract.perItem[0]!.answers[0]!.contract = 'change';
  const generator = planNewReleaseL1(reseal(contract), MASTER, DEFS);
  assert.equal(generator.ok, false);
  if (generator.ok) return;
  assert.equal(generator.reason, `change effort has no answer from master ${MASTER}`);
});

test('an invalid change effort is refused with the gate reason', () => {
  const plan = planNewReleaseL1({ schemaVersion: 'no' }, MASTER, DEFS);
  assert.equal(plan.ok, false);
  if (plan.ok) return;
  assert.match(plan.reason, /schema/);
});

function mutate(file: ChangeEffortFile, visit: (answer: EffortAnswer) => void): ChangeEffortFile {
  const copy = JSON.parse(JSON.stringify(file)) as ChangeEffortFile;
  visit(l1Answer(copy));
  return copy;
}

function unit(kind: EffortUnitRef['kind'], id: string, path: string): EffortUnitRef {
  return { kind, id, path };
}

function definitionJson(source: string): string {
  const marker = 'export const definition = ';
  const start = source.indexOf(marker);
  const end = source.indexOf(' as const', start);
  return source.slice(start + marker.length, end);
}

/** Paths whose only change is the absence of a removed rule id. Any other difference fails the test. */
function diffValues(before: unknown, after: unknown, path = '$'): string[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (Array.isArray(before) && Array.isArray(after)) {
    const removed = before.filter(entry => typeof entry === 'string' && !after.includes(entry));
    const added = after.filter(entry => typeof entry === 'string' && !before.includes(entry));
    if (added.length === 0 && removed.every(entry => entry === 'devolucaoExigeMotivo') && after.length === before.length - removed.length) {
      return [];
    }
  }
  if (before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after)) {
    const left = before as Record<string, unknown>;
    const right = after as Record<string, unknown>;
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    const issues: string[] = [];
    for (const key of keys) issues.push(...diffValues(left[key], right[key], `${path}.${key}`));
    return issues;
  }
  return [`${path}: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`];
}

test('a removed flow with its task item is applied: the regenerate of the removed flow is dropped', () => {
  const flow = 'l1/tarefas/layer_2_application/workflows/resumoDiarioTarefas.defs.ts';
  const file = JSON.parse(JSON.stringify(loadEffort('R3.changeEffort.json'))) as ChangeEffortFile;
  const first = file.perItem[0]!;
  const processId = 'process:resumoDiarioTarefas';
  const taskId = 'task:resumoDiarioTarefas.avisarVencendo';
  file.request.items[0] = { changeId: processId, kind: 'process', op: 'removed', entity: '', source: 'workflows.defs.ts' };
  first.item = processId;
  for (const answer of first.answers) {
    answer.item = processId;
    answer.regenerateDefs = [];
    answer.materialize = [];
    if (answer.master.project === MASTER) answer.remove = [unit('workflow', 'resumoDiarioTarefas', flow)];
  }
  const second = JSON.parse(JSON.stringify(first)) as typeof first;
  second.item = taskId;
  for (const answer of second.answers) {
    answer.item = taskId;
    answer.remove = [];
    if (answer.master.project === MASTER) {
      answer.regenerateDefs = [unit('workflow', 'resumoDiarioTarefas', flow)];
      answer.materialize = [unit('workflow', 'resumoDiarioTarefas', flow)];
    }
  }
  file.perItem.push(second);
  file.request.items.push({ changeId: taskId, kind: 'task', op: 'removed', entity: '', source: 'workflows.defs.ts' });
  const plan = planNewReleaseL1(reseal(file), MASTER, DEFS);
  assert.equal(plan.ok, true, plan.ok ? '' : plan.reason);
  if (!plan.ok) return;
  assert.equal(plan.path, 'def-edit');
  assert.deepEqual(plan.removes, [flow]);
  assert.equal(plan.flow, true);
  assert.deepEqual(plan.targets, []);
});

test('W2 and W3 mark flow when a workflow is regenerated and a rule effort does not', () => {
  const resumo = 'l1/tarefas/layer_2_application/workflows/resumoDiarioTarefas.defs.ts';
  const processo = 'l1/tarefas/layer_2_application/workflows/processoTarefa.defs.ts';
  const w2 = planNewReleaseL1(reseal(mutate(loadEffort('R3.changeEffort.json'), answer => {
    answer.regenerateDefs = [unit('workflow', 'resumoDiarioTarefas', resumo)];
    answer.materialize = [unit('workflow', 'resumoDiarioTarefas', resumo)];
  })), MASTER, DEFS);
  assert.equal(w2.ok, true, w2.ok ? '' : w2.reason);
  if (!w2.ok) return;
  assert.equal(w2.flow, true);
  assert.equal(w2.path, 'generator');
  assert.deepEqual(w2.allowed, [resumo]);

  const w3 = planNewReleaseL1(reseal(mutate(loadEffort('R3.changeEffort.json'), answer => {
    answer.regenerateDefs = [unit('workflow', 'processoTarefa', processo)];
    answer.materialize = [unit('workflow', 'processoTarefa', processo)];
  })), MASTER, DEFS);
  assert.equal(w3.ok, true, w3.ok ? '' : w3.reason);
  if (!w3.ok) return;
  assert.equal(w3.flow, true);
  assert.equal(w3.path, 'generator');
  assert.deepEqual(w3.allowed, [processo]);
});
