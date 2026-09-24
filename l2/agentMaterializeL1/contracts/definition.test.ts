/// <mls fileReference="_102021_/l2/agentMaterializeL1/contracts/definition.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { definitionIssues as d1DefinitionIssues } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { parseRendered } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import {
  D1_31_EXPORTS,
  D1_31_IMPORT,
  D1_DEFINITION_SCHEMA_V1,
  M1_ARTIFACT_TYPES,
  M1_DEFINITION_SCHEMA,
  M1_STATUSES,
  canonicalProjection,
  definitionIssues,
  diagnoseUnit,
  generatedAllowsSkip,
  parseDefinitionSource,
  receiptFolder,
  referenceIssues,
  renderDefinition,
  semanticHash,
  statusEvidenceIssues,
  traverseDefinitions,
  type M1Definition,
} from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import {
  LIST,
  LIST_CONSULTA_EXAMPLE,
  blockedReceipt,
  definitionsByType,
  failedReceipt,
  fixtureIndex,
  indexedUnits,
  listConsultaPending,
  listConsultaReceipt,
  withStatus,
} from '/_102021_/l2/agentMaterializeL1/fixtures/cases.js';

void test('d1_31 import surface is this module', () => {
  assert.equal(D1_31_IMPORT, '/_102021_/l2/agentMaterializeL1/contracts/definition.js');
  assert.deepEqual(D1_31_EXPORTS, [
    'M1_DEFINITION_SCHEMA',
    'M1_STATUSES',
    'M1_ARTIFACT_TYPES',
    'parseDefinitionSource',
    'renderDefinition',
    'definitionIssues',
    'canonicalProjection',
    'semanticHash',
    'referenceIssues',
    'traverseDefinitions',
    'statusEvidenceIssues',
    'generatedAllowsSkip',
    'receiptIssues',
    'diagnoseUnit',
  ]);
  assert.equal(receiptFolder('agendaClinica'), 'l1/agendaClinica/materialization/agentMaterializeL1');
});

void test('each artifact type has a valid pending definition', async () => {
  assert.deepEqual([...M1_ARTIFACT_TYPES], Object.keys(definitionsByType));
  for (const type of M1_ARTIFACT_TYPES) {
    const definition = definitionsByType[type];
    assert.deepEqual(definitionIssues(definition), [], type);
    assert.equal(definition.status, 'pending');
    assert.equal(await generatedAllowsSkip(definition, null), false, type);
  }
});

void test('serialized listConsulta example parses without eval and without pipeline', () => {
  const rendered = renderDefinition(listConsultaPending, LIST);
  assert.equal('source' in rendered, true, 'issues' in rendered ? rendered.issues.join('\n') : '');
  if (!('source' in rendered)) return;
  assert.equal(rendered.source.includes('export const pipeline'), false);
  assert.equal(rendered.source.includes('export const agent'), false);
  const parsed = parseDefinitionSource(rendered.source);
  assert.equal('definition' in parsed, true, 'issues' in parsed ? parsed.issues.join('\n') : '');
  if (!('definition' in parsed)) return;
  assert.deepEqual(parsed.definition, listConsultaPending);
  assert.equal(JSON.parse(LIST_CONSULTA_EXAMPLE).schemaVersion, M1_DEFINITION_SCHEMA);
  assert.equal(JSON.parse(LIST_CONSULTA_EXAMPLE).status, 'pending');
});

void test('parser closes on the final as const of the export', () => {
  const definition: M1Definition = {
    ...listConsultaPending,
    data: { ...listConsultaPending.data, operation: 'list as const; kept' },
  };
  const rendered = renderDefinition(definition, LIST);
  assert.equal('source' in rendered, true, 'issues' in rendered ? rendered.issues.join('\n') : '');
  if (!('source' in rendered)) return;
  const parsed = parseDefinitionSource(rendered.source);
  assert.equal('definition' in parsed, true, 'issues' in parsed ? parsed.issues.join('\n') : '');
  if (!('definition' in parsed)) return;
  assert.deepEqual(parsed.definition, definition);
});

