/// <mls fileReference="_102021_/l2/agentPlannerL1/steps/plan20/contracts.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { readL1Inventory, type L1Inventory } from '/_102021_/l2/agentPlannerL1/helpers/l1Inventory.js';
import {
  P1_BACKEND_SCHEMA_VERSION,
  buildP1BackendMessage,
  buildP1BackendTool,
  buildP1ResolutionSchema,
  parseP1Needs,
  planP1Backend,
  p1BackendSubject,
  type P1EntityView,
} from '/_102021_/l2/agentPlannerL1/steps/plan20/contracts.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NEEDS_ACADEMIA = JSON.parse(readFileSync(
  path.join(HERE, '../entry10/fixtures/needs-mensalidadesAcademia.json'),
  'utf8',
)) as unknown;
const NEEDS_CHAMADOS = JSON.parse(readFileSync(
  path.join(HERE, 'fixtures/needs-controleChamados.json'),
  'utf8',
)) as unknown;
const L1_FIXTURE = path.join(HERE, '../entry10/fixtures/controleChamados-l1');
const AT = new Date(Date.UTC(2026, 8, 20, 10, 30, 0));

const EMPTY_INVENTORY: L1Inventory = {
  routes: [],
  usecases: [],
  ports: [],
  tables: [],
  present: false,
};

const ACADEMIA_ONTOLOGY: P1EntityView[] = [
  { entityId: 'Mensalidade', family: 'tdm', storageKind: 'relational', storageTarget: 'moduleDatabase', transitions: [] },
  { entityId: 'Pagamento', family: 'tdm', storageKind: 'relational', storageTarget: 'moduleDatabase', transitions: [] },
];

const CHAMADOS_ONTOLOGY: P1EntityView[] = [
  { entityId: 'Chamado', family: 'tdm', storageKind: 'relational', storageTarget: 'moduleDatabase', transitions: [] },
  { entityId: 'Comentario', family: 'tdm', storageKind: 'relational', storageTarget: 'moduleDatabase', transitions: [] },
  { entityId: 'Atendente', family: 'mdm', storageKind: '', storageTarget: 'mdm', transitions: [] },
];

type Stored = {
  project: number; level: number; folder: string; shortName: string; extension: string;
  status: string; versionRef: string; content: string;
  getValueInfo: () => Promise<{ content: string }>;
  getContent: () => Promise<string>;
};
type Host = { files: Record<string, Stored> };

function keyOf(info: { project: number | string; level: number | string; folder: string; shortName: string; extension: string }): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function seed(
  host: Host,
  project: number,
  level: number,
  folder: string,
  shortName: string,
  extension: string,
  content: string,
): Stored {
  const file: Stored = {
    project, level, folder, shortName, extension,
    status: 'changed', versionRef: '1', content,
    getValueInfo: async () => ({ content: file.content }),
    getContent: async () => file.content,
  };
  host.files[keyOf(file)] = file;
  return file;
}

function installHost(project: number): Host {
  const host: Host = { files: {} };
  (globalThis as unknown as Record<string, unknown>).mls = {
    actualProject: project,
    events: { addEventListener() {}, removeEventListener() {}, dispatch() {} },
    stor: {
      files: host.files,
      getKeyToFile: keyOf,
      localStor: {
        setContent: async (file: Stored, value: { content: string }) => { file.content = value.content; },
        listFolder: () => [],
      },
    },
  };
  return host;
}

function walkFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walkFiles(full));
    else out.push(full);
  }
  return out;
}

function seedControleChamados(host: Host): void {
  const project = 102039;
  const moduleName = 'controleChamados';
  const l1Root = path.join(L1_FIXTURE, 'l1');
  for (const full of walkFiles(l1Root)) {
    const rel = path.relative(l1Root, full).replace(/\\/g, '/');
    const parsed = path.parse(rel);
    const ext = parsed.ext === '.ts' && parsed.name.endsWith('.defs') ? '.defs.ts' : parsed.ext;
    const shortName = ext === '.defs.ts' ? parsed.name.replace(/\.defs$/, '') : parsed.name;
    const folder = parsed.dir ? `${moduleName}/${parsed.dir}` : moduleName;
    seed(host, project, 1, folder, shortName, ext, readFileSync(full, 'utf8'));
  }
  seed(host, project, 5, moduleName, 'todoBackend', '.defs.ts', readFileSync(path.join(L1_FIXTURE, 'l5/todoBackend.defs.ts'), 'utf8'));
  const backend = JSON.parse(readFileSync(path.join(L1_FIXTURE, 'l5/backend.json'), 'utf8')) as Record<string, unknown>;
  seed(host, project, 5, '', 'project', '.json', `${JSON.stringify({ modules: [{ moduleName, backend }] }, null, 2)}\n`);
}

