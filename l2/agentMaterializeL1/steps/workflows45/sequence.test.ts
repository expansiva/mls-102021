/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/sequence.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addHelpers,
  calledFunctions,
  findFunction,
  functionSignature,
  mergeImports,
  notImplementedFunctions,
  notImplementedStub,
  replaceFunction,
  signaturesOnly,
  WORKFLOW_NOT_IMPLEMENTED,
  workflowPhaseOrder,
} from '/_102021_/l2/agentMaterializeL1/steps/workflows45/sequence.js';

const SOURCE = `/// <mls fileReference="x" enhancement="_blank"/>
import { AppError } from '/_102034_/l1/server/error.js';

/** Keeps a brace in a string, a template, a comment and a regex. */
export async function resolverA(input: { note: string }): Promise<string> {
  const text = "brace } still";
  const nested = \`pre \${\`inner } \${1}\`} post }\`;
  // }
  /* } */
  const pattern = /}/;
  return text + nested + pattern.source;
}

// only this one changes
export async function etapa1(input: { note: string }, ctx: { now: Date }): Promise<void> {
  return resolverA(input);
}

export async function etapa2(): Promise<{ ok: boolean }> {
  throw new AppError('${WORKFLOW_NOT_IMPLEMENTED}', 'etapa2');
}
`;

test('braces inside a string, a template, a comment and a regex stay inside the function', () => {
  const span = findFunction(SOURCE, 'resolverA');
  assert.ok(span);
  assert.equal(SOURCE.slice(span.start, span.end), SOURCE.slice(SOURCE.indexOf('/** Keeps'), SOURCE.indexOf('\n\n// only')));
  const etapa = findFunction(SOURCE, 'etapa1');
  assert.ok(etapa);
  assert.equal(SOURCE.slice(etapa.start, etapa.start + 2), '//');
});

test('replaceFunction swaps one function and leaves every other byte', () => {
  const span = findFunction(SOURCE, 'etapa1');
  assert.ok(span);
  const replacement = `export async function etapa1(input: { note: string }, ctx: { now: Date }): Promise<void> {\n  return 1;\n}\n`;
  const next = replaceFunction(SOURCE, 'etapa1', replacement);
  assert.equal(next.slice(0, span.start), SOURCE.slice(0, span.start));
  assert.equal(next.slice(span.start, span.start + replacement.length), replacement);
  assert.equal(next.slice(span.start + replacement.length), SOURCE.slice(span.end));
});

test('a missing function and a duplicated function are errors', () => {
  assert.equal(findFunction(SOURCE, 'ausente'), null);
  assert.throws(() => replaceFunction(SOURCE, 'ausente', 'export async function ausente() {}'), /ausente/);
  const twice = `${SOURCE}\nexport async function etapa1(): Promise<void> {\n  return;\n}\n`;
  assert.throws(() => replaceFunction(twice, 'etapa1', 'export async function etapa1(): Promise<void> { return; }'), /etapa1/);
});

test('functionSignature has no body', () => {
  const signature = functionSignature(SOURCE, 'resolverA');
  assert.equal(signature.startsWith('/** Keeps'), true);
  assert.equal(signature.endsWith(' { … }'), true);
  assert.equal(signature.includes('brace } still'), false);
  assert.equal(signature.includes('return text'), false);
  assert.equal(signaturesOnly(SOURCE, ['etapa2']), `export async function etapa2(): Promise<{ ok: boolean }> { … }`);
});

test('mergeImports appends an import once and ignores a line that is not an import', () => {
  const line = `import { engine } from '/_102034_/l1/workflow/index.js';`;
  const once = mergeImports(SOURCE, [line, 'const no = 1;', line]);
  assert.equal(once.split('\n').filter(item => item === line).length, 1);
  assert.equal(once.includes('const no = 1;'), false);
  const again = mergeImports(once, [line]);
  assert.equal(again, once);
  const at = once.indexOf(line);
  assert.ok(once.slice(0, at).includes(`import { AppError }`));
  assert.ok(once.slice(at).includes('export async function resolverA'));
});

test('addHelpers inserts before the first export and an empty string is the same source', () => {
  assert.equal(addHelpers(SOURCE, ''), SOURCE);
  const next = addHelpers(SOURCE, 'function helper(): number {\n  return 1;\n}');
  const helperAt = next.indexOf('function helper');
  const exportAt = next.indexOf('export async function resolverA');
  assert.ok(helperAt > next.indexOf(`import { AppError }`));
  assert.ok(helperAt < exportAt);
  assert.equal(next.includes(SOURCE.slice(SOURCE.indexOf('/** Keeps'))), true);
});

test('workflowPhaseOrder lists unreferenced functions first, then the step order', () => {
  const order = workflowPhaseOrder(
    { functions: ['resolverA', 'etapa1', 'etapa2', 'resolverB'], trigger: { kind: 'event' } },
    [{ stepId: 's1', functionRef: 'etapa1' }, { stepId: 's2', functionRef: 'etapa2' }, { stepId: 's3' }],
    ['entregarPesquisa', 'recuperarCiclo'],
  );
  assert.deepEqual(order, ['resolverA', 'resolverB', 'etapa1', 'etapa2', 'entregarPesquisa', 'recuperarCiclo']);
});

test('notImplementedFunctions lists only exported functions whose body is the marker', () => {
  assert.equal(notImplementedStub('etapa2'), `throw new AppError('${WORKFLOW_NOT_IMPLEMENTED}', 'etapa2');`);
  assert.deepEqual(notImplementedFunctions(SOURCE), ['etapa2']);
  const plain = `async function etapa2(): Promise<void> {\n  ${notImplementedStub('etapa2')}\n}\n`;
  assert.deepEqual(notImplementedFunctions(plain), []);
});

test('calledFunctions keeps names already written that the prose names', () => {
  const names = ['resolverA', 'etapa1', 'etapa10'];
  const written = new Set(['resolverA', 'etapa1', 'etapa10']);
  assert.deepEqual(calledFunctions('etapa1 calls resolverA and not etapa10x', names, written), ['resolverA', 'etapa1']);
  assert.deepEqual(calledFunctions('calls resolverA', names, new Set(['etapa1'])), []);
});
