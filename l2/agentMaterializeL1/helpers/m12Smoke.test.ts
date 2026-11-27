/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Smoke.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { buildM12Report } from '/_102021_/l2/agentMaterializeL1/steps/finalize80/agentM12Finalize.js';
import { M12_SMOKE_VERSION, acceptedEntryProblems, evaluateSmoke, smokeInputsHash, smokeState, type SmokeAcceptedEntry, type SmokeCaseLike, type SmokeDiffLike, type SmokeFile } from '/_102021_/l2/agentMaterializeL1/helpers/m12Smoke.js';
import { inputsHashOnDisk, lastCleanSmokeCommit } from '/_102021_/l2/agentMaterializeL1/testing/smoke/smokeWrite.js';

const ok = (route: string, extra: Partial<SmokeCaseLike> = {}): SmokeCaseLike => ({ pass: 'happy', route, kind: 'qry', verdict: 'ok', conforms: [], ...extra });
const diff = (key: string, before: string, after: string, arrival = false): SmokeDiffLike => ({ kind: 'code', key, before, after, arrival });
const entry = (over: Partial<SmokeAcceptedEntry> = {}): SmokeAcceptedEntry => ({ case: 'happy a', before: 'refused 400 OLD', after: 'refused 400 NEW', against: 'abc', reason: 'the rule changed on purpose in the L4', by: 'dono', at: '2026-11-26', ...over });

void test('d1_333: 5xx, an exception, an output outside the type and a difference block; a refusal alone and the arrivals do not', () => {
  const results: SmokeCaseLike[] = [
    ok('r1'),
    { pass: 'happy', route: 'r2', kind: 'cmd', verdict: 'refused', status: 400, code: 'X', conforms: [] },
    { pass: 'happy', route: 'r3', kind: 'cmd', verdict: 'failed', status: 501, code: 'NOT_IMPLEMENTED', conforms: [] },
    { pass: 'happy', route: 'r4', kind: 'qry', verdict: 'error', code: 'ERROR', conforms: [] },
    ok('r5', { conforms: ['$.x: missing'] }),
    { pass: 'happy', route: 'arr', kind: 'arrival', verdict: 'error', code: 'ERROR', conforms: [] },
    { pass: 'happy', route: 'sk', kind: 'qry', verdict: 'skipped', conforms: [] },
  ];
  const verdict = evaluateSmoke({ results, differences: [diff('happy a', 'ok 200', 'refused 400 X'), diff('happy arr', 'ok 200', 'refused 403 F', true)], accepted: [], against: 'abc' });
  assert.deepEqual(verdict.blocks.map(item => [item.kind, item.key]), [['failed', 'happy r3'], ['error', 'happy r4'], ['typed', 'happy r5'], ['difference', 'happy a']]);
  assert.deepEqual(verdict.skipped, ['happy sk']);
  assert.equal(verdict.arrivals.cases, 1);
  assert.equal(verdict.arrivals.differences, 1);
});

void test('d1_333: a difference is accepted only by an entry with the same case, before, after and compared commit; an entry that matches nothing is stale', () => {
  const d = [diff('happy a', 'refused 400 OLD', 'refused 400 NEW')];
  const match = evaluateSmoke({ results: [], differences: d, accepted: [entry()], against: 'abc' });
  assert.deepEqual(match.blocks, []);
  assert.equal(match.used.length, 1);
  for (const other of [entry({ case: 'happy b' }), entry({ before: 'x' }), entry({ after: 'y' }), entry({ against: 'zzz' })]) {
    const miss = evaluateSmoke({ results: [], differences: d, accepted: [other], against: 'abc' });
    assert.equal(miss.blocks.length, 1);
    assert.equal(miss.stale.length, 1);
  }
});

void test('d1_333: a reason of at least 20 characters and a name are needed to accept', () => {
  assert.deepEqual(acceptedEntryProblems({ reason: 'too short', by: 'dono' }), ['The reason needs at least 20 characters.']);
  assert.deepEqual(acceptedEntryProblems({ reason: 'the rule changed on purpose', by: ' ' }), ['Say who accepts it.']);
  assert.deepEqual(acceptedEntryProblems({ reason: 'the rule changed on purpose', by: 'dono' }), []);
});

const fileOf = (over: Partial<SmokeFile> = {}): SmokeFile => ({ schemaVersion: M12_SMOKE_VERSION, module: 'm', createdAt: '2026-11-26', against: null, inputsHash: 'h1', counts: { routes: 1, executed: 2, ok: 2, refused: 0, failed: 0, error: 0, skipped: 0, outsideType: 0 }, blocks: [], skipped: [], arrivals: { cases: 0, refused: 0, error: 0, differences: 0 }, differences: [], accepted: [], stale: [], ...over });

void test('d1_333: the state of the smoke: pending without a file, stale when the module changed, blocked with a block, ok otherwise', () => {
  assert.equal(smokeState(null, 'h1').code, 'SMOKE_PENDING');
  assert.equal(smokeState(fileOf(), 'h2').code, 'SMOKE_STALE');
  const blocked = smokeState(fileOf({ blocks: [{ kind: 'error', key: 'happy r', detail: 'ERROR' }] }), 'h1');
  assert.equal(blocked.code, 'SMOKE_BLOCKED');
  assert.match(blocked.detail, /happy r/u);
  assert.deepEqual([smokeState(fileOf(), 'h1').ok, smokeState(fileOf(), 'h1').code], [true, '']);
});