function requiredIncludesAllProperties(schema: unknown, pathName = '$'): string[] {
  const issues: string[] = [];
  const walk = (node: unknown, at: string) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const record = node as Record<string, unknown>;
    if (record.type === 'object' && record.properties && typeof record.properties === 'object') {
      const required = Array.isArray(record.required) ? record.required.map(String) : [];
      for (const key of Object.keys(record.properties as object)) {
        const prop = (record.properties as Record<string, unknown>)[key];
        const unique = prop && typeof prop === 'object' && !Array.isArray(prop)
          && ((prop as { const?: unknown }).const !== undefined
            || (Array.isArray((prop as { enum?: unknown }).enum) && ((prop as { enum: unknown[] }).enum.length === 1)));
        if (unique && !required.includes(key)) issues.push(`${at}.${key} is optional with a single allowed value`);
        walk(prop, `${at}.${key}`);
      }
    }
    if (record.$defs && typeof record.$defs === 'object') {
      for (const [key, def] of Object.entries(record.$defs as object)) walk(def, `${at}.$defs.${key}`);
    }
    if (record.items) walk(record.items, `${at}.items`);
  };
  walk(schema, pathName);
  return issues;
}

void test('102047 mensalidadesAcademia with no l1: every candidate is toCreate and llm is not needed', () => {
  const needs = parseP1Needs(NEEDS_ACADEMIA);
  const planned = planP1Backend({
    needs,
    inventory: EMPTY_INVENTORY,
    ontology: ACADEMIA_ONTOLOGY,
    now: AT,
  });
  assert.equal(planned.unresolved.length, 0);
  assert.equal(planned.file.schemaVersion, P1_BACKEND_SCHEMA_VERSION);
  assert.equal(planned.file.inventoryPresent, false);
  assert.equal(planned.file.meta.llmCalled, false);
  assert.deepEqual(planned.file.endpoints.map(item => item.route), [
    'mensalidadesAcademia.mensalidades_pagamentos.cmdCreatePagamento',
    'mensalidadesAcademia.mensalidades_pagamentos.qryGetPagamento',
    'mensalidadesAcademia.mensalidades_pagamentos.qryListMensalidade',
  ]);
  assert.ok(planned.file.endpoints.every(item => item.status === 'toCreate'));
  assert.ok(planned.file.usecases.every(item => item.status === 'toCreate' && item.existing === ''));
  assert.deepEqual(planned.file.usecases.map(item => item.usecaseId), ['createPagamento', 'getPagamento', 'listMensalidade']);
  assert.deepEqual(planned.file.ports.map(item => item.portId), ['MensalidadeRepository', 'PagamentoRepository']);
  assert.deepEqual(planned.file.tables.map(item => item.tableId), ['mensalidade', 'pagamento']);
  assert.deepEqual(planned.file.removed, []);
  const list = planned.file.usecases.find(item => item.usecaseId === 'listMensalidade');
  assert.equal(list?.reason, 'no l1 usecase for Mensalidade.list');
});

void test('fixture 102039 with invented needs: done, toUpdate and toRemove each appear', async () => {
  const host = installHost(102039);
  seedControleChamados(host);
  const inventory = await readL1Inventory(102039, 'controleChamados');
  assert.equal(inventory.present, true);
  const planned = planP1Backend({
    needs: parseP1Needs(NEEDS_CHAMADOS),
    inventory,
    ontology: CHAMADOS_ONTOLOGY,
    now: AT,
  });
  assert.equal(planned.unresolved.length, 0);
  assert.equal(planned.file.meta.llmCalled, false);
  const byId = new Map(planned.file.usecases.map(item => [item.usecaseId, item]));
  const list = byId.get('listChamado');
  const get = byId.get('getChamado');
  const create = byId.get('createChamado');
  assert.equal(list?.status, 'done', JSON.stringify(list));
  assert.ok(list?.existing.endsWith('/listChamado.defs.ts'));
  assert.equal(get?.status, 'toUpdate', JSON.stringify(get));
  assert.match(get?.reason || '', /prioridade/);
  assert.equal(create?.status, 'done');
  assert.ok(planned.file.removed.some(item => item.kind === 'usecase' && item.status === 'toRemove'));
  assert.ok(planned.file.removed.some(item => item.id === 'createAtendente'));
  assert.ok(planned.file.endpoints.some(item => item.route === 'controleChamados.chamadoCatalogue.cmdCreateChamado' && item.status === 'done'));
  assert.ok(planned.file.endpoints.some(item => item.route === 'controleChamados.chamadoCatalogue.qryGetChamado' && item.status === 'toUpdate'));
  assert.ok(planned.file.ports.some(item => item.portId === 'ChamadoRepository' && item.status === 'done'));
  assert.ok(planned.file.tables.some(item => item.entity === 'Chamado' && item.status === 'done'));
  assert.ok(planned.file.removed.some(item => item.kind === 'table' && item.id === 'Comentario'));
});

