/// <mls fileReference="_102021_/l2/agentMaterializeL1/register/reconcileL5.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { composeBackendRuntimeConfig } from '/_102021_/l2/agentChangeBackend/nodejsSaveConfigJson.js';
import { M1_STUB_ERROR } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import {
  commitL5Registration,
  L5_PUBLICATION_OWNER,
  loadRegistrationFiles,
  reconcileL5Backend,
  type L5CommitIo,
  type L5FileFact,
  type ReconcileL5Input,
} from '/_102021_/l2/agentMaterializeL1/register/reconcileL5.js';

const PROJECT = 109014;
const MODULE = 'desk';

function ref(rel: string): string {
  return `_${PROJECT}_/${rel}`;
}

function controller(route: string, usecaseFile: string): string {
  return [
    `import { openItem } from '/_${PROJECT}_/l1/${MODULE}/${usecaseFile}.js';`,
    'export const routes: ControllerRoute[] = [',
    `  { key: '${route}', handler: openItem },`,
    '];',
    '',
  ].join('\n');
}

function catalog(moduleName: string): string {
  return `export const scenarioCatalog = ${JSON.stringify({
    schemaVersion: '2026-09-25-m1-scenario-catalog-v1',
    moduleName,
    store: 'memory',
    scenarios: [{
      scenarioId: 'open',
      source: 'def',
      artifactType: 'usecase',
      artifactId: 'openItem',
      handlerId: 'structure.usecase',
      productionFile: ref(`l1/${moduleName}/layer_2_application/usecases/openItem.ts`),
      testFile: ref(`l1/${moduleName}/layer_2_application/usecases/openItem.test.ts`),
      cases: [{
        caseId: 'open.check',
        gate: 'compile',
        mandatory: true,
        source: 'def',
        expectation: 'compiles',
        preconditions: [],
        synthetic: [],
        actorId: '',
        routine: 'open',
        mutating: false,
        expect: { ok: true, status: 0, errorCode: null, ruleId: null, forbiddenFields: [], isolatedActorField: null },
        expectedFailure: null,
      }],
    }],
  })};`;
}

function ready(moduleName = MODULE, route = `${moduleName}.board.open`): ReconcileL5Input {
  const usecase = `layer_2_application/usecases/openItem`;
  const files: L5FileFact[] = [
    { ref: ref(`l1/${moduleName}/layer_1_external/adapters/http/controllers/board.ts`), source: controller(route, usecase), role: 'httpController' },
    { ref: ref(`l1/${moduleName}/${usecase}.ts`), source: 'export async function openItem() { return { ok: true }; }\n', role: 'output' },
    { ref: ref(`l1/${moduleName}/layer_1_external/adapters/persistence/boardRow.ts`), source: 'export const tableName = "board";\n', role: 'table' },
    { ref: ref(`l1/${moduleName}/layer_1_external/adapters/persistence/registerRepositories.ts`), source: 'export function registerRepositories(): void {}\n', role: 'repositoryRegistration' },
    { ref: ref(`l1/${moduleName}/materialization/agentMaterializeL1/scenarioCatalog.ts`), source: catalog(moduleName), role: 'output' },
  ];
  return {
    project: PROJECT,
    moduleName,
    allowStructureStub: true,
    phase: 'structure',
    projectJson: `${JSON.stringify({ appEnv: 'development', profilePath: '/keep', modules: [{ moduleName }] }, null, 2)}\n`,
    files,
    catalogRef: ref(`l1/${moduleName}/materialization/agentMaterializeL1/scenarioCatalog.ts`),
  };
}

test('materialized files patch the module and a second pass keeps the bytes', () => {
  const first = reconcileL5Backend(ready());
  assert.equal(first.action, 'patch');
  assert.ok(first.nextText);
  const parsed = JSON.parse(first.nextText!) as { profilePath: string; modules: Array<{ moduleName: string; backend: { routeKeys: string[]; scenarioCatalog: string[]; materialization: { behaviorVerified: boolean } } }> };
  assert.equal(parsed.profilePath, '/keep');
  assert.deepEqual(parsed.modules[0].backend.routeKeys, [`${MODULE}.board.open`]);
  assert.deepEqual(parsed.modules[0].backend.scenarioCatalog, [ref(`l1/${MODULE}/materialization/agentMaterializeL1/scenarioCatalog.ts`)]);
  assert.equal(parsed.modules[0].backend.materialization.behaviorVerified, false);
  const again = reconcileL5Backend({ ...ready(), projectJson: first.nextText });
  assert.equal(again.action, 'unchanged');
  assert.equal(again.nextText, first.nextText);
});

