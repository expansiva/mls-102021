/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-usecase/agentCbUsecase.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { callToolProvider, liveTestsEnabled, parseEnvFile } from '/_102025_/l2/testLlmClient.js';
import { createPlannerToolSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbPlanner.js';
import { usecaseResultSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbSchemas.js';
import { classifyEntityKind } from '/_102021_/l2/agentChangeBackend/helpers/cbDefsSource.js';
import { buildOwnerItem, deriveMaps, validateUsecasePlan } from '/_102021_/l2/agentChangeBackend/steps/gen-usecase/usecaseOwnerItem.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../..');
const TOOL_NAME = 'submitUsecase';
const MODEL_TYPES = ['code', 'design'] as const;

void test('agentCbUsecase declares the LLM fan-out step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCbUsecase.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCbUsecase/);
  assert.match(src, /createPromptReadyIntent/);
  assert.match(src, /afterPromptStep/);
  assert.match(flow, /"agentName": "agentCbUsecase"/);
});

void test('gen-usecase worker prompt receives referenced rule text, not the whole catalog', () => {
  const src = readFileSync(path.join(HERE, 'agentCbUsecase.ts'), 'utf8');
  assert.match(src, /appliedRulesPromptSection/);
  assert.match(src, /readRuleDefinitions\(scan\.project\)/);
  assert.match(src, /owner\.rulesApplied/);
  const skill = readFileSync(path.join(HERE, '..', '..', 'skills', 'applicationUsecase.md'), 'utf8');
  assert.match(skill, /When in doubt, comment/);
  assert.match(skill, /useRules/);
});

void test('gen-usecase owner item carries the declared lifecycle when the module has one', () => {
  const src = readFileSync(path.join(HERE, 'usecaseOwnerItem.ts'), 'utf8');
  assert.match(src, /lifecycleForEntity\(lifecycles, o\.entity\)/);
  assert.match(src, /\.\.\.\(lifecycle \? \{ lifecycle \} : \{\}\)/);
  const prompt = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  assert.match(prompt, /When the item includes `lifecycle`/);
  assert.match(prompt, /Do NOT add a guard that rejects/);
});

void test('usecase defs pin and validate io shape symmetry after outputShape is applied', () => {
  const src = readFileSync(path.join(HERE, 'agentCbUsecase.ts'), 'utf8');
  assert.match(src, /collectIoShapeSymmetryIssues/);
  assert.match(src, /pinUsecaseL4Mdm\(result, owner\?\.mdm\)/);
  assert.match(src, /alignOutputShapeToOntology/);
  assert.match(src, /systemDecisions/);
});

void test('agentCbUsecase tool schema is provider-clean', () => {
  const errs = lintToolSchema(JSON.stringify(tool().function.parameters));
  assert.equal(errs, null, errs?.join(' | '));
});

for (const modelType of MODEL_TYPES) {
  void test(`agentCbUsecase live @ ${modelType}: schema accepted + result has functions`, { skip: !liveTestsEnabled() }, async () => {
    const result = {
      usecaseId: 'createOrder',
      ports: ['IOrderRepository'],
      functions: [{
        functionName: 'createOrder',
        inputTypeName: 'CreateOrderInput',
        outputTypeName: 'CreateOrderOutput',
        input: [],
        output: [],
      }],
    };
    const r = await callToolProvider(config(), { modelType, system: system(modelType), human: human(result), tool: tool() });
    assertLiveResponse(r);
    assert.ok(isRecord(r.args) && Array.isArray(r.args.functions), `${modelType}: result.functions missing`);
  });
}

function tool(): any {
  return createPlannerToolSchema(TOOL_NAME, 'Submit the usecase.', usecaseResultSchema as Record<string, unknown>);
}

function system(modelType: string): string {
  return ['<!-- modelType: code -->', '<!-- x-tool-strict: true -->', `Return only one valid ${TOOL_NAME} tool call for model ${modelType}.`].join('\n');
}

function human(result: unknown): string {
  return `Call ${TOOL_NAME} with exactly this arguments JSON:\n${JSON.stringify({ status: 'ok', result, questions: [], trace: ['schema-test'] }, null, 2)}`;
}

