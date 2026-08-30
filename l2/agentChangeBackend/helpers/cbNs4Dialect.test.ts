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
  pickTodoBackendReadBack, selectTodoBackendFileForStatusWrite,
  readOwnerMdm, pinUsecaseL4Mdm, isMdmLifecycle, synthesizeMdmInputs,
} from './cbDefsSource.js';
import { collectMdmLifecycleIssues } from './cbMdmGuards.js';
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
  assert.match(io, /export function modelCounts\(\): \{ registry: number; pendingRelease: number; peak: number \}/);
  assert.match(io, /shortName: defsShort/);
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

// ── read-back / write escolhem o módulo (run 30/08 listaAssinatura no 102047) ──
// O run era do listaAssinatura; a conferência leu o primeiro todoBackend.defs.ts do stor
// (`l5/todo/`) e acusou as 18 operations como <missing>. As escritas tinham acertado o arquivo
// certo. Fixture mínima no formato real (statusBackend + import type + `as const`) — NÃO lê o
// app gerado: ele some no próximo rebuild.

function todoBackendDefs(moduleName: string, exportName: string, owners: { ownerId: string; statusBackend: string }[]): string {
  const value = {
    schemaVersion: '2026-08-13-ns4-todo-backend-v1',
    layer: 'backend',
    moduleName,
    owners: owners.map(o => ({ ownerType: 'useCase', ownerId: o.ownerId, statusBackend: o.statusBackend })),
  };
  return [
    `/// <mls fileReference="_102000_/l5/${moduleName}/todoBackend.defs.ts" enhancement="_blank"/>`,
    '',
    "import type { Ns4L5TodoBackendArtifact } from '/_102020_/l2/agentNewSolution/types.js';",
    '',
    `export const ${exportName} = ${JSON.stringify(value, null, 2)} as const satisfies Ns4L5TodoBackendArtifact;`,
    '',
    `export default ${exportName};`,
    '',
  ].join('\n');
}

const LISTA_ASSINATURA_OWNERS = [
  'createSignatory', 'createSignature', 'decideSignatureAcceptance', 'deleteSignature',
  'downloadSignaturesCsv', 'getSignatory', 'getSignature', 'inactivateSignatory',
  'inspectPetition', 'listSignatory', 'listSignature', 'locatePetition',
  'locateSignatures', 'reactivateSignatory', 'registerSignature', 'updateSignatory',
  'updateSignature', 'viewPetitionPublicSummary',
] as const;

const TODO_MODULE_OWNERS = ['createTask', 'listTask', 'updateTask'] as const;

test('read-back of listaAssinatura ignores the todo file that comes first in the stor', () => {
  const todoFile = todoBackendDefs('todo', 'todoTodoBackend', TODO_MODULE_OWNERS.map(id => ({ ownerId: id, statusBackend: 'done' })));
  const listaFile = todoBackendDefs('listaAssinatura', 'listaAssinaturaTodoBackend', LISTA_ASSINATURA_OWNERS.map(id => ({ ownerId: id, statusBackend: 'done' })));
  const folders = ['todo', 'listaAssinatura'];
  const expected = new Map(LISTA_ASSINATURA_OWNERS.map(id => [`operation:${id}`, 'done'] as const));

  // The defect: first file in iteration order is `todo`, whose 18 owners are all missing.
  const firstFileDivergences = todoStatusDivergences(todoFile, expected);
  assert.equal(firstFileDivergences!.length, LISTA_ASSINATURA_OWNERS.length);
  assert.ok(firstFileDivergences!.every(d => d.found === '<missing>'));
  assert.equal(firstFileDivergences!.find(d => d.key === 'operation:listSignatory')?.found, '<missing>');
  assert.equal(firstFileDivergences!.find(d => d.key === 'operation:createSignatory')?.found, '<missing>');

  const pick = pickTodoBackendReadBack(folders, 'listaAssinatura');
  assert.deepEqual(pick, { kind: 'file', folder: 'listaAssinatura', ref: 'l5/listaAssinatura/todoBackend.defs.ts' });
  assert.equal(pick.kind === 'file' ? pick.ref : '', 'l5/listaAssinatura/todoBackend.defs.ts');
  assert.doesNotMatch(pick.kind === 'file' ? pick.ref : '', /todoAvancado|includes/);
  assert.deepEqual(todoStatusDivergences(listaFile, expected), []);

  // A module `todo` must not match a folder `todoAvancado` (equality, never substring).
  assert.deepEqual(pickTodoBackendReadBack(['todoAvancado', 'listaAssinatura'], 'todo'), {
    kind: 'module-missing', moduleName: 'todo', ref: 'l5/todo/todoBackend.defs.ts',
  });
});

