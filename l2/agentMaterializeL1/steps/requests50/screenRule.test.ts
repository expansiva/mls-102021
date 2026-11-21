/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/requests50/screenRule.test.ts" enhancement="_blank"/>

// d1_248: a rule about the screen never removes a field of the payload, and a request does not declare itself impossible with a plain Error.
// Fixtures: the request services of mls-102047@d9f71271 (agents, and two files that already had `new Error(` with a value).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { staticPlainErrorProblems, unknownUsecaseImportProblems, upstreamThrowWithoutReadProblems } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import type { M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { SCREEN_RULE_NOTE, loadRequestContext, requestGate } from '/_102021_/l2/agentMaterializeL1/steps/requests50/context.js';

const FIXTURES = path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures');
const recorded = (name: string): string => readFileSync(path.join(FIXTURES, `${name}D9f71271.recorded.txt`), 'utf8');

test('d1_248: the recorded agents request (3 static throws) is refused, with the contract wording', () => {
  const problems = staticPlainErrorProblems(recorded('agentsRequests'));
  assert.equal(problems.length, 3, problems.join('\n'));
  assert.match(problems[0], /PLAIN_ERROR_STATIC: line 126 .*AppError.* ruleId/u);
  assert.deepEqual(problems.map(item => /line (\d+)/u.exec(item)?.[1]), ['126', '140', '164']);
});

test('d1_248 bench: the plain errors of the recorded agendaClinica and comandaRestaurante requests carry a value and pass', () => {
  assert.deepEqual(staticPlainErrorProblems(recorded('consultasRequests')), []);
  assert.deepEqual(staticPlainErrorProblems(recorded('inicioRequests')), []);
  // The recorded cm and platform routes validate their input with a fixed text ("… is required"): not an impossibility.
  for (const name of ['agentsCmToday', 'agentsPlatformRequest', 'agentsPlatformRequestRule']) {
    assert.deepEqual(staticPlainErrorProblems(readFileSync(path.join(FIXTURES, `${name}.recorded.txt`), 'utf8')), [], name);
  }
});

test('d1_248: AppError, a comment and a message with a value are not static plain errors', () => {
  assert.deepEqual(staticPlainErrorProblems("throw new AppError('NOT_FOUND', 'x', 404);\n// throw new Error('Cannot do it');\n"), []);
  assert.deepEqual(staticPlainErrorProblems('throw new Error(`bad ${value}`);\nthrow new Error("bad " + value);'), []);
  assert.deepEqual(staticPlainErrorProblems("throw new Error('releaseId is required');"), []);
  assert.equal(staticPlainErrorProblems("throw new Error('Cannot do it');").length, 1);
  assert.equal(staticPlainErrorProblems('throw new Error("Cannot do it", { cause });').length, 1);
});

test('d1_248: requestGate carries the check', () => {
  const problems = requestGate("export const requests = {};\nthrow new Error('Cannot be served');\n", { header: '', routes: [], project: 1, moduleName: 'm', pageId: 'p', waived: new Set() });
  assert.equal(problems.some(item => item.startsWith('PLAIN_ERROR_STATIC')), true, problems.join('\n'));
});

