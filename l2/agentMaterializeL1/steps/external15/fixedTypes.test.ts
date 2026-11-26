/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/external15/fixedTypes.test.ts" enhancement="_blank"/>

// d1_257: the types written in the declaration of a system outside the app stay when it is generated again. The file is the real
// `github.ts` of the repoHost at 102047@f45e1e26, the one the l4_p4_139 regeneration broke (16 files).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { DECLARATION_TYPES_REF } from '/_102021_/l2/helpers/connections/catalogResolve.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { declarationLiteral, externalFacts, type ExternalFacts } from '/_102021_/l2/agentMaterializeL1/steps/external15/declaration.js';
import { externalAnswerProblems, loadExternalContext } from '/_102021_/l2/agentMaterializeL1/steps/external15/context.js';
import { exportedTypeBlocks, fixedTypeProblems, fixedTypesOf, withFixedTypes } from '/_102021_/l2/agentMaterializeL1/steps/external15/fixedTypes.js';
import { removedTypesLines } from '/_102021_/l2/agentMaterializeL1/steps/external15/removedTypes.js';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '../../../../..');
const PROJECT = 102047;
const MODULE = 'repoHost';
// The recorded file imports the type from the old path of the runtime; the gate of today accepts only the current one (the types are untouched).
const RECORDED = readFileSync(path.join(HERE, 'fixtures/repoHostGithubF45e1e26.recorded.txt'), 'utf8')
  .replace('/_102034_/l1/server/layer_1_external/connections/external/types.js', '/_102034_/l2/shared/contracts/connections/externalSystem.js');
const TYPES = readFileSync(path.join(ROOT, 'mls-102034/l2/shared/contracts/connections/externalSystem.ts'), 'utf8');
const outputRef = `_${PROJECT}_/l1/${MODULE}/layer_1_external/connections/github.ts`;

const literal = declarationLiteral(RECORDED);
assert.ok('value' in literal);
const declared = literal.value as Record<string, any>;
function facts(without: string[] = []): ExternalFacts {
  return externalFacts({
    systemId: declared.systemId,
    title: declared.title,
    description: declared.description,
    settings: declared.settings,
    operations: declared.operations.filter((item: any) => !without.includes(item.operationId)),
  });
}

function unit(without: string[] = []): M12Unit {
  const data = facts(without);
  const definition = { artifactType: 'externalConnection', artifactId: 'github', moduleName: MODULE, data, dependencies: [], text: '' };
  return { definition, declared: definition, outputRef, defRef: outputRef.replace(/\.ts$/u, '.defs.ts'), unitId: 'github', layer: 'external', text: '' } as unknown as M12Unit;
}