test('read-back of a single-module project is identical with or without the module name', () => {
  const folders = ['petShop'];
  const expected = new Map([
    ['operation:listBusinessHours', 'inProgress'],
    ['operation:createPet', 'toCreate'],
    ['workflow:petIntake', 'done'],
  ]);
  assert.deepEqual(pickTodoBackendReadBack(folders, ''), { kind: 'file', folder: 'petShop', ref: 'l5/petShop/todoBackend.defs.ts' });
  assert.deepEqual(pickTodoBackendReadBack(folders, 'petShop'), { kind: 'file', folder: 'petShop', ref: 'l5/petShop/todoBackend.defs.ts' });
  assert.deepEqual(todoStatusDivergences(TODO_SOURCE, expected), []);
  assert.deepEqual(pickTodoBackendReadBack([], ''), { kind: 'none' });
  assert.deepEqual(pickTodoBackendReadBack([], 'petShop'), { kind: 'none' });
});

test('writing an owner in module A does not mutate the same owner id in module B', () => {
  const files = [
    { folder: 'modA', content: todoBackendDefs('modA', 'modATodoBackend', [{ ownerId: 'createTask', statusBackend: 'toCreate' }]) },
    { folder: 'modB', content: todoBackendDefs('modB', 'modBTodoBackend', [{ ownerId: 'createTask', statusBackend: 'done' }]) },
  ];
  const snapshotB = files[1].content;
  const target = selectTodoBackendFileForStatusWrite(files, { kind: 'operation', id: 'createTask', moduleName: 'modA' });
  assert.equal(target, files[0]);
  const parsed = parseDefsSource(target!.content) as { owners: { ownerId: string; statusBackend: string }[] };
  parsed.owners[0].statusBackend = 'done';
  const written = replaceDefsValue(target!.content, parsed);
  assert.ok(written);
  target!.content = written!;
  assert.equal(files[1].content, snapshotB);
  assert.match(files[0].content, /"statusBackend": "done"/);
  assert.match(files[1].content, /"statusBackend": "done"/);
  // Owner missing from its own module: do not fall through to the neighbour.
  assert.equal(selectTodoBackendFileForStatusWrite(files, { kind: 'operation', id: 'createTask', moduleName: 'modC' }), undefined);
  assert.equal(selectTodoBackendFileForStatusWrite(files, { kind: 'operation', id: 'listItem', moduleName: 'modA' }), undefined);
  // Empty moduleName keeps search-by-identity (first file that has the owner).
  assert.equal(selectTodoBackendFileForStatusWrite(files, { kind: 'operation', id: 'createTask', moduleName: '' }), files[0]);
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
  // be4: createStorFile(..., true, true, true) created a Monaco model for every defs write.
  assert.doesNotMatch(shared, /createStorFile\(param, true, true, true\)/);
  assert.match(shared, /createStorFile\(param, false, false, false\)/);
  // E o read-back olha as DUAS superfícies: o stor (o que o próximo run lê) e o modelo (o que o export escreve).
  assert.match(shared, /export async function readBackTodoBackend\(expected: ReadonlyMap<string, string>, moduleName = ''\)/);
  assert.match(shared, /pickTodoBackendReadBack\(matches\.map\(m => m\.folder\), moduleName\)/);
  assert.match(shared, /selectTodoBackendFileForStatusWrite\(candidates, owner\)/);
  assert.match(shared, /modelDivergent = todoStatusDivergences\(model\.model\.getValue\(\), expected\);/);
  // Divergência em qualquer superfície mata o run; stor ilegível também. Modelo ilegível é aba do
  // usuário com sintaxe quebrada no meio da edição — warning alto, não morte do run.
  assert.match(shared, /export function todoReadBackIsFatal[\s\S]{0,240}return readBack\.stor\.unreadable \|\| todoReadBackDivergences\(readBack\)\.length > 0;/);
  // O merge do l5\/config.json cai na MESMA classe de defeito, e numa escrita única.
  assert.match(shared, /content: source \}\);[\s\S]{0,400}refreshExistingModel\(file, source\);/);
});

