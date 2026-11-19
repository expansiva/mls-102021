/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/adapter17/adapter.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import { declaredSystemsOf, DECLARATION_TYPES_REF } from '/_102021_/l2/helpers/connections/catalogResolve.js';
import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/source.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { adapterKeys } from '/_102021_/l2/agentMaterializeL1/steps/adapter17/adapter.js';
import { adapterAnswerProblems, loadAdapterContext } from '/_102021_/l2/agentMaterializeL1/steps/adapter17/context.js';
import { declarationLiteral } from '/_102021_/l2/agentMaterializeL1/steps/external15/declaration.js';
import { createFakeAdapterContext, createFakeExternalSender } from '/_102034_/testing/connections/externalFixtures.js';
import type { ExternalAdapterContext, ExternalSystemDeclaration } from '/_102034_/l1/server/layer_1_external/connections/external/types.js';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '../../../../..');
const PROJECT = 102099;
const MODULE = 'codeReview';
const L4 = readFileSync(path.join(HERE, '../../../helpers/connections/fixtures/repoInsideModule.integration.recorded.txt'), 'utf8');
const TYPES = readFileSync(path.join(ROOT, 'mls-102034/l1/server/layer_1_external/connections/external/types.ts'), 'utf8');
const RESULTS = readFileSync(path.join(ROOT, 'mls-102034/l1/server/layer_1_external/connections/catalogs/types.ts'), 'utf8');
const DECLARATION = readFileSync(path.join(HERE, '../external15/fixtures/repoHostDeclaration.recorded.txt'), 'utf8');
const ADAPTER = readFileSync(path.join(HERE, 'fixtures/repoHostAdapter.recorded.txt'), 'utf8');

const system = declaredSystemsOf(parseD1Source(L4, 'defs'))[0];
const outputRef = `_${PROJECT}_/l1/${MODULE}/layer_1_external/connections/${system.id}Adapter.ts`;

function unit(): M12Unit {
  const definition = {
    artifactType: 'externalConnection', artifactId: system.id, moduleName: MODULE,
    data: { systemId: system.id, title: system.title, description: system.description, settings: system.settings, operations: system.operations },
    dependencies: [`_${PROJECT}_/l4/${MODULE}/integration.defs.ts`], text: '',
  };
  return { definition, declared: definition, outputRef, defRef: `_${PROJECT}_/l1/${MODULE}/layer_1_external/connections/${system.id}.defs.ts`, unitId: `${system.id}Adapter`, layer: 'adapter', text: '' } as unknown as M12Unit;
}

