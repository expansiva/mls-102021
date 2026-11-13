/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/catalog75/assistantCatalogBuild.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { extractExportedObject } from '/_102020_/l2/helpers/assistantCatalog/asSource.js';
import { asArray, asRecord, asString } from '/_102020_/l2/helpers/assistantCatalog/asCatalog.js';
import { buildAssistantCatalog, type AssistantCatalogInputs } from '/_102021_/l2/agentMaterializeL1/steps/catalog75/assistantCatalogBuild.js';

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', '102047');

function readFixture(rel: string): string {
  return readFileSync(path.join(FIXTURE, rel), 'utf8');
}

function textsIn(rel: string): string[] {
  return readdirSync(path.join(FIXTURE, rel))
    .filter(name => name.endsWith('.defs.ts'))
    .sort()
    .map(name => readFixture(path.join(rel, name)));
}

function journeyTexts(moduleName: string): string[] {
  const index = extractExportedObject(readFixture(`l4/${moduleName}/journeys/index.defs.ts`));
  const ordered = asArray(asRecord(index).journeys).map(item => asString(asRecord(item).journeyId)).filter(Boolean);
  const files = readdirSync(path.join(FIXTURE, `l4/${moduleName}/journeys`))
    .filter(name => name.endsWith('.defs.ts') && name !== 'index.defs.ts')
    .map(name => name.slice(0, -'.defs.ts'.length));
  const ranked = [
    ...ordered.filter(id => files.includes(id)),
    ...files.filter(id => !ordered.includes(id)).sort(),
  ];
  return ranked.map(id => readFixture(`l4/${moduleName}/journeys/${id}.defs.ts`));
}

function routeKeys(moduleName: string): string[] {
  const project = JSON.parse(readFixture('l5/project.json')) as { modules?: unknown[] };
  const moduleNode = (project.modules ?? []).map(item => asRecord(item)).find(item => asString(item.moduleName) === moduleName);
  return asArray(asRecord(moduleNode?.backend).routeKeys).map(asString).filter(Boolean);
}

function inputsOf(moduleName: string, routeKeysOverride?: string[]): AssistantCatalogInputs {
  return {
    project: '102047',
    module: moduleName,
    routeKeys: routeKeysOverride ?? routeKeys(moduleName),
    requests: textsIn(`l1/${moduleName}/layer_2_application/requests`),
    contracts: textsIn(`l2/${moduleName}/web/contracts`),
    ontology: textsIn(`l4/${moduleName}/ontology`),
    usecases: textsIn(`l1/${moduleName}/layer_2_application/usecases`),
    journeys: journeyTexts(moduleName),
    integration: readFixture(`l4/${moduleName}/integration.defs.ts`),
    workflows: readFixture(`l4/${moduleName}/workflows.defs.ts`),
    workflowOperations: textsIn(`l1/${moduleName}/layer_2_application/workflows`),
    sharedPages: textsIn(`l2/${moduleName}/web/shared`),
    config: readFixture('l5/config.json'),
  };
}

test('iniciar routes merge, updateTarefa does not, and cancelar is sensitive', () => {
  const { catalog } = buildAssistantCatalog(inputsOf('tarefas'));
  const iniciar = catalog.commands.find(command => command.routes.includes('tarefas.inicio.iniciarTarefa'));
  assert.ok(iniciar);
  assert.equal(iniciar.actionId, 'tarefas.iniciar');
  assert.deepEqual(iniciar.routes, ['tarefas.inicio.iniciarTarefa', 'tarefas.minhas_tarefas.cmdIniciar']);
  assert.equal(iniciar.route, 'tarefas.inicio.iniciarTarefa');

  const updates = catalog.commands.filter(command => command.routes.some(route => route === 'tarefas.minhas_tarefas.cmdSalvarAlteracoes' || route === 'tarefas.tarefas_equipe.trocarResponsavelTarefa'));
  assert.equal(updates.length, 2);
  assert.ok(updates.every(command => command.routes.length === 1));
  assert.ok(catalog.issues.some(issue => issue.startsWith('ACTION_NOT_MERGED:') && issue.includes('updateTarefa')));

  const inicio = catalog.queries.find(query => query.route === 'tarefas.inicio.carregarInicio');
  assert.equal(inicio?.assistant, 'included');
  const filtros = catalog.queries.find(query => query.route === 'tarefas.tarefas_equipe.carregarFiltrosEquipe');
  assert.equal(filtros?.assistant, 'included');

  const cancelar = catalog.commands.find(command => command.routes.includes('tarefas.minhas_tarefas.cmdCancelar'));
  assert.equal(cancelar?.risk, 'sensitive');
  assert.ok(catalog.queries.every(query => query.routes.length === 1 && query.actionId === query.route));
});