test('no materialized controller does not point at a deleted backend path', () => {
  const input = ready();
  input.files = input.files.map(file => file.ref.includes('/controllers/') ? { ...file, source: null } : file);
  const result = reconcileL5Backend(input);
  assert.equal(result.action, 'pending');
  assert.equal(result.nextText, input.projectJson);
  assert.equal(result.backend, null);
  assert.ok(result.pendings.some(item => item.reason === 'CONTROLLERS_ABSENT'));
  assert.ok(!result.nextText!.includes('backendControllers'));
});

test('a renamed module id still registers and a neighbor module is kept', () => {
  const name = 'windowDesk';
  const input = ready(name, `${name}.board.open`);
  input.projectJson = `${JSON.stringify({
    modules: [
      { moduleName: 'neighbor', theme: 'kept', backend: { seedCoverage: { skippedTables: ['old'] }, routeKeys: ['neighbor.stay'] } },
      { moduleName: name },
    ],
  }, null, 2)}\n`;
  const result = reconcileL5Backend(input);
  assert.equal(result.action, 'patch');
  const parsed = JSON.parse(result.nextText!) as { modules: Array<{ moduleName: string; theme?: string; backend?: { seedCoverage?: unknown; routeKeys: string[] } }> };
  assert.equal(parsed.modules[0].theme, 'kept');
  assert.deepEqual(parsed.modules[0].backend?.seedCoverage, { skippedTables: ['old'] });
  assert.deepEqual(parsed.modules[0].backend?.routeKeys, ['neighbor.stay']);
  assert.deepEqual(parsed.modules[1].backend?.routeKeys, [`${name}.board.open`]);
});

test('a route change updates only that module routeKeys and keeps seedCoverage', () => {
  const patched = reconcileL5Backend(ready());
  const moved = ready(MODULE, `${MODULE}.board.close`);
  const current = JSON.parse(patched.nextText!) as { modules: Array<{ backend: Record<string, unknown> }> };
  current.modules[0].backend.seedCoverage = { skippedTables: ['board'] };
  moved.projectJson = `${JSON.stringify(current, null, 2)}\n`;
  const result = reconcileL5Backend(moved);
  assert.equal(result.action, 'patch');
  const backend = (JSON.parse(result.nextText!) as { modules: Array<{ backend: { routeKeys: string[]; seedCoverage: unknown } }> }).modules[0].backend;
  assert.deepEqual(backend.routeKeys, [`${MODULE}.board.close`]);
  assert.deepEqual(backend.seedCoverage, { skippedTables: ['board'] });
});

test('invalid json, a production stub, a missing dependency and a missing table stay specific', () => {
  const invalid = reconcileL5Backend({ ...ready(), projectJson: '{' });
  assert.equal(invalid.action, 'invalid');
  assert.equal(invalid.nextText, null);
  assert.equal(invalid.pendings[0].reason, 'PROJECT_JSON_INVALID');

  const stub = ready();
  stub.allowStructureStub = false;
  stub.phase = 'verified';
  stub.files = stub.files.map(file => file.ref.includes('/controllers/')
    ? { ...file, source: `${file.source}\nthrow new Error('${M1_STUB_ERROR}');\n` }
    : file);
  const refused = reconcileL5Backend(stub);
  assert.ok(refused.pendings.some(item => item.reason === 'STUB_REFUSED'));
  assert.equal(refused.nextText, stub.projectJson);

  const missingDep = ready();
  missingDep.files = missingDep.files.map(file => file.ref.endsWith('/openItem.ts') ? { ...file, source: null } : file);
  const dep = reconcileL5Backend(missingDep);
  assert.ok(dep.pendings.some(item => item.reason === 'ROUTE_DEPENDENCY_ABSENT'));

  const mdm = ready();
  mdm.files = mdm.files.filter(file => !file.ref.includes('/persistence/boardRow.ts'));
  const noTable = reconcileL5Backend(mdm);
  assert.ok(noTable.pendings.some(item => item.reason === 'LOCAL_TABLE_ABSENT'));
  assert.equal(noTable.backend, null);
});

