/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbNs4Dialect.test.ts" enhancement="_blank"/>

// The l4/l5 this agent reads is now written by agentNewSolution, which emits a different dialect:
// `as const satisfies <Artifact>`, `ownerType: 'useCase'` with `statusBackend`, entity lifecycles
// under workflows/, the relationship graph in ontology/index, profiles instead of actors.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseDefsSource, replaceDefsValue, handlerKindOf, entityKindOf, isEntityLifecycle,
  mlsImportPathParts, phantomModulePathOf, isModelAlreadyExistsError,
  todoStatusDivergences, todoOwnerType, todoStatusField, todoOwnerKey,
} from './cbDefsSource.js';
import { readAccessMatrixActors } from './cbWorkspace.js';

const ns4Defs = (value: unknown) => [
  '/// <mls fileReference="_102046_/l5/buildFlowFsm47/todoBackend.defs.ts" enhancement="_blank"/>',
  '',
  "import type { Ns4L5TodoBackendArtifact } from '/_102020_/l2/agentNewSolution/types.js';",
  '',
  `export const buildFlowFsm47TodoBackend = ${JSON.stringify(value, null, 2)} as const satisfies Ns4L5TodoBackendArtifact;`,
  '',
  'export type BuildFlowFsm47TodoBackendType = typeof buildFlowFsm47TodoBackend;',
  '',
  'export default buildFlowFsm47TodoBackend;',
  '',
].join('\n');

const todo = {
  schemaVersion: '2026-08-13-ns4-todo-backend-v1', layer: 'backend', moduleName: 'buildFlowFsm47',
  owners: [{ ownerType: 'useCase', ownerId: 'alignProjectBudget', statusBackend: 'toCreate' }],
};

test('a defs file typed with `satisfies` parses like any other', () => {
  assert.deepEqual(parseDefsSource(ns4Defs(todo)), todo);
  // The older dialect keeps working, and a file with a second export still parses its first value.
  assert.deepEqual(parseDefsSource('export const x = {"a":1} as const;\n\nexport default x;\n'), { a: 1 });
  assert.deepEqual(parseDefsSource('export const x = {"a":1} as const;\nexport const pipeline = [2] as const;\n'), { a: 1 });
  assert.equal(parseDefsSource('export const x = nothing;\n'), null);
});

test('a status write-back keeps the file the generator wrote', () => {
  const source = ns4Defs(todo);
  const next = structuredClone(todo);
  next.owners[0].statusBackend = 'done';
  const written = replaceDefsValue(source, next);
  assert.ok(written);
  // The header, the import type, the `satisfies` and the trailing exports all survive: re-serializing
  // would strip them and leave the generated project without its type check.
  assert.match(written!, /import type \{ Ns4L5TodoBackendArtifact \}/);
  assert.match(written!, /as const satisfies Ns4L5TodoBackendArtifact;/);
  assert.match(written!, /export default buildFlowFsm47TodoBackend;/);
  assert.deepEqual(parseDefsSource(written!), next);
});

test('an entity lifecycle is not a unit of backend work', () => {
  assert.equal(isEntityLifecycle({ workflowId: 'changeOrderLifecycle', entityRef: 'ChangeOrder', states: ['proposed'], transitions: [] }), true);
  // ns3 workflows were owners and still are: they name entities, not a lifecycle.
  assert.equal(isEntityLifecycle({ workflowId: 'orderFlow', entities: ['Order'], operationIds: ['createOrder'] }), false);
});

test('a projection owns no table: it maps to the kind that already meant read-model', () => {
  assert.equal(entityKindOf('projection'), 'metric');
  assert.equal(entityKindOf('core'), 'core');
  assert.equal(entityKindOf('mdm'), 'mdm');
  assert.equal(entityKindOf('somethingNew'), 'core');
});

test('the handler vocabulary is query or command, whatever dialect the operation kind speaks', () => {
  assert.equal(handlerKindOf('list'), 'query');
  assert.equal(handlerKindOf('getById'), 'query');
  assert.equal(handlerKindOf('query'), 'query');
  assert.equal(handlerKindOf('commandInput'), 'command');
  assert.equal(handlerKindOf('transition'), 'command');
  assert.equal(handlerKindOf(''), 'command');
});

test('the module audience comes from the access matrix profiles', () => {
  const actors = readAccessMatrixActors({
    profiles: [
      { profileId: 'companyAdministrator', title: 'Company administrator', kind: 'internal', actorRefs: ['companyAdministrator'] },
      { profileId: 'fieldWorker', kind: 'internal' },
      { title: 'no id' },
    ],
  }, 'buildFlowFsm47');
  assert.deepEqual(actors, [
    { actorId: 'companyAdministrator', title: 'Company administrator', roleScope: 'internal', moduleName: 'buildFlowFsm47' },
    { actorId: 'fieldWorker', title: 'fieldWorker', roleScope: 'internal', moduleName: 'buildFlowFsm47' },
  ]);
});

// ── a phantom module is an environment failure, not a plan defect ────────────
// Waves 1 and 2 of the seed run compiled the same seeds.ts with the same import minutes before wave 3
// failed on it: the file was always there, its compiler model was not.

