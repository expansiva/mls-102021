/// <mls fileReference="_102021_/l2/agentPlannerL1/helpers/l1Inventory.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { resolveFixtureFile } from '/_102021_/l2/agentDefsL1/fixtures/fixtureDisk.js';
import { readL1Inventory } from '/_102021_/l2/agentPlannerL1/helpers/l1Inventory.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = path.join(HERE, '../steps/entry10/fixtures/controleChamados-l1');

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

function installHost(project: number, listFolder?: (...args: unknown[]) => unknown[]): Host {
  const host: Host = { files: {} };
  const localStor: Record<string, unknown> = {
    setContent: async (file: Stored, value: { content: string }) => { file.content = value.content; },
  };
  if (listFolder) localStor.listFolder = listFolder;
  (globalThis as unknown as Record<string, unknown>).mls = {
    actualProject: project,
    events: { addEventListener() {}, removeEventListener() {}, dispatch() {} },
    stor: {
      files: host.files,
      getKeyToFile: keyOf,
      localStor,
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
  const l1Root = path.join(FIXTURE_ROOT, 'l1');
  for (const full of walkFiles(l1Root)) {
    const rel = path.relative(l1Root, full).replace(/\\/g, '/');
    const parsed = path.parse(rel);
    const folderRel = parsed.dir;
    const ext = parsed.ext === '.ts' && parsed.name.endsWith('.defs')
      ? '.defs.ts'
      : parsed.ext;
    const shortName = ext === '.defs.ts' ? parsed.name.replace(/\.defs$/, '') : parsed.name;
    const folder = folderRel ? `${moduleName}/${folderRel}` : moduleName;
    seed(host, project, 1, folder, shortName, ext, readFileSync(full, 'utf8'));
  }
  seed(
    host,
    project,
    5,
    moduleName,
    'todoBackend',
    '.defs.ts',
    readFileSync(resolveFixtureFile(path.join(FIXTURE_ROOT, 'l5/todoBackend.defs.ts')), 'utf8'),
  );
  const backend = JSON.parse(readFileSync(path.join(FIXTURE_ROOT, 'l5/backend.json'), 'utf8')) as Record<string, unknown>;
  seed(
    host,
    project,
    5,
    '',
    'project',
    '.json',
    `${JSON.stringify({ modules: [{ moduleName, backend }] }, null, 2)}\n`,
  );
}

void test('102047 mensalidadesAcademia has no l1: present false and empty lists', async () => {
  installHost(102047);
  const inventory = await readL1Inventory(102047, 'mensalidadesAcademia');
  assert.equal(inventory.present, false);
  assert.deepEqual(inventory.routes, []);
  assert.deepEqual(inventory.usecases, []);
  assert.deepEqual(inventory.ports, []);
  assert.deepEqual(inventory.tables, []);
});

void test('fixture 102039 controleChamados: 19 usecases, 25 routes, 2 tables, statusBackend read', async () => {
  const host = installHost(102039);
  seedControleChamados(host);
  const inventory = await readL1Inventory(102039, 'controleChamados');
  assert.equal(inventory.present, true);
  assert.equal(inventory.usecases.length, 19, inventory.usecases.map(item => item.usecaseId).join(','));
  assert.equal(inventory.routes.length, 25, inventory.routes.join('\n'));
  assert.equal(inventory.tables.length, 2, inventory.tables.map(item => item.tableId).join(','));
  assert.equal(inventory.ports.length, 2);
  assert.deepEqual(inventory.tables.map(item => item.tableId).sort(), ['Chamado', 'Comentario']);
  assert.deepEqual(inventory.ports.map(item => item.portId).sort(), ['ChamadoRepository', 'ComentarioRepository']);
  const create = inventory.usecases.find(item => item.usecaseId === 'createChamado');
  assert.ok(create);
  assert.equal(create?.statusBackend, 'done');
  assert.ok(Array.isArray(create?.rulesApplied));
  assert.ok(create?.functions.some(fn => fn.name === 'createChamado'));
  assert.ok(create?.file.endsWith('/createChamado.defs.ts'));
  for (const usecase of inventory.usecases) {
    assert.equal(usecase.statusBackend, 'done', usecase.usecaseId);
  }
  assert.ok(inventory.routes.includes('controleChamados.chamadoCatalogue.cmdCreateChamado'));
  assert.ok(inventory.routes.includes('controleChamados.registrarComentarioChamado.cmdRegisterComentario'));
});

void test('host-only defs from localStor.listFolder never enter the inventory nor the index', async () => {
  const baseHost = installHost(102039);
  seedControleChamados(baseHost);
  const withoutListing = await readL1Inventory(102039, 'controleChamados');
  const keysBefore = Object.keys(baseHost.files).sort();

  let calls = 0;
  const hostOnly = (project: unknown, level: unknown, folder: unknown) => {
    calls++;
    return ['hostOnlyUsecase', 'hostOnlyPort', 'hostOnlyTable'].map(shortName => ({
      project, level, folder, shortName, extension: '.defs.ts',
    }));
  };
  const listingHost = installHost(102039, hostOnly);
  seedControleChamados(listingHost);
  const withListing = await readL1Inventory(102039, 'controleChamados');

  assert.equal(calls, 0);
  assert.deepEqual(withListing, withoutListing);
  assert.deepEqual(Object.keys(listingHost.files).sort(), keysBefore);
  assert.equal(Object.keys(listingHost.files).some(key => key.includes('hostOnly')), false);
});

void test('deleted def, other project and other folder stay out of the listing', async () => {
  const host = installHost(102039);
  seedControleChamados(host);
  const usecases = 'controleChamados/layer_2_application/usecases';
  const source = host.files[keyOf({ project: 102039, level: 1, folder: usecases, shortName: 'createChamado', extension: '.defs.ts' })];
  assert.ok(source);
  seed(host, 102039, 1, usecases, 'deletedCopy', '.defs.ts', source.content).status = 'deleted';
  seed(host, 102040, 1, usecases, 'otherProjectCopy', '.defs.ts', source.content);
  seed(host, 102039, 1, 'controleChamados/layer_2_application/other', 'otherFolderCopy', '.defs.ts', source.content);
  const inventory = await readL1Inventory(102039, 'controleChamados');
  assert.equal(inventory.usecases.length, 19);
  for (const name of ['deletedCopy', 'otherProjectCopy', 'otherFolderCopy']) {
    assert.equal(inventory.usecases.some(item => item.file.includes(name)), false, name);
  }
});