test('the real composer reads the patched registration and the controller route is discoverable', async () => {
  const reconciled = reconcileL5Backend(ready());
  assert.equal(reconciled.action, 'patch');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'm1-l5-'));
  try {
    const clientRoot = path.join(root, `mls-${PROJECT}`);
    const controllers = path.join(clientRoot, 'l1', MODULE, 'layer_1_external', 'adapters', 'http', 'controllers');
    const persistence = path.join(clientRoot, 'l1', MODULE, 'layer_1_external', 'adapters', 'persistence');
    fs.mkdirSync(controllers, { recursive: true });
    fs.mkdirSync(path.join(clientRoot, 'l5'), { recursive: true });
    fs.mkdirSync(persistence, { recursive: true });
    const project = JSON.parse(reconciled.nextText!) as { masters?: unknown };
    project.masters = { backend: { runtimeProject: 102034, masterProject: 102021, agentFolder: 'agentChangeBackend' } };
    fs.writeFileSync(path.join(clientRoot, 'l5', 'project.json'), `${JSON.stringify(project, null, 2)}\n`);
    fs.writeFileSync(path.join(clientRoot, 'l5', 'config.json'), '{}\n');
    fs.writeFileSync(path.join(persistence, 'boardRow.js'), 'export const tableName = "board";\n');
    fs.writeFileSync(path.join(persistence, 'registerRepositories.js'), 'export function registerRepositories() {}\n');
    const route = `${MODULE}.board.open`;
    fs.writeFileSync(path.join(controllers, 'board.js'), `export const routes = [{ key: '${route}', handler() { return { key: '${route}' }; } }];\n`);
    const composed = composeBackendRuntimeConfig(root, String(PROJECT));
    const config = JSON.parse(fs.readFileSync(composed.configPath, 'utf8')) as {
      projects: Record<string, { modules?: Array<{ moduleId: string; backendControllers?: string }>; persistenceModules?: Array<{ moduleId: string; tableDefsDir?: string }> }>;
    };
    const client = config.projects[String(PROJECT)];
    assert.equal(client.modules?.[0].moduleId, MODULE);
    assert.ok(client.modules?.[0].backendControllers?.includes('/controllers'));
    assert.ok(client.persistenceModules?.[0].tableDefsDir?.includes('/persistence'));
    const loaded = await import(pathToFileURL(path.join(controllers, 'board.js')).href) as { routes: Array<{ key: string }> };
    assert.deepEqual(loaded.routes.map(item => item.key), [route]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

const FROZEN = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/agendaClinica-8d8729d');

function frozenText(rel: string): string | null {
  const abs = path.join(FROZEN, rel);
  if (!abs.startsWith(`${FROZEN}${path.sep}`)) return null;
  try {
    return fs.readFileSync(abs, 'utf8');
  } catch {
    return null;
  }
}

function frozenDefs(moduleName: string): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const name of fs.readdirSync(dir)) {
      const abs = path.join(dir, name);
      if (fs.statSync(abs).isDirectory()) walk(abs);
      else if (name.endsWith('.defs.ts')) found.push(path.relative(FROZEN, abs).split(path.sep).join('/'));
    }
  };
  walk(path.join(FROZEN, 'l1', moduleName));
  return found.sort();
}

function keysOf(source: string): string[] {
  const keys: string[] = [];
  const pattern = /key:\s*'([^']+)'/g;
  let match = pattern.exec(source);
  while (match) {
    keys.push(match[1]);
    match = pattern.exec(source);
  }
  return keys;
}