test('a TS2792 over a real project path is recognized, and nothing else is', () => {
  const real = "file://server/_102046_/l1/x.ts - TS2792 - Cannot find module '/_102034_/l1/server/layer_1_external/persistence/contracts.js'. Did you mean to set moduleResolution?";
  assert.equal(phantomModulePathOf(real), '/_102034_/l1/server/layer_1_external/persistence/contracts.js');
  // A package import is not ours to load; a different diagnostic is not this problem.
  assert.equal(phantomModulePathOf("TS2792 - Cannot find module 'lit'"), '');
  assert.equal(phantomModulePathOf("TS2339 - Property 'x' does not exist"), '');
  assert.equal(phantomModulePathOf(''), '');
});

test('the import path resolves to the file coordinates the loader needs', () => {
  assert.deepEqual(mlsImportPathParts('/_102034_/l1/server/layer_1_external/persistence/contracts.js'), {
    project: 102034, level: 1, folder: 'server/layer_1_external/persistence', shortName: 'contracts',
  });
  assert.deepEqual(mlsImportPathParts('/_102046_/l2/buildFlowFsm47/web/contracts/page.js'), {
    project: 102046, level: 2, folder: 'buildFlowFsm47/web/contracts', shortName: 'page',
  });
  // No folder, or not an mls path at all: nothing to load.
  assert.equal(mlsImportPathParts('/_102034_/l1/contracts.js'), null);
  assert.equal(mlsImportPathParts('lit'), null);
});

// ── a model that is already there is not a failure ───────────────────────────
// `addModels` throws "model already exists" when Monaco holds the model under a key this agent's
// guard does not compute: the guard says "absent", the call throws, and the import stayed unborrowed
// while the same warning repeated for the whole run.
test('"model already exists" is the goal, not an error', () => {
  assert.equal(isModelAlreadyExistsError('Error: model already exists, uri: file://server/_102034_/l1/server/layer_2_controllers/contracts.ts'), true);
  assert.equal(isModelAlreadyExistsError('MODEL ALREADY EXISTS'), true);
  assert.equal(isModelAlreadyExistsError('network error'), false);
  assert.equal(isModelAlreadyExistsError(''), false);
});

// ── mdm no ns4 significa duas coisas, e quem decide é o ownership ─────────────
// Run 8 do buildFlowFsm: Client/InventoryItem/Project vieram `mdm` + `moduleOwned` com CRUD gerado.
// Lidos como master data EXTERNA, o create/update/delete não tinham onde morar — 4 usecases stub e o
// gate final acusou 12 "export not found".
test('mdm owned by the module is a local aggregate; mdm de fora continua read-only', () => {
  assert.equal(entityKindOf('mdm', 'moduleOwned'), 'core');
  assert.equal(entityKindOf('mdm', 'platformOwned'), 'mdm');
  assert.equal(entityKindOf('mdm', 'external'), 'mdm');
  assert.equal(entityKindOf('mdm', ''), 'mdm');          // sem ownership declarado: comportamento atual
  assert.equal(entityKindOf('mdm'), 'mdm');
  // As outras classificações não mudam.
  assert.equal(entityKindOf('projection', 'derived'), 'metric');
  assert.equal(entityKindOf('core', 'moduleOwned'), 'core');
  assert.equal(entityKindOf('somethingNew', 'moduleOwned'), 'core');
});

// ── varredura de modelos e telemetria (resíduo 464 monaco × 256 registry) ─────
test('the model sweep skips what the Studio had open and reports what it removed', () => {
  const io = readFileSync(new URL('cbMaterializeIo.ts', import.meta.url), 'utf8');
  // Só modelos do l1 do módulo alvo entram na varredura.
  assert.match(io, /if \(moduleName && !String\(storFile\.folder \|\| ''\)\.startsWith\(`\$\{moduleName\}\/`\)\) continue;/);
  // A regra de ownership: o que já estava no registry antes do run é aba do usuário e é PRESERVADO.
  assert.match(io, /if \(keep\.has\(key\)\) \{ kept\+\+; continue; \}/);
  assert.match(io, /return \{ swept, kept \}/);
  // A telemetria conta o que este agente pode contabilizar (o store do Monaco não é alcançável daqui).
  assert.match(io, /export function modelCounts\(\): \{ registry: number; pendingRelease: number \}/);
});

// ── read-back do todoBackend (lost update do petShop, 21/08/2026) ─────────────
// O run 5 do petShop reportou 65 owners `done` e o arquivo persistido ficou com 64 `toCreate` + 1
// `inProgress`. O comparador abaixo é o que transforma esse silêncio em falha: ele compara o que o run
// ACREDITA ter escrito com o que a fonte realmente carrega.
const TODO_SOURCE = `/// <mls fileReference="_102047_/l5/petShop/todoBackend.defs.ts" enhancement="_blank"/>

import type { Ns4L5TodoBackendArtifact } from '/_102020_/l2/agentNewSolution/types.js';

export const petShopTodoBackend = {
  "schemaVersion": "2026-08-13-ns4-todo-backend-v1",
  "layer": "backend",
  "moduleName": "petShop",
  "owners": [
    { "ownerType": "useCase", "ownerId": "listBusinessHours", "statusBackend": "inProgress" },
    { "ownerType": "useCase", "ownerId": "createPet", "statusBackend": "toCreate" },
    { "ownerType": "workflow", "ownerId": "petIntake", "statusBackend": "done" }
  ]
} as const satisfies Ns4L5TodoBackendArtifact;

export default petShopTodoBackend;
`;

