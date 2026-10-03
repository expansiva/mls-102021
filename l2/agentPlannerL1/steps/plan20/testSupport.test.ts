/// <mls fileReference="_102021_/l2/agentPlannerL1/steps/plan20/testSupport.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { L1Inventory } from '/_102021_/l2/agentPlannerL1/helpers/l1Inventory.js';
import {
  normalizeP1Backend,
  parseP1Actors,
  parseP1Entity,
  parseP1Needs,
  planP1Backend,
  type P1EntityView,
  type P1PlanBackendInput,
} from '/_102021_/l2/agentPlannerL1/steps/plan20/contracts.js';
import type { PoolBackendFile, PoolTestSupportItem } from '/_102035_/l2/solution/poolPlan.js';
import { repairP1Backend, validateP1Backend } from '/_102021_/l2/agentPlannerL1/steps/plan20/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_TEXT = readFileSync(path.join(HERE, 'fixtures/testSupport-agendaClinica.json'), 'utf8');
const AT = new Date(Date.UTC(2026, 8, 27, 12, 0, 0));
const EMPTY: L1Inventory = { routes: [], usecases: [], ports: [], tables: [], present: false };

interface Fixture {
  needs: unknown;
  access: unknown;
  ontology: unknown[];
}

function inputFrom(text: string): P1PlanBackendInput {
  const raw = JSON.parse(text) as Fixture;
  return {
    needs: parseP1Needs(raw.needs),
    inventory: EMPTY,
    ontology: raw.ontology.map(item => parseP1Entity(item)).filter((item): item is P1EntityView => item !== null),
    actors: parseP1Actors(raw.access),
    now: AT,
  };
}

/** Every module, entity, table, actor, page, journey, step, transition and state id of the fixture. */
function renameMap(text: string): Array<[string, string]> {
  const raw = JSON.parse(text) as Fixture;
  const input = inputFrom(text);
  const entities = input.ontology.map(item => item.entityId);
  const lower = new Set<string>([input.needs.moduleName]);
  input.actors!.forEach(actor => lower.add(actor.actorId));
  for (const page of input.needs.pages) {
    lower.add(page.pageId);
    for (const ref of [...page.reads.flatMap(item => item.from), ...page.writes.flatMap(item => item.from)]) {
      ref.replace(/^journey:/, '').split('/').forEach(token => lower.add(token));
    }
    page.writes.forEach(item => item.transitionRef && lower.add(item.transitionRef));
  }
  for (const item of raw.ontology as Array<{ lifecycleStates?: Array<{ state: string }>; transitions?: Array<{ transitionId: string }> }>) {
    (item.lifecycleStates ?? []).forEach(row => lower.add(row.state));
    (item.transitions ?? []).forEach(row => lower.add(row.transitionId));
  }
  entities.forEach(entity => lower.add(entity.charAt(0).toLowerCase() + entity.slice(1)));
  const map: Array<[string, string]> = [];
  entities.forEach((entity, index) => {
    map.push([entity, `Qx${index}`]);
    map.push([entity.charAt(0).toLowerCase() + entity.slice(1), `qx${index}`]);
  });
  let next = entities.length;
  for (const token of lower) {
    if (map.some(([from]) => from === token)) continue;
    map.push([token, `qx${next++}`]);
  }
  return map.sort((left, right) => right[0].length - left[0].length);
}

function rename(text: string, map: Array<[string, string]>): string {
  let out = text;
  for (const [from, to] of map) out = out.replace(new RegExp(`(?<![A-Za-z0-9_])${from}(?![A-Za-z0-9_])`, 'g'), to);
  return out;
}

function canonical(items: readonly PoolTestSupportItem[]): string {
  const sorted = items.map(item => ({
    ...item,
    actorRefs: [...item.actorRefs].sort(),
    entityRefs: [...item.entityRefs].sort(),
    sourceRefs: [...item.sourceRefs].sort(),
  })).sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  return JSON.stringify(sorted);
}

void test('testSupport derives identities, module data and related MDM from needs, actors, fk and lifecycle', () => {
  const input = inputFrom(FIXTURE_TEXT);
  const { file } = planP1Backend(input);
  assert.deepEqual(file.testSupport.map(item => [item.id, item.owner, item.entityRefs, item.actorRefs]), [
    ['data:Consulta', 'L1', ['Consulta', 'Paciente', 'Profissional'], ['profissional', 'recepcionista']],
    ['identity:profissional', 'runtime', ['Profissional'], ['profissional']],
    ['identity:recepcionista', 'runtime', ['Recepcionista'], ['recepcionista']],
    ['mdm:Paciente', 'runtime', ['Paciente'], ['recepcionista']],
  ]);
  const data = file.testSupport.find(item => item.id === 'data:Consulta')!;
  assert.ok(data.sourceRefs.includes('ontology:Consulta/lifecycleStates/scheduled'));
  assert.ok(data.sourceRefs.includes('journey:agendarConsulta/criarConsulta'));
  assert.match(data.gap, /^FIXTURE_EXECUTOR_UNREFERENCED: .* consulta rows /);
  const identity = file.testSupport.find(item => item.id === 'identity:profissional')!;
  assert.ok(identity.sourceRefs.includes('access:actors/profissional'));
  assert.match(identity.gap, /^RUNTIME_TEST_IDENTITY_UNREFERENCED: /);
  const mdm = file.testSupport.find(item => item.id === 'mdm:Paciente')!;
  assert.ok(mdm.sourceRefs.includes('ontology:Consulta/relationships'));
  assert.match(mdm.gap, /^RUNTIME_MDM_FIXTURE_UNREFERENCED: /);
  for (const item of file.testSupport) {
    assert.equal(item.status, 'toCreate', item.id);
    assert.equal(item.executorRef, '', item.id);
    assert.equal(item.cleanupRef, '', item.id);
    assert.ok(item.gap, item.id);
  }
  // Grants, rows and ContatoPaciente (no need, no own fk) stay out.
  assert.equal(JSON.stringify(file.testSupport).includes('ContatoPaciente'), false);
  assert.equal(JSON.stringify(file.testSupport).includes('grant'), false);
  const gate = validateP1Backend(file, input.needs, input.ontology);
  assert.deepEqual(gate.issues.filter(issue => issue.severity === 'error'), []);
});