test('the materialized client copy registers from promoted outputs, not a folder name', async () => {
  const moduleName = 'agendaClinica';
  const project = 102047;
  assert.match(fs.readFileSync(path.join(FROZEN, 'SOURCE'), 'utf8'), /^8d8729d /);
  const units = frozenDefs(moduleName).map(rel => {
    const artifactType = /"artifactType": "([^"]+)"/.exec(frozenText(rel) ?? '')?.[1] ?? '';
    return { defPath: `_${project}_/${rel}`, artifactType };
  });
  const files = await loadRegistrationFiles(project, moduleName, units, async ref => frozenText(ref.replace(`_${project}_/`, '')));
  const catalogRef = `_${project}_/l1/${moduleName}/materialization/agentMaterializeL1/scenarioCatalog.ts`;
  if (!files.some(file => file.ref === catalogRef)) {
    files.push({ ref: catalogRef, source: frozenText(catalogRef.replace(`_${project}_/`, '')), role: 'output' });
  }
  const input: ReconcileL5Input = {
    project,
    moduleName,
    allowStructureStub: true,
    phase: 'structure',
    projectJson: `${JSON.stringify({ modules: [{ moduleName }] }, null, 2)}\n`,
    files,
    catalogRef,
  };
  const reconciled = reconcileL5Backend(input);
  assert.equal(reconciled.action, 'patch', reconciled.detail);
  assert.equal(reconciled.pendings.filter(item => item.reason === 'ROUTE_DEPENDENCY_ABSENT' || item.reason === 'NO_ROUTES').length, 0, reconciled.detail);
  const controllers = files.filter(file => file.role === 'httpController' && file.source !== null);
  assert.equal(controllers.length, 3);
  const backend = reconciled.backend as { backendControllers: string; routeKeys: string[] };
  assert.equal(backend.backendControllers, `./${path.posix.dirname(controllers[0].ref)}`);
  assert.deepEqual(backend.routeKeys, controllers.flatMap(file => keysOf(file.source!)).sort());

  const victim = controllers[0];
  const kept = controllers.slice(1).flatMap(file => keysOf(file.source!)).sort();
  const droppedFiles = files.map(file => file.ref === victim.ref ? { ...file, source: null } : file);
  const dropped = reconcileL5Backend({ ...input, files: droppedFiles });
  assert.ok(droppedFiles.some(file => file.role === 'httpController' && file.source === null), victim.ref);
  assert.equal(dropped.action, 'patch', dropped.detail);
  assert.deepEqual(dropped.pendings.map(item => `${item.reason} ${item.origin}`), [`CONTROLLER_FILE_ABSENT ${victim.ref}`]);
  assert.equal(dropped.pendings[0].origin, victim.ref);
  assert.deepEqual((dropped.backend as { routeKeys: string[] }).routeKeys, kept);

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'm1-l5-real-'));
  try {
    const clientRoot = path.join(root, `mls-${project}`);
    for (const file of files) {
      if (file.source === null) continue;
      const dest = path.join(clientRoot, file.ref.replace(`_${project}_/`, ''));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, file.source);
    }
    fs.mkdirSync(path.join(clientRoot, 'l5'), { recursive: true });
    const projectJson = JSON.parse(reconciled.nextText!) as { masters?: unknown };
    projectJson.masters = { backend: { runtimeProject: 102034, masterProject: 102021, agentFolder: 'agentChangeBackend' } };
    fs.writeFileSync(path.join(clientRoot, 'l5', 'project.json'), `${JSON.stringify(projectJson, null, 2)}\n`);
    fs.writeFileSync(path.join(clientRoot, 'l5', 'config.json'), '{}\n');
    const composed = composeBackendRuntimeConfig(root, String(project));
    const config = JSON.parse(fs.readFileSync(composed.configPath, 'utf8')) as {
      projects: Record<string, { modules?: Array<{ moduleId: string; backendControllers?: string }> }>;
    };
    const pointed = config.projects[String(project)].modules?.[0].backendControllers ?? '';
    const dir = path.join(root, pointed.replace(/^\.\//, '').replace(/^_(\d+)_\//, 'mls-$1/'));
    const discovered = fs.readdirSync(dir).filter(name => name.endsWith('.ts') && !name.endsWith('.defs.ts') && !name.endsWith('.test.ts'));
    const found = discovered.flatMap(name => keysOf(fs.readFileSync(path.join(dir, name), 'utf8'))).sort();
    assert.deepEqual(found, backend.routeKeys);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a compatible masters.backend signature is preserved and an incompatible one blocks the patch', () => {
  const kept = ready();
  const parsed = JSON.parse(kept.projectJson!) as { masters?: unknown };
  parsed.masters = { frontend: { masterProject: 102020 }, backend: { masterProject: 102021, runtimeProject: 102034, agentFolder: 'agentChangeBackend' } };
  kept.projectJson = `${JSON.stringify(parsed, null, 2)}\n`;
  const result = reconcileL5Backend(kept);
  assert.equal(result.action, 'patch');
  const next = JSON.parse(result.nextText!) as { masters: { frontend: { masterProject: number }; backend: { agentFolder: string } } };
  assert.equal(next.masters.backend.agentFolder, 'agentChangeBackend');
  assert.equal(next.masters.frontend.masterProject, 102020);

  const broken = ready();
  const bad = JSON.parse(broken.projectJson!) as { masters?: unknown };
  bad.masters = { backend: { masterProject: 102021, agentFolder: 'agentChangeBackend' } };
  broken.projectJson = `${JSON.stringify(bad, null, 2)}\n`;
  const refused = reconcileL5Backend(broken);
  assert.equal(refused.action, 'pending');
  assert.equal(refused.nextText, broken.projectJson);
  assert.equal(refused.pendings[0].reason, 'SIGNATURE_INCOMPATIBLE');
  assert.equal(refused.backend, null);
});

