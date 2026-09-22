/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { P1_BACKEND_SCHEMA_VERSION } from '/_102021_/l2/agentPlannerL1/steps/plan20/contracts.js';
import { P2_EFFORT_SCHEMA_VERSION } from '/_102020_/l2/agentPlannerL2/steps/effort40/contracts.js';
import {
  D1_SOURCE_SCHEMAS,
  type D1InputArtifacts,
  type D1InputSnapshot,
  type D1SourceDigest,
} from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { buildD1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';
import { parseD1Source, sha256Text } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, 'fixtures', 'head');
const MODULE = 'agendaClinica';
const PROJECT = 102047;
const PAGES = ['agenda', 'cadastro_profissional', 'cadastro_recepcionista', 'consultas', 'pacientes'];
const USECASES = [
  'confirmarConsulta', 'createConsulta', 'createPaciente', 'createProfissional', 'createRecepcionista',
  'listConsulta', 'listPaciente', 'listProfissional', 'listRecepcionista', 'registrarAtendimento',
  'registrarFalta', 'updateProfissional', 'updateRecepcionista',
];

function walk(dir: string, prefix: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(abs).isDirectory()) out.push(...walk(abs, rel));
    else out.push(rel);
  }
  return out;
}

function logical(rel: string): string {
  return rel.endsWith('.defs.txt') ? `${rel.slice(0, -4)}.ts` : rel;
}

