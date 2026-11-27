/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/tests60/keepCases.test.ts" enhancement="_blank"/>

// d1_347 s6 (the essential of d1_334): the cases of a page test file are kept when only the controller moved. Off (the committed generator) nothing of this runs.

import assert from 'node:assert/strict';
import test from 'node:test';

import type { M12TestCase } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { sha256Text, type M12UnitStatus } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { pageTestsFile } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { fileRef } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { testsInputHash, testsInputParts, testsKeepPlan } from '/_102021_/l2/agentMaterializeL1/steps/tests60/agentM12Tests.js';
import { readPageTestCases, renderPageTests } from '/_102021_/l2/agentMaterializeL1/steps/tests60/render.js';

const CASES: M12TestCase[] = [
  { id: 'a.read', routine: 'demo.cm.read', params: { id: 'x' }, expect: { ok: true, shape: 'object' }, mutating: false },
  { id: 'a.refuse', routine: 'demo.cm.write', params: { id: 'x' }, expect: { ok: false, errorCode: 'CONVERSATION_BLOCKED' }, mutating: true },
];
const FILE = pageTestsFile(102099, 'demo', 'cm');

void test('d1_347 s6: the cases of a rendered test file are read back as they are; another shape is null', () => {
  const text = renderPageTests({ file: FILE, moduleName: 'demo', pageId: 'cm', actor: '', cases: CASES });
  assert.deepEqual(readPageTestCases(text), [CASES[0], CASES[1]]);
  assert.equal(readPageTestCases('export const x = 1;\n'), null);
  assert.equal(readPageTestCases('export const pageTests = {not json} as const;'), null);
});

void test('d1_347 s6: the halves of the hash of the cases: `hash` is the one of before; `own` does not move with the controller, `deps` does', async () => {
  const inputs = ['route a', 'entity b'];
  const before = await testsInputParts(inputs, { 'c.ts': 'sha256:1' });
  assert.equal(before.hash, await testsInputHash(inputs, { 'c.ts': 'sha256:1' }));
  const moved = await testsInputParts(inputs, { 'c.ts': 'sha256:2' });
  assert.equal(moved.own, before.own);
  assert.notEqual(moved.deps, before.deps);
  assert.notEqual(moved.hash, before.hash);
  const changed = await testsInputParts(['route a', 'entity c'], { 'c.ts': 'sha256:1' });
  assert.notEqual(changed.own, before.own);
});

void test('d1_347 s6: only an unedited file of a receipt with both halves and the same `own` is kept; anything else (or off) is from scratch', async () => {
  const text = renderPageTests({ file: FILE, moduleName: 'demo', pageId: 'cm', actor: '', cases: CASES });
  const own = (await testsInputParts(['x'], {})).own;
  const prior = (over: Partial<M12UnitStatus> = {}): M12UnitStatus => ({
    schemaVersion: '2026-10-05-m12-unit-v1', layer: 'tests', unitId: 'cm', defRef: '', status: 'done', code: '', attempt: 1, diagnostic: '', inputHash: 'h',
    inputParts: { own, deps: 'd' }, outputs: { [fileRef(FILE)]: '' }, updatedAt: 'now', ...over,
  }) as never;
  const recorded = prior({ outputs: { [fileRef(FILE)]: await sha256Text(text) } });
  const plan = (over: Record<string, unknown> = {}) => testsKeepPlan({ on: true, scratch: false, prior: recorded, own, file: fileRef(FILE), fileText: text, ...over } as never);
  assert.equal(await plan(), 'keep');
  assert.equal(await plan({ on: false }), 'scratch', 'off');
  assert.equal(await plan({ scratch: true }), 'scratch', 'force asked from scratch');
  assert.equal(await plan({ prior: null }), 'scratch', 'no receipt');
  assert.equal(await plan({ prior: prior({ inputParts: undefined, outputs: recorded.outputs }) }), 'scratch', 'no halves');
  assert.equal(await plan({ own: 'another' }), 'scratch', 'the prompt moved');
  assert.equal(await plan({ fileText: `${text}// edited by hand` }), 'scratch', 'the file is not the one of the receipt');
  assert.equal(await plan({ fileText: null }), 'scratch', 'no file');
  assert.equal(await plan({ prior: prior({ status: 'failed', outputs: recorded.outputs }) }), 'scratch', 'a failed receipt');
});