const norm = (ref: string) => ref.replace(/^\//u, '');
const files: Record<string, string> = {
  [`_${PROJECT}_/l4/${MODULE}/integration.defs.ts`]: L4,
  [`_${PROJECT}_/l1/${MODULE}/layer_1_external/connections/${system.id}.ts`]: DECLARATION,
  [DECLARATION_TYPES_REF]: TYPES,
  '_102034_/l1/server/layer_1_external/connections/catalogs/types.ts': RESULTS,
};
const ctx = { run: { project: PROJECT, module: MODULE }, units: [unit()], read: async (ref: string) => files[norm(ref)] ?? null } as never;

void test('d1_209 s1: the prompt shows the generated declaration, the call lines and the contract of the adapter', async () => {
  const human = await loadAdapterContext(ctx, unit());
  assert.match(human, /## The declaration of the system \(generated, source\)/u);
  assert.match(human, /export interface RepoHostListChangesInput/u);
  assert.match(human, /## What the module asks of each call \(l4 connections, source\)/u);
  assert.match(human, /listChanges \(usedBy: reviewChanges\.pickProject\)/u);
  assert.equal(human.includes('changePushed (usedBy'), false, 'a serve has no adapter function');
  assert.match(human, /export interface ExternalAdapterContext/u);
  assert.match(human, /export type ExternalSystemAdapter =/u);
  assert.match(human, /export type ConnectionResult<Output = unknown>/u);
  assert.equal(human.includes('export function validateExternalSystemDeclaration'), false, 'the validator of the declaration is another phase');
  assert.match(await loadAdapterContext(ctx, unit(), { problems: ['x'], previous: ADAPTER }), /## Repair/u);
  assert.match(await loadAdapterContext({ ...ctx as object, read: async () => null } as never, unit()), /was not generated/u);
});

void test('d1_209 s1: no fixed text of the phase names a service, a module or a system of the rehearsal', () => {
  const fixed = ['prompt.md', 'context.ts', 'adapter.ts', 'agentM12Adapter.ts', 'agentM12AdapterUnit.ts'].map(name => readFileSync(path.join(HERE, name), 'utf8')).join('\n');
  for (const word of ['repoHost', 'zipLookup', 'codeReview', 'customers', 'github', 'gitlab', 'stripe', 'slack', 'twilio', 'openai', 'anthropic']) {
    assert.equal(new RegExp(`\\b${word}\\b`, 'iu').test(fixed), false, word);
  }
});

void test('d1_209 s1: the adapter keys are the top-level members, however they are written', () => {
  assert.deepEqual(adapterKeys(ADAPTER), ['listChanges']);
  assert.deepEqual(adapterKeys("const a = { async one(i, c) { return { ok: true }; }, 'two': async () => ({ a: 1 }), three: (x) => [x, { y: 2 }], \"four\"() {} };\nexport default a;"), ['one', 'two', 'three', 'four']);
  assert.equal(adapterKeys('export const x = 1;'), null);
});

void test('d1_209 s1: an adapter written by hand from the declaration passes the gate', async () => {
  assert.deepEqual(await adapterAnswerProblems(ctx, unit(), ADAPTER), []);
});

void test('d1_209 s1: fetch, a client, child_process, eval, import(), a function too many or too few and a secret read are refused', async () => {
  const problems = async (code: string) => (await adapterAnswerProblems(ctx, unit(), code)).join('\n');
  const inject = (line: string) => ADAPTER.replace("    const typed = input as", `    ${line}\n    const typed = input as`);
  assert.match(await problems(inject("await fetch('https://example.test');")), /never uses fetch/u);
  assert.match(await problems(inject('const x = new XMLHttpRequest();')), /HTTP or socket client/u);
  assert.match(await problems(inject("const cp = require('child_process');")), /child_process|require\(\)/u);
  assert.match(await problems(inject('eval("1");')), /eval or Function/u);
  assert.match(await problems(inject("const m = await import('x');")), /dynamic import/u);
  assert.match(await problems(inject('const k = process.env.KEY;')), /process\.env/u);
  assert.match(await problems(inject("const k = ctx.setting('accessKey');")), /Setting accessKey is a secret/u);
  assert.deepEqual((await adapterAnswerProblems(ctx, unit(), inject("const a = ctx.setting('repositoryAddress');"))), [], 'a non-secret setting is read');
  assert.match(await problems(ADAPTER.replace('const adapter: ExternalSystemAdapter = {', 'const adapter: ExternalSystemAdapter = {\n  async extra(input, ctx) { return { ok: true, output: input }; },')), /adapter has extra, which is not a call of repoHost/u);
  assert.match(await problems(ADAPTER.replace('async listChanges(', 'async other(')), /adapter has no function for call listChanges/u);
  assert.match(await problems(ADAPTER.replace("import type { ExternalSystemAdapter }", "import { helper } from '/_102021_/l2/other.js';\nimport type { ExternalSystemAdapter }")), /Import "\/_102021_\/l2\/other\.js" is not allowed/u);
  assert.match(await problems(ADAPTER.replace("import type { RepoHostChange,", "import { RepoHostChange,")), /is not allowed/u);
  assert.match(await problems(ADAPTER.replace(/^[^\n]*\n/u, '')), /must start with the line/u);
  assert.match(await problems(ADAPTER.replace('export default adapter;', '')), /default-export the adapter/u);
  assert.equal((await problems(`// fetch( and process.env and child_process in a comment\n${ADAPTER}`)).includes('never uses'), false, 'a word in a comment is not a call');
  assert.match((await adapterAnswerProblems({ ...ctx as object, read: async () => null } as never, unit(), ADAPTER)).join('\n'), /is not generated/u);
});

/** Loads the recorded adapter as code: its imports are types only, so they leave nothing to resolve. */
async function loadAdapter(source: string): Promise<{ default: Record<string, (input: unknown, ctx: ExternalAdapterContext) => Promise<{ ok: boolean; output?: unknown; code?: string; message?: string }>> }> {
  const dir = mkdtempSync(path.join(ROOT, '.adapter-proof-'));
  writeFileSync(path.join(dir, 'adapter.ts'), source);
  try {
    return await import(pathToFileURL(path.join(dir, 'adapter.ts')).href);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

void test('d1_209 s2: the recorded adapter, against the fake door, sends the declared method and path with the secret by reference', async () => {
  const declaration = (declarationLiteral(DECLARATION) as { value: ExternalSystemDeclaration }).value;
  const url = 'https://git.example.test/changes?limit=2';
  const changes = [{ id: 'c1', message: 'm1', author: 'a1' }, { id: 'c2', message: 'm2', author: 'a2' }];
  const sender = createFakeExternalSender({
    declaration,
    settings: { repositoryAddress: 'git.example.test' },
    secrets: { accessKey: 'k-123456' },
    answers: { [url]: { status: 200, headers: {}, body: JSON.stringify({ changes }) } },
    ref: { projectId: 'p', moduleId: MODULE, systemId: system.id },
  });
  const base = createFakeAdapterContext({ settings: { repositoryAddress: 'git.example.test' }, secrets: ['accessKey'], sender, ref: { projectId: 'p', moduleId: MODULE, systemId: system.id } });
  const sent: Array<{ operationId: string; request: { method: string; path: string; headers?: Record<string, string> } }> = [];
  const probe: ExternalAdapterContext = { ...base, send: (operationId, request) => { sent.push({ operationId, request }); return base.send(operationId, request); } };
  const { default: adapter } = await loadAdapter(ADAPTER);
  assert.deepEqual(Object.keys(adapter), ['listChanges']);
  const result = await adapter.listChanges({ limit: 2 }, probe);
  // The adapter cites the secret and never holds it; the door puts it.
  assert.deepEqual([sent[0].operationId, sent[0].request.method, sent[0].request.path], ['listChanges', 'GET', '/changes']);
  assert.equal(sent[0].request.headers?.authorization, 'Bearer {{secret:accessKey}}');
  assert.equal(JSON.stringify(sent).includes('k-123456'), false);
  assert.equal(sender.calls[0].url, url);
  assert.equal(sender.calls[0].method, 'GET');
  assert.equal(sender.calls[0].headers.authorization, 'Bearer ***', 'the door filled the secret; the record shows it hidden');
  // A 2xx becomes the output type.
  assert.deepEqual(result, { ok: true, output: { changes } });
});

void test('d1_209 s2: an error of the door is returned as it came, and an answer that does not fit the type is an error of its own', async () => {
  const declaration = (declarationLiteral(DECLARATION) as { value: ExternalSystemDeclaration }).value;
  const ref = { projectId: 'p', moduleId: MODULE, systemId: system.id };
  const contextFor = (answers: Record<string, { status: number; headers: Record<string, string>; body: string }>) => createFakeAdapterContext({
    settings: { repositoryAddress: 'git.example.test' }, secrets: ['accessKey'], ref,
    sender: createFakeExternalSender({ declaration, settings: { repositoryAddress: 'git.example.test' }, secrets: { accessKey: 'k-123456' }, answers, ref }),
  });
  const { default: adapter } = await loadAdapter(ADAPTER);
  const failed = await adapter.listChanges({}, contextFor({}));
  assert.equal(failed.ok, false, 'the 404 of the system is not swallowed');
  assert.equal(typeof failed.code, 'string');
  const notJson = await adapter.listChanges({}, contextFor({ 'https://git.example.test/changes': { status: 200, headers: {}, body: '<html>' } }));
  assert.deepEqual([notJson.ok, notJson.code], [false, 'invalid']);
  const wrongShape = await adapter.listChanges({}, contextFor({ 'https://git.example.test/changes': { status: 200, headers: {}, body: '{"items":[]}' } }));
  assert.deepEqual([wrongShape.ok, wrongShape.code], [false, 'invalid']);
});
