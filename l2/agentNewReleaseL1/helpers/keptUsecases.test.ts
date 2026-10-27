/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/keptUsecases.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { loadD1Artifacts } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { buildD1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';
import type { D1InputArtifacts } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { usedRemovedUsecases } from '/_102021_/l2/agentNewReleaseL1/helpers/keptUsecases.js';

const MODULE = 'comandaRestaurante';
const ORPHAN = 'usecaseNobodyCalls';

test('a removed usecase a route still calls is kept; one nobody calls is not', () => {
  const artifacts = loadD1Artifacts('comandaRestaurante-c0f25ee', MODULE);
  const parked = parkOneUsedUsecase(artifacts);
  const kept = usedRemovedUsecases({ project: 102047, moduleName: MODULE }, parked.artifacts);
  assert.deepEqual(kept.map(item => item.id), [parked.id]);
  assert.ok(kept[0].routes.length > 0);
  assert.equal(kept.some(item => item.id === ORPHAN), false);

  const opened = buildD1InputSnapshot(
    { project: 102047, moduleName: MODULE },
    stripUsecaseRemoved(parked.artifacts),
    null,
  );
  const created = opened.selection.usecases.find(item => item.usecaseId === parked.id);
  assert.equal(created?.status, 'toCreate');
  assert.equal(opened.selection.usecases.some(item => item.usecaseId === ORPHAN), false);
});

function parkOneUsedUsecase(source: D1InputArtifacts): { artifacts: D1InputArtifacts; id: string } {
  const backend = clonePlan(source.backend);
  const effort = clonePlan(source.effort);
  const ids = rows(backend.usecases).map(row => String(row.usecaseId || '')).filter(Boolean);
  for (const id of ids) {
    const artifacts = withRemoved(source, backend, effort, id);
    const kept = usedRemovedUsecases({ project: 102047, moduleName: MODULE }, artifacts);
    if (kept.some(item => item.id === id)) return { artifacts, id };
  }
  throw new Error('fixture has no usecase a contract route calls');
}

function withRemoved(source: D1InputArtifacts, backend: Record<string, unknown>, effort: Record<string, unknown>, id: string): D1InputArtifacts {
  const nextBackend = clonePlan(backend);
  const nextEffort = clonePlan(effort);
  nextBackend.usecases = rows(nextBackend.usecases).filter(row => row.usecaseId !== id);
  nextEffort.usecases = rows(nextEffort.usecases).filter(row => row.usecaseId !== id);
  nextBackend.removed = [...rows(nextBackend.removed), { kind: 'usecase', id, status: 'toRemove' }, { kind: 'usecase', id: ORPHAN, status: 'toRemove' }];
  nextEffort.removed = [...rows(nextEffort.removed), { kind: 'usecase', id, status: 'toRemove' }, { kind: 'usecase', id: ORPHAN, status: 'toRemove' }];
  return { ...source, backend: nextBackend, effort: nextEffort };
}

function stripUsecaseRemoved(artifacts: D1InputArtifacts): D1InputArtifacts {
  return {
    ...artifacts,
    backend: dropUsecase(artifacts.backend),
    effort: dropUsecase(artifacts.effort),
  };
}

function dropUsecase(doc: unknown): unknown {
  const plan = clonePlan(doc);
  plan.removed = rows(plan.removed).filter(row => row.kind !== 'usecase');
  return plan;
}

function clonePlan(doc: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(doc)) as Record<string, unknown>;
}

function rows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object' && !Array.isArray(row)) : [];
}