test('todoStatusDivergences names exactly the owners the file disagrees about', () => {
  // O estado real do run 5: o run acredita em `done` para os três, o arquivo diz outra coisa em dois.
  const divergences = todoStatusDivergences(TODO_SOURCE, new Map([
    ['operation:listBusinessHours', 'done'],
    ['operation:createPet', 'done'],
    ['workflow:petIntake', 'done'],
  ]));
  assert.deepEqual(divergences, [
    { key: 'operation:listBusinessHours', expected: 'done', found: 'inProgress' },
    { key: 'operation:createPet', expected: 'done', found: 'toCreate' },
  ]);
});

test('todoStatusDivergences aceita o dialeto (useCase -> operation, statusBackend) e o caminho feliz', () => {
  // `useCase` do ns4 é o `operation` do scan, e a chave do read-back é a do owner JÁ traduzido.
  assert.equal(todoOwnerType('useCase'), 'operation');
  assert.equal(todoStatusField({ statusBackend: 'done' }), 'statusBackend');
  assert.equal(todoStatusField({ status: 'done' }), 'status');
  assert.equal(todoOwnerKey('operation', 'listBusinessHours'), 'operation:listBusinessHours');
  // Caminho feliz: escrita seguida de releitura no mesmo fluxo, statuses batendo (guard de regressão).
  assert.deepEqual(todoStatusDivergences(TODO_SOURCE.replace(/"toCreate"|"inProgress"/g, '"done"'), new Map([
    ['operation:listBusinessHours', 'done'],
    ['operation:createPet', 'done'],
    ['workflow:petIntake', 'done'],
  ])), []);
});

test('todoStatusDivergences separa "ilegível" de "sem divergência", e acusa owner ausente', () => {
  // null NÃO é "está tudo certo": é "não deu para verificar", e o chamador falha o step.
  assert.equal(todoStatusDivergences('não é um defs', new Map([['operation:x', 'done']])), null);
  assert.equal(todoStatusDivergences('export const x = {} as const;', new Map([['operation:x', 'done']])), null);
  // Owner que o run escreveu e o arquivo não tem: divergência nomeada, nunca omissão.
  assert.deepEqual(todoStatusDivergences(TODO_SOURCE, new Map([['operation:desapareceu', 'done']])), [
    { key: 'operation:desapareceu', expected: 'done', found: '<missing>' },
  ]);
});

// ── a causa raiz: modelo Monaco congelado no PRIMEIRO write ───────────────────
// libModel.createModel devolve um modelo já existente SEM setValue, e o sync Studio<->disco lê o
// conteúdo do modelo ANTES do stor. Por isso o writeDefsSource tem de atualizar o modelo que existe —
// e nunca criar um (modelo não-emprestado é leak).
test('writeDefsSource mantém o modelo existente em sincronia com o que persistiu', () => {
  const shared = readFileSync(new URL('cbShared.ts', import.meta.url), 'utf8');
  assert.match(shared, /await mls\.stor\.localStor\.setContent\(file, \{ contentType: 'string', content: src \}\);\s*\n\s*refreshExistingModel\(file, src\);/);
  // Atualiza só o que JÁ existe: nada de getOrCreateModel aqui.
  assert.match(shared, /const model = mls\.editor\.getModel\(file\) as mls\.editor\.IModelBase \| undefined;\s*\n\s*if \(model\?\.model && model\.model\.getValue\(\) !== src\) model\.model\.setValue\(src\);/);
  assert.doesNotMatch(shared, /refreshExistingModel[\s\S]{0,400}getOrCreateModel/);
  // E o read-back olha as DUAS superfícies: o stor (o que o próximo run lê) e o modelo (o que o export escreve).
  assert.match(shared, /export async function readBackTodoBackend\(expected: ReadonlyMap<string, string>\)/);
  assert.match(shared, /modelDivergent = todoStatusDivergences\(model\.model\.getValue\(\), expected\);/);
  // Divergência em qualquer superfície mata o run; stor ilegível também. Modelo ilegível é aba do
  // usuário com sintaxe quebrada no meio da edição — warning alto, não morte do run.
  assert.match(shared, /export function todoReadBackIsFatal[\s\S]{0,240}return readBack\.stor\.unreadable \|\| todoReadBackDivergences\(readBack\)\.length > 0;/);
  // O merge do l5\/config.json cai na MESMA classe de defeito, e numa escrita única.
  assert.match(shared, /content: source \}\);[\s\S]{0,400}refreshExistingModel\(file, source\);/);
});
