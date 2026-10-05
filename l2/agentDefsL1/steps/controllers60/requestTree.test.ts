/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/requestTree.test.ts" enhancement="_blank"/>

/**
 * d1_61: the request service def carries, per route, the classified output tree, the route JSDoc and the rules; the M1
 * request service emits only the nodes it projects as they are and refuses every other one by name.
 * The first route has the shape that stopped the comandaRestaurante live run (task 20261005042145.1001, bench 83b4de0,
 * `atendimento.atualizarLocalizacaoAtendimento`): a group of three page wrappers with `total`, a field of an N:1 entity
 * and a readonly value that is no ontology path. The second is a plain list, which the M1 emits as before.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { applyResolutions } from '/_102021_/l2/agentDefsL1/steps/input20/deriveRequest.js';
import type { D1RequestGapAnswer } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { readContractV2, serviceRowsFor } from '/_102021_/l2/agentDefsL1/steps/controllers60/requestService.js';
import type { D1ServiceRequestSource } from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';
import { requestServiceIssues } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { emitRequestService, type EmitFailure, type EmitResult } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import type { M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import type { RequestOutputNode } from '/_102021_/l2/helpers/l1Defs/requestTree.js';

const P = '_102099_';
const MOD = 'comandaRestaurante';
const GROUP = `${MOD}.atendimento.atualizarLocalizacaoAtendimento`;
const PLAIN = `${MOD}.atendimento.listarMesas`;

const CONTRACT = `/// <mls fileReference="${P}/l2/${MOD}/web/contracts/atendimento.defs.ts" enhancement="_blank"/>

export interface MesaDisponivel {
  id: string;
  code: string;
  readonly disponivel: boolean;
}

export interface ComandaResumo {
  id: string;
  version: number;
  number: number;
  mesaId: string;
  status: 'open' | 'closed';
  code: string;
}

export interface ItemCardapioResumo {
  id: string;
  name: string;
  precoVigente: string;
}

export interface PaginaMesasDisponiveis {
  items: MesaDisponivel[];
  readonly total: number;
  page: number;
  pageSize: number;
}

export interface PaginaComandasAbertas {
  items: ComandaResumo[];
  readonly total: number;
  page: number;
  pageSize: number;
}

export interface PaginaItensCardapio {
  items: ItemCardapioResumo[];
  readonly total: number;
  page: number;
  pageSize: number;
}

export interface ContextoAtendimento {
  mesasDisponiveis: PaginaMesasDisponiveis;
  comandasAbertas: PaginaComandasAbertas;
  itensCardapio: PaginaItensCardapio;
}

export interface MesaLinha {
  id: string;
  code: string;
}

export interface AtendimentoContracts {
  /**
   * Finalidade: Pesquisa ou troca a página das listas de localização sem carregar detalhes de uma comanda.
   * Entrada: os campos Page determinam o trecho retornado.
   * Processamento: Calcula o total de cada coleção e só então pagina cada uma.
   * Saída: Devolve o novo contexto de localização.
   */
  '${GROUP}': {
    kind: 'qry';
    input: { mesasPage?: number; comandasPage?: number; itensPage?: number };
    output: { contextoAtendimento: ContextoAtendimento };
    rules: ['mesaDisponivelParaAbrirComanda'];
    access: { actors: ['garcom']; grants: ['garcomAtendimentoComandas']; scope: 'organization' };
  };
  /**
   * Finalidade: Lista as mesas.
   * Entrada: nenhuma.
   * Processamento: Lê as mesas.
   * Saída: As mesas.
   */
  '${PLAIN}': {
    kind: 'qry';
    input: {};
    output: { mesas: MesaLinha[] };
    rules: [];
    access: { actors: ['garcom']; grants: ['garcomAtendimentoComandas']; scope: 'organization' };
  };
}
`;

const ENTITIES: Record<string, unknown> = {
  Mesa: {
    entityId: 'Mesa',
    relationships: { comandas: { relationshipId: 'comandaMesa', to: 'Comanda', via: 'Comanda.mesaId', cardinality: '1:N' } },
    record: { fields: { id: { type: 'uuid', derived: true }, version: { type: 'integer', derived: true }, code: { type: 'string' } } },
  },
  Comanda: {
    entityId: 'Comanda',
    relationships: { mesa: { relationshipId: 'comandaMesa', to: 'Mesa', via: 'Comanda.mesaId', cardinality: 'N:1' } },
    record: {
      fields: {
        id: { type: 'uuid', derived: true },
        version: { type: 'integer', derived: true },
        number: { type: 'integer' },
        mesaId: { type: 'record', to: ['Mesa'] },
        status: { type: 'string' },
      },
    },
  },
  ItemCardapio: {
    entityId: 'ItemCardapio',
    record: { fields: { id: { type: 'uuid', derived: true }, version: { type: 'integer', derived: true }, name: { type: 'string' }, precoVigente: { type: 'money' } } },
  },
};

const definition = (() => {
  const parsed = readContractV2(CONTRACT);
  assert.ok(parsed, 'the contract parses');
  return parsed;
})();

/** resolve25 stand-in, one round: each gap whose candidates are one choice and `none` is answered with that choice. */
function selected(route: string): D1ServiceRequestSource {
  const found = definition.routes.find(item => item.route === route);
  assert.ok(found, route);
  const first = applyResolutions({ route: found, definition, entities: ENTITIES }, []);
  const answers: D1RequestGapAnswer[] = first.unresolved.filter(gap => gap.candidates.length === 2).map(gap => ({ path: gap.path, choice: gap.candidates[0] }));
  const result = applyResolutions({ route: found, definition, entities: ENTITIES }, answers);
  return {
    route,
    pageId: 'atendimento',
    kind: found.kind,
    uses: ['listMesa', 'listComanda', 'listItemCardapio'],
    outputs: result.outputs,
    params: result.params,
    ...(result.computedBy.length ? { computedBy: result.computedBy } : {}),
    ...(result.unresolved.length ? { unresolved: result.unresolved } : {}),
  };
}

function rows() {
  const built = serviceRowsFor('atendimento', definition, [selected(GROUP), selected(PLAIN)]);
  assert.deepEqual(built.problems.filter(item => item.severity === 'error'), []);
  return built.rows;
}

const shape = (node: RequestOutputNode): string => `${node.kind} ${node.path}`;

void test('the nested group of pages is a tree, not an unreadable output; the def carries the JSDoc and the rules', () => {
  const row = rows().find(item => item.route === GROUP);
  assert.ok(row);
  assert.deepEqual(row.output.map(shape), [
    'list contextoAtendimento.mesasDisponiveis',
    'computed contextoAtendimento.mesasDisponiveis.items.disponivel',
    'list contextoAtendimento.comandasAbertas',
    'related contextoAtendimento.comandasAbertas.items',
    'list contextoAtendimento.itensCardapio',
  ]);
  assert.deepEqual(row.output[2], {
    kind: 'list',
    path: 'contextoAtendimento.comandasAbertas',
    entity: 'Comanda',
    items: 'items',
    page: 'contextoAtendimento.comandasAbertas.page',
    pageSize: 'contextoAtendimento.comandasAbertas.pageSize',
    total: 'contextoAtendimento.comandasAbertas.total',
    fields: ['id', 'version', 'number', 'mesaId', 'status'].map(field => ({ field, path: field })),
  });
  assert.deepEqual(row.output[3], { kind: 'related', path: 'contextoAtendimento.comandasAbertas.items', entity: 'Mesa', relationship: 'comandaMesa', fields: [{ field: 'code', path: 'code' }] });
  assert.deepEqual(row.output[1], { kind: 'computed', path: 'contextoAtendimento.mesasDisponiveis.items.disponivel', entity: 'Mesa', rules: ['mesaDisponivelParaAbrirComanda'] });
  assert.deepEqual(row.rules, ['mesaDisponivelParaAbrirComanda']);
  assert.equal(row.doc?.raw.includes('Finalidade: Pesquisa ou troca'), true, JSON.stringify(row.doc));
  assert.equal(row.doc?.purpose, 'Pesquisa ou troca a página das listas de localização sem carregar detalhes de uma comanda.');
  assert.equal(typeof row.doc?.processing, 'string');
  assert.deepEqual(requestServiceIssues({ pageId: 'atendimento', requests: rows() }), []);
  // The flat outputs of earlier defs are not a second accepted form.
  const flat = { ...row, outputs: [{ key: 'contextoAtendimento', entity: 'Comanda', fields: ['id'] }] } as Record<string, unknown>;
  delete flat.output;
  assert.equal(requestServiceIssues({ pageId: 'atendimento', requests: [flat] }).some(issue => issue.includes('output')), true);
});

const usecase = (id: string, entity: string): M1Definition => ({
  schemaVersion: '2026-09-24-d1-definition-v2',
  artifactType: 'usecase',
  artifactId: id,
  moduleName: MOD,
  status: 'generated',
  dependencies: [],
  data: { entityId: entity, operation: 'list', ports: [], functions: [{ functionName: id, input: [], output: [{ name: 'items', type: entity }] }] },
} as unknown as M1Definition);

const USECASES = [usecase('listMesa', 'Mesa'), usecase('listComanda', 'Comanda'), usecase('listItemCardapio', 'ItemCardapio')];
const usecasePath = (id: string) => `${P}/l1/${MOD}/layer_2_application/usecases/${id}.defs.ts`;

function serviceDef(route: string): M1Definition {
  const row = rows().find(item => item.route === route);
  assert.ok(row, route);
  return {
    schemaVersion: '2026-09-24-d1-definition-v2',
    artifactType: 'requestService',
    artifactId: 'atendimento',
    moduleName: MOD,
    status: 'generated',
    dependencies: row.uses.map(usecasePath),
    data: { pageId: 'atendimento', requests: [{ ...row, uses: route === PLAIN ? ['listMesa'] : row.uses }] },
  } as unknown as M1Definition;
}

const read = async (ref: string): Promise<string | null> => {
  const found = USECASES.find(item => usecasePath(item.artifactId) === ref);
  return found ? `export const definition = ${JSON.stringify(found)} as const;\nexport default definition;\n` : null;
};
const OUT = `${P}/l1/${MOD}/layer_2_application/requests/atendimento.ts`;
const detail = (result: EmitResult | EmitFailure): string => 'code' in result ? result.detail : 'ok';

void test('the M1 refuses by name every node it does not project: page wrappers with total, the related field, the calculated value', async () => {
  const lines = detail(await emitRequestService(serviceDef(GROUP), OUT, read, [], 'structure')).split('\n');
  assert.deepEqual(lines, [
    `REQUEST_SHAPE_UNSUPPORTED: ${GROUP} contextoAtendimento.mesasDisponiveis list`,
    `REQUEST_SHAPE_UNSUPPORTED: ${GROUP} contextoAtendimento.mesasDisponiveis.total list`,
    `REQUEST_SHAPE_UNSUPPORTED: ${GROUP} contextoAtendimento.mesasDisponiveis.items.disponivel computed`,
    `REQUEST_SHAPE_UNSUPPORTED: ${GROUP} contextoAtendimento.comandasAbertas list`,
    `REQUEST_SHAPE_UNSUPPORTED: ${GROUP} contextoAtendimento.comandasAbertas.total list`,
    `REQUEST_SHAPE_UNSUPPORTED: ${GROUP} contextoAtendimento.comandasAbertas.items.code related`,
    `REQUEST_SHAPE_UNSUPPORTED: ${GROUP} contextoAtendimento.itensCardapio list`,
    `REQUEST_SHAPE_UNSUPPORTED: ${GROUP} contextoAtendimento.itensCardapio.total list`,
  ]);
});

void test('a tree of a plain list is emitted as the flat outputs were', async () => {
  const tree = await emitRequestService(serviceDef(PLAIN), OUT, read, [], 'implement');
  assert.equal(detail(tree), 'ok');
  const flatDef = serviceDef(PLAIN);
  const row = (flatDef.data.requests as Record<string, unknown>[])[0];
  delete row.output;
  row.outputs = [{ key: 'mesas', entity: 'Mesa', fields: ['id', 'code'] }];
  const flat = await emitRequestService(flatDef, OUT, read, [], 'implement');
  assert.ok(!('code' in tree) && !('code' in flat));
  assert.equal(tree.source, flat.source);
});
