/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/external15/inputSecrets.test.ts" enhancement="_blank"/>

// d1_350: the `inputSecrets` of the declaration come from the secret fields of the L4: the context says them, the gate asks for them.

import assert from 'node:assert/strict';
import test from 'node:test';

import { inputFieldNames, inputSecretFieldsOf, inputSecretProblems, inputSecretsSection, secretFieldPaths } from '/_102021_/l2/agentMaterializeL1/steps/external15/inputSecrets.js';
import { connectionLinesOf } from '/_102021_/l2/agentMaterializeL1/steps/external15/declaration.js';
import type { M12Context } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';

const ENTITY = `export const e = ${JSON.stringify({ record: { fields: { id: { type: 'uuid' }, details: { type: 'object', fields: { accessKey: { type: 'string', secret: true }, name: { type: 'string' } } } } } })} as const;`;
const PLAIN = `export const e = ${JSON.stringify({ record: { fields: { id: { type: 'uuid' }, details: { type: 'object', fields: { name: { type: 'string' } } } } } })} as const;`;
const INTEGRATION = `export const x = ${JSON.stringify({ connections: [
  { connectionId: 'tg', operationId: 'check', direction: 'call', usedBy: ['a'], description: 'c', entityRefs: ['Bot'] },
  { connectionId: 'tg', operationId: 'send', direction: 'call', usedBy: ['b'], description: 's', entityRefs: ['Audit'] },
  { connectionId: 'tg', operationId: 'arrive', direction: 'serve', usedBy: [], description: 'a', entityRefs: ['Bot'] },
] })} as const;`;

const context = (files: Record<string, string>): M12Context => ({ run: { project: 1, module: 'demo' }, read: async (ref: string) => files[ref] ?? null }) as never;
const FILES = { '_1_/l4/demo/ontology/Bot.defs.ts': ENTITY, '_1_/l4/demo/ontology/Audit.defs.ts': PLAIN };

const CODE = `/// h
export interface CheckInput { botAccessKey: string; botId?: string }
export type SendInput = { text: string; 'chatId': string };
export default {};`;

void test('d1_350: the secret paths come down the fields of the ontology (details.accessKey)', () => {
  assert.deepEqual(secretFieldPaths({ id: { type: 'uuid' }, details: { type: 'object', fields: { accessKey: { type: 'string', secret: true }, name: { type: 'string' } } } }), ['details.accessKey']);
  assert.deepEqual(secretFieldPaths({ id: { type: 'uuid' } }), []);
});

void test('d1_350: only the outbound operations whose entities have a secret field are in the map and in the context', async () => {
  const lines = connectionLinesOf(INTEGRATION, 'tg');
  assert.deepEqual(lines.map(line => line.entityRefs), [['Bot'], ['Audit'], ['Bot']]);
  const map = await inputSecretFieldsOf(context(FILES), lines);
  assert.deepEqual([...map.keys()], ['check'], 'send reads an entity with no secret; arrive is a serve');
  assert.deepEqual(map.get('check'), [{ entityId: 'Bot', path: 'details.accessKey' }]);
  assert.match(inputSecretsSection(map), /^- check: the entity Bot has secret field\(s\) `details\.accessKey` in the L4\. The operation must declare `uses\.inputSecrets`/u);
  assert.equal(inputSecretsSection(await inputSecretFieldsOf(context({ ...FILES, '_1_/l4/demo/ontology/Bot.defs.ts': PLAIN }), lines)), '', 'a module with no secret field: nothing added');
});

void test('d1_350: the gate asks inputSecrets of an operation that reads a secret field, and every name must be a field of the input', async () => {
  const map = await inputSecretFieldsOf(context(FILES), connectionLinesOf(INTEGRATION, 'tg'));
  const ok = [{ operationId: 'check', inputType: 'CheckInput', uses: { settings: [], secrets: [], inputSecrets: ['botAccessKey'] } }, { operationId: 'send', inputType: 'SendInput', uses: { inputSecrets: ['text'] } }];
  assert.deepEqual(inputSecretProblems(CODE, ok, map), []);
  const missing = inputSecretProblems(CODE, [{ operationId: 'check', inputType: 'CheckInput', uses: { settings: [], secrets: [], inputSecrets: [] } }], map);
  assert.equal(missing.length, 1);
  assert.match(missing[0], /^Operation check reads Bot\.details\.accessKey, which the L4 marks secret: declare `uses\.inputSecrets`/u);
  assert.equal(inputSecretProblems(CODE, [{ operationId: 'check', inputType: 'CheckInput', uses: {} }], map).length, 1, 'no uses at all');
  const wrong = inputSecretProblems(CODE, [{ operationId: 'check', inputType: 'CheckInput', uses: { inputSecrets: ['accessKey'] } }], map);
  assert.equal(wrong.length, 1);
  assert.match(wrong[0], /inputSecrets item accessKey is not a field of the input CheckInput \(fields: botAccessKey, botId\)/u);
  assert.deepEqual(inputSecretProblems(CODE, [{ operationId: 'check', inputType: 'CheckInput', uses: {} }], new Map()), [], 'no secret in the L4: nothing asked');
});

void test('d1_350: the names of the input are read from an interface, a type literal and a one-line type', () => {
  assert.deepEqual(inputFieldNames(CODE, 'CheckInput'), ['botAccessKey', 'botId']);
  assert.deepEqual(inputFieldNames(CODE, 'SendInput'), ['text', 'chatId']);
  assert.deepEqual(inputFieldNames('export interface A { x: string }', 'A'), ['x']);
  assert.equal(inputFieldNames(CODE, 'Missing'), null);
  assert.deepEqual(inputFieldNames('export interface A {\n  // a: string\n  nested: { a: string; b: number };\n  y?: number;\n}', 'A'), ['nested', 'y']);
});