function keyOf(info: M12FileInfo): string { return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`; }

test('d1_248: the request context lists the rules of the route and the screen-rule note beside them', async () => {
  const project = 102099;
  const moduleName = 'fila';
  const contract: M12FileInfo = { project, level: 2, folder: `${moduleName}/web/contracts`, shortName: 'minhas', extension: '.defs.ts' };
  const text = `export interface MinhasContracts {\n  '${moduleName}.minhas.abertas': { kind: 'qry'; input: {}; output: { title: string }; rules: ['noTechnicalIdsOnScreen'] };\n}\n`;
  const previous = globalThis.mls;
  (globalThis as { mls: unknown }).mls = {
    actualProject: project,
    stor: { files: { [keyOf(contract)]: { ...contract, status: 'changed', getContent: async () => text, getValueInfo: async () => ({ content: text }) } }, getKeyToFile: keyOf },
  };
  const definition = { artifactType: 'requestService', artifactId: 'minhas', moduleName, data: { pageId: 'minhas', requests: [{ route: `${moduleName}.minhas.abertas`, uses: [] }] }, dependencies: [] as string[] };
  const unit = { definition, declared: definition, outputRef: `_${project}_/l1/${moduleName}/layer_2_application/requests/minhas.ts`, defRef: `_${project}_/l1/${moduleName}/layer_2_application/requests/minhas.defs.ts`, output: { project, level: 1, folder: '', shortName: 'minhas', extension: '.ts' }, unitId: 'minhas' } as unknown as M12Unit;
  const read = async (): Promise<string | null> => null;
  try {
    const loaded = await loadRequestContext({ run: { project, module: moduleName }, units: [unit], read } as never, unit);
    const at = loaded.human.indexOf('## Rules (l4 text)');
    assert.ok(at >= 0, 'the rules section is there');
    const section = loaded.human.slice(at);
    assert.match(section, /- noTechnicalIdsOnScreen: /u);
    assert.ok(section.includes(SCREEN_RULE_NOTE), 'the note is in the same section');
    assert.match(SCREEN_RULE_NOTE, /never removes a field from the payload/u);
  } finally {
    (globalThis as { mls: unknown }).mls = previous;
  }
});

test('d1_251: the recorded my_conduct request of f45e1e26 imports listPersonalConduct, which has no def once the plan dropped it: refused; the bench has no false', () => {
  const code = readFileSync(path.join(FIXTURES, 'myConductRequestsF45e1e26.recorded.txt'), 'utf8');
  const own = '/_102047_/l1/agents/';
  const usecases = ['getOrganizationUser', 'listAgentBehavior', 'listAgentSimulation', 'updatePersonalConduct'];
  const problems = unknownUsecaseImportProblems(code, usecases, own);
  assert.equal(problems.length, 1, problems.join('\n'));
  assert.match(problems[0], /USECASE_NOT_IN_MODULE: `listPersonalConduct`/u);
  assert.deepEqual(unknownUsecaseImportProblems(code, [...usecases, 'listPersonalConduct'], own), [], 'with the def it passes');
  assert.deepEqual(unknownUsecaseImportProblems(code, [], own), [], 'no list, no check');
  // A usecase of another module (wfteste imports tarefas/listParticipante) is not this module's to judge.
  assert.deepEqual(unknownUsecaseImportProblems("import { listParticipante } from '/_102047_/l1/tarefas/layer_2_application/usecases/listParticipante.js';", ['x'], '/_102047_/l1/wfteste/'), []);
  assert.equal(requestGate(code, { header: '', routes: [], project: 102047, moduleName: 'agents', pageId: 'my_conduct', waived: new Set(), usecases }).some(item => item.startsWith('USECASE_NOT_IN_MODULE')), true);
});

test('d1_254: the recorded agents request of f45e1e26 (AppError 502 before any read) is refused; the other recorded requests pass', () => {
  const problems = upstreamThrowWithoutReadProblems(readFileSync(path.join(FIXTURES, 'agentsRequestsF45e1e26.recorded.txt'), 'utf8'));
  assert.equal(problems.length, 2, problems.join('\n'));
  assert.deepEqual(problems.map(item => /line (\d+)/u.exec(item)?.[1]), ['92', '104']);
  for (const name of ['agentsRequestsD9f71271', 'consultasRequestsD9f71271', 'inicioRequestsD9f71271', 'myConductRequestsF45e1e26', 'agentsCmToday', 'agentsPlatformRequest', 'agentsPlatformRequestRule']) {
    const file = name.includes('D9f71271') || name.includes('F45e1e26') ? `${name}.recorded.txt` : `${name}.recorded.txt`;
    assert.deepEqual(upstreamThrowWithoutReadProblems(readFileSync(path.join(FIXTURES, file), 'utf8')), [], name);
  }
});

test('d1_254: an AppError 502 after a read, a 500 and a 4xx before a read are not refused', () => {
  const route = (body: string) => `export const requests = {\n  'm.p.r': async function (input, ctx) {\n${body}\n  },\n};\n`;
  assert.deepEqual(upstreamThrowWithoutReadProblems(route("    const x = await read(ctx);\n    throw new AppError('UPSTREAM', 'cm answered badly', 502);")), []);
  assert.deepEqual(upstreamThrowWithoutReadProblems(route("    throw new AppError('INVALID_DATA', 'bad', 500);")), []);
  assert.deepEqual(upstreamThrowWithoutReadProblems(route("    throw new AppError('FORBIDDEN', 'no', 403);")), []);
  assert.equal(upstreamThrowWithoutReadProblems(route("    if (x) {\n      throw new AppError('UPSTREAM', 'not exposed', 503);\n    }")).length, 1);
});