test('a query whose output is only option lists is excluded', () => {
  const contract = `
    export interface A { id: string; nome: string }
    export interface B { id: string; rotulo: string }
    export interface Contracts {
      'mod.page.soOpcoes': { kind: 'qry'; input: {}; output: { listas: A[]; outras: B[] } };
      'mod.page.outra': { kind: 'qry'; input: {}; output: { listas: A[] } };
    }
  `;
  const request = `export const definition = { "data": { "requests": [
    { "route": "mod.page.soOpcoes", "kind": "qry", "uses": ["listA"], "doc": { "purpose": "so opcoes" }, "output": [], "params": [], "rules": [] },
    { "route": "mod.page.outra", "kind": "qry", "uses": ["listA"], "doc": { "purpose": "outras opcoes" }, "output": [], "params": [], "rules": [] }
  ] } };`;
  const usecase = `export const definition = { "data": { "usecaseId": "listA", "entityId": "A", "operation": "list", "effects": [] } };`;
  const { catalog } = buildAssistantCatalog({
    project: '1',
    module: 'mod',
    routeKeys: ['mod.page.soOpcoes', 'mod.page.outra'],
    requests: [request],
    contracts: [contract],
    ontology: [],
    usecases: [usecase],
    journeys: [],
    integration: null,
    workflows: null,
    workflowOperations: [],
    sharedPages: [],
    config: '{}',
  });
  assert.equal(catalog.queries.length, 2);
  assert.equal(catalog.queries[0].assistant, 'excluded');
  assert.equal(catalog.queries[1].assistant, 'excluded');
  assert.deepEqual(catalog.queries.map(query => query.actionId), ['mod.page.soOpcoes', 'mod.page.outra']);
});

test('a module with no live routes is an empty catalog', () => {
  const { catalog } = buildAssistantCatalog(inputsOf('tarefas', []));
  assert.equal(catalog.schemaVersion, 'assistant-catalog-v1');
  assert.equal(catalog.module, 'tarefas');
  assert.deepEqual(catalog.commands, []);
  assert.deepEqual(catalog.queries, []);
  assert.deepEqual(catalog.lookups, []);
  assert.deepEqual(catalog.entities, []);
  assert.deepEqual(catalog.issues, []);
});

test('route keys and requests only meet on the live routes', () => {
  const live = routeKeys('compras').filter(route => route !== 'compras.produtos.cadastrarProduto');
  const { catalog } = buildAssistantCatalog(inputsOf('compras', [...live, 'compras.produtos.rotaAusente']));
  const routes = [...catalog.commands, ...catalog.queries].flatMap(item => item.routes);
  assert.equal(routes.includes('compras.produtos.cadastrarProduto'), false);
  assert.equal(routes.includes('compras.produtos.rotaAusente'), false);
  assert.ok(routes.includes('compras.painel_compras.autorizarSolicitacao'));
});

test('the file text is deterministic and reads back as the same catalog', () => {
  const inputs = inputsOf('compras');
  const first = buildAssistantCatalog(inputs);
  const second = buildAssistantCatalog(inputs);
  assert.equal(first.text, second.text);
  assert.match(first.text, /^\/\/\/ <mls fileReference="_102047_\/l1\/compras\/layer_2_application\/assistant\/assistantCatalog\.ts" enhancement="_blank"\/>\n/);
  assert.equal(first.text.includes('import '), false);
  assert.deepEqual(extractExportedObject(first.text), first.catalog);
  assert.equal(first.catalog.schemaVersion, 'assistant-catalog-v1');
  assert.equal(first.catalog.module, 'compras');
});