function config() {
  return parseEnvFile(readFileSync(path.join(MLS_BASE, '.env'), 'utf8'));
}

function assertLiveResponse(r: { modelType: string; status: number; text: string; args: unknown; schemaReject: boolean }) {
  const sample = r.text.replace(/\s+/g, ' ').slice(0, 200);
  assert.ok(!r.schemaReject, `${r.modelType}: schema rejected (${r.status}): ${sample}`);
  assert.equal(r.status, 200, `${r.modelType}: expected 200, got ${r.status}: ${sample}`);
  assert.ok(r.args, `${r.modelType}: no tool_call result`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// ── nenhum usecase stub sobrevive à geração ───────────────────────────────────
// Run 8: 4 usecases saíram com `functions: []` (irmãos do MESMO tipo saíram completos), o juiz não
// olhava isso e os controllers que os referenciam derrubaram o gate final com "export not found" —
// achado defs-level, que nenhuma rematerialização conserta.
void test('a usecase without a function for its own operationId is rejected', () => {
  const src = readFileSync(path.join(HERE, 'usecaseOwnerItem.ts'), 'utf8');
  // O gate é no validador do plano, antes de qualquer persistência, e roteia pelo repair existente.
  assert.match(src, /const functionNames = \(Array\.isArray\(result\?\.functions\) \? result\.functions : \[\]\)/);
  assert.match(src, /if \(!functionNames\.includes\(ownerId\)\)/);
  assert.match(src, /functions\[\] is empty — a stub usecase is forbidden/);
  // A mensagem do caso "tem funções, mas nenhuma com o nome da operação" diz quais existem.
  assert.match(src, /no function named '\$\{ownerId\}' \(declared: \$\{functionNames\.join\(', '\)\}\)/);
});

// ── o juiz (e tudo depois dele) espera o FAN-OUT, não o dispatcher ────────────
// 28/ago (102047/todo): cb-judge dependia de cb-gen-usecase, que completa no instante em que despacha.
// O juiz leu 0/9 defs de usecase e o cb-gen-http, logo atrás, leu 4/9 — 5 bffCalls e o controller
// inteiro do taskHub sumiram em silêncio (11 testes em ROUTINE_NOT_FOUND no app publicado).
void test('the judge joins on the usecase fan-out, never on the dispatcher', () => {
  const src = readFileSync(path.join(HERE, 'agentCbUsecase.ts'), 'utf8');
  const shared = readFileSync(path.join(HERE, '..', '..', 'helpers', 'cbShared.ts'), 'utf8');
  // A barreira é passada explicitamente ao enqueue; sem o último argumento volta a ser o dispatcher.
  assert.match(src, /enqueueNextInPhase\(context, step, 'judge', 'cb-judge', 'agentCbJudge', [^\n]*, 'continue', FANOUT_PLAN_ID\)/);
  assert.match(src, /const FANOUT_PLAN_ID = 'cb-usecase-fanout';/);
  // E o helper precisa honrar o override em vez de sempre usar o planId do passo corrente.
  assert.match(shared, /dependsOnPlanId\?: string,/);
  assert.match(shared, /const dep = dependsOnPlanId \|\| planIdOf\(currentStep\);/);
});

// ── derived projections (listaAssinatura 30/08): no table, no port, compose in memory ──
// Byte-a-byte from mls-102047/l4/listaAssinatura/ontology/{PetitionPublicSummary,SignatureExport}.defs.ts
// (app descartável — fixture copied in; tests must not read that tree).

const PETITION_PUBLIC_SUMMARY_L4 = {
  entityId: 'PetitionPublicSummary',
  title: 'Resumo público da petição',
  description: 'Projeção de leitura que reúne o conteúdo publicável da petição vigente e seu total agregado de assinaturas, sem identificar signatários.',
  kind: 'projection',
  ownership: 'derived',
  fields: [
    { fieldId: 'petitionId', title: 'Identificador da petição', type: 'uuid', required: true },
    { fieldId: 'publicContent', title: 'Conteúdo público da petição', type: 'json', required: true },
    { fieldId: 'signatureCount', title: 'Total de assinaturas', type: 'integer', required: true },
  ],
  storage: {
    target: 'derived',
    scope: 'none',
    notes: 'Projeção calculada sob demanda a partir da petição e das assinaturas registradas. É o limite de divulgação para a consulta pública e para o resumo administrativo, sem acesso a dados individuais.',
  },
} as const;

const SIGNATURE_EXPORT_L4 = {
  entityId: 'SignatureExport',
  title: 'Exportação de assinaturas',
  description: 'Artefato derivado que gera o arquivo assinaturas.csv com CPF, nome e data de nascimento das assinaturas registradas na petição.',
  kind: 'projection',
  ownership: 'derived',
  fields: [
    { fieldId: 'petitionId', title: 'Petição selecionada', type: 'uuid', required: true },
    { fieldId: 'fileName', title: 'Nome do arquivo', type: 'string', required: true },
    { fieldId: 'csvContent', title: 'Conteúdo do arquivo CSV', type: 'text', required: true },
  ],
  storage: {
    target: 'derived',
    scope: 'none',
    notes: 'Arquivo calculado sob demanda para download administrativo autorizado. Não é persistido porque não foi solicitado histórico, versionamento, auditoria específica ou reprocessamento de exportações.',
  },
} as const;

function derivedScanEntity(l4: typeof PETITION_PUBLIC_SUMMARY_L4 | typeof SIGNATURE_EXPORT_L4) {
  const kind = classifyEntityKind({ kind: l4.kind, ownership: l4.ownership, storage: { target: l4.storage.target } });
  assert.equal(kind, 'derived');
  return {
    entityId: l4.entityId,
    title: l4.title,
    description: l4.description,
    kind,
    ownership: l4.ownership,
    moduleName: 'listaAssinatura',
    fields: l4.fields.map(f => ({ fieldId: f.fieldId, type: f.type, required: f.required })),
    storageTarget: l4.storage.target,
    storageNotes: l4.storage.notes,
  };
}

function coreEntity(entityId: string) {
  return {
    entityId,
    title: entityId,
    kind: 'core' as const,
    ownership: 'moduleOwned',
    moduleName: 'listaAssinatura',
    fields: [{ fieldId: `${entityId.charAt(0).toLowerCase()}${entityId.slice(1)}Id`, type: 'uuid', required: true }],
  };
}

function mdmEntity(entityId: string) {
  return {
    entityId,
    title: entityId,
    kind: 'mdm' as const,
    ownership: 'moduleOwned',
    moduleName: 'listaAssinatura',
    mdmType: `listaAssinatura.${entityId}`,
    idField: `${entityId.charAt(0).toLowerCase()}${entityId.slice(1)}Id`,
    fields: [{ fieldId: `${entityId.charAt(0).toLowerCase()}${entityId.slice(1)}Id`, type: 'uuid', required: true }],
  };
}

function owner(partial: { id: string; entity: string; reads: string[]; writes?: string[] }) {
  return {
    kind: 'operation' as const,
    id: partial.id,
    pageId: '',
    commandName: '',
    bffName: '',
    title: partial.id,
    entity: partial.entity,
    opKind: 'view',
    actors: [],
    reads: partial.reads,
    writes: partial.writes ?? [],
    rulesApplied: [],
    inputs: [],
    contextResolution: [],
    acceptanceAssertions: [],
    todoStatus: 'toCreate',
    statusBackend: 'toCreate',
    inlineStatusBackend: '',
    moduleName: 'listaAssinatura',
  };
}

function aggregate(rootEntity: string) {
  return { aggregateId: rootEntity, rootEntity, embeddedMembers: [] as string[], events: [] as string[], mdmRefs: [] as string[] };
}

function scanOf(entities: object[], owners: object[], aggregates: object[]) {
  return { entities, owners, aggregates, events: [], project: 102047, moduleNames: ['listaAssinatura'], relationships: [], workspaces: [], actors: [], siteMaps: {}, lifecycles: [], warnings: [] } as any;
}

void test('derived projection in reads goes to derivedRefs, never ports or mdmRefs', () => {
  const exportEntity = derivedScanEntity(SIGNATURE_EXPORT_L4);
  const petition = coreEntity('Petition');
  const signature = coreEntity('PetitionSignature');
  const o = owner({
    id: 'downloadSignaturesCsv',
    entity: 'Petition',
    reads: ['Petition', 'PetitionSignature', 'SignatureExport'],
  });
  const scan = scanOf([petition, signature, exportEntity], [o], [aggregate('Petition'), aggregate('PetitionSignature')]);
  const item = buildOwnerItem(o as any, deriveMaps(scan), scan.lifecycles);
  assert.ok(Array.isArray(item.derivedRefs), 'derivedRefs must be present');
  assert.deepEqual(item.derivedRefs.map((r: { entityId: string }) => r.entityId), ['SignatureExport']);
  assert.equal(item.derivedRefs[0].description, SIGNATURE_EXPORT_L4.description);
  assert.equal(item.derivedRefs[0].notes, SIGNATURE_EXPORT_L4.storage.notes);
  assert.ok(!item.ports.includes('SignatureExport'));
  assert.ok(!item.mdmRefs.includes('SignatureExport'));
  assert.ok(item.ports.includes('Petition'));
  assert.ok('SignatureExport' in item.entityFields);
  assert.equal(Object.prototype.hasOwnProperty.call(item.derivedRefs[0], 'derivation'), false,
    'older l4 without derivation must keep the same derivedRefs shape');
});

void test('derivedRefs carries derivation and folds the source into ports when the l4 declared the account', () => {
  const derivation = {
    from: 'PetitionSignature',
    filter: 'status = valid',
    aggregate: [
      { fieldId: 'petitionId', op: 'groupKey', sourceField: 'petitionId' },
      { fieldId: 'validSignatureCount', op: 'count' },
    ],
  };
  const counter = {
    entityId: 'PetitionSignatureCounter',
    title: 'Contador de assinaturas',
    description: 'Total de assinaturas válidas da petição.',
    kind: 'derived' as const,
    ownership: 'derived',
    moduleName: 'listaAssinatura',
    fields: [
      { fieldId: 'petitionId', type: 'uuid', required: true },
      { fieldId: 'validSignatureCount', type: 'integer', required: true },
    ],
    storageTarget: 'derived',
    storageNotes: 'Calculado sob demanda.',
    derivation,
  };
  const signature = coreEntity('PetitionSignature');
  const o = owner({
    id: 'viewPetitionSignatureCounter',
    entity: 'PetitionSignatureCounter',
    reads: ['PetitionSignatureCounter'],
  });
  const scan = scanOf([counter, signature], [o], [aggregate('PetitionSignature')]);
  const item = buildOwnerItem(o as any, deriveMaps(scan), scan.lifecycles);
  assert.ok(Array.isArray(item.derivedRefs));
  assert.deepEqual(item.derivedRefs.map((r: { entityId: string }) => r.entityId), ['PetitionSignatureCounter']);
  assert.deepEqual(item.derivedRefs[0].derivation, derivation);
  assert.ok(item.ports.includes('PetitionSignature'), 'derivation.from must be reachable as a port');
  assert.ok(!item.ports.includes('PetitionSignatureCounter'));
  assert.ok('PetitionSignature' in item.entityFields);
  assert.equal(JSON.stringify(item).includes('"derivation"'), true);
});

void test('module without derived entities omits the derivedRefs key', () => {
  const petition = coreEntity('Petition');
  const o = owner({ id: 'getPetition', entity: 'Petition', reads: ['Petition'] });
  const scan = scanOf([petition], [o], [aggregate('Petition')]);
  const item = buildOwnerItem(o as any, deriveMaps(scan), scan.lifecycles);
  assert.equal(Object.prototype.hasOwnProperty.call(item, 'derivedRefs'), false);
  assert.ok(!JSON.stringify(item).includes('derivedRefs'));
});

void test('unknown port that is a derived projection teaches how to compose it', () => {
  const exportEntity = derivedScanEntity(SIGNATURE_EXPORT_L4);
  const petition = coreEntity('Petition');
  const o = owner({ id: 'downloadSignaturesCsv', entity: 'Petition', reads: ['Petition', 'SignatureExport'] });
  const scan = scanOf([petition, exportEntity], [o], [aggregate('Petition')]);
  const issues = validateUsecasePlan({
    usecaseId: 'downloadSignaturesCsv',
    ports: ['SignatureExport'],
    functions: [{ functionName: 'downloadSignaturesCsv', input: [], output: [] }],
  }, scan, 'downloadSignaturesCsv');
  assert.ok(issues.some((issue: string) => /derived projection/.test(issue) && /compose SignatureExport/.test(issue) && /ofEntity/.test(issue)), issues.join('\n'));
  assert.ok(!issues.some((issue: string) => issue === "usecase downloadSignaturesCsv: unknown port 'SignatureExport'"), issues.join('\n'));

  const generic = validateUsecasePlan({
    usecaseId: 'downloadSignaturesCsv',
    ports: ['NotAnEntityAtAll'],
    functions: [{ functionName: 'downloadSignaturesCsv', input: [], output: [] }],
  }, scan, 'downloadSignaturesCsv');
  assert.ok(generic.includes("usecase downloadSignaturesCsv: unknown port 'NotAnEntityAtAll'"), generic.join('\n'));
  assert.ok(!generic.some((issue: string) => /derived projection/.test(issue)), generic.join('\n'));
});

void test('unknown port that is master data teaches ctx.mdm', () => {
  const person = mdmEntity('Person');
  const petition = coreEntity('Petition');
  const o = owner({ id: 'createSignatory', entity: 'Petition', reads: ['Petition', 'Person'] });
  const scan = scanOf([petition, person], [o], [aggregate('Petition')]);
  const issues = validateUsecasePlan({
    usecaseId: 'createSignatory',
    ports: ['Person'],
    functions: [{ functionName: 'createSignatory', input: [], output: [] }],
  }, scan, 'createSignatory');
  assert.ok(issues.some((issue: string) => /master data/.test(issue) && /ctx\.mdm/.test(issue)), issues.join('\n'));
});

void test('ofEntity pointing at a derived projection on output fields is valid', () => {
  const exportEntity = derivedScanEntity(SIGNATURE_EXPORT_L4);
  const petition = coreEntity('Petition');
  const o = owner({ id: 'downloadSignaturesCsv', entity: 'Petition', reads: ['Petition', 'SignatureExport'] });
  const scan = scanOf([petition, exportEntity], [o], [aggregate('Petition')]);
  const issues = validateUsecasePlan({
    usecaseId: 'downloadSignaturesCsv',
    ports: ['Petition'],
    functions: [{
      functionName: 'downloadSignaturesCsv',
      input: [{ name: 'petitionId', type: 'string', required: true, ofEntity: 'Petition' }],
      output: [
        { name: 'fileName', type: 'string', ofEntity: 'SignatureExport' },
        { name: 'csvContent', type: 'string', ofEntity: 'SignatureExport' },
      ],
    }],
  }, scan, 'downloadSignaturesCsv');
  assert.ok(!issues.some((issue: string) => /unknown ofEntity/.test(issue)), issues.join('\n'));
  assert.equal(issues.length, 0, issues.join('\n'));
});

void test('prompt.md teaches derivedRefs next to mdmRefs and keeps ports non-empty', () => {
  const prompt = readFileSync(path.join(HERE, 'prompt.md'), 'utf8');
  assert.match(prompt, /Entities in "derivedRefs" are computed projections/);
  assert.match(prompt, /Never put a derivedRef in ports, and never resolveRepository it/);
  assert.match(prompt, /When a derivedRef carries `derivation`/);
  assert.match(prompt, /When `derivation` is absent/);
  assert.match(prompt, /ports must NOT be empty/);
  assert.match(prompt, /Entities in "mdmRefs"/);
  const mdmAt = prompt.indexOf('Entities in "mdmRefs"');
  const derivedAt = prompt.indexOf('Entities in "derivedRefs"');
  assert.ok(mdmAt >= 0 && derivedAt > mdmAt, 'derivedRefs paragraph must sit after mdmRefs');
  const skill = readFileSync(path.join(HERE, '..', '..', 'skills', 'applicationUsecase.md'), 'utf8');
  assert.match(skill, /When a derivedRef carries `derivation`/);
  assert.match(skill, /When `derivation` is absent/);
});