const norm = (ref: string) => ref.replace(/^\//u, '');
const reader = (written: string | null, others: Record<string, string> = {}) => async (ref: string) => (norm(ref) === outputRef ? written : norm(ref) === DECLARATION_TYPES_REF ? TYPES : others[norm(ref)] ?? null);
const ctxOf = (written: string | null, units: M12Unit[] = [unit()], others: Record<string, string> = {}) => ({ run: { project: PROJECT, module: MODULE }, units, read: reader(written, others) }) as never;

/** What a model that writes the types again would answer: other field names, a renamed field, an operation payload of the service. */
const REINVENTED = RECORDED
  .replace(/export type LerArquivoOutput = \{[\s\S]*?\};/u, 'export type LerArquivoOutput = {\n  caminho: string;\n  conteudo: string;\n  identificador: string;\n};')
  .replace('mensagemRegistro: string;\n  ramo?: string;\n  identificadorAnterior', 'mensagem: string;\n  ramo?: string;\n  identificadorAnterior');

void test('d1_257: the exported types are cut as they are written, the auxiliary one included', () => {
  const names = exportedTypeBlocks(RECORDED).map(block => block.name);
  assert.deepEqual(names, ['ListarConteudoInput', 'ListarConteudoItem', 'ListarConteudoOutput', 'LerArquivoInput', 'LerArquivoOutput', 'GravarArquivoInput', 'GravarArquivoOutput', 'RepositorioMudouInput', 'RepositorioMudouOutput']);
  const item = exportedTypeBlocks(RECORDED).find(block => block.name === 'ListarConteudoItem')!;
  assert.match(item.text, /tipo: 'arquivo' \| 'pasta';/u);
  assert.ok(item.text.endsWith('};'));
});

void test('d1_257: every operation stays: all the written types are fixed, byte by byte', () => {
  const fixed = fixedTypesOf(RECORDED, facts());
  assert.equal(fixed.blocks.length, 9);
  assert.deepEqual(fixed.removed, []);
  assert.deepEqual(fixed.operations.map(item => item.operationId), ['listarConteudo', 'lerArquivo', 'gravarArquivo', 'repositorioMudou']);
  assert.deepEqual(fixedTypeProblems(RECORDED, fixed), []);
});

void test('d1_257: an answer that writes the types again leaves the copy with the written ones, and the gate refuses it before the copy', () => {
  const fixed = fixedTypesOf(RECORDED, facts());
  const refused = fixedTypeProblems(REINVENTED, fixed);
  assert.equal(refused.length, 2);
  assert.match(refused.join('\n'), /Type LerArquivoOutput is fixed/u);
  assert.match(refused.join('\n'), /Type GravarArquivoInput is fixed/u);
  const copied = withFixedTypes(REINVENTED, fixed);
  assert.deepEqual(fixedTypeProblems(copied, fixed), []);
  const before = new Map(exportedTypeBlocks(RECORDED).map(block => [block.name, block.text]));
  for (const block of exportedTypeBlocks(copied)) assert.equal(block.text, before.get(block.name), block.name);
  assert.match(copied, /nome: string;\n {2}conteudo: string;\n {2}codificacao: 'base64' \| 'utf-8';/u);
  assert.match(copied, /mensagemRegistro: string;/u);
  assert.equal(copied.split('\n')[0], RECORDED.split('\n')[0]);
  assert.match(copied, /^import type \{ ExternalSystemDeclaration \}[^\n]*;\n\nexport type ListarConteudoInput/mu);
});

void test('d1_257: an operation that keeps its name must keep the type names the file gave it', () => {
  const fixed = fixedTypesOf(RECORDED, facts());
  const renamed = RECORDED.replace('"inputType": "GravarArquivoInput"', '"inputType": "GravarArquivoParametros"');
  assert.match(fixedTypeProblems(renamed, fixed).join('\n'), /Operation gravarArquivo: inputType stays GravarArquivoInput/u);
});

void test('d1_257: an operation that left the L4 takes its types, but not the ones another operation uses', () => {
  const fixed = fixedTypesOf(RECORDED, facts(['repositorioMudou', 'listarConteudo']));
  assert.deepEqual(fixed.removed, ['ListarConteudoInput', 'ListarConteudoItem', 'ListarConteudoOutput', 'RepositorioMudouInput', 'RepositorioMudouOutput']);
  assert.deepEqual(fixed.blocks.map(block => block.name), ['LerArquivoInput', 'LerArquivoOutput', 'GravarArquivoInput', 'GravarArquivoOutput']);
  const sharing = fixedTypesOf(RECORDED.replace('"outputType": "LerArquivoOutput"', '"outputType": "ListarConteudoOutput"'), facts(['listarConteudo']));
  assert.ok(sharing.blocks.some(block => block.name === 'ListarConteudoItem'), 'the auxiliary type of a type that stays stays');
  assert.deepEqual(sharing.removed, ['ListarConteudoInput']);
});

void test('d1_257: a new operation is not fixed (the model writes its types); no file before changes nothing', () => {
  const added = externalFacts({ ...facts() , operations: [...facts().operations, { operationId: 'apagarArquivo', direction: 'call', description: 'x' }] });
  const fixed = fixedTypesOf(RECORDED, added);
  assert.equal(fixed.blocks.length, 9);
  assert.deepEqual(fixed.operations.map(item => item.operationId), ['listarConteudo', 'lerArquivo', 'gravarArquivo', 'repositorioMudou']);
  const none = fixedTypesOf(null, facts());
  assert.deepEqual(none.blocks, []);
  assert.equal(withFixedTypes(REINVENTED, none), REINVENTED);
  assert.deepEqual(fixedTypeProblems(REINVENTED, none), []);
  assert.deepEqual(fixedTypesOf('not a declaration', facts()).blocks, []);
});

void test('d1_257: the prompt shows the fixed types and the gate of the unit refuses a type that changed', async () => {
  const human = await loadExternalContext(ctxOf(RECORDED), unit());
  assert.match(human, /## Types already written \(fixed\)/u);
  assert.match(human, /- gravarArquivo: inputType GravarArquivoInput, outputType GravarArquivoOutput/u);
  assert.match(human, /mensagemRegistro: string;/u);
  assert.doesNotMatch(await loadExternalContext(ctxOf(null), unit()), /Types already written/u);
  assert.deepEqual((await externalAnswerProblems(ctxOf(RECORDED), unit(), RECORDED)), []);
  const problems = await externalAnswerProblems(ctxOf(RECORDED), unit(), REINVENTED);
  assert.ok(problems.some(problem => /Type LerArquivoOutput is fixed/u.test(problem)));
  assert.deepEqual(await externalAnswerProblems(ctxOf(null), unit(), REINVENTED), []);
});

void test('d1_257: the trace names the units of the module that import a type that left', async () => {
  const consumer = { unitId: 'listPastas', outputRef: `_${PROJECT}_/l1/${MODULE}/layer_3_requests/listPastas.ts`, layer: 'usecases' } as unknown as M12Unit;
  const others = { [norm(consumer.outputRef)]: `import type { ListarConteudoOutput } from '/_${PROJECT}_/l1/${MODULE}/layer_1_external/connections/github.js';\n` };
  const lines = await removedTypesLines(ctxOf(RECORDED, [unit(['listarConteudo']), consumer], others), [unit(['listarConteudo'])]);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /ListarConteudoOutput/u);
  assert.match(lines[0], /imported by listPastas/u);
  assert.deepEqual(await removedTypesLines(ctxOf(RECORDED), [unit()]), []);
});

void test('d1_310: the types of an operation whose line the L4 changed are free; the ones of the operations that did not change stay byte by byte', () => {
  const base = facts();
  const changedId = base.operations[0].operationId;
  const changedFacts: ExternalFacts = { ...base, operations: base.operations.map(item => item.operationId === changedId ? { ...item, description: `${item.description} It also returns the identifier of each part.` } : item) };
  const previousOperations = declared.operations as Array<Record<string, string>>;
  const changedOperation = previousOperations.find(item => item.operationId === changedId)!;
  const whole = fixedTypesOf(RECORDED, base);
  const fixed = fixedTypesOf(RECORDED, changedFacts);
  // The changed operation keeps its type names (the importers still compile) and loses what only it uses.
  assert.ok(fixed.operations.some(item => item.operationId === changedId && item.outputType === changedOperation.outputType), 'the names stay');
  assert.equal(fixed.blocks.some(block => block.name === changedOperation.outputType), false, 'the output type of the changed operation is free');
  assert.equal(fixed.blocks.some(block => block.name === changedOperation.inputType), false, 'the input type of the changed operation is free');
  assert.deepEqual(fixed.removed, [], 'a changed operation does not make its types leave');
  // The others stay as written, byte by byte.
  const others = previousOperations.filter(item => item.operationId !== changedId);
  for (const operation of others) {
    for (const key of ['inputType', 'outputType'] as const) {
      const before = whole.blocks.find(block => block.name === operation[key]);
      const after = fixed.blocks.find(block => block.name === operation[key]);
      if (before) assert.equal(after?.text, before.text, `${operation.operationId} ${key}`);
    }
  }
  // An answer that rewrites the changed output is accepted by the gate; one that rewrites an unchanged type is not.
  const rewritten = RECORDED.replace(new RegExp(`export type ${changedOperation.outputType} = \\{[\\s\\S]*?\\};`, 'u'), `export type ${changedOperation.outputType} = {\n  novo: string;\n};`);
  assert.deepEqual(fixedTypeProblems(rewritten, fixed), []);
  assert.ok(fixedTypeProblems(REINVENTED, fixed).length > 0, 'an unchanged type rewritten is still refused');
  // Nothing changed: as before.
  assert.deepEqual(fixedTypesOf(RECORDED, base).blocks.map(block => block.name), exportedTypeBlocks(RECORDED).map(block => block.name));
});