// ── bloco `mdm` da operação (F1 do mdm_write_path) ───────────────────────────
// Payload REAL do petShop (mls-102047/l4/petShop/operations/), que é o primeiro l4 gerado com o
// vocabulário novo. Repare no `inputs: []` do list: o `includeInactive` que o `activeFilterInput`
// nomeia NÃO existe no l4 — o gate do ns4 exige que todo fieldRef resolva para campo da ontologia, e
// `includeInactive` não é campo de nada. Quem materializa esse input é o CB.
const OP_INACTIVATE_CUSTOMER = {
  operationId: 'inactivateCustomer',
  entity: 'Customer',
  kind: 'update',
  reads: ['Customer'],
  writes: ['Customer'],
  inputs: [{ inputId: 'customerId', fieldRef: 'Customer.customerId', required: true, source: 'selectedEntity', description: 'Identificador estável' }],
  mdm: { lifecycle: 'inactivate' },
  pageId: 'customerCatalogue',
  commandName: 'cmdInactivateCustomer',
  bffName: 'cmdInactivateCustomer',
};
const OP_LIST_CUSTOMER = {
  operationId: 'listCustomer',
  entity: 'Customer',
  kind: 'query',
  reads: ['Customer'],
  writes: [],
  inputs: [],
  mdm: { activeFilterInput: 'includeInactive', situationOutput: 'active' },
  pageId: 'attachPetServiceImage',
  commandName: 'qryCustomerPicker',
  bffName: 'qryCustomerPicker',
};

test('readOwnerMdm lê o bloco real e é AUSENTE (não vazio) quando o l4 não tem', () => {
  assert.deepEqual(readOwnerMdm(OP_INACTIVATE_CUSTOMER), { lifecycle: 'inactivate' });
  assert.deepEqual(readOwnerMdm(OP_LIST_CUSTOMER), { activeFilterInput: 'includeInactive', situationOutput: 'active' });
  // Critério 1 da spec: l4 antigo (sem bloco) tem de produzir owner IDÊNTICO ao de antes.
  assert.equal(readOwnerMdm({ operationId: 'createCustomer', entity: 'Customer' }), undefined);
  // Bloco presente mas vazio/inválido também é ausente — nada de `mdm: {}` no item do prompt.
  assert.equal(readOwnerMdm({ mdm: {} }), undefined);
  assert.equal(readOwnerMdm({ mdm: { lifecycle: 42 } }), undefined);
  assert.equal(readOwnerMdm({ mdm: [] }), undefined);
  assert.equal(isMdmLifecycle(readOwnerMdm(OP_INACTIVATE_CUSTOMER)), true);
  assert.equal(isMdmLifecycle(readOwnerMdm(OP_LIST_CUSTOMER)), false);
});

test('pinUsecaseL4Mdm writes the l4 block onto the model output — otherwise the defs never have mdm', () => {
  const fromL4 = readOwnerMdm(OP_INACTIVATE_CUSTOMER);
  const missing = { ports: ['Customer'], functions: [] } as Record<string, unknown>;
  pinUsecaseL4Mdm(missing, fromL4);
  assert.deepEqual(missing.mdm, { lifecycle: 'inactivate' });
  const invented = { mdm: { lifecycle: 'delete' }, ports: [] } as Record<string, unknown>;
  pinUsecaseL4Mdm(invented, undefined);
  assert.equal('mdm' in invented, false);
  const src = readFileSync(new URL('../steps/gen-usecase/agentCbUsecase.ts', import.meta.url), 'utf8');
  assert.match(src, /pinUsecaseL4Mdm\(result, owner\?\.mdm\)/);
  // The materialize guard reads data.mdm of the DEFS. With the pin, a no-op body is visible.
  assert.match(
    collectMdmLifecycleIssues('export async function x(){ return {}; }', (missing.mdm as { lifecycle: string }).lifecycle)[0],
    /does not call ctx\.mdm\.entity\.inactivate/,
  );
});

