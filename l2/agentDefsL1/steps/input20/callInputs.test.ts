/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/callInputs.test.ts" enhancement="_blank"/>

// d1_269: the required field of an outside call that no field of the usecase names is a gap the model answers (resolve25) in a list the code closes, and the
// answer is applied to the usecase and written in its def (`data.calls`).

import assert from 'node:assert/strict';
import test from 'node:test';

import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { installStudio } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { callInputSourceOf, callInputsOf } from '/_102021_/l2/agentDefsL1/steps/input20/callInputs.js';
import { assembleD1Input, readD1InputArtifacts } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { callUnitsAnswered, resolveUnits } from '/_102021_/l2/agentDefsL1/steps/resolve25/gate.js';
import { callsIssues } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { answersByRoute, buildResolveReceipt } from '/_102021_/l2/agentDefsL1/steps/resolve25/gate.js';
import { D1_RESOLVE_VERSION } from '/_102021_/l2/agentDefsL1/steps/resolve25/contracts.js';
import { readResolveReceipt } from '/_102021_/l2/agentDefsL1/steps/resolve25/io.js';

const PROJECT = 102047;
const PATH_OF_PARENT = 'entity:RepositoryEntry.path@parentEntryId';

async function seeded() {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, 'repoHost-74f17ca3', PROJECT);
  const receipt = await readResolveReceipt(PROJECT, 'repoHost');
  return { host, answers: answersByRoute(receipt) };
}

void test('repoHost at 74f17ca3: caminho of listarConteudo and lerArquivo has no field of that name, and the candidates are closed by code', async () => {
  const { answers } = await seeded();
  const snapshot = await assembleD1Input(PROJECT, 'repoHost', answers);
  const gaps = snapshot.selection.callInputGaps ?? [];
  assert.deepEqual(gaps.map(gap => `${gap.usecaseId}|${gap.call}|${gap.field}`), ['getRepositoryEntry|github.lerArquivo|caminho', 'listRepositoryEntry|github.listarConteudo|caminho']);
  const list = gaps.find(gap => gap.usecaseId === 'listRepositoryEntry')!;
  assert.ok(list.candidates.includes(PATH_OF_PARENT), list.candidates.join(', '));
  assert.ok(list.candidates.includes('input:path'));
  assert.equal(list.candidates.includes('none'), false, 'none is added by the unit, never by the derivation');
  assert.match(list.reason, /listRepositoryEntry .* calls github\.listarConteudo/u);
  assert.ok(list.reason.includes(`- ${PATH_OF_PARENT}: the field path of the RepositoryEntry record that the id parentEntryId points to (Caminho: Caminho completo`), list.reason);
  // The one usecase left to the model asks nothing before an answer: no source chosen yet.
  assert.equal(snapshot.selection.usecases.some(usecase => usecase.callInputs), false);
});

void test('the answer is applied: the chosen source goes to the usecase; none, a stranger and a missing answer leave the field open', async () => {
  const { answers } = await seeded();
  const withAnswer = new Map(answers);
  withAnswer.set('usecase:listRepositoryEntry', [{ path: 'github.listarConteudo.caminho', choice: PATH_OF_PARENT }]);
  withAnswer.set('usecase:getRepositoryEntry', [{ path: 'github.lerArquivo.caminho', choice: 'none' }]);
  const snapshot = await assembleD1Input(PROJECT, 'repoHost', withAnswer);
  const byId = Object.fromEntries(snapshot.selection.usecases.map(usecase => [usecase.usecaseId, usecase.callInputs]));
  assert.deepEqual(byId.listRepositoryEntry, [{ call: 'github.listarConteudo', field: 'caminho', from: { kind: 'entity', entity: 'RepositoryEntry', field: 'path', idFrom: 'parentEntryId' } }]);
  assert.equal(byId.getRepositoryEntry, undefined, 'none leaves it open');
  const stranger = new Map(answers);
  stranger.set('usecase:listRepositoryEntry', [{ path: 'github.listarConteudo.caminho', choice: 'entity:Other.path@x' }]);
  assert.equal((await assembleD1Input(PROJECT, 'repoHost', stranger)).selection.usecases.find(usecase => usecase.usecaseId === 'listRepositoryEntry')?.callInputs, undefined, 'a value that is not a candidate is not taken');
  assert.deepEqual(callInputSourceOf('input:path'), { kind: 'input', field: 'path' });
  assert.equal(callInputSourceOf('none'), null);
  assert.deepEqual(callInputsOf('x', [], new Map()), []);
});

void test('resolve25 gets one unit per usecase call, with none last, and a receipt that lacks it is not enough', async () => {
  const { answers } = await seeded();
  const snapshot = await assembleD1Input(PROJECT, 'repoHost', answers);
  const artifacts = await readD1InputArtifacts(PROJECT, 'repoHost');
  const units = resolveUnits(artifacts, snapshot.selection.callInputGaps ?? []);
  const call = units.filter(unit => unit.route.startsWith('usecase:'));
  assert.deepEqual(call.map(unit => unit.route), ['usecase:getRepositoryEntry', 'usecase:listRepositoryEntry']);
  assert.deepEqual(call[1].gaps.map(gap => [gap.path, gap.kind, gap.candidates[gap.candidates.length - 1]]), [['github.listarConteudo.caminho', 'callInput', 'none']]);
  const receipt = buildResolveReceipt({ schemaVersion: D1_RESOLVE_VERSION, project: PROJECT, moduleName: 'repoHost', sourceKey: 'k', units: call.slice(0, 1), repairs: 0 }, []);
  assert.equal(callUnitsAnswered(receipt, units), false, 'one of the two units has no answer');
  const both = buildResolveReceipt({ schemaVersion: D1_RESOLVE_VERSION, project: PROJECT, moduleName: 'repoHost', sourceKey: 'k', units: call, repairs: 0 }, []);
  assert.equal(callUnitsAnswered(both, units), true);
});

void test('data.calls of a usecase def: a source of the two forms is valid, anything else is refused', () => {
  const ok = { calls: [{ call: 'github.listarConteudo', input: [{ field: 'caminho', from: { kind: 'entity', entity: 'RepositoryEntry', field: 'path', idFrom: 'parentEntryId' } }, { field: 'ramo', from: { kind: 'input', field: 'branch' } }] }] };
  const issues: string[] = [];
  callsIssues(ok, issues);
  assert.deepEqual(issues, []);
  const bad = (calls: unknown): string[] => { const out: string[] = []; callsIssues({ calls }, out); return out; };
  assert.equal(bad([]).length, 1);
  assert.ok(bad([{ call: 'github', input: [] }]).length >= 1);
  assert.ok(bad([{ call: 'github.x', input: [{ field: 'a', from: { kind: 'constant', field: 'b' } }] }]).some(issue => issue.includes('input or entity')));
  assert.ok(bad([{ call: 'github.x', input: [{ field: 'a', from: { kind: 'entity', field: 'b' } }] }]).some(issue => issue.includes('from.entity')));
  assert.ok(bad([{ call: 'github.x', input: [{ field: 'a', from: { kind: 'input', field: 'b', idFrom: 'c' } }] }]).some(issue => issue.includes('Unknown field')));
});
