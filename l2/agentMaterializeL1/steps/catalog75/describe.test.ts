/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/catalog75/describe.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { extractExportedObject } from '/_102020_/l2/helpers/assistantCatalog/asSource.js';
import { asArray, asRecord, asString } from '/_102020_/l2/helpers/assistantCatalog/asCatalog.js';
import { accessOfRoute, optionsOnly, pageOfRoute, titleOfCommand, titleOfQuery } from '/_102021_/l2/agentMaterializeL1/steps/catalog75/describe.js';

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', '102047');

function readFixture(rel: string): string {
  return readFileSync(path.join(FIXTURE, rel), 'utf8');
}

function journeyTexts(moduleName: string): string[] {
  const index = extractExportedObject(readFixture(`l4/${moduleName}/journeys/index.defs.ts`));
  return asArray(asRecord(index).journeys).map(item => {
    const journeyId = asString(asRecord(item).journeyId);
    if (!journeyId) throw new Error('journey index entry has no journeyId');
    return readFixture(`l4/${moduleName}/journeys/${journeyId}.defs.ts`);
  });
}

const TAREFAS_JOURNEYS = journeyTexts('tarefas');
const COMPRAS_JOURNEYS = journeyTexts('compras');
const CONFIG = readFixture('l5/config.json');

test('iniciarTarefa takes the page journey title, actors and rules', () => {
  const title = titleOfCommand({
    usecaseText: readFixture('l1/tarefas/layer_2_application/usecases/iniciar.defs.ts'),
    journeyTexts: TAREFAS_JOURNEYS,
    sharedPageText: readFixture('l2/tarefas/web/shared/inicio.defs.ts'),
    purpose: 'unused',
  });
  assert.equal(title, 'Iniciar tarefa');
  const access = accessOfRoute(readFixture('l2/tarefas/web/contracts/inicio.defs.ts'), 'tarefas.inicio.iniciarTarefa');
  assert.deepEqual(access.actors, ['membroEquipe']);
  assert.ok(access.rules.includes('apenasResponsavelExecuta'));
});

test('the same write usecase takes the title of each page journey', () => {
  const usecaseText = readFixture('l1/tarefas/layer_2_application/usecases/updateTarefa.defs.ts');
  const equipe = titleOfCommand({
    usecaseText,
    journeyTexts: TAREFAS_JOURNEYS,
    sharedPageText: readFixture('l2/tarefas/web/shared/tarefas_equipe.defs.ts'),
    purpose: 'unused',
  });
  const minhas = titleOfCommand({
    usecaseText,
    journeyTexts: TAREFAS_JOURNEYS,
    sharedPageText: readFixture('l2/tarefas/web/shared/minhas_tarefas.defs.ts'),
    purpose: 'unused',
  });
  assert.equal(equipe, 'Trocar responsável');
  assert.equal(minhas, 'Editar tarefa');
});

test('autorizarSolicitacao uses the journey step title', () => {
  const title = titleOfCommand({
    usecaseText: readFixture('l1/compras/layer_2_application/usecases/autorizar.defs.ts'),
    journeyTexts: COMPRAS_JOURNEYS,
    sharedPageText: readFixture('l2/compras/web/shared/painel_compras.defs.ts'),
    purpose: 'unused',
  });
  assert.equal(title, 'Autorizar com opção');
});

test('a command with no journey step falls back to doc.purpose', () => {
  const purpose = 'Cadastra no catálogo um produto que falta para as compras, ou anexa o papel compras.Produto a um produto já existente no cadastro mestre.';
  const title = titleOfCommand({
    usecaseText: readFixture('l1/compras/layer_2_application/usecases/createProduto.defs.ts'),
    journeyTexts: COMPRAS_JOURNEYS,
    sharedPageText: readFixture('l2/compras/web/shared/produtos.defs.ts'),
    purpose,
  });
  assert.equal(title, purpose);
});

test('a query title is the first locate or inspect step of its entity on the page', () => {
  const title = titleOfQuery({
    entity: 'Tarefa',
    journeyTexts: TAREFAS_JOURNEYS,
    sharedPageText: readFixture('l2/tarefas/web/shared/inicio.defs.ts'),
    purpose: 'unused',
  });
  assert.equal(title, 'Abrir tarefa avisada');
});

test('cmdIniciar resolves the page address and the single url parameter', () => {
  const page = pageOfRoute({
    route: 'tarefas.minhas_tarefas.cmdIniciar',
    project: '102047',
    module: 'tarefas',
    configText: CONFIG,
    sharedPageText: readFixture('l2/tarefas/web/shared/minhas_tarefas.defs.ts'),
  });
  assert.deepEqual(page, { address: '/tarefas/minhas_tarefas', recordParam: 'tarefaId' });
});

test('a route whose page has no readable source has no page', () => {
  const page = pageOfRoute({
    route: 'tarefas.pagina_sem_fonte.algo',
    project: '102047',
    module: 'tarefas',
    configText: CONFIG,
    sharedPageText: readFixture('l2/tarefas/web/shared/inicio.defs.ts'),
  });
  assert.equal(page, undefined);
});

test('optionsOnly is structural: two string leaves, one of them id, and nothing else', () => {
  const contract = readFixture('l2/tarefas/web/contracts/tarefas_equipe.defs.ts');
  assert.equal(optionsOnly(contract, 'tarefas.tarefas_equipe.carregarFiltrosEquipe'), false);
  assert.equal(optionsOnly(contract, 'tarefas.tarefas_equipe.listarTarefasEquipe'), false);

  const synthetic = `
    export interface A { id: string; nome: string }
    export interface B { id: string; rotulo: string }
    export interface C { id: string; nome: string; extra: string }
    export interface Nested { id: string; nome: { texto: string } }
    export interface Contracts {
      'mod.page.soOpcoes': { kind: 'qry'; output: { listas: A[]; outras: B[] } };
      'mod.page.terceiraFolha': { kind: 'qry'; output: { listas: C[] } };
      'mod.page.aninhado': { kind: 'qry'; output: { listas: Nested[] } };
      'mod.page.naoLista': { kind: 'qry'; output: { listas: A[]; total: number } };
    }
  `;
  assert.equal(optionsOnly(synthetic, 'mod.page.soOpcoes'), true);
  assert.equal(optionsOnly(synthetic, 'mod.page.terceiraFolha'), false);
  assert.equal(optionsOnly(synthetic, 'mod.page.aninhado'), false);
  assert.equal(optionsOnly(synthetic, 'mod.page.naoLista'), false);

  const doubt = `
    export interface A { id: string; nome: string }
    export interface Saida { listas: A[] }
    export interface Contracts {
      'mod.page.saidaNomeada': { kind: 'qry'; output: Saida };
      'mod.page.refPerdida': { kind: 'qry'; output: { listas: SomeType[] } };
      'mod.page.desconhecido': { kind: 'qry'; output: unknown };
    }
  `;
  assert.equal(optionsOnly(doubt, 'mod.page.saidaNomeada'), true);
  assert.equal(optionsOnly(doubt, 'mod.page.refPerdida'), false);
  assert.equal(optionsOnly(doubt, 'mod.page.desconhecido'), false);
});