void test('renamed fixture: every id renamed gives the renamed testSupport, with no original id left', () => {
  const map = renameMap(FIXTURE_TEXT);
  const renamedText = rename(FIXTURE_TEXT, map);
  const original = planP1Backend(inputFrom(FIXTURE_TEXT)).file.testSupport;
  const renamedInput = inputFrom(renamedText);
  const renamed = planP1Backend(renamedInput).file;
  assert.equal(renamed.testSupport.length, 4);
  assert.equal(canonical(renamed.testSupport), canonical(JSON.parse(rename(JSON.stringify(original), map)) as PoolTestSupportItem[]));
  const out = JSON.stringify(renamed.testSupport);
  for (const [from] of map) {
    assert.equal(new RegExp(`(?<![A-Za-z0-9_])${from}(?![A-Za-z0-9_])`).test(out), false, from);
  }
  const gate = validateP1Backend(renamed, renamedInput.needs, renamedInput.ontology);
  assert.deepEqual(gate.issues.filter(issue => issue.severity === 'error'), []);
});

void test('serialization is deterministic and the re-read (normalize/repair) gives the same bytes; payload testSupport is ignored', () => {
  const input = inputFrom(FIXTURE_TEXT);
  const first = JSON.stringify(planP1Backend(input).file, null, 2);
  const second = JSON.stringify(planP1Backend(inputFrom(FIXTURE_TEXT)).file, null, 2);
  assert.equal(first, second);
  const reread = JSON.parse(first) as PoolBackendFile & Record<string, unknown>;
  reread.testSupport = [{
    id: 'identity:profissional', actorRefs: ['profissional'], entityRefs: ['Profissional'], sourceRefs: [],
    status: 'done', owner: 'runtime', executorRef: 'invented', cleanupRef: 'invented', gap: '',
  }];
  const normalized = normalizeP1Backend(reread, input);
  assert.equal(JSON.stringify(normalized, null, 2), first);
  const repaired = repairP1Backend(normalized, input.needs, input.ontology, EMPTY, null, input.actors);
  assert.equal(JSON.stringify(repaired, null, 2), first);
});

void test('named gaps: actor absent from access, actor without personEntity; no actors and no tables is empty', () => {
  const input = inputFrom(FIXTURE_TEXT);
  const noAccess = planP1Backend({ ...input, actors: [] }).file.testSupport;
  assert.match(noAccess.find(item => item.id === 'identity:profissional')!.gap, /^ACTOR_UNDECLARED: /);
  assert.deepEqual(noAccess.find(item => item.id === 'identity:profissional')!.entityRefs, []);
  // Without a bound person, the MDM role records become their own runtime units.
  assert.ok(noAccess.some(item => item.id === 'mdm:Profissional'));
  const noPerson = planP1Backend({ ...input, actors: [{ actorId: 'profissional', personEntity: '' }, { actorId: 'recepcionista', personEntity: 'Ausente' }] }).file;
  assert.match(noPerson.testSupport.find(item => item.id === 'identity:profissional')!.gap, /^PERSON_ENTITY_UNDECLARED: /);
  assert.match(noPerson.testSupport.find(item => item.id === 'identity:recepcionista')!.gap, /^PERSON_ENTITY_UNKNOWN: /);
  assert.equal(validateP1Backend(noPerson, input.needs, input.ontology).ok, true);
  const empty = planP1Backend({ ...input, needs: { ...input.needs, pages: [] } }).file;
  assert.deepEqual(empty.testSupport, []);
});

void test('gate fails closed on shape: no executor and no gap, done without executor, unknown refs, bad owner', () => {
  const input = inputFrom(FIXTURE_TEXT);
  const { file } = planP1Backend(input);
  const broken: PoolBackendFile = {
    ...file,
    testSupport: [
      { ...file.testSupport[0], gap: '' },
      { ...file.testSupport[1], status: 'done' },
      { ...file.testSupport[2], entityRefs: ['Inexistente'], actorRefs: ['ninguem'] },
      { ...file.testSupport[3], owner: 'L2' as never },
    ],
  };
  const codes = validateP1Backend(broken, input.needs, input.ontology).issues.map(issue => issue.code).sort();
  assert.deepEqual(codes, [
    'P1_BACKEND_ENTITY_UNKNOWN',
    'P1_BACKEND_TEST_SUPPORT',
    'P1_BACKEND_TEST_SUPPORT_GAP',
    'P1_BACKEND_TEST_SUPPORT_GAP',
    'P1_BACKEND_TEST_SUPPORT_REF',
  ]);
  const missing = { ...file } as Partial<PoolBackendFile>;
  delete missing.testSupport;
  assert.equal(validateP1Backend(missing as PoolBackendFile, input.needs, input.ontology).ok, false);
});