test('a missing signature is not attributed to agentChangeBackend, and a reader-ready config is copied', () => {
  const bare = reconcileL5Backend(ready());
  assert.equal(bare.action, 'patch');
  assert.equal((JSON.parse(bare.nextText!) as { masters?: unknown }).masters, undefined);

  const unread = reconcileL5Backend({ ...ready(), backendSignature: { masterProject: 102021, runtimeProject: 102034 } });
  assert.equal(unread.action, 'pending');
  assert.equal(unread.pendings[0].reason, 'SIGNATURE_INCOMPATIBLE');
  assert.equal((JSON.parse(unread.nextText!) as { masters?: unknown }).masters, undefined);

  const filled = reconcileL5Backend({
    ...ready(),
    backendSignature: { masterProject: 102021, runtimeProject: 102034, agentFolder: 'agentMaterializeL1' },
  });
  assert.equal(filled.action, 'patch');
  const signature = (JSON.parse(filled.nextText!) as { masters: { backend: { agentFolder: string; runtimeProject: number } } }).masters.backend;
  assert.equal(signature.agentFolder, 'agentMaterializeL1');
  assert.equal(signature.runtimeProject, 102034);
});

test('a divergent runtime.project.json is not patched through project.json, and an owned snapshot is the file that changes', () => {
  const base = ready();
  const override = reconcileL5Backend({
    ...base,
    runtimeProjectJson: `${JSON.stringify({ modules: [{ moduleName: MODULE, backend: { routeKeys: ['old.route'] } }] }, null, 2)}\n`,
  });
  assert.equal(override.action, 'pending');
  assert.equal(override.nextText, null);
  assert.equal(override.effectiveSource, 'l5/runtime.project.json');
  assert.equal(override.pendings[0].reason, 'RUNTIME_OVERRIDE_DIVERGENT');
  assert.match(override.detail, /owner: unspecified/);

  const invalid = reconcileL5Backend({ ...base, runtimeProjectJson: '{' });
  assert.equal(invalid.action, 'invalid');
  assert.equal(invalid.nextText, null);
  assert.equal(invalid.pendings[0].reason, 'RUNTIME_JSON_INVALID');

  const owned = `${JSON.stringify({ publicationOwner: L5_PUBLICATION_OWNER, modules: [{ moduleName: MODULE }] }, null, 2)}\n`;
  const derived = reconcileL5Backend({ ...base, runtimeProjectJson: owned });
  assert.equal(derived.action, 'patch');
  assert.equal(derived.effectiveSource, 'l5/runtime.project.json');
  assert.notEqual(derived.nextText, base.projectJson);
  const written = JSON.parse(derived.nextText!) as { publicationOwner: string; modules: Array<{ backend: { routeKeys: string[] } }> };
  assert.equal(written.publicationOwner, L5_PUBLICATION_OWNER);
  assert.deepEqual(written.modules[0].backend.routeKeys, [`${MODULE}.board.open`]);
});