void test('alias resolution reuses an l1 usecase of another name', async () => {
  const host = installHost(102039);
  seedControleChamados(host);
  const inventory = await readL1Inventory(102039, 'controleChamados');
  const needs = parseP1Needs({
    schemaVersion: '2026-09-21-p2-needs-v1',
    moduleName: 'controleChamados',
    device: 'web',
    pages: [{
      pageId: 'chamadoCatalogue',
      actors: ['atendente'],
      reads: [{ entity: 'Chamado', family: 'tdm', scope: 'organization', derived: [], from: ['organism:list'] }],
      writes: [{ entity: 'Chamado', operation: 'transition', transitionRef: 'resolve', from: ['journey:resolver/act'] }],
    }],
  });
  const before = planP1Backend({ needs, inventory, ontology: CHAMADOS_ONTOLOGY, now: AT });
  assert.ok(before.unresolved.some(item => item.candidateUsecaseId === 'resolveChamado'));
  const after = planP1Backend({
    needs,
    inventory,
    ontology: CHAMADOS_ONTOLOGY,
    now: AT,
    resolution: {
      aliases: [{ candidateUsecaseId: 'resolveChamado', existingUsecaseId: 'closeChamado', reason: 'closeChamado already settles the chamado' }],
      merges: [],
    },
  });
  assert.equal(after.unresolved.length, 0);
  assert.equal(after.file.meta.llmCalled, true);
  const close = after.file.usecases.find(item => item.usecaseId === 'closeChamado');
  assert.ok(close);
  assert.equal(close?.status, 'done');
  assert.equal(after.file.usecases.some(item => item.usecaseId === 'resolveChamado'), false);
  assert.ok(after.file.endpoints.some(item => item.usecaseRef === 'closeChamado' && item.kind === 'cmd'));
});

void test('MDM entities get a usecase and never a port or table', () => {
  const needs = parseP1Needs({
    schemaVersion: '2026-09-21-p2-needs-v1',
    moduleName: 'controleChamados',
    device: 'web',
    pages: [{
      pageId: 'atendenteCatalogue',
      actors: ['atendente'],
      reads: [{ entity: 'Atendente', family: 'mdm', scope: 'organization', derived: [], from: ['organism:list'] }],
      writes: [],
    }],
  });
  const planned = planP1Backend({
    needs,
    inventory: EMPTY_INVENTORY,
    ontology: CHAMADOS_ONTOLOGY,
    now: AT,
  });
  assert.ok(planned.file.usecases.some(item => item.usecaseId === 'listAtendente' && item.ports.length === 0));
  assert.equal(planned.file.ports.length, 0);
  assert.equal(planned.file.tables.length, 0);
});

void test('pool message is l1→l2 with backend.json and the thread round', () => {
  const needs = parseP1Needs(NEEDS_ACADEMIA);
  const planned = planP1Backend({ needs, inventory: EMPTY_INVENTORY, ontology: ACADEMIA_ONTOLOGY, now: AT });
  const message = buildP1BackendMessage({
    file: planned.file,
    received: { thread: 'mensalidadesAcademia-20260920103000', round: 1, mode: 'implement' },
  });
  assert.equal(message.from, 'l1');
  assert.equal(message.to, 'l2');
  assert.equal(message.round, 1);
  assert.equal(message.subject, p1BackendSubject('mensalidadesAcademia'));
  assert.deepEqual(message.artifacts, ['pool/l2/web/backend.json']);
});

void test('resolution tool schema is provider-clean and has no optional single-value fields', () => {
  const schema = buildP1ResolutionSchema();
  const tool = buildP1BackendTool(schema);
  assert.equal(tool.function.name, 'submitP1BackendResolution');
  assert.equal(lintToolSchema(JSON.stringify(tool.function.parameters)), null);
  assert.deepEqual(requiredIncludesAllProperties(schema), []);
  assert.deepEqual(requiredIncludesAllProperties(tool.function.parameters), []);
});