async function loadHead(): Promise<D1InputArtifacts> {
  const sources: D1SourceDigest[] = [];
  const parsed = new Map<string, unknown>();
  for (const rel of walk(FIXTURE, '')) {
    const file = logical(rel);
    const text = readFileSync(path.join(FIXTURE, rel), 'utf8');
    const kind = file.endsWith('.defs.ts') ? 'defs' : 'json';
    const value = parseD1Source(text, kind);
    const sha256 = await sha256Text(text);
    sources.push({
      path: file,
      sha256,
      bytes: new TextEncoder().encode(text).length,
      schemaVersion: value && typeof value === 'object' && !Array.isArray(value) ? String((value as { schemaVersion?: string }).schemaVersion || '') : '',
      state: value ? 'present' : 'invalid',
    });
    parsed.set(file, value);
  }
  const journeys: Record<string, unknown> = {};
  const entities: Record<string, unknown> = {};
  for (const [file, value] of parsed) {
    if (file.includes('/journeys/') && !file.endsWith('/index.defs.ts')) journeys[path.basename(file, '.defs.ts')] = value;
    if (file.includes('/ontology/') && !file.endsWith('/index.defs.ts')) entities[path.basename(file, '.defs.ts')] = value;
  }
  const root = `l4/${MODULE}`;
  return {
    sources,
    module: parsed.get(`${root}/module.defs.ts`) ?? null,
    journeyIndex: parsed.get(`${root}/journeys/index.defs.ts`) ?? null,
    journeys,
    ontologyIndex: parsed.get(`${root}/ontology/index.defs.ts`) ?? null,
    entities,
    rules: parsed.get(`${root}/rules.defs.ts`) ?? null,
    workflows: parsed.get(`${root}/workflows.defs.ts`) ?? null,
    access: parsed.get(`${root}/access.defs.ts`) ?? null,
    integration: parsed.get(`${root}/integration.defs.ts`) ?? null,
    menu: parsed.get(`${root}/pool/l2/web/menu.json`) ?? null,
    needs: parsed.get(`${root}/pool/l1/web/needs.json`) ?? null,
    backend: parsed.get(`${root}/pool/l2/web/backend.json`) ?? null,
    effort: parsed.get(`${root}/pool/l2/web/effort.json`) ?? null,
    planner: parsed.get(`l1/${MODULE}/pipeline/pipeline.json`) ?? null,
    contracts: {},
    presentDefs: [],
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function build(artifacts: D1InputArtifacts, previous: D1InputSnapshot | null = null): D1InputSnapshot {
  return buildD1InputSnapshot({ project: PROJECT, moduleName: MODULE }, artifacts, previous);
}

function codes(snapshot: D1InputSnapshot, severity: 'error' | 'review'): string[] {
  return snapshot.problems.filter(problem => problem.severity === severity).map(problem => problem.code);
}

function fileOf(snapshot: D1InputSnapshot, artifactType: string, identity: string) {
  return snapshot.files.find(file => file.artifactType === artifactType && file.identity === identity);
}

void test('supported plan schemas are the producers versions', () => {
  assert.equal(D1_SOURCE_SCHEMAS.backend, P1_BACKEND_SCHEMA_VERSION);
  assert.equal(D1_SOURCE_SCHEMAS.effort, P2_EFFORT_SCHEMA_VERSION);
});

void test('frozen agendaClinica snapshot is cut by id', async () => {
  const snapshot = build(await loadHead());
  const errors = snapshot.problems.filter(problem => problem.severity === 'error');
  assert.deepEqual([...new Set(errors.map(problem => problem.code))], ['CONTRACT_ABSENT']);
  assert.deepEqual(snapshot.selection.pages.map(page => page.pageId), PAGES);
  const backend = JSON.parse(readFileSync(path.join(FIXTURE, 'l4', MODULE, 'pool/l2/web/backend.json'), 'utf8')) as {
    endpoints: Array<{ route: string }>;
  };
  assert.deepEqual(snapshot.selection.routes.map(route => route.route), backend.endpoints.map(endpoint => endpoint.route).sort());
  assert.equal(snapshot.selection.routes.length, backend.endpoints.length);
  assert.deepEqual(snapshot.selection.usecases.map(usecase => usecase.usecaseId), USECASES);
  assert.deepEqual(snapshot.selection.ports.map(port => port.portId), ['ConsultaRepository']);
  assert.deepEqual(snapshot.selection.tables.map(table => table.tableId), ['consulta']);
  assert.deepEqual(snapshot.selection.entities, ['Consulta', 'ContatoPaciente', 'Paciente', 'Profissional', 'Recepcionista']);
  assert.deepEqual(snapshot.selection.outbound.slice().sort(), ['atendimentoRegistrado', 'consultaConfirmada', 'faltaPacienteRegistrada']);
  assert.equal(snapshot.consumersReleased, false);
  assert.equal(snapshot.files.filter(file => file.artifactType === 'usecase').length, USECASES.length);
  assert.equal(snapshot.files.filter(file => file.artifactType === 'httpController').length, PAGES.length);
  assert.equal(snapshot.files.some(file => file.defPath.includes('/painel')), false);
  assert.equal(snapshot.files.some(file => file.artifactType === 'table' && file.identity !== 'consulta'), false);
  const shared = fileOf(snapshot, 'usecase', 'listConsulta');
  assert.ok(shared);
  assert.ok(shared.ownerRefs.filter(owner => owner.startsWith('endpoint:')).length >= 2);
  const contact = fileOf(snapshot, 'domainEntity', 'ContatoPaciente');
  assert.ok(contact);
  assert.ok(contact.ownerRefs.some(owner => owner === 'relationship:patientContacts'));
  assert.equal(snapshot.files.filter(file => file.defPath.endsWith('/listConsulta.defs.ts')).length, 1);
  assert.ok(snapshot.problems.some(problem => problem.code === 'PAYLOAD_UNDECLARED' && problem.ownerRef === 'registrarAtendimento'));
  assert.ok(snapshot.problems.some(problem => problem.code === 'ACCESS_ANCHOR' && problem.ownerRef === 'profissionalAgendaDiaria'));
  for (const event of ['consultaConfirmada', 'faltaPacienteRegistrada', 'atendimentoRegistrado']) {
    assert.ok(snapshot.problems.some(problem => problem.code === 'INTEGRATION_UNBOUND' && problem.ownerRef === event), event);
  }
  assert.equal(codes(snapshot, 'review').includes('UNATTRIBUTED_CHANGE'), false);
  assert.ok(snapshot.problems.some(problem => problem.code === 'SCREEN_WITHOUT_ROUTES' && problem.ownerRef === 'painel'));
  assert.equal(codes(snapshot, 'error').includes('DAG_CYCLE'), false);
  for (const file of snapshot.files) {
    for (const dep of file.dependsOn) assert.ok(snapshot.files.some(item => item.id === dep), `${file.id} -> ${dep}`);
  }
});

void test('removing one route keeps a usecase another page still uses', async () => {
  const artifacts = clone(await loadHead());
  const route = 'agendaClinica.agenda.qryListConsulta';
  const backend = artifacts.backend as { endpoints: Array<{ route: string }>; meta: { pages: Record<string, string[]> } };
  const effort = artifacts.effort as {
    endpoints: Array<{ route: string }>;
    screens: Array<{ pageId: string; endpoints: string[] }>;
    totals: { endpoints: { toCreate: number } };
    removed: Array<{ kind: string; id: string; status: string }>;
  };
  backend.endpoints = backend.endpoints.filter(endpoint => endpoint.route !== route);
  backend.meta.pages.agenda = backend.meta.pages.agenda.filter(item => item !== route);
  effort.endpoints = effort.endpoints.filter(endpoint => endpoint.route !== route);
  effort.screens.find(screen => screen.pageId === 'agenda')!.endpoints = effort.screens.find(screen => screen.pageId === 'agenda')!.endpoints.filter(item => item !== route);
  effort.totals.endpoints.toCreate -= 1;
  effort.removed.push({ kind: 'endpoint', id: route, status: 'toRemove' });
  const snapshot = build(artifacts);
  assert.equal(snapshot.selection.routes.some(item => item.route === route), false);
  assert.ok(snapshot.selection.usecases.some(usecase => usecase.usecaseId === 'listConsulta'));
  assert.ok(fileOf(snapshot, 'usecase', 'listConsulta'));
  assert.equal(snapshot.problems.some(problem => problem.code === 'REMOVE_STILL_REFERENCED'), false);
  assert.equal(snapshot.removed.some(item => item.id === route && item.kind === 'endpoint'), true);
});

void test('an update keeps existing identity only with an inventoried hash', async () => {
  const artifacts = clone(await loadHead());
  const head = build(artifacts);
  const defPath = fileOf(head, 'usecase', 'updateProfissional')!.defPath;
  const hash = 'sha256:ab'.padEnd(7 + 64, 'c');
  const previous = clone(head);
  previous.files.find(file => file.defPath === defPath)!.contentHash = hash;
  const backend = artifacts.backend as { usecases: Array<Record<string, string>>; endpoints: Array<Record<string, string>> };
  const effort = artifacts.effort as { usecases: Array<Record<string, string>>; endpoints: Array<Record<string, string>>; totals: { endpoints: Record<string, number>; usecases: Record<string, number> } };
  const usecase = backend.usecases.find(item => item.usecaseId === 'updateProfissional')!;
  usecase.status = 'toUpdate';
  usecase.existing = 'updateProfissional';
  effort.usecases.find(item => item.usecaseId === 'updateProfissional')!.status = 'toUpdate';
  effort.usecases.find(item => item.usecaseId === 'updateProfissional')!.existing = 'updateProfissional';
  for (const endpoint of [...backend.endpoints, ...effort.endpoints]) {
    if (endpoint.usecaseRef === 'updateProfissional') endpoint.status = 'toUpdate';
  }
  effort.totals.usecases.toCreate -= 1;
  effort.totals.usecases.toUpdate += 1;
  effort.totals.endpoints.toCreate -= 2;
  effort.totals.endpoints.toUpdate += 2;
  artifacts.presentDefs = [{ path: defPath, sha256: hash }];
  const snapshot = build(artifacts, previous);
  const file = fileOf(snapshot, 'usecase', 'updateProfissional');
  assert.equal(file?.action, 'update');
  assert.equal(file?.contentHash, hash);
  assert.equal(snapshot.problems.some(problem => problem.code === 'EXISTING_UNRESOLVED' && problem.ownerRef === 'usecase:updateProfissional'), false);
});

void test('alias existing keeps the inventoried id and does not mint the candidate', async () => {
  const artifacts = clone(await loadHead());
  const head = build(artifacts);
  const defPath = fileOf(head, 'usecase', 'listConsulta')!.defPath;
  const hash = `sha256:${'d'.repeat(64)}`;
  const previous = clone(head);
  previous.files.find(file => file.defPath === defPath)!.contentHash = hash;
  const backend = artifacts.backend as { usecases: Array<Record<string, string>>; endpoints: Array<Record<string, string>> };
  const effort = artifacts.effort as { usecases: Array<Record<string, string>>; endpoints: Array<Record<string, string>>; totals: { endpoints: Record<string, number>; usecases: Record<string, number> } };
  const row = backend.usecases.find(item => item.usecaseId === 'listConsulta')!;
  row.usecaseId = 'listConsultaNovo';
  row.existing = 'listConsulta';
  row.status = 'toUpdate';
  const effortRow = effort.usecases.find(item => item.usecaseId === 'listConsulta')!;
  effortRow.usecaseId = 'listConsultaNovo';
  effortRow.existing = 'listConsulta';
  effortRow.status = 'toUpdate';
  let moved = 0;
  for (const endpoint of [...backend.endpoints, ...effort.endpoints]) {
    if (endpoint.usecaseRef !== 'listConsulta') continue;
    endpoint.usecaseRef = 'listConsultaNovo';
    endpoint.status = 'toUpdate';
    moved += 1;
  }
  effort.totals.usecases.toCreate -= 1;
  effort.totals.usecases.toUpdate += 1;
  effort.totals.endpoints.toCreate -= moved / 2;
  effort.totals.endpoints.toUpdate += moved / 2;
  artifacts.presentDefs = [{ path: defPath, sha256: hash }];
  const snapshot = build(artifacts, previous);
  assert.equal(fileOf(snapshot, 'usecase', 'listConsulta')?.action, 'update');
  assert.equal(snapshot.files.some(file => file.defPath.endsWith('/listConsultaNovo.defs.ts')), false);
  assert.equal(snapshot.selection.usecases.find(usecase => usecase.usecaseId === 'listConsultaNovo')?.identity, 'listConsulta');
});

void test('a done usecase with no file stays done and is not created', async () => {
  const artifacts = clone(await loadHead());
  const backend = artifacts.backend as { usecases: Array<Record<string, string>> };
  const effort = artifacts.effort as { usecases: Array<Record<string, string>>; totals: { usecases: Record<string, number> } };
  backend.usecases.find(item => item.usecaseId === 'listRecepcionista')!.status = 'done';
  effort.usecases.find(item => item.usecaseId === 'listRecepcionista')!.status = 'done';
  effort.totals.usecases.toCreate -= 1;
  effort.totals.usecases.done += 1;
  const snapshot = build(artifacts);
  const file = fileOf(snapshot, 'usecase', 'listRecepcionista');
  assert.equal(file?.action, 'preserve');
  assert.equal(snapshot.problems.some(problem => problem.code === 'DONE_ABSENT' && problem.ownerRef === 'usecase:listRecepcionista'), true);
  assert.equal(snapshot.consumersReleased, false);
});

void test('an orphan route is reported by path and is not given a controller', async () => {
  const artifacts = clone(await loadHead());
  const route = 'agendaClinica.fantasma.qryNowhere';
  const endpoint = { route, page: 'fantasma', kind: 'qry', usecaseRef: 'listConsulta', status: 'toCreate', tableRefs: ['consulta'], noTable: 'ok' };
  (artifacts.backend as { endpoints: unknown[] }).endpoints.push(endpoint);
  (artifacts.effort as { endpoints: unknown[]; totals: { endpoints: { toCreate: number } } }).endpoints.push({
    route, page: 'fantasma', kind: 'qry', usecaseRef: 'listConsulta', status: 'toCreate',
  });
  (artifacts.effort as { totals: { endpoints: { toCreate: number } } }).totals.endpoints.toCreate += 1;
  const snapshot = build(artifacts);
  const problem = snapshot.problems.find(item => item.code === 'ORPHAN_ROUTE');
  assert.equal(problem?.path, `l4/${MODULE}/pool/l2/web/backend.json`);
  assert.equal(problem?.ownerRef, route);
  assert.equal(snapshot.selection.routes.some(item => item.route === route), false);
  assert.equal(snapshot.files.some(file => file.identity === 'fantasma'), false);
});

void test('unattributed changes are recorded and do not add files', async () => {
  const artifacts = clone(await loadHead());
  const head = build(artifacts);
  const backend = artifacts.backend as { changes: unknown[]; meta: { unmappedChanges: unknown[] } };
  const effort = artifacts.effort as { unattributed: unknown[] };
  backend.meta.unmappedChanges.push({ changeId: 'chg-map', kind: 'field', source: 'ontology/Consulta.defs.ts' });
  backend.changes.push({ changeId: 'chg-open', kind: 'field', op: 'changed', entity: 'Consulta', tableRefs: [], noTable: 'ok', usecaseRefs: [], reason: '', source: 'ontology/Consulta.defs.ts' });
  effort.unattributed.push({ changeId: 'chg-effort', kind: 'rule', op: 'changed', reason: 'no page' });
  const snapshot = build(artifacts);
  const owners = snapshot.problems.filter(problem => problem.code === 'UNATTRIBUTED_CHANGE').map(problem => problem.ownerRef).sort();
  assert.deepEqual(owners, ['chg-effort', 'chg-map', 'chg-open']);
  assert.ok(snapshot.problems.filter(problem => problem.code === 'UNATTRIBUTED_CHANGE').every(problem => problem.path.includes('agendaClinica')));
  assert.equal(snapshot.files.length, head.files.length);
  assert.deepEqual(snapshot.selection.routes.map(route => route.route), head.selection.routes.map(route => route.route));
});

void test('a new L4 hash does not validate an unchanged plan', async () => {
  const artifacts = clone(await loadHead());
  const head = build(artifacts);
  const next = clone(artifacts);
  const target = `l4/${MODULE}/ontology/Consulta.defs.ts`;
  const source = next.sources.find(item => item.path === target)!;
  const fresh = `sha256:${'e'.repeat(64)}`;
  source.sha256 = fresh;
  const snapshot = build(next, head);
  const problem = snapshot.problems.find(item => item.code === 'STALE_L4' && item.path === target);
  assert.ok(problem);
  assert.match(problem.message, new RegExp(fresh));
  assert.match(problem.message, /does not validate the plan/);
  assert.equal(snapshot.sources.find(item => item.path === target)?.sha256, fresh);
  assert.equal(snapshot.consumersReleased, false);
});

void test('toRemove on a live row is not treated as a removal', async () => {
  const artifacts = clone(await loadHead());
  const effort = artifacts.effort as { endpoints: Array<Record<string, string>>; totals: { endpoints: Record<string, number> } };
  const backend = artifacts.backend as { endpoints: Array<Record<string, string>> };
  const route = 'agendaClinica.pacientes.qryListPaciente';
  backend.endpoints.find(item => item.route === route)!.status = 'toRemove';
  effort.endpoints.find(item => item.route === route)!.status = 'toRemove';
  effort.totals.endpoints.toCreate -= 1;
  effort.totals.endpoints.toRemove += 1;
  const snapshot = build(artifacts);
  assert.ok(snapshot.problems.some(problem => problem.code === 'STATUS_NOT_IN_REMOVED' && problem.ownerRef === route));
  assert.equal(snapshot.selection.routes.some(item => item.route === route), false);
  assert.equal(snapshot.removed.some(item => item.id === route), false);
});
