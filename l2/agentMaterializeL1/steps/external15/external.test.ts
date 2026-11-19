/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/external15/external.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { declaredSystemsOf, DECLARATION_TYPES_REF } from '/_102021_/l2/helpers/connections/catalogResolve.js';
import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/source.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { declarationLiteral, externalFacts, fixedPart, withFixedSettings } from '/_102021_/l2/agentMaterializeL1/steps/external15/declaration.js';
import { externalAnswerProblems, loadExternalContext } from '/_102021_/l2/agentMaterializeL1/steps/external15/context.js';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '../../../../..');
const PROJECT = 102099;
const MODULE = 'codeReview';
// Copy of the l4_p4_117 s5 rehearsal (mls-102035@7c91b5e), case 1: the module declares the system it uses.
const L4 = readFileSync(path.join(HERE, '../../../helpers/connections/fixtures/repoInsideModule.integration.recorded.txt'), 'utf8');
const TYPES = readFileSync(path.join(ROOT, 'mls-102034/l1/server/layer_1_external/connections/external/types.ts'), 'utf8');
const ANSWER = readFileSync(path.join(HERE, 'fixtures/repoHostDeclaration.recorded.txt'), 'utf8');

const system = declaredSystemsOf(parseD1Source(L4, 'defs'))[0];
const outputRef = `_${PROJECT}_/l1/${MODULE}/layer_1_external/connections/${system.id}.ts`;

function unit(): M12Unit {
  const definition = {
    artifactType: 'externalConnection',
    artifactId: system.id,
    moduleName: MODULE,
    data: { systemId: system.id, title: system.title, description: system.description, settings: system.settings, operations: system.operations },
    dependencies: [`_${PROJECT}_/l4/${MODULE}/integration.defs.ts`],
    text: '',
  };
  return { definition, declared: definition, outputRef, defRef: outputRef.replace(/\.ts$/u, '.defs.ts'), unitId: system.id, layer: 'external', text: '' } as unknown as M12Unit;
}

