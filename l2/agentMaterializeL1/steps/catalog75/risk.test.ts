/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/catalog75/risk.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { commandRisk, finalStates, riskOfQuery, type RiskCommandInput } from '/_102021_/l2/agentMaterializeL1/steps/catalog75/risk.js';

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', '102047');

function loadFixture(): Readonly<Record<string, string>> {
  const files: Record<string, string> = {};
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const abs = path.join(dir, name);
      if (statSync(abs).isDirectory()) {
        walk(abs);
        continue;
      }
      if (name === 'SOURCE.md') continue;
      files[path.relative(FIXTURE, abs).split(path.sep).join('/')] = readFileSync(abs, 'utf8');
    }
  };
  walk(FIXTURE);
  return files;
}

const files = loadFixture();

function text(rel: string): string {
  const value = files[rel];
  if (value === undefined) throw new Error(`missing fixture ${rel}`);
  return value;
}

function workflowOperations(moduleName: string): string[] {
  const prefix = `l1/${moduleName}/layer_2_application/workflows/`;
  return Object.keys(files).filter(rel => rel.startsWith(prefix) && rel.endsWith('.defs.ts')).sort().map(text);
}

function input(moduleName: string, usecase: string, ontology: string): RiskCommandInput {
  return {
    usecases: [text(`l1/${moduleName}/layer_2_application/usecases/${usecase}.defs.ts`)],
    ontologies: [text(`l4/${moduleName}/ontology/${ontology}.defs.ts`)],
    integration: text(`l4/${moduleName}/integration.defs.ts`),
    workflows: text(`l4/${moduleName}/workflows.defs.ts`),
    workflowOperations: workflowOperations(moduleName),
  };
}

function usecaseSource(data: Record<string, unknown>): string {
  return `export const definition = ${JSON.stringify({ data })} as const;\n`;
}

test('final states are the lifecycle states that no transition leaves', () => {
  assert.deepEqual(finalStates(text('l4/tarefas/ontology/Tarefa.defs.ts')), ['concluida', 'cancelada']);
  assert.deepEqual(finalStates(text('l4/compras/ontology/SolicitacaoCompra.defs.ts')), ['autorizada', 'rejeitada']);
});

test('Tarefa.cancelar and Tarefa.aceitar are sensitive because they reach a final state', () => {
  const cancelar = commandRisk(input('tarefas', 'cancelar', 'Tarefa'));
  const aceitar = commandRisk(input('tarefas', 'aceitar', 'Tarefa'));
  assert.equal(cancelar.risk, 'sensitive');
  assert.equal(aceitar.risk, 'sensitive');
  assert.ok(cancelar.reasons.includes('finalState'));
  assert.ok(aceitar.reasons.includes('finalState'));
});

test('iniciar stays write', () => {
  assert.deepEqual(commandRisk(input('tarefas', 'iniciar', 'Tarefa')), { risk: 'write', reasons: [] });
});

test('autorizar and rejeitar are sensitive', () => {
  assert.equal(commandRisk(input('compras', 'autorizar', 'SolicitacaoCompra')).risk, 'sensitive');
  assert.equal(commandRisk(input('compras', 'rejeitar', 'SolicitacaoCompra')).risk, 'sensitive');
  assert.ok(commandRisk(input('compras', 'autorizar', 'SolicitacaoCompra')).reasons.includes('finalState'));
  assert.ok(commandRisk(input('compras', 'rejeitar', 'SolicitacaoCompra')).reasons.includes('finalState'));
});

test('createRecebimento is sensitive only because of the outbound event', () => {
  assert.deepEqual(commandRisk(input('compras', 'createRecebimento', 'Recebimento')), {
    risk: 'sensitive',
    reasons: ['outbound'],
  });
});

test('SolicitacaoCompra.enviar is sensitive because a later workflow task is llm', () => {
  const enviar = commandRisk(input('compras', 'enviar', 'SolicitacaoCompra'));
  assert.equal(enviar.risk, 'sensitive');
  assert.deepEqual(enviar.reasons, ['llm']);
});

test('createProduto is write', () => {
  assert.deepEqual(commandRisk(input('compras', 'createProduto', 'Produto')), { risk: 'write', reasons: [] });
});

test('delete and an unknown operation are sensitive', () => {
  const base = input('compras', 'createProduto', 'Produto');
  const deleted = commandRisk({
    ...base,
    usecases: [usecaseSource({ entityId: 'Produto', operation: 'delete', effects: [] })],
  });
  const unknown = commandRisk({
    ...base,
    usecases: [usecaseSource({ entityId: 'Produto', operation: 'archive', effects: [] })],
  });
  assert.deepEqual(deleted, { risk: 'sensitive', reasons: ['delete'] });
  assert.deepEqual(unknown, { risk: 'sensitive', reasons: ['unclassified'] });
});

test('a query is read', () => {
  assert.equal(riskOfQuery(), 'read');
});
