/// <mls fileReference="_102021_/l2/helpers/l1Defs/definition.test.ts" enhancement="_blank"/>

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
  receiptPathFor,
  referenceIssues,
  renderDefinition,
  semanticHash,
  statusEvidenceIssues,
  traverseDefinitions,
  type M1Definition,
} from '/_102021_/l2/helpers/l1Defs/definition.js';
import {
  LIST,
  LIST_BUOY_EXAMPLE,
  ADAPTER,
  blockedReceipt,
  BUOY,
  defPathOf,
  definitionsByType,
  failedReceipt,
  fixtureIndex,
  indexedUnits,
  listBuoyPending,
  listBuoyReceipt,
  M1_FIXTURE_MODULE,
  M1_FIXTURE_PROJECT,
  PORT,
  TABLE,
  withStatus,
} from '/_102021_/l2/agentMaterializeL1/fixtures/cases.js';

/** Fixture usecases still carry the script keys until s8. Validators only accept the intention. */
function asIntention(definition: M1Definition): M1Definition {
  if (definition.artifactType !== 'usecase') return definition;
  const data = definition.data;
  const next: Record<string, unknown> = {
    usecaseId: data.usecaseId,
    entityId: data.entityId,
    operation: data.operation,
    rulesApplied: data.rulesApplied ?? [],
    effects: data.effects ?? [],
  };
  if (data.transitionRef !== undefined) next.transitionRef = data.transitionRef;
  if (data.mdm !== undefined) next.mdm = data.mdm;
  return { ...definition, data: next };
}

const listBuoy = asIntention(listBuoyPending);

void test('d1_31 import surface is this module', () => {
  assert.equal(D1_31_IMPORT, '/_102021_/l2/helpers/l1Defs/definition.js');
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
    'receiptPathFor',
    'diagnoseUnit',
  ]);
  assert.equal(receiptFolder(M1_FIXTURE_MODULE), `l1/${M1_FIXTURE_MODULE}/materialization/agentMaterializeL1`);
});

