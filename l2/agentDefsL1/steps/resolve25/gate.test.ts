/// <mls fileReference="_102021_/l2/agentDefsL1/steps/resolve25/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { D1_RESOLVE_VERSION, type D1ResolveReceipt, type D1ResolveUnit, type D1ResolveWork } from '/_102021_/l2/agentDefsL1/steps/resolve25/contracts.js';
import { buildResolveReceipt, keptRoutes, withKeptAnswers } from '/_102021_/l2/agentDefsL1/steps/resolve25/gate.js';

function gapKey(route: string, path: string, reason: string, candidates: string[]): string {
  return JSON.stringify([route, path, 'usecase', reason, [...candidates].sort()]);
}

function unit(route: string, gaps: D1ResolveUnit['gaps']): D1ResolveUnit {
  return { unitId: route, route, pageId: 'p', gaps };
}

function gap(path: string, reason: string, candidates: string[], gapId = 'g0'): D1ResolveUnit['gaps'][number] {
  return { gapId, path, kind: 'usecase', reason, candidates };
}

function receiptFrom(units: D1ResolveUnit[], choices: Record<string, Record<string, string>>): D1ResolveReceipt {
  const work: D1ResolveWork = {
    schemaVersion: D1_RESOLVE_VERSION,
    project: 102021,
    moduleName: 'm',
    sourceKey: 'src',
    units,
    repairs: 0,
  };
  return buildResolveReceipt(work, units.map(item => ({
    unitId: item.unitId,
    status: 'parsed' as const,
    trace: '',
    unitAttempts: 1,
    planId: 'plan-1',
    calls: 1,
    answers: choices[item.unitId] || {},
  })));
}

describe('keptRoutes', () => {
  const same = unit('/fechar', [gap('usecase', 'qual', ['fecharComanda', 'none'])]);

  it('keeps a route whose gap is unchanged and returns the previous choices', () => {
    const receipt = receiptFrom([same], { '/fechar': { g0: 'fecharComanda' } });
    assert.equal(receipt.routes[0].answers[0].gapKey, gapKey('/fechar', 'usecase', 'qual', ['none', 'fecharComanda']));
    assert.deepEqual(Object.fromEntries(keptRoutes(receipt, [same])), {
      '/fechar': { g0: 'fecharComanda' },
    });
  });

  it('drops a route whose candidates changed', () => {
    const receipt = receiptFrom([same], { '/fechar': { g0: 'fecharComanda' } });
    const changed = unit('/fechar', [gap('usecase', 'qual', ['fecharComanda', 'outro', 'none'])]);
    assert.equal(keptRoutes(receipt, [changed]).size, 0);
  });

  it('drops a route that is not on the receipt', () => {
    const receipt = receiptFrom([same], { '/fechar': { g0: 'fecharComanda' } });
    const extra = unit('/abrir', [gap('usecase', 'qual', ['abrirComanda', 'none'])]);
    assert.deepEqual(Object.fromEntries(keptRoutes(receipt, [same, extra])), {
      '/fechar': { g0: 'fecharComanda' },
    });
  });

  it('drops a route that gained a gap', () => {
    const receipt = receiptFrom([same], { '/fechar': { g0: 'fecharComanda' } });
    const more = unit('/fechar', [
      gap('usecase', 'qual', ['fecharComanda', 'none'], 'g0'),
      gap('campo', 'onde', ['desconto', 'none'], 'g1'),
    ]);
    assert.equal(keptRoutes(receipt, [more]).size, 0);
  });
});

describe('withKeptAnswers (d1_263)', () => {
  const first = unit('r1', [gap('a', 'x', ['e1', 'none'])]);
  const previous = (() => {
    const receipt = receiptFrom([first], { r1: { g0: 'e1' } });
    receipt.routes[0].answers.push({ path: 'a.b', kind: 'usecase', choice: 'e2', call: 'plan-2', gapKey: gapKey('r1', 'a.b', 'y', ['e2', 'none']) });
    return receipt;
  })();

  it('a kept route keeps the answers of the paths its choices opened, which the kept attempt does not carry', () => {
    const built = receiptFrom([first], { r1: { g0: 'e1' } });
    const merged = withKeptAnswers(built, previous, new Set(['r1']));
    assert.deepEqual(merged.routes[0].answers.map(item => [item.path, item.choice]), [['a', 'e1'], ['a.b', 'e2']]);
  });

  it('a route that was asked again does not take the old answers back, and no previous receipt leaves the built one', () => {
    const built = receiptFrom([first], { r1: { g0: 'none' } });
    assert.deepEqual(withKeptAnswers(built, previous, new Set()).routes[0].answers.map(item => item.path), ['a']);
    assert.equal(withKeptAnswers(built, null, new Set(['r1'])), built);
  });

  it('an answer for a path the built route already has stays as built', () => {
    const built = receiptFrom([first], { r1: { g0: 'none' } });
    const merged = withKeptAnswers(built, previous, new Set(['r1']));
    assert.equal(merged.routes[0].answers.find(item => item.path === 'a')!.choice, 'none');
  });
});