const norm = (ref: string) => ref.replace(/^\//u, '');
const read = async (ref: string) => (norm(ref) === `_${PROJECT}_/l4/${MODULE}/integration.defs.ts` ? L4 : norm(ref) === DECLARATION_TYPES_REF ? TYPES : null);
const ctx = { run: { project: PROJECT, module: MODULE }, units: [unit()], read } as never;

/** The answer with its declaration object changed. The file keeps its types and its header. */
function mutated(change: (declaration: Record<string, any>) => void): string {
  const literal = declarationLiteral(ANSWER);
  assert.ok('value' in literal);
  const value = JSON.parse(JSON.stringify(literal.value)) as Record<string, any>;
  change(value);
  const start = ANSWER.indexOf('const declaration: ExternalSystemDeclaration = ') + 'const declaration: ExternalSystemDeclaration = '.length;
  const end = ANSWER.indexOf('export default declaration;');
  return `${ANSWER.slice(0, start)}${JSON.stringify(value, null, 2)};\n\n${ANSWER.slice(end)}`;
}

void test('d1_208 s2: the prompt shows the L4 system, the lines that use it, the part code wrote and the type of the runtime', async () => {
  const human = await loadExternalContext(ctx, unit());
  assert.match(human, /## The system \(l4, source\)/u);
  assert.match(human, /Where the code of a project lives/u);
  assert.match(human, /"id": "accessKey"/u);
  assert.match(human, /## What the module does with each operation \(l4 connections, source\)/u);
  assert.match(human, /call listChanges \(usedBy: reviewChanges\.pickProject\)/u);
  assert.match(human, /Reads the latest changes of the repository of the project\./u);
  assert.match(human, /serve changePushed/u);
  assert.match(human, /## Written by code/u);
  assert.match(human, /"schemaVersion": "external-system-v1"/u);
  assert.match(human, /export interface ExternalSystemDeclaration/u);
  assert.match(human, /export function validateExternalSystemDeclaration/u);
  assert.equal(human.includes('validateExternalSystemAdapter'), false, 'the adapter is another phase');
  assert.equal(human.includes('## Repair'), false);
  const repaired = await loadExternalContext(ctx, unit(), { problems: ['Operation x is not an operation of the L4 system.'], previous: ANSWER });
  assert.match(repaired, /## Repair/u);
  assert.match(repaired, /Operation x is not an operation/u);
  // A system with no line in connections[] still gets its prompt: the section is simply absent.
  const lonely = await loadExternalContext({ ...ctx as object, read: async (ref: string) => (norm(ref) === DECLARATION_TYPES_REF ? TYPES : null) } as never, unit());
  assert.equal(lonely.includes('## What the module does with each operation'), false);
});

void test('d1_208 s2: no fixed text of the phase names a service, a module or a system of the rehearsal', () => {
  const fixed = ['prompt.md', 'context.ts', 'declaration.ts', 'agentM12External.ts', 'agentM12ExternalUnit.ts'].map(name => readFileSync(path.join(HERE, name), 'utf8')).join('\n');
  for (const word of ['repoHost', 'zipLookup', 'codeReview', 'customers', 'integrations', 'github', 'gitlab', 'stripe', 'slack', 'twilio', 'openai', 'anthropic']) {
    assert.equal(new RegExp(`\\b${word}\\b`, 'iu').test(fixed), false, word);
  }
});

void test('d1_208 s2: the part code writes is the L4 and nothing the model decides', () => {
  const fixed = fixedPart(externalFacts(unit().definition.data));
  assert.deepEqual(Object.keys(fixed), ['schemaVersion', 'systemId', 'title', 'description', 'settings', 'operations']);
  assert.deepEqual(fixed.settings, [
    { id: 'repositoryAddress', title: 'Repository address', description: 'The repository the project lives in.', secret: false },
    { id: 'accessKey', title: 'Access key', description: 'Lets the module read the repository.', secret: true },
  ]);
  assert.deepEqual((fixed.operations as Array<{ operationId: string }>).map(item => item.operationId), ['listChanges', 'changePushed']);
});

void test('d1_208 s2: an answer written by hand from the L4 passes the gate', async () => {
  assert.deepEqual(await externalAnswerProblems(ctx, unit(), ANSWER), []);
  const inline = ANSWER.replace('const declaration: ExternalSystemDeclaration = ', 'export default ').replace('\nexport default declaration;\n', '');
  assert.deepEqual(await externalAnswerProblems(ctx, unit(), inline), [], '`export default { ... }` is read the same');
});

void test('d1_208 s2: the validator of the runtime refuses a wildcard host, a scheme, an address and a secret that is not one', async () => {
  const refused = async (change: (declaration: Record<string, any>) => void) => (await externalAnswerProblems(ctx, unit(), mutated(change))).filter(item => item.startsWith('Declaration:'));
  assert.equal((await refused(d => { d.hosts = [{ host: '*.example.test' }]; })).length > 0, true, 'wildcard');
  assert.equal((await refused(d => { d.hosts = [{ host: 'http://example.test' }]; })).length > 0, true, 'scheme');
  assert.equal((await refused(d => { d.hosts = [{ host: '10.0.0.1' }]; })).length > 0, true, 'address');
  assert.equal((await refused(d => { d.hosts = [{ fromSetting: 'unknown' }]; })).length > 0, true, 'a setting the declaration does not have');
  assert.equal((await refused(d => { d.operations[0].uses.secrets = ['repositoryAddress']; })).length > 0, true, 'a secret that is not a secret setting');
  assert.equal((await refused(d => { d.operations[0].methods = []; })).length > 0, true, 'a call with no method');
  assert.deepEqual(await refused(d => { d.hosts = [{ host: 'api.example.test' }]; }), [], 'an exact host is accepted');
});

void test('d1_208 s2: an operation of more or less than the L4, a swapped setting and a changed text are refused by the coverage', async () => {
  const problems = async (change: (declaration: Record<string, any>) => void) => (await externalAnswerProblems(ctx, unit(), mutated(change))).join('\n');
  assert.match(await problems(d => { d.operations.push({ ...d.operations[0], operationId: 'extra' }); }), /Operation extra is not an operation of the L4 system/u);
  assert.match(await problems(d => { d.operations.pop(); }), /Operation changePushed of the L4 is not in the declaration/u);
  assert.match(await problems(d => { d.settings[1].secret = false; }), /settings must be exactly those of the L4/u);
  assert.match(await problems(d => { d.settings[0].id = 'otherAddress'; }), /settings must be exactly those of the L4/u);
  assert.match(await problems(d => { d.operations[0].direction = 'serve'; }), /Operation listChanges is a call in the L4/u);
  assert.match(await problems(d => { d.operations[1].description = 'Something else.'; }), /Operation changePushed: description must be the one of the L4/u);
  assert.match(await problems(d => { d.title = 'Another title'; }), /title must be the title of the L4 system/u);
  assert.match(await problems(d => { d.systemId = 'otherSystem'; }), /systemId must be repoHost/u);
  assert.match(await problems(d => { d.operations[0].inputType = 'NotExported'; }), /inputType NotExported is not exported in this file/u);
});

void test('d1_208 s2: the file is data: another import, a call that reaches out or a body that is not JSON is refused', async () => {
  const problems = async (code: string) => (await externalAnswerProblems(ctx, unit(), code)).join('\n');
  assert.match(await problems(ANSWER.replace("import type { ExternalSystemDeclaration }", "import { helper } from '/_102021_/l2/other.js';\nimport type { ExternalSystemDeclaration }")), /Import "\/_102021_\/l2\/other\.js" is not allowed/u);
  assert.match(await problems(`${ANSWER}\nawait fetch('https://example.test');\n`), /reaches out to nothing/u);
  assert.match(await problems(ANSWER.replace('"schemaVersion"', 'schemaVersion')), /JSON syntax/u);
  assert.match(await problems(ANSWER.replace('export default declaration;', '')), /default-export the declaration/u);
  assert.match(await problems(ANSWER.replace(/^[^\n]*\n/u, '')), /must start with the line/u);
});

void test('d1_211 s1: the recorded declaration with a verify and a noticeId passes; a serve with no noticeId passes too; a noticeId of a wrong shape is refused', async () => {
  assert.deepEqual(await externalAnswerProblems(ctx, unit(), ANSWER), []);
  assert.match(ANSWER, /"noticeId": \{ "header": "x-change-id" \}/u);
  const without = mutated(d => { delete d.operations[1].noticeId; });
  assert.deepEqual(await externalAnswerProblems(ctx, unit(), without), [], 'a notice with no identifier is accepted: the platform does not deduplicate it');
  const pointer = mutated(d => { d.operations[1].noticeId = { jsonPointer: '/data/id' }; });
  assert.deepEqual(await externalAnswerProblems(ctx, unit(), pointer), []);
  const refused = async (noticeId: unknown) => (await externalAnswerProblems(ctx, unit(), mutated(d => { d.operations[1].noticeId = noticeId; }))).filter(item => item.startsWith('Declaration:'));
  assert.match((await refused({ cookie: 'a' })).join('\n'), /must be \{ header \} or \{ jsonPointer \}/u);
  assert.match((await refused({ header: 'a', jsonPointer: '/b' })).join('\n'), /must be \{ header \} or \{ jsonPointer \}/u);
  assert.match((await refused({ jsonPointer: 'data/id' })).join('\n'), /must start with \//u);
  assert.match((await refused('x-change-id')).join('\n'), /noticeId is not an object/u);
});

void test('d1_211 s1: the title and the description of each setting come from the L4 by code, whatever the model wrote', async () => {
  // The model dropped the texts and retyped one: the code puts the L4 ones back before the gate.
  const model = mutated(d => { d.settings = [{ id: 'repositoryAddress', secret: false }, { id: 'accessKey', title: 'Chave', description: 'outra', secret: true }]; });
  const facts = externalFacts(unit().definition.data);
  assert.ok((await externalAnswerProblems(ctx, unit(), model)).some(item => item.startsWith('settings must be exactly those of the L4')));
  const copied = withFixedSettings(model, facts);
  assert.deepEqual(await externalAnswerProblems(ctx, unit(), copied), []);
  const literal = declarationLiteral(copied);
  assert.ok('value' in literal);
  assert.deepEqual((literal.value as { settings: unknown }).settings, fixedPart(facts).settings);
  assert.match(copied, /Lets the module read the repository\./u);
  // Everything the model analysed stays: hosts, kinds, types, methods, verify and the notice id.
  assert.deepEqual((literal.value as { operations: unknown }).operations, (declarationLiteral(ANSWER) as { value: { operations: unknown } }).value.operations);
  assert.equal(copied.startsWith(ANSWER.slice(0, ANSWER.indexOf('const declaration'))), true, 'the types before the object are untouched');
  assert.equal(copied.endsWith('export default declaration;\n'), true);
  // An answer whose object cannot be read is returned as it came: the gate refuses it with its own message.
  const broken = ANSWER.replace('"schemaVersion"', 'schemaVersion');
  assert.equal(withFixedSettings(broken, facts), broken);
  // A setting the L4 gives no text keeps only id and secret.
  const bare = { ...facts, settings: [{ id: 'x', title: '', description: '', secret: false }] };
  assert.deepEqual(fixedPart(bare).settings, [{ id: 'x', secret: false }]);
});