void test('receipt path follows the def, so the same id and case do not collide', () => {
  const folder = receiptFolder(M1_FIXTURE_MODULE);
  const port = receiptPathFor(PORT);
  const adapter = receiptPathFor(ADAPTER);
  assert.notEqual(port, adapter);
  const entity = receiptPathFor(BUOY);
  const table = receiptPathFor(TABLE);
  assert.notEqual(entity.toLowerCase(), table.toLowerCase());
  for (const path of [port, adapter, entity, table]) {
    assert.equal(path.startsWith(`${folder}/`), true, path);
    const base = path.slice(path.lastIndexOf('/') + 1);
    assert.match(base, /^[A-Za-z][A-Za-z0-9_]*\.json$/, base);
  }
  assert.equal(receiptPathFor(PORT.replace(/^_\d+_\//, '')), port);
});

void test('each artifact type has a valid pending definition', async () => {
  assert.deepEqual([...M1_ARTIFACT_TYPES], Object.keys(definitionsByType));
  for (const type of M1_ARTIFACT_TYPES) {
    const definition = asIntention(definitionsByType[type]);
    assert.deepEqual(definitionIssues(definition), [], type);
    assert.equal(definition.status, 'pending');
    assert.equal(await generatedAllowsSkip(definition, null), false, type);
  }
});

void test('serialized list usecase example parses without eval and without pipeline', () => {
  const rendered = renderDefinition(listBuoy, LIST);
  assert.equal('source' in rendered, true, 'issues' in rendered ? rendered.issues.join('\n') : '');
  if (!('source' in rendered)) return;
  assert.equal(rendered.source.includes('export const pipeline'), false);
  assert.equal(rendered.source.includes('export const agent'), false);
  const parsed = parseDefinitionSource(rendered.source);
  assert.equal('definition' in parsed, true, 'issues' in parsed ? parsed.issues.join('\n') : '');
  if (!('definition' in parsed)) return;
  assert.deepEqual(parsed.definition, listBuoy);
  assert.equal(JSON.parse(LIST_BUOY_EXAMPLE).schemaVersion, M1_DEFINITION_SCHEMA);
  assert.equal(JSON.parse(LIST_BUOY_EXAMPLE).status, 'pending');
});

void test('parser closes on the final as const of the export', () => {
  const definition: M1Definition = {
    ...listBuoy,
    data: { ...listBuoy.data, operation: 'list as const; kept' },
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
  const rendered = renderDefinition(listBuoy, LIST);
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

void test('D1 writer accepts v2 and does not export pipeline', () => {
  const rendered = renderDefinition(listBuoy, LIST);
  assert.equal('source' in rendered, true);
  if (!('source' in rendered)) return;
  const parsed = parseRendered(rendered.source);
  assert.ok(parsed);
  assert.deepEqual(parsed?.definition, listBuoy);
  assert.equal(rendered.source.includes('export const pipeline'), false);
  const issues = d1DefinitionIssues(listBuoy);
  assert.equal(issues.some(item => item.includes('schemaVersion') || item.includes('status is invalid')), false);
});

void test('old version, invalid status and unknown data are refused', () => {
  const v1 = { ...listBuoyPending, schemaVersion: D1_DEFINITION_SCHEMA_V1 };
  assert.match(definitionIssues(v1).join('\n'), /2026-09-21-d1-definition-v1/);
  const status = { ...listBuoyPending, status: 'draft' };
  assert.match(definitionIssues(status).join('\n'), /status is invalid/);
  const unknown = { ...listBuoyPending, data: { ...listBuoyPending.data, extra: true } };
  assert.match(definitionIssues(unknown).join('\n'), /Unknown field data.extra/);
  const tsImport = { ...listBuoyPending, dependencies: [`/_${M1_FIXTURE_PROJECT}_/l1/${M1_FIXTURE_MODULE}/x.defs.ts`] };
  assert.match(definitionIssues(tsImport).join('\n'), /not a TypeScript import/);
});

void test('missing and ambiguous references are reported', () => {
  const missing = referenceIssues(listBuoy, { files: listBuoy.dependencies, artifacts: [] });
  const entityId = String(listBuoy.data.entityId);
  assert.equal(missing.some(item => item.includes(`Missing reference domainEntity:${entityId}`)), true);
  assert.deepEqual(referenceIssues(listBuoy, fixtureIndex).filter(item => item.includes('Ambiguous') || item.includes('Missing')), []);
  const contract = `_${M1_FIXTURE_PROJECT}_/l4/${M1_FIXTURE_MODULE}/divers.defs.ts`;
  const catalog = '_102034_/l4/ontology/mdm.defs.ts';
  const effect = { eventId: 'enrollIt', path: `l4/${M1_FIXTURE_MODULE}/divers.defs.ts`, symbol: 'enrollIt' };
  const mixed = {
    ...listBuoy,
    dependencies: [...new Set([...listBuoy.dependencies, catalog, contract])].sort(),
    data: {
      ...listBuoy.data,
      effects: [
        ...(Array.isArray(listBuoy.data.effects) ? listBuoy.data.effects : []),
        effect,
      ],
    },
  };
  const mixedIssues = referenceIssues(mixed, { files: mixed.dependencies, artifacts: fixtureIndex.artifacts });
  assert.equal(mixedIssues.some(item => item.includes(`_102034_/l4/${M1_FIXTURE_MODULE}/`)), false, mixedIssues.join('\n'));
  assert.equal(mixedIssues.some(item => item.includes('divers.defs.ts')), false, mixedIssues.join('\n'));
  const unlisted = { ...mixed, dependencies: mixed.dependencies.filter(path => path !== contract) };
  const unlistedIssues = referenceIssues(unlisted, { files: unlisted.dependencies, artifacts: fixtureIndex.artifacts });
  assert.equal(unlistedIssues.some(item => item.includes('divers.defs.ts')), true, unlistedIssues.join('\n'));
  const tablePath = defPathOf('table', 'buoy');
  const portPath = defPathOf('repositoryPort', 'BuoyRepository');
  const adapter = {
    ...listBuoyPending,
    artifactType: 'repositoryAdapter' as const,
    artifactId: 'BuoyRepository',
    data: { entityId: 'Buoy', portId: 'BuoyRepository', tableId: 'buoy', columns: [] },
  };
  const byTableId = referenceIssues(adapter, {
    files: [tablePath, portPath],
    artifacts: [
      { artifactType: 'table', artifactId: 'buoy', defPath: tablePath },
      { artifactType: 'repositoryPort', artifactId: 'BuoyRepository', defPath: portPath },
    ],
  });
  assert.equal(byTableId.some(item => item.includes('table:buoy')), false, byTableId.join('\n'));
  const byFileName = referenceIssues(adapter, {
    files: [tablePath, portPath],
    artifacts: [
      { artifactType: 'table', artifactId: 'Buoy', defPath: tablePath },
      { artifactType: 'repositoryPort', artifactId: 'BuoyRepository', defPath: portPath },
    ],
  });
  assert.equal(byFileName.some(item => item.includes('Missing reference table:buoy at data.tableId')), true, byFileName.join('\n'));
});

void test('traversal orders dependencies and reports a cycle', () => {
  const known = fixtureIndex.files.filter(path => !indexedUnits.some(unit => unit.defPath === path));
  const units = indexedUnits.map(unit => ({ ...unit, definition: asIntention(unit.definition) }));
  const walked = traverseDefinitions(units, known);
  assert.deepEqual(walked.issues, []);
  assert.equal(walked.order.indexOf(indexedUnits[0].defPath) < walked.order.indexOf(LIST), true);
  assert.equal(walked.order.indexOf(LIST) < walked.order.indexOf(indexedUnits.find(unit => unit.definition.artifactType === 'httpController')!.defPath), true);
  const a = defPathOf('usecase', 'a');
  const b = defPathOf('repositoryPort', 'b');
  const cycle = traverseDefinitions([
    { defPath: a, definition: { ...listBuoy, dependencies: [b] } },
    { defPath: b, definition: { ...portClone(), dependencies: [a] } },
  ], known);
  assert.equal(cycle.issues.some(item => item.includes('Cycle')), true);
});

void test('semantic hash ignores status and formatting and changes with rule, signature or dependency', async () => {
  const pending = listBuoy;
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
    data: { ...pending.data, rulesApplied: ['otherRule'] },
  };
  const signatureChanged: M1Definition = {
    ...pending,
    data: {
      ...pending.data,
      effects: [{ eventId: 'buoyListed', path: `l4/${M1_FIXTURE_MODULE}/rules.defs.ts`, symbol: 'buoyListed' }],
    },
  };
  const dependencyChanged: M1Definition = {
    ...pending,
    dependencies: [...pending.dependencies, defPathOf('domainEntity', 'diverContact')].sort(),
  };
  const pendingHash = await semanticHash(pending);
  assert.notEqual(await semanticHash(ruleChanged), pendingHash);
  assert.notEqual(await semanticHash(signatureChanged), pendingHash);
  assert.notEqual(await semanticHash(dependencyChanged), pendingHash);
});

void test('status fixtures do not claim generation without a receipt', async () => {
  const hash = await semanticHash(listBuoy);
  const receipt = listBuoyReceipt(hash);
  const current = receipt.dependencyHashes;
  assert.equal(await generatedAllowsSkip(listBuoy, null), false);
  assert.deepEqual(await statusEvidenceIssues(listBuoy, null), []);
  const generatedBare = withStatus(listBuoy, 'generated');
  assert.equal(await generatedAllowsSkip(generatedBare, null), false);
  assert.match((await statusEvidenceIssues(generatedBare, null)).join('\n'), /generated requires a receipt/);
  const generatedOk = withStatus(listBuoy, 'generated');
  assert.deepEqual(await statusEvidenceIssues(generatedOk, receipt, current), []);
  assert.equal(await generatedAllowsSkip(generatedOk, receipt, current), true);
  const blocked = withStatus(listBuoy, 'blocked');
  assert.equal(await generatedAllowsSkip(blocked, blockedReceipt()), false);
  assert.deepEqual(await statusEvidenceIssues(blocked, blockedReceipt()), []);
  const failed = withStatus(listBuoy, 'failed');
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
  const hash = await semanticHash(listBuoyPending);
  const receipt = listBuoyReceipt(hash);
  const generated = withStatus(listBuoyPending, 'generated');
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

function portClone(): M1Definition {
  return definitionsByType.repositoryPort;
}

const cicloTarefa: M1Definition = {
  schemaVersion: M1_DEFINITION_SCHEMA,
  artifactType: 'workflowProcess',
  artifactId: 'cicloTarefa',
  moduleName: 'tarefas',
  status: 'pending',
  dependencies: [],
  data: {
    processId: 'cicloTarefa',
    trigger: { kind: 'manual', actorRef: 'membroEquipe' },
    occurrence: { entityId: 'Tarefa' },
    functions: ['abrirOcorrenciaTarefa', 'avancarEtapaTarefa', 'reatribuirQuemAge', 'resolverQuemAgeAgora'],
    operations: [
      { operation: 'ItemChecklist.update', steps: ['journey:executarTarefa/marcarChecklist'] },
      { operation: 'Tarefa.aceitar', steps: ['journey:revisarTarefa/aceitarTarefa'] },
      { operation: 'Tarefa.cancelar', steps: ['journey:cancelarTarefaCriador/cancelarCriada', 'journey:cancelarTarefaGestor/cancelarPeloGestor'] },
      { operation: 'Tarefa.create', steps: ['journey:criarTarefa/preencherTarefa'] },
      { operation: 'Tarefa.devolver', steps: ['journey:revisarTarefa/devolverTarefa'] },
      { operation: 'Tarefa.enviarParaRevisao', steps: ['journey:executarTarefa/enviarRevisao', 'journey:retomarTarefaDevolvida/reenviarRevisao'] },
      { operation: 'Tarefa.iniciar', steps: ['journey:executarTarefa/iniciarTarefa'] },
      { operation: 'Tarefa.update', steps: ['journey:reatribuirTarefaCriador/trocarResponsavel', 'journey:reatribuirTarefaGestor/reatribuir', 'journey:retomarTarefaDevolvida/ajustarCampos'] },
    ],
  },
};

void test('workflowProcess accepts cicloTarefa and refuses a trigger or a key outside the def', () => {
  assert.deepEqual(definitionIssues(cicloTarefa), []);
  assert.deepEqual(d1DefinitionIssues(cicloTarefa), []);
  const manual: M1Definition = {
    ...cicloTarefa,
    data: { ...cicloTarefa.data, trigger: { kind: 'manual' } },
  };
  assert.match(d1DefinitionIssues(manual).join('\n'), /Missing field data\.trigger\.actorRef\./);
  const routes: M1Definition = { ...cicloTarefa, data: { ...cicloTarefa.data, routes: [] } };
  assert.match(definitionIssues(routes).join('\n'), /Unknown field data\.routes\./);
  assert.match(d1DefinitionIssues(routes).join('\n'), /Unknown field data\.routes\./);
});

void test('usecase keeps the intention and refuses the script', () => {
  assert.deepEqual(definitionIssues(listBuoy), []);
  assert.deepEqual(d1DefinitionIssues(listBuoy), []);
  const script: M1Definition = { ...listBuoy, data: { ...listBuoy.data, sequence: [] } };
  assert.match(definitionIssues(script).join('\n'), /Unknown field data\.sequence\./);
  assert.match(d1DefinitionIssues(script).join('\n'), /Unknown field data\.sequence\./);
  const transition: M1Definition = { ...listBuoy, data: { ...listBuoy.data, operation: 'transition' } };
  assert.match(d1DefinitionIssues(transition).join('\n'), /Missing field data\.transitionRef\./);
});