void test('d1_333: the report is complete only when the smoke is ok (and as before when it was not asked)', () => {
  const unit = { schemaVersion: '2026-10-05-m12-unit-v1', layer: 'usecases', unitId: 'u', defRef: 'd', status: 'done', code: '', attempt: 1, diagnostic: '', inputHash: 'x', outputs: {}, updatedAt: 'now' } as never;
  assert.equal(buildM12Report(1, 'm', [unit], [], [], null).status, 'complete');
  assert.equal(buildM12Report(1, 'm', [unit], [], [], null, smokeState(fileOf(), 'h1')).status, 'complete');
  for (const [file, hash] of [[null, 'h1'], [fileOf(), 'h2'], [fileOf({ blocks: [{ kind: 'failed', key: 'k', detail: 'd' }] }), 'h1']] as const) {
    const report = buildM12Report(1, 'm', [unit], [], [], null, smokeState(file, hash));
    assert.equal(report.status, 'partial');
    assert.ok(report.smoke?.code);
  }
});

void test('d1_333: the inputs hash does not depend on the order, and moves with an output or a contract', async () => {
  const a = await smokeInputsHash([{ key: 'usecases/a', outputs: { f: 'h' } }, { key: 'tests/p', outputs: {} }], [{ name: 'x.defs.ts', text: 'X' }]);
  assert.equal(a, await smokeInputsHash([{ key: 'tests/p', outputs: {} }, { key: 'usecases/a', outputs: { f: 'h' } }], [{ name: 'x.defs.ts', text: 'X' }]));
  assert.notEqual(a, await smokeInputsHash([{ key: 'usecases/a', outputs: { f: 'h2' } }, { key: 'tests/p', outputs: {} }], [{ name: 'x.defs.ts', text: 'X' }]));
  assert.notEqual(a, await smokeInputsHash([{ key: 'usecases/a', outputs: { f: 'h' } }, { key: 'tests/p', outputs: {} }], [{ name: 'x.defs.ts', text: 'Y' }]));
});

void test('d1_333: the hash on disk is the one of the receipts and contracts of the module; the compared commit is the last that delivered a smoke without a block', async () => {
  const repo = mkdtempSync(path.join(os.tmpdir(), 'smoke-write-'));
  const write = (rel: string, text: string) => { mkdirSync(path.dirname(path.join(repo, rel)), { recursive: true }); writeFileSync(path.join(repo, rel), text); };
  write('l1/m/pipeline/agentMaterializeL1/usecases/a.json', JSON.stringify({ outputs: { f: 'h' } }));
  write('l1/m/pipeline/agentMaterializeL1/drafts/usecases/a_code.txt', 'draft');
  write('l2/m/web/contracts/p.defs.ts', 'X');
  assert.equal(await inputsHashOnDisk(repo, 'm'), await smokeInputsHash([{ key: 'usecases/a', outputs: { f: 'h' } }], [{ name: 'p.defs.ts', text: 'X' }]));
  const git = (...args: string[]) => spawnSync('git', ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { encoding: 'utf8' });
  git('init', '-q');
  assert.equal(lastCleanSmokeCommit(repo, 'm'), null, 'no smoke yet');
  write('l1/m/pipeline/agentMaterializeL1/smoke.json', JSON.stringify(fileOf({ blocks: [{ kind: 'error', key: 'k', detail: 'd' }] })));
  git('add', '.'); git('commit', '-q', '-m', 'blocked');
  assert.equal(lastCleanSmokeCommit(repo, 'm'), null, 'the last smoke blocked');
  write('l1/m/pipeline/agentMaterializeL1/smoke.json', JSON.stringify(fileOf()));
  git('add', '.'); git('commit', '-q', '-m', 'clean');
  const head = git('rev-parse', 'HEAD').stdout.trim();
  assert.equal(lastCleanSmokeCommit(repo, 'm'), head);
});

import { parseSmokeArgs } from '/_102021_/l2/agentMaterializeL1/testing/smoke/smokeCli.js';

void test('d1_335: there is no "accept all": the option is refused, and each --accept takes its own --reason', () => {
  assert.throws(() => parseSmokeArgs(['m', '/repo', '--write', '--accept-all', '--reason', 'a reason of enough characters', '--by', 'x']), /Unknown option --accept-all/u);
  assert.throws(() => parseSmokeArgs(['m', '/repo', '--write', '--accept', 'happy a', '--accept', 'happy b', '--reason', 'only one reason given here ok']), /Each --accept needs its own --reason \(2 --accept, 1 --reason\)/u);
  assert.throws(() => parseSmokeArgs(['m', '/repo', '--write', '--accept', 'happy a']), /Each --accept needs its own --reason/u);
  const ok = parseSmokeArgs(['m', '/repo', '--write', '--accept', 'happy a', '--reason', 'first reason long enough', '--accept', 'failure a [v]', '--reason', 'second reason long enough', '--by', 'dono']);
  assert.deepEqual(ok.accept, [{ case: 'happy a', reason: 'first reason long enough' }, { case: 'failure a [v]', reason: 'second reason long enough' }]);
  assert.deepEqual([ok.module, ok.subject, ok.write, ok.by], ['m', '/repo', true, 'dono']);
  assert.equal(parseSmokeArgs(['m', 'abc123', '--against', 'def456']).against, 'def456');
});