// ── o usecase de lifecycle não pode destruir nada ────────────────────────────
test('collectMdmLifecycleIssues acusa delete, porta local e tabela local — e o no-op', () => {
  const ok = `export async function inactivateCustomer(ctx, input) {
    const current = await ctx.mdm.entity.get({ mdmId: input.customerId });
    return ctx.mdm.entity.inactivate({ mdmId: input.customerId, expectedVersion: current.version });
  }`;
  assert.deepEqual(collectMdmLifecycleIssues(ok, 'inactivate'), []);
  // Fixture ADULTERADA do payload real: o lifecycle chamando delete é o defeito que a spec nomeia.
  const deleting = ok.replace('ctx.mdm.entity.inactivate', 'ctx.mdm.entity.delete');
  const issues = collectMdmLifecycleIssues(deleting, 'inactivate');
  assert.equal(issues.length, 1);
  assert.match(issues[0], /must not delete/);
  assert.match(issues[0], /use ctx\.mdm\.entity\.inactivate/);
  // Porta local e tabela local: o bug original do 102046 (mls102046_client no lugar do índice MDM).
  assert.match(collectMdmLifecycleIssues(`customerRepository.delete({ id })`, 'inactivate')[0], /local port/);
  assert.match(collectMdmLifecycleIssues(`await ctx.data.customer.update({ where, data })`, 'reactivate')[0], /local table/);
  // Não fazer nada também é defeito: a ação na tela viraria no-op silencioso.
  assert.match(collectMdmLifecycleIssues(`export async function x(){ return {}; }`, 'reactivate')[0], /does not call ctx\.mdm\.entity\.reactivate/);
  // LEITURA por porta é legítima num lifecycle (carregar o registro, validar regra) — não acusa.
  const readsPort = `const found = await customerRepository.findById(input.customerId);
    return ctx.mdm.entity.reactivate({ mdmId: found.customerId, expectedVersion: found.version });`;
  assert.deepEqual(collectMdmLifecycleIssues(readsPort, 'reactivate'), []);
  // Fora de lifecycle o validador é inerte (list, create, ou l4 sem bloco).
  assert.deepEqual(collectMdmLifecycleIssues(deleting, ''), []);
  assert.deepEqual(collectMdmLifecycleIssues(deleting, undefined), []);
});

// ── o input que o l4 NÃO pode declarar ───────────────────────────────────────
// `activeFilterInput: 'includeInactive'` nomeia um input que não existe em nenhum l4 (o gate do ns4
// exige fieldRef resolvível, e `includeInactive` não é campo da ontologia). Sem materializá-lo, o
// controller — que deriva o contrato de fronteira de `owner.inputs` — nunca aprenderia a flag, e o
// chamador não teria como pedir os inativos.
test('synthesizeMdmInputs materializa o includeInactive como booleano OPCIONAL', () => {
  const created = synthesizeMdmInputs([], readOwnerMdm(OP_LIST_CUSTOMER));
  assert.equal(created.length, 1);
  assert.deepEqual(created[0], {
    inputId: 'includeInactive',
    fieldRef: '',
    type: 'boolean',
    required: false,
    source: 'userInput',
    description: 'Include records inactivated in the MDM index (default: only active ones).',
  });
  // `required: false` não é detalhe: `requiredBoundaryFields` só coleta required===true, então nenhuma
  // checagem obrigatória nova aparece nos controllers já gerados.
  assert.equal(created[0].required, false);
});

test('synthesizeMdmInputs não toca em quem não pediu, e nunca duplica', () => {
  const originals = [{ inputId: 'customerId', fieldRef: 'Customer.customerId', required: true, source: 'selectedEntity', description: 'x' }];
  // Critério 1: sem bloco `mdm`, os inputs saem pela MESMA referência — zero mudança de comportamento.
  assert.equal(synthesizeMdmInputs(originals, undefined), originals);
  // Lifecycle não tem activeFilterInput: também intocado.
  assert.equal(synthesizeMdmInputs(originals, readOwnerMdm(OP_INACTIVATE_CUSTOMER)), originals);
  // Um l4 futuro que JÁ declare o input não ganha uma segunda cópia.
  const already = [{ inputId: 'includeInactive', fieldRef: '', type: 'boolean', required: false, source: 'userInput', description: 'já existe' }];
  assert.equal(synthesizeMdmInputs(already, readOwnerMdm(OP_LIST_CUSTOMER)), already);
});