void test('parser refuses pipeline, agent, eval and a missing export', () => {
  const rendered = renderDefinition(listConsultaPending, LIST);
  assert.equal('source' in rendered, true);
  if (!('source' in rendered)) return;
  const withPipeline = `${rendered.source}\nexport const pipeline = [] as const;\n`;
  const pipeline = parseDefinitionSource(withPipeline);
  assert.equal('issues' in pipeline, true);
  if ('issues' in pipeline) assert.match(pipeline.issues.join('\n'), /must not export pipeline/);
  const withAgent = `${rendered.source}\nexport const agent = "agentCbMaterialize" as const;\n`;
  const agent = parseDefinitionSource(withAgent);
  assert.equal('issues' in agent, true);
  if ('issues' in agent) assert.match(agent.issues.join('\n'), /must not export agent/);
  const evalSource = 'export const definition = { schemaVersion: 1 + 1 } as const;';
  const evaluated = parseDefinitionSource(evalSource);
  assert.equal('issues' in evaluated, true);
  if ('issues' in evaluated) assert.match(evaluated.issues.join('\n'), /not JSON/);
  const missing = parseDefinitionSource('export const other = {} as const;');
  assert.equal('issues' in missing, true);
});

void test('legacy CB writer still refuses v2', () => {
  const rendered = renderDefinition(listConsultaPending, LIST);
  assert.equal('source' in rendered, true);
  if (!('source' in rendered)) return;
  assert.equal(parseRendered(rendered.source), null);
  const issues = d1DefinitionIssues(listConsultaPending);
  assert.equal(issues.some(item => item.includes('schemaVersion')), true);
  assert.equal(issues.some(item => item.includes('status') || item.includes('Unknown field')), true);
});

void test('old version, invalid status and unknown data are refused', () => {
  const v1 = { ...listConsultaPending, schemaVersion: D1_DEFINITION_SCHEMA_V1 };
  assert.match(definitionIssues(v1).join('\n'), /2026-09-21-d1-definition-v1/);
  const status = { ...listConsultaPending, status: 'draft' };
  assert.match(definitionIssues(status).join('\n'), /status is invalid/);
  const unknown = { ...listConsultaPending, data: { ...listConsultaPending.data, extra: true } };
  assert.match(definitionIssues(unknown).join('\n'), /Unknown field data.extra/);
  const tsImport = { ...listConsultaPending, dependencies: ['/_102047_/l1/agendaClinica/x.defs.ts'] };
  assert.match(definitionIssues(tsImport).join('\n'), /not a TypeScript import/);
});

void test('missing and ambiguous references are reported', () => {
  const missing = referenceIssues(listConsultaPending, { files: listConsultaPending.dependencies, artifacts: [] });
  assert.equal(missing.some(item => item.includes('Missing reference domainEntity:Consulta')), true);
  const ambiguous = referenceIssues(listConsultaPending, {
    files: fixtureIndex.files,
    artifacts: [
      ...fixtureIndex.artifacts,
      { artifactType: 'repositoryPort', artifactId: 'ConsultaRepository', defPath: `${LIST}.other` },
    ],
  });
  assert.equal(ambiguous.some(item => item.includes('Ambiguous reference repositoryPort:ConsultaRepository')), true);
  assert.deepEqual(referenceIssues(listConsultaPending, fixtureIndex).filter(item => item.includes('Ambiguous') || item.includes('Missing')), []);
});

void test('traversal orders dependencies and reports a cycle', () => {
  const known = fixtureIndex.files.filter(path => !indexedUnits.some(unit => unit.defPath === path));
  const walked = traverseDefinitions(indexedUnits, known);
  assert.deepEqual(walked.issues, []);
  assert.equal(walked.order.indexOf(indexedUnits[0].defPath) < walked.order.indexOf(LIST), true);
  assert.equal(walked.order.indexOf(LIST) < walked.order.indexOf(indexedUnits.find(unit => unit.definition.artifactType === 'httpController')!.defPath), true);
  const a = '_102047_/l1/agendaClinica/layer_2_application/usecases/a.defs.ts';
  const b = '_102047_/l1/agendaClinica/layer_2_application/ports/b.defs.ts';
  const cycle = traverseDefinitions([
    { defPath: a, definition: { ...listConsultaPending, dependencies: [b] } },
    { defPath: b, definition: { ...consultaPortClone(), dependencies: [a] } },
  ], known);
  assert.equal(cycle.issues.some(item => item.includes('Cycle')), true);
});