test('the composer follows runtime.project.json when that file exists', () => {
  const reconciled = reconcileL5Backend(ready());
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'm1-l5-runtime-'));
  try {
    const clientRoot = path.join(root, `mls-${PROJECT}`);
    const controllers = path.join(clientRoot, 'l1', MODULE, 'layer_1_external', 'adapters', 'http', 'controllers');
    const persistence = path.join(clientRoot, 'l1', MODULE, 'layer_1_external', 'adapters', 'persistence');
    fs.mkdirSync(controllers, { recursive: true });
    fs.mkdirSync(path.join(clientRoot, 'l5'), { recursive: true });
    fs.mkdirSync(persistence, { recursive: true });
    fs.writeFileSync(path.join(persistence, 'boardRow.js'), 'export const tableName = "board";\n');
    fs.writeFileSync(path.join(controllers, 'board.js'), 'export const routes = [];\n');
    const signature = { masters: { backend: { runtimeProject: 102034, masterProject: 102021, agentFolder: 'agentChangeBackend' } } };
    fs.writeFileSync(path.join(clientRoot, 'l5', 'project.json'), `${JSON.stringify({ ...signature, modules: [] }, null, 2)}\n`);
    const runtime = JSON.parse(reconciled.nextText!) as Record<string, unknown>;
    runtime.masters = signature.masters;
    fs.writeFileSync(path.join(clientRoot, 'l5', 'runtime.project.json'), `${JSON.stringify(runtime, null, 2)}\n`);
    fs.writeFileSync(path.join(clientRoot, 'l5', 'config.json'), '{}\n');
    const composed = composeBackendRuntimeConfig(root, String(PROJECT));
    const config = JSON.parse(fs.readFileSync(composed.configPath, 'utf8')) as {
      projects: Record<string, { modules?: Array<{ moduleId: string }> }>;
    };
    assert.equal(config.projects[String(PROJECT)].modules?.[0].moduleId, MODULE);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('commit merges a concurrent edit once and stops when the file keeps changing', async () => {
  const input = ready();
  let current = input.projectJson!;
  let swaps = 0;
  const writes: string[] = [];
  const io: L5CommitIo = {
    async claim() { return true; },
    async release() {},
    async read(ref: string) {
      return ref.endsWith('/runtime.project.json') ? null : current;
    },
    async compareAndSwap(_ref, expected, next) {
      swaps += 1;
      if (swaps === 1) {
        const edited = JSON.parse(current) as { note?: string };
        edited.note = 'from-neighbor';
        current = `${JSON.stringify(edited, null, 2)}\n`;
      }
      if (expected !== current) return 'conflict';
      current = next;
      writes.push(next);
      return 'ok';
    },
  };
  const { projectJson: _ignored, ...rest } = input;
  const merged = await commitL5Registration(rest, io, 'holder-a');
  assert.equal(merged.action, 'patch');
  assert.equal(writes.length, 1);
  const saved = JSON.parse(current) as { note: string; modules: Array<{ backend: { routeKeys: string[] } }> };
  assert.equal(saved.note, 'from-neighbor');
  assert.deepEqual(saved.modules[0].backend.routeKeys, [`${MODULE}.board.open`]);

  let flips = 0;
  const racing: L5CommitIo = {
    async claim() { return true; },
    async release() {},
    async read(ref: string) {
      if (ref.endsWith('/runtime.project.json')) return null;
      flips += 1;
      return `${JSON.stringify({ modules: [{ moduleName: MODULE }], flip: flips }, null, 2)}\n`;
    },
    async compareAndSwap() { return 'conflict'; },
  };
  const lost = await commitL5Registration(input, racing, 'holder-b');
  assert.equal(lost.action, 'pending');
  assert.equal(lost.pendings[0].reason, 'CONCURRENT_EDIT');
  assert.equal(lost.nextText, null);

  const busy: L5CommitIo = {
    async claim() { return false; },
    async release() { throw new Error('release after a missed claim'); },
    async read() { throw new Error('read after a missed claim'); },
    async compareAndSwap() { throw new Error('write after a missed claim'); },
  };
  const held = await commitL5Registration(input, busy, 'holder-c');
  assert.equal(held.pendings[0].reason, 'PROJECT_LOCK_BUSY');
});
