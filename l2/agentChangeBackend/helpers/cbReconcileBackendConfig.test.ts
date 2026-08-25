/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbReconcileBackendConfig.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  formatDiscardedOrphans,
  liveBackendModulesFromL5,
  pruneOrphanL5BackendModules,
  reconcileClientBackendRegistration,
} from './cbReconcileBackendConfig.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const petShopPersistence = {
  moduleId: 'petShop',
  tableDefsDir: './_102047_/l1/petShop/layer_1_external/adapters/persistence',
};
const todoPersistence = {
  moduleId: 'todo',
  tableDefsDir: './_102047_/l1/todo/layer_1_external/adapters/persistence',
};
const todoLive = {
  moduleId: 'todo',
  backendControllers: './_102047_/l1/todo/layer_1_external/adapters/http/controllers',
  tableDefsDir: todoPersistence.tableDefsDir,
};
const catalogLive = {
  moduleId: 'catalog',
  backendControllers: './_102047_/l1/catalog/layer_1_external/adapters/http/controllers',
  tableDefsDir: './_102047_/l1/catalog/layer_1_external/adapters/persistence',
};

test('petShop leftover is dropped when l5 only has todo', () => {
  const result = reconcileClientBackendRegistration(
    [
      { moduleId: 'petShop', basePath: '/petShop', shellMode: 'spa', backendControllers: './_102047_/l1/petShop/layer_1_external/adapters/http/controllers' },
      { moduleId: 'todo', basePath: '/todo', shellMode: 'spa' },
    ],
    [petShopPersistence, todoPersistence],
    [todoLive],
  );
  assert.deepEqual(result.persistenceModules.map(m => m.moduleId), ['todo']);
  assert.equal(result.persistenceModules[0].tableDefsDir, todoLive.tableDefsDir);
  assert.equal(result.modules.length, 1);
  assert.equal(result.modules[0].moduleId, 'todo');
  assert.equal(result.modules[0].backendControllers, todoLive.backendControllers);
  assert.deepEqual(result.discarded, ['petShop']);
  assert.match(formatDiscardedOrphans(result.discarded), /petShop/);
});

test('two live modules stay registered', () => {
  const result = reconcileClientBackendRegistration(
    [{ moduleId: 'todo', backendControllers: todoLive.backendControllers }],
    [todoPersistence],
    [todoLive, catalogLive],
  );
  assert.deepEqual(result.persistenceModules.map(m => m.moduleId), ['todo', 'catalog']);
  assert.equal(result.modules.length, 2);
  assert.deepEqual(result.discarded, []);
});

test('stale frontend pages of an orphan stay; backend wiring is stripped', () => {
  const result = reconcileClientBackendRegistration(
    [{
      moduleId: 'petShop',
      backendControllers: './gone',
      frontend: { pages: [{ pageId: 'home', route: '/petShop', source: './gone.ts', componentTag: 'x' }] },
    }],
    [petShopPersistence],
    [todoLive],
  );
  const leftover = result.modules.find(m => m.moduleId === 'petShop');
  assert.ok(leftover);
  assert.equal(leftover.backendControllers, undefined);
  assert.equal(result.persistenceModules.some(m => m.moduleId === 'petShop'), false);
  assert.ok(result.discarded.includes('petShop'));
});

test('legacy persistenceEntrypoint does not survive a live upsert', () => {
  const result = reconcileClientBackendRegistration(
    [],
    [{ moduleId: 'todo', persistenceEntrypoint: './old.js', tableDefsDir: './stale' }],
    [todoLive],
  );
  assert.equal(result.persistenceModules[0].tableDefsDir, todoLive.tableDefsDir);
  assert.equal('persistenceEntrypoint' in result.persistenceModules[0], false);
});

test('liveBackendModulesFromL5 reads the register block', () => {
  const live = liveBackendModulesFromL5([
    { moduleName: 'todo', backend: { backendControllers: todoLive.backendControllers, persistence: { tableDefsDir: todoLive.tableDefsDir }, routeKeys: ['todo.a'] } },
    { moduleName: 'ghost' },
  ]);
  assert.deepEqual(live, [todoLive]);
});

test('pruneOrphanL5BackendModules drops a backend whose persistence dir is gone', () => {
  const result = pruneOrphanL5BackendModules(
    [
      { moduleName: 'petShop', backend: { backendControllers: './pet', persistence: { tableDefsDir: './pet' }, routeKeys: ['a'] } },
      { moduleName: 'todo', backend: { backendControllers: './todo', persistence: { tableDefsDir: './todo' }, routeKeys: ['b'] } },
    ],
    'todo',
    (name) => name === 'todo',
  );
  assert.deepEqual(result.modules.map(m => m.moduleName), ['todo']);
  assert.deepEqual(result.discarded, ['petShop']);
});

test('backend config writers call reconcile instead of appending', () => {
  const composer = readFileSync(path.join(HERE, '..', 'nodejsSaveConfigJson.ts'), 'utf8');
  const shared = readFileSync(path.join(HERE, 'cbShared.ts'), 'utf8');
  const register = readFileSync(path.join(HERE, '..', 'steps', 'register', 'agentCbRegister.ts'), 'utf8');
  assert.match(composer, /reconcileClientBackendRegistration/);
  assert.match(shared, /reconcileClientBackendRegistration/);
  assert.match(register, /pruneOrphanL5BackendModules/);
});
