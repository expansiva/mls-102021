/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/validate-all/agentCbValidateAll.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

void test('agentCbValidateAll declares the validate-all step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCbValidateAll.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCbValidateAll/);
  assert.match(src, /export function createAgent/);
  assert.match(src, /beforePromptStep/);
  assert.match(flow, /"agentName": "agentCbValidateAll"/);
});

void test('validate-all flags a redundant PK index next to the empty-primaryKey guard', () => {
  const src = readFileSync(path.join(HERE, 'agentCbValidateAll.ts'), 'utf8');
  assert.match(src, /table without primary key ->/);
  assert.match(src, /collectRedundantPkIndexFindings\(def\.source/);
});

void test('a delete-without-port-method gap is repaired on the PORT, not the usecase', () => {
  const src = readFileSync(path.join(HERE, 'agentCbValidateAll.ts'), 'utf8');
  const materialize = readFileSync(path.join(HERE, '..', 'materialize', 'agentCbMaterialize.ts'), 'utf8');
  assert.match(src, /collectDeleteOperationPortGaps\(uc\.usecaseId/);
  assert.match(src, /addRepair\(portDefRef, msg\)/);
  assert.match(src, /defRefByLc\.set\(`ports::\$\{shortName\}`/);
  // The usecase worker must NOT burn its repair budget on a finding it cannot satisfy.
  assert.doesNotMatch(materialize, /collectDeleteOperationPortGaps/);
});

void test('validate-all flags JSON.parse of a JSONB row column on repository adapters', () => {
  const src = readFileSync(path.join(HERE, 'agentCbValidateAll.ts'), 'utf8');
  assert.match(src, /collectJsonbRowParseFindings\(/);
  assert.match(src, /jsonbColumnsFromTableSource/);
});

// ── o sweep não pode consumir a memória da aba nem morrer mudo ────────────────
// Run be3: este step compilou ~200 arquivos (cada compile empresta os modelos dos imports) e a aba
// estourou a memória antes de o step registrar qualquer coisa.
void test('validate-all flags io shape mismatch on usecase defs', () => {
  const src = readFileSync(path.join(HERE, 'agentCbValidateAll.ts'), 'utf8');
  assert.match(src, /collectIoShapeSymmetryIssues/);
});

void test('validate-all flags an unreadable l4 contract dependsFile instead of omitting it in silence', () => {
  const src = readFileSync(path.join(HERE, 'agentCbValidateAll.ts'), 'utf8');
  assert.match(src, /collectL4ContractDependsRefs/);
  assert.match(src, /l4 contract unreadable ->/);
});

void test('validate-all flags derived persistence even with the MDM write path off', () => {
  const src = readFileSync(path.join(HERE, 'agentCbValidateAll.ts'), 'utf8');
  assert.match(src, /storageTarget === 'derived' \|\| e\.kind === 'derived'/);
  assert.match(src, /collectPersistencePolicyIssues\(/);
});

void test('validate-all flags dotted shortName on l1 (repairable) and l4 (defs-level) defs', () => {
  const src = readFileSync(path.join(HERE, 'agentCbValidateAll.ts'), 'utf8');
  assert.match(src, /collectDottedShortNameFindings/);
  assert.match(src, /addRepair\(defRefOf\(def\.folder, def\.real\), msg\)/);
});

void test('after a repair round the whole-project compile re-asks every file and keeps remaining families', () => {
  const src = readFileSync(path.join(HERE, 'agentCbValidateAll.ts'), 'utf8');
  assert.match(src, /const afterRepair = repairStateForCompile\.globalAttempts > 0/);
  assert.match(src, /const secondTargets = afterRepair \? inScope : flaggedFirst/);
  assert.match(src, /compilerErrorsAfterRepair\(first,/);
  assert.match(src, /selectCompilerRepairRoots\([\s\S]{0,200}compilerErrorFamily/);
  assert.match(src, /collectNonEnglishAppErrorMessages/);
  assert.match(src, /peak=/);
});

void test('the compile sweep drains the borrow queue in blocks and leaves a durable trail', () => {
  const src = readFileSync(path.join(HERE, 'agentCbValidateAll.ts'), 'utf8');
  // A fila de release só drena em ponto quiescente, que uma varredura longa nunca alcança sozinha.
  assert.match(src, /const compileBlock = 25;/);
  assert.match(src, /if \(compiled % compileBlock === 0\) \{[\s\S]{0,240}flushBorrowedModels\(\)/);
  // E ao final do sweep, antes de decidir qualquer coisa.
  assert.match(src, /const endFlush = await flushBorrowedModels\(\);/);
  // Progresso durável: se a aba morrer no meio, o último arquivo diz ONDE parou.
  assert.match(src, /saveValidateProgress\(project, \{ phase: 'compile', done: 0/);
  assert.match(src, /shortName: 'cb-validate-progress'/);
  // Diagnóstico nunca derruba o step.
  assert.match(src, /catch \{ \/\* progress is diagnostics: never fail the step over it \*\/ \}/);
});

void test('validate-all partitions blocking vs degradable and finalizes when only degradable remain', () => {
  const src = readFileSync(path.join(HERE, 'agentCbValidateAll.ts'), 'utf8');
  assert.match(src, /partitionFindings\(unique\)/);
  assert.match(src, /unmappedBlocking/);
  assert.match(src, /canRepair/);
  assert.match(src, /outcome: 'passed-degraded'/);
  assert.match(src, /INTEGRITY PASSED-DEGRADED/);
  assert.match(src, /blocking\.length === 0/);
  // Blocking still fails the run; degradable does not skip repair when mapped.
  assert.match(src, /INTEGRITY FAILED/);
  assert.match(src, /canRepair && \(state\.globalAttempts < GLOBAL_REPAIR_BUDGET \|\| isRescue\)/);
});

void test('validate-all records operations coverage on health and never turns it into a finding', () => {
  const src = readFileSync(path.join(HERE, 'agentCbValidateAll.ts'), 'utf8');
  assert.match(src, /compareOperationsCoverage/);
  assert.match(src, /persistHealth/);
  assert.match(src, /operationsCoverageLogLine/);
  assert.match(src, /declaredOperations/);
  assert.doesNotMatch(src, /missing\.push\([^)]*operations/);
});

void test('the compile sweep paints an ephemeral local title and never replaces the durable progress file', () => {
  const src = readFileSync(path.join(HERE, 'agentCbValidateAll.ts'), 'utf8');
  assert.match(src, /step\.stepTitle \|\| 'Validate l1 artifacts'.*compiling \$\{inScope\.length\} files/);
  assert.match(src, /step\.stepTitle \|\| 'Validate l1 artifacts'.*compile \$\{compiled\}\/\$\{inScope\.length\}/);
  assert.match(src, /saveValidateProgress\(project, \{ phase: 'compile', done: 0/);
  assert.match(src, /shortName: 'cb-validate-progress'/);
  assert.doesNotMatch(src, /step\.stepTitle\s*=/);
});
