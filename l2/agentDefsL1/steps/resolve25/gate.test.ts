/// <mls fileReference="_102021_/l2/agentDefsL1/steps/resolve25/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { D1_RESOLVE_VERSION, type D1ResolveReceipt, type D1ResolveUnit, type D1ResolveWork } from '/_102021_/l2/agentDefsL1/steps/resolve25/contracts.js';
import { buildResolveReceipt, keptRoutes } from '/_102021_/l2/agentDefsL1/steps/resolve25/gate.js';

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
