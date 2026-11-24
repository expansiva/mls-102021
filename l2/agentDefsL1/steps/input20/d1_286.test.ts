/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/d1_286.test.ts" enhancement="_blank"/>

// d1_286: the entry of the round `@@agentDefsL1 agents /run` refused (`mls-102047@30b4af69`, with the three pool files the working tree had changed and the resolve25 receipt of that round,
// stored in `fixtures/d1_286-refused/`). Production functions only, no model. The refusal was `EXTERNAL_ROUTE_CALL_UNRESOLVED` on `getSimulationPage`: the division by call had
// made `readAgent` beside the planned `getAgent`, both `Agent.get` by `cm.readAgent`.
// `EXISTS_WITHOUT_RECEIPT` is left out of the check: the git archive carries the defs of the commit and not the writer receipts and snapshot of that working tree, so every def
// reads as a file nobody owns. It is a trait of the replay, not of the entry; the refused `input.json` had the one error of this spec.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { setFacadePlatformKeysForTest } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';

setFacadePlatformKeysForTest(readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../mls-102034/l1/mdm/defs/platformDetailKeys.ts'),
  'utf8',
));

import { loadD1Artifacts, loadD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { installStudio, seed, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { resolverAnswers } from '/_102021_/l2/agentDefsL1/helpers/d1TestResolver.js';
import { fixtureLogicalRel } from '/_102021_/l2/helpers/l1Fixtures/fixtureDisk.js';
import { assembleD1Input, fileInfoFromDisplay, readD1InputArtifacts } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { buildD1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';
import { answersByRoute, callUnitsAnswered, keptRoutes, receiptAnswersDerived, resolveUnits } from '/_102021_/l2/agentDefsL1/steps/resolve25/gate.js';
import { readResolveReceipt } from '/_102021_/l2/agentDefsL1/steps/resolve25/io.js';

const PROJECT = 102047;
const COMMIT = '30b4af69';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(HERE, '../../../../..');
// Only the git history of the commit is read (`git archive`), never the files of the bench.
const REPO = path.join(BASE, 'mls-102047');
const ROOT = '/tmp/d1_286_real';

function extract(): void {
  if (existsSync(path.join(ROOT, 'l4/agents/pool/l1/web/needs.json'))) return;
  mkdirSync(ROOT, { recursive: true });
  const archived = spawnSync('git', ['-C', REPO, 'archive', COMMIT, 'l1/agents', 'l2/agents', 'l4/agents', 'l4/organization'], { maxBuffer: 128 * 1024 * 1024 });
  if (archived.status !== 0) throw new Error(archived.stderr?.toString() || `git archive ${COMMIT}`);
  const extracted = spawnSync('tar', ['-x', '-C', ROOT], { input: archived.stdout });
  if (extracted.status !== 0) throw new Error(extracted.stderr?.toString() || 'tar');
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const abs = path.join(dir, name);
    return statSync(abs).isDirectory() ? walk(abs) : [abs];
  });
}

function put(host: TestHost, rel: string, text: string, tag: string): void {
  const platform = /^_(\d+)_\/(.+)$/.exec(rel);
  const info = platform ? fileInfoFromDisplay(Number(platform[1]), platform[2]) : fileInfoFromDisplay(PROJECT, rel);
  if (info) seed(host, info, text, tag);
}

const ROUTES_OF_D1_285: Record<string, string[]> = {
  'agents.agent_tools.suggestTools': ['createAgentTool', 'getAgent', 'runAiPrompt', 'listTool'],
  'agents.agent_tools.enableUnchosenTool': ['createAgentTool', 'listTool'],
  'agents.agent_behavior.requestBehaviorChange': ['updateAgentAgentBehavior'],
  'agents.agent_behavior.undoBehaviorChange': ['undoAgentChange'],
};

void test('d1_286: the entry the round refused has no error, no duplicate usecase, and resolve25 asks the model for nothing', async () => {
  extract();
  const host = installStudio(PROJECT);
  const logical = (abs: string, root: string): string => fixtureLogicalRel(path.relative(root, abs).split(path.sep).join('/'));
  const stored = loadD1Fixture('d1_286-refused');
  for (const abs of walk(ROOT)) {
    const rel = logical(abs, ROOT);
    if (!(rel in stored)) put(host, rel, readFileSync(abs, 'utf8'), 'commit');
  }
  for (const [rel, text] of Object.entries(stored)) put(host, rel, text, 'refused');
  for (const [rel, text] of Object.entries(loadD1Fixture('agents-2e3e5a1b'))) if (rel.startsWith('_102034_/')) put(host, rel, text, 'platform');

  const receipt = await readResolveReceipt(PROJECT, 'agents');
  const snapshot = await assembleD1Input(PROJECT, 'agents', answersByRoute(receipt));
  const artifacts = await readD1InputArtifacts(PROJECT, 'agents');
  const usecases = snapshot.selection.usecases;
  const uses = new Map((snapshot.selection.requests ?? []).map(request => [request.route, request.uses ?? []]));

  // (1) no error, apart from the trait of the replay.
  const errors = snapshot.problems.filter(item => item.severity === 'error' && item.code !== 'EXISTS_WITHOUT_RECEIPT');
  assert.deepEqual(errors.map(item => `${item.code} ${item.ownerRef}`), []);
  // (2) one usecase for each (entity, operation, transitionRef, call).
  const pairs = new Map<string, string[]>();
  for (const item of usecases) {
    if (!item.call) continue;
    const key = [item.entity, item.operation, item.transitionRef ?? '', item.call].join('|');
    pairs.set(key, [...(pairs.get(key) ?? []), item.usecaseId]);
  }
  assert.deepEqual([...pairs].filter(([, ids]) => ids.length > 1), []);
  assert.equal(usecases.some(item => item.usecaseId === 'readAgent'), false, 'the duplicate of getAgent is gone');
  // (3) the simulation page reads the agent by getAgent; the configuration page keeps its two calls.
  assert.ok((uses.get('agents.agent_simulation.getSimulationPage') ?? []).includes('getAgent'), `${uses.get('agents.agent_simulation.getSimulationPage')?.join()}`);
  const save = uses.get('agents.agent_configuration.saveAgentConfiguration') ?? [];
  assert.ok(save.includes('updateAgentAgent') && save.includes('runAiPrompt'), save.join());
  // (4) the routes of d1_285 are as it left them.
  for (const [route, expected] of Object.entries(ROUTES_OF_D1_285)) assert.deepEqual(uses.get(route), expected, route);
  // (5) the gate of resolve25, with the answers of the refused round: every unit is answered, nothing goes to the model.
  const units = resolveUnits(artifacts, snapshot.selection.callInputGaps ?? []);
  const kept = keptRoutes(receipt as never, units);
  assert.deepEqual(units.filter(unit => !kept.has(unit.unitId)).map(unit => unit.route), []);
  assert.equal(callUnitsAnswered(receipt as never, units), true);
  assert.equal(receiptAnswersDerived(receipt as never, artifacts as never), true);
});

void test('d1_286: no module of the suite has two usecases of one (entity, operation, transitionRef, call)', () => {
  const modules: Array<[string, string]> = [['tarefas-7495be0', 'tarefas'], ['controleEstoque-39a5166', 'controleEstoque'], ['ledgerBin-39a5166', 'ledgerBin'], ['mensalidadesAcademia-7495be0', 'mensalidadesAcademia'], ['reembolsoDespesas-71cca1d', 'reembolsoDespesas'], ['agendaClinica-f35e28a', 'agendaClinica'], ['comandaRestaurante-c0f25ee', 'comandaRestaurante'], ['agents-2e3e5a1b', 'agents'], ['repoHost-74f17ca3', 'repoHost']];
  for (const [id, moduleName] of modules) {
    const artifacts = loadD1Artifacts(id, moduleName);
    const snapshot = buildD1InputSnapshot({ project: PROJECT, moduleName }, artifacts, null, resolverAnswers(artifacts));
    const pairs = new Map<string, string[]>();
    for (const item of snapshot.selection.usecases) {
      if (!item.call) continue;
      const key = [item.entity, item.operation, item.transitionRef ?? '', item.call].join('|');
      pairs.set(key, [...(pairs.get(key) ?? []), item.usecaseId]);
    }
    assert.deepEqual([...pairs].filter(([, ids]) => ids.length > 1), [], moduleName);
  }
});
