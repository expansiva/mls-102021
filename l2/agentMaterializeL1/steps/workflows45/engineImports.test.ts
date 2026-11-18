/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/engineImports.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { completeEngineImports, engineExportsOf } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/engineImports.js';

const INDEX = [
  "export type { TaskOccurrenceSnapshot, OccurrenceKey as Key } from '/_102034_/l1/workflow/contracts.js';",
  "export { occurrenceRecordId, type OccurrencePort } from '/_102034_/l1/workflow/occurrenceRecordId.js';",
  'export interface Own { a: string }',
  'export async function openOccurrence(): Promise<void> {}',
].join('\n');

const HEAD = ['/// <mls fileReference="x" enhancement="_blank"/>', "import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';"].join('\n');

test('d1_198: the exports of the index are read as types and values', () => {
  const engine = engineExportsOf(INDEX);
  assert.deepEqual([...engine.types].sort(), ['Key', 'OccurrencePort', 'Own', 'TaskOccurrenceSnapshot']);
  assert.deepEqual([...engine.values].sort(), ['occurrenceRecordId', 'openOccurrence']);
});

test('d1_198: the real index of the engine exports TaskOccurrenceSnapshot as a type', () => {
  const file = fileURLToPath(new URL('../../../../../mls-102034/l1/workflow/index.ts', import.meta.url));
  const engine = engineExportsOf(readFileSync(file, 'utf8'));
  assert.equal(engine.types.has('TaskOccurrenceSnapshot'), true);
  assert.equal(engine.values.size > 0, true);
});

test('d1_198: a used name of the index with no import is imported; a type with import type, a value with import', () => {
  const engine = engineExportsOf(INDEX);
  const source = `${HEAD}\nexport function f(s: TaskOccurrenceSnapshot): string { return occurrenceRecordId(s); }\n`;
  const done = completeEngineImports(source, engine);
  assert.ok(done.includes("import { occurrenceRecordId } from '/_102034_/l1/workflow/index.js';"));
  assert.ok(done.includes("import type { TaskOccurrenceSnapshot } from '/_102034_/l1/workflow/index.js';"));
  assert.equal(done.split('\n')[0], '/// <mls fileReference="x" enhancement="_blank"/>');
  assert.equal(completeEngineImports(done, engine), done, 'a second pass changes nothing');
});

test('d1_198: a name that is imported, declared, aliased, a property, a key, a comment or a string is left alone', () => {
  const engine = engineExportsOf(INDEX);
  const source = [
    HEAD,
    "import type { TaskOccurrenceSnapshot } from '/_102034_/l1/workflow/index.js';",
    "import { openOccurrence as open } from '/_102034_/l1/workflow/index.js';",
    'type Key = string;',
    '// occurrenceRecordId in a comment',
    "const message = 'OccurrencePort is not here';",
    'const row = { Own: 1, occurrenceRecordId: 2 };',
    'export function g(s: TaskOccurrenceSnapshot, k: Key) { return [open, row.Own, s, k]; }',
  ].join('\n');
  assert.equal(completeEngineImports(source, engine), source);
});