void test('semantic hash ignores status and formatting and changes with rule, signature or dependency', async () => {
  const pending = listConsultaPending;
  const generated = withStatus(pending, 'generated');
  const compact: M1Definition = JSON.parse(JSON.stringify(pending));
  assert.deepEqual(canonicalProjection(pending), canonicalProjection(generated));
  assert.equal(await semanticHash(pending), await semanticHash(generated));
  assert.equal(await semanticHash(pending), await semanticHash(compact));
  const pretty = renderDefinition(pending, LIST);
  const tight = renderDefinition(pending, LIST);
  assert.equal('source' in pretty && 'source' in tight, true);
  if (!('source' in pretty) || !('source' in tight)) return;
  const parsedPretty = parseDefinitionSource(pretty.source.replaceAll('\n', '\n\n'));
  const parsedTight = parseDefinitionSource(tight.source);
  assert.equal('definition' in parsedPretty && 'definition' in parsedTight, true);
  if (!('definition' in parsedPretty) || !('definition' in parsedTight)) return;
  const left = parsedPretty.definition as M1Definition;
  const right = parsedTight.definition as M1Definition;
  assert.equal(await semanticHash(left), await semanticHash(right));

  const ruleChanged: M1Definition = {
    ...pending,
    data: {
      ...pending.data,
      rules: [{ ruleId: 'otherRule', path: 'l4/agendaClinica/rules.defs.ts', symbol: 'otherRule' }],
    },
  };
  const signatureChanged: M1Definition = {
    ...pending,
    data: {
      ...pending.data,
      functions: [{
        ...(pending.data.functions as Array<Record<string, unknown>>)[0],
        input: [{ name: 'id', type: 'uuid' }],
      }],
    },
  };
  const dependencyChanged: M1Definition = {
    ...pending,
    dependencies: [...pending.dependencies, '_102047_/l1/agendaClinica/layer_3_domain/entities/contatoPaciente.defs.ts'].sort(),
  };
  const pendingHash = await semanticHash(pending);
  assert.notEqual(await semanticHash(ruleChanged), pendingHash);
  assert.notEqual(await semanticHash(signatureChanged), pendingHash);
  assert.notEqual(await semanticHash(dependencyChanged), pendingHash);
});

void test('status fixtures do not claim generation without a receipt', async () => {
  const hash = await semanticHash(listConsultaPending);
  const receipt = listConsultaReceipt(hash);
  const current = receipt.dependencyHashes;
  assert.equal(await generatedAllowsSkip(listConsultaPending, null), false);
  assert.deepEqual(await statusEvidenceIssues(listConsultaPending, null), []);
  const generatedBare = withStatus(listConsultaPending, 'generated');
  assert.equal(await generatedAllowsSkip(generatedBare, null), false);
  assert.match((await statusEvidenceIssues(generatedBare, null)).join('\n'), /generated requires a receipt/);
  const generatedOk = withStatus(listConsultaPending, 'generated');
  assert.deepEqual(await statusEvidenceIssues(generatedOk, receipt, current), []);
  assert.equal(await generatedAllowsSkip(generatedOk, receipt, current), true);
  const blocked = withStatus(listConsultaPending, 'blocked');
  assert.equal(await generatedAllowsSkip(blocked, blockedReceipt()), false);
  assert.deepEqual(await statusEvidenceIssues(blocked, blockedReceipt()), []);
  const failed = withStatus(listConsultaPending, 'failed');
  assert.equal(await generatedAllowsSkip(failed, failedReceipt()), false);
  assert.deepEqual(await statusEvidenceIssues(failed, failedReceipt()), []);
  const diagnosis = await diagnoseUnit({
    defPath: LIST,
    definition: generatedOk,
    receipt,
    index: fixtureIndex,
    stage: 'verify',
    currentDependencyHashes: current,
  });
  assert.deepEqual(diagnosis.issues, []);
  assert.equal(diagnosis.inputHash, hash);
  assert.equal(diagnosis.status, 'generated');
  assert.equal(diagnosis.stage, 'verify');
  assert.match(diagnosis.outputHash, /^sha256:/);
  assert.deepEqual([...M1_STATUSES], ['pending', 'generated', 'blocked', 'failed']);
});

void test('generated skip compares the semantic hash and each dependency hash', async () => {
  const hash = await semanticHash(listConsultaPending);
  const receipt = listConsultaReceipt(hash);
  const generated = withStatus(listConsultaPending, 'generated');
  const current = receipt.dependencyHashes;
  assert.equal(await generatedAllowsSkip(generated, receipt, current), true);

  const altered: M1Definition = {
    ...generated,
    data: { ...generated.data, operation: 'get' },
  };
  assert.equal(await generatedAllowsSkip(altered, receipt, current), false);
  assert.equal((await statusEvidenceIssues(altered, receipt, current)).includes('semantic hash changed'), true);

  const path = generated.dependencies[0];
  const drifted = { ...current, [path]: 'sha256:other' };
  assert.equal(await generatedAllowsSkip(generated, receipt, drifted), false);
  assert.equal(
    (await statusEvidenceIssues(generated, receipt, drifted)).includes(`dependency ${path} changed`),
    true,
  );
});

function consultaPortClone(): M1Definition {
  return definitionsByType.repositoryPort;
}
