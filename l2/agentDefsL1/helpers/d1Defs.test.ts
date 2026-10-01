/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Defs.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { fileKey, installStudio } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import {
  D1_ARTIFACT_TYPES,
  D1_DEFINITION_SCHEMA,
  D1_FORECAST_CORE,
  D1_MEASURED_PUBLISH,
  accessAnchorIssues,
  accessScopeIssues,
  adapterLinkIssues,
  authorityGrantIssues,
  definitionIssues,
  derivedFieldIssues,
  domainImportIssues,
  integrationMechanismIssues,
  pendingDefinition,
  recordFieldIssues,
  seedScenarioIssues,
  typeDataSchema,
  valueObjectIssues,
} from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import {
  D1_FIELD_READERS,
  catalogIssues,
  coverageReport,
  cycleIssues,
  resolveCatalogRefs,
  skillPaths,
} from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import {
  artifactFile,
  parseRendered,
  persistDefinitions,
  renderDefinition,
} from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import {
  AGENDA_ENTITY_STORAGE,
  agendaCatalog,
} from '/_102021_/l2/agentDefsL1/examples/agendaClinicaCatalog.js';
import type { D1MeasuredPlan } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SCHEMA_FILES = ['definition-v1.schema.json', 'pipeline-item-v1.schema.json', 'catalog-v1.schema.json'];

/**
 * Inlined from the deleted `agentChangeBackend/helpers/cbPlanner.ts` (p4_15): this test is the only
 * surviving caller, just to lint the assembled tool schema below. The status/result/questions/trace
 * envelope and the strict-provider $defs hoisting are copied verbatim.
 */
function createPlannerToolSchema(toolName: string, description: string, resultSchema: Record<string, unknown>): mls.msg.LLMTool {
  const resultBody: Record<string, unknown> = { ...resultSchema };
  const hoistedDefs = resultBody.$defs;
  delete resultBody.$defs;
  delete resultBody.$id;
  const parameters: Record<string, unknown> = {
    type: 'object',
    additionalProperties: false,
    required: ['status', 'result', 'questions', 'trace'],
    properties: {
      status: { type: 'string', enum: ['ok', 'needs_input', 'failed'] },
      result: resultBody,
      questions: { type: 'array', items: { type: 'string' } },
      trace: { type: 'array', items: { type: 'string' } },
    },
  };
  if (hoistedDefs && typeof hoistedDefs === 'object') parameters.$defs = hoistedDefs;
  return {
    type: 'function',
    function: { name: toolName, description, parameters },
  } as unknown as mls.msg.LLMTool;
}

function loadAgendaPlan(): D1MeasuredPlan {
  return JSON.parse(readFileSync(path.join(ROOT, 'examples/agendaClinicaPlan.json'), 'utf8')) as D1MeasuredPlan;
}

function readSchema(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(ROOT, 'schemas', name), 'utf8')) as Record<string, unknown>;
}

function knownSkills(): string[] {
  return readdirSync(path.join(ROOT, 'skills'))
    .filter(name => name.endsWith('.md'))
    .map(name => `_102021_/l2/agentDefsL1/skills/${name}`);
}

function walkProperties(node: unknown, pathName: string, root: unknown, out: string[]): void {
  let current = node;
  if (current && typeof current === 'object' && !Array.isArray(current)) {
    const ref = (current as { $ref?: unknown }).$ref;
    if (typeof ref === 'string' && ref.startsWith('#/')) current = resolveRef(root, ref);
  }
  if (!current || typeof current !== 'object' || Array.isArray(current)) return;
  const record = current as Record<string, unknown>;
  if (record.type === 'object' && record.properties && typeof record.properties === 'object') {
    for (const [key, child] of Object.entries(record.properties as Record<string, unknown>)) {
      const next = pathName ? `${pathName}.${key}` : key;
      out.push(next);
      walkProperties(child, next, root, out);
    }
  }
  if (record.items) walkProperties(record.items, pathName, root, out);
}

function resolveRef(root: unknown, ref: string): unknown {
  let current = root;
  for (const part of ref.slice(2).split('/')) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function assertObjectsClosed(node: unknown, pathName: string): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item, index) => assertObjectsClosed(item, `${pathName}/${index}`));
    return;
  }
  const record = node as Record<string, unknown>;
  if (record.type === 'object') assert.equal(record.additionalProperties, false, pathName);
  for (const [key, child] of Object.entries(record)) {
    if (child && typeof child === 'object') assertObjectsClosed(child, `${pathName}/${key}`);
  }
}

void test('definition and pipeline schemas are closed and have no materializer', () => {
  for (const name of SCHEMA_FILES) assertObjectsClosed(readSchema(name), name);
  const definition = readSchema('definition-v1.schema.json');
  const properties = definition.properties as Record<string, unknown>;
  assert.deepEqual(definition.required, ['schemaVersion', 'artifactType', 'artifactId', 'moduleName', 'status', 'dependencies', 'data']);
  const status = properties.status as { enum: string[] };
  assert.deepEqual(status.enum, ['pending', 'generated', 'blocked', 'failed']);
  const artifactType = properties.artifactType as { enum: string[] };
  assert.deepEqual(artifactType.enum, [...D1_ARTIFACT_TYPES]);
  const pipeline = readSchema('pipeline-item-v1.schema.json');
  const pipelineProperties = pipeline.properties as Record<string, unknown>;
  assert.equal(Object.hasOwn(pipelineProperties, 'agent'), false);
  assert.equal((definition.properties as { schemaVersion: { const: string } }).schemaVersion.const, D1_DEFINITION_SCHEMA);
});

void test('every schema field names a reader', () => {
  const definition = readSchema('definition-v1.schema.json');
  const paths: string[] = [];
  walkProperties(definition, 'definition', definition, paths);
  const defs = definition.$defs as Record<string, unknown>;
  for (const type of D1_ARTIFACT_TYPES) walkProperties(defs[type], type, definition, paths);
  walkProperties(readSchema('pipeline-item-v1.schema.json'), 'pipelineItem', readSchema('pipeline-item-v1.schema.json'), paths);
  const catalog = readSchema('catalog-v1.schema.json');
  walkProperties(catalog, 'catalog', catalog, paths);
  const readers = D1_FIELD_READERS as Record<string, string>;
  for (const field of paths) assert.equal(typeof readers[field], 'string', field);
  for (const field of Object.keys(readers)) assert.equal(paths.includes(field), true, field);
});

void test('assembled artifact tool schemas pass the strict provider lint', () => {
  const definition = readSchema('definition-v1.schema.json');
  for (const type of D1_ARTIFACT_TYPES) {
    const tool = createPlannerToolSchema(`submit_${type}`, `Submit ${type} data.`, typeDataSchema(definition, type));
    const parameters = (tool as { function: { parameters: unknown } }).function.parameters;
    const errors = lintToolSchema(JSON.stringify(parameters));
    assert.equal(errors, null, `${type}: ${errors?.join(' | ')}`);
  }
});

void test('agendaClinica catalog records the measured plan and does not turn the forecast into a file count', () => {
  const plan = loadAgendaPlan();
  const catalog = agendaCatalog(plan);
  const skills = knownSkills();
  assert.deepEqual(catalogIssues(catalog, skills), []);
  assert.equal(plan.selection.pages.flatMap(page => page.routes).length, 26);
  assert.equal(plan.files.length, 32);
  assert.equal(plan.files.filter(file => file.artifactType === 'httpController').length, 6);
  const coverage = coverageReport(catalog, plan, AGENDA_ENTITY_STORAGE);
  assert.deepEqual(coverage.gaps, []);
  assert.equal(coverage.measured.httpController, 6);
  assert.equal(coverage.measured.usecase, 13);
  assert.equal(coverage.measured.domainEntity, 5);
  assert.equal(coverage.measuredCore, 27);
  assert.equal(coverage.forecastCore, D1_FORECAST_CORE.count);
  assert.equal(coverage.forecastMatchesMeasured, false);
  assert.equal(Object.hasOwn(coverage, 'generatedFileCount'), false);
  assert.equal(coverage.auxiliaries.length, 5);
  assert.equal(coverage.absences.length, 1);
  assert.equal(coverage.absences[0]?.artifactType, 'valueObject');
  assert.deepEqual(
    catalog.items.filter(item => item.type === 'usecase').map(item => item.id.split('/').pop()).sort(),
    plan.selection.usecases.map(usecase => usecase.usecaseId).sort(),
  );
  assert.deepEqual(
    catalog.items.flatMap(item => item.routes || []).sort(),
    plan.selection.pages.flatMap(page => page.routes).sort(),
  );
  assert.equal(catalog.items.some(item => item.outputAvailability !== 'future'), false);
  assert.equal(JSON.stringify(catalog).includes('agentCbMaterialize'), false);
  assert.equal(JSON.stringify(catalog).includes('.d.ts'), false);
  for (const item of catalog.items) {
    assert.deepEqual(item.skills, skillPaths(item.type));
    for (const skill of item.skills) assert.equal(existsSync(path.join(ROOT, 'skills', path.basename(skill))), true, skill);
  }
});

void test('refs separate a future output from a missing contract and reject an uncontracted declaration', () => {
  const plan = loadAgendaPlan();
  const catalog = agendaCatalog(plan);
  const controller = catalog.items.find(item => item.type === 'httpController');
  assert.ok(controller);
  const broken = {
    ...controller,
    dependsFiles: [...controller.dependsFiles, '_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.d.ts', 'l2/agendaClinica/web/contracts/consultas_profissional.defs.ts'],
  };
  const findings = resolveCatalogRefs({ ...catalog, items: catalog.items.map(item => item.id === broken.id ? broken : item) });
  assert.equal(findings.some(item => item.kind === 'futureOutput' && item.path.endsWith('.ts') && !item.path.endsWith('.defs.ts')), true);
  assert.equal(findings.some(item => item.kind === 'missingInput' && item.path === 'l2/agendaClinica/web/contracts/consultas_profissional.defs.ts'), true);
  assert.equal(findings.some(item => item.kind === 'uncontractedDeclaration' && item.path.endsWith('.d.ts')), true);
});


void test('the gate reports cycle, duplicate id, route and output, orphan dependency and a domain import', () => {
  const catalog = agendaCatalog(loadAgendaPlan());
  const entity = catalog.items.find(item => item.id.endsWith('/domainEntity/Consulta'));
  const usecase = catalog.items.find(item => item.id.endsWith('/usecase/createConsulta'));
  assert.ok(entity && usecase);
  entity.dependsOn = [usecase.id];
  assert.equal(cycleIssues(catalog.items).some(issue => issue.startsWith('Cycle:')), true);
  const skills = knownSkills();
  const cycled = catalogIssues(catalog, skills);
  assert.equal(cycled.some(issue => issue.includes('must not depend on usecase')), true);

  const fresh = agendaCatalog(loadAgendaPlan());
  fresh.items[0].dependsOn = ['102047/agendaClinica/usecase/missing'];
  assert.equal(catalogIssues(fresh, skills).some(issue => issue.startsWith('Orphan dependency')), true);

  const duplicated = agendaCatalog(loadAgendaPlan());
  duplicated.items[1].id = duplicated.items[0].id;
  duplicated.items[1].outputPath = duplicated.items[0].outputPath;
  const duplicateIssues = catalogIssues(duplicated, skills);
  assert.equal(duplicateIssues.some(issue => issue.startsWith('Duplicate id')), true);
  assert.equal(duplicateIssues.some(issue => issue.startsWith('Duplicate output')), true);

  const routes = agendaCatalog(loadAgendaPlan());
  const controllers = routes.items.filter(item => item.type === 'httpController');
  controllers[1].routes = [...(controllers[0].routes || [])];
  assert.equal(catalogIssues(routes, skills).some(issue => issue.startsWith('Duplicate route')), true);

  const external = pendingDefinition('domainEntity', 'Consulta', 'agendaClinica', {
    entityId: 'Consulta',
    storageTarget: 'moduleDatabase',
    fields: [],
    lifecycle: { states: [], transitions: [] },
    invariants: [],
    imports: ['l1/agendaClinica/layer_1_external/adapters/persistence/consulta.defs.ts'],
  });
  assert.equal(definitionIssues(external).some(issue => issue.includes('outside the domain')), true);
  assert.equal(domainImportIssues('agendaClinica', ['l1/agendaClinica/layer_1_external/adapters/persistence/consulta.defs.ts']).length, 1);
});

void test('unknown fields, draft status and an empty value object are refused without being stripped', () => {
  const draft = { schemaVersion: D1_DEFINITION_SCHEMA, artifactType: 'domainEntity', artifactId: 'Consulta', moduleName: 'agendaClinica', status: 'draft', data: {} };
  const issues = definitionIssues(draft);
  assert.equal(issues.some(issue => issue.includes('definition.status is invalid')), true);
  assert.equal((draft as { status?: string }).status, 'draft');
  assert.equal(valueObjectIssues({ valueObjectId: 'Slot', fields: [], referencedBy: [] }).some(issue => issue.includes('referencedBy')), true);
  assert.equal(recordFieldIssues({ fields: [{ name: 'patientId', type: 'record' }] }).some(issue => issue.includes('ref')), true);
  assert.equal(seedScenarioIssues({
    seedId: 'seeds',
    scenarios: [{ scenarioId: 'people', tableId: 'consulta', constraints: ['password:secret'] }],
  }).some(issue => issue.includes('constraint')), true);
});

void test('an anchor outside entity refs is kept as a finding', () => {
  const scope = {
    scopeId: 'accessScope',
    grants: [{
      grantId: 'ownDesk',
      actorRef: 'clerk',
      anchorEntity: 'Other',
      entityRefs: ['Item'],
      disclosure: 'fullRecord',
      scopeMode: 'own',
      session: 'verified',
      path: [{
        entityId: 'Item',
        steps: [{ relationshipId: 'r1', from: 'Item', to: 'Other', field: 'ownerId' }],
        pending: '',
      }],
      pending: '',
    }],
  };
  assert.deepEqual(accessScopeIssues(scope), []);
  const anchors = accessAnchorIssues(scope);
  assert.equal(anchors.length, 1);
  assert.match(anchors[0] || '', /ownDesk/);
  assert.deepEqual(authorityGrantIssues({ mapId: 'authorityMap', entries: [{ grantId: 'ownDesk', actorRef: 'clerk' }] }, scope), []);
});

void test('naming the measured queue is an incompatible mechanism, not a missing API', () => {
  const data = {
    integrationId: 'outbound',
    events: [{ eventId: 'itemSaved', on: 'Item.create', entityId: 'Item', mechanism: '', consumer: 'createItem' }],
  };
  assert.equal(integrationMechanismIssues(data).length, 1);
  data.events[0].mechanism = D1_MEASURED_PUBLISH.symbol;
  (data.events[0] as { mechanismRef?: string }).mechanismRef = D1_MEASURED_PUBLISH.path;
  const named = integrationMechanismIssues(data);
  assert.equal(named.some(issue => issue.startsWith('MECHANISM_INCOMPATIBLE:') && issue.includes('itemSaved')), true);
  assert.equal(named.some(issue => issue.startsWith('FICTIONAL_API:')), false);
  assert.equal(named.some(issue => issue.startsWith('MECHANISM_REF:')), false);

  (data.events[0] as { mechanismRef?: string }).mechanismRef = 'mls-102034/l1/other.ts';
  const wrong = integrationMechanismIssues(data);
  assert.equal(wrong.some(issue => issue.startsWith('MECHANISM_REF:')), true);
  assert.equal(wrong.some(issue => issue.startsWith('MECHANISM_INCOMPATIBLE:')), true);
  assert.equal(wrong.some(issue => issue.startsWith('FICTIONAL_API:')), false);

  data.events[0].mechanism = 'ctx.publishEvent';
  delete (data.events[0] as { mechanismRef?: string }).mechanismRef;
  const fictional = integrationMechanismIssues(data);
  assert.equal(fictional.some(issue => issue.startsWith('FICTIONAL_API:')), true);
  assert.equal(fictional.some(issue => issue.startsWith('MECHANISM_INCOMPATIBLE:')), false);
});

void test('a derived field is rejected as a usecase input', () => {
  const entity = { fields: [{ name: 'id', type: 'string', derived: true }] };
  const usecase = { functions: [{ input: [{ name: 'id' }] }] };
  assert.equal(derivedFieldIssues(entity, [usecase]).some(issue => issue.includes('Derived field id')), true);
});

void test('a duplicate def path writes nothing', async () => {
  const host = installStudio(102047);
  const definition = pendingDefinition('repositoryPort', 'itemRepository', 'ledgerDesk', {
    entityId: 'Item',
    interfaceName: 'ItemRepository',
    methods: [{ name: 'save', params: ['record'], returns: 'void' }],
  });
  const defPath = '_102047_/l1/ledgerDesk/layer_2_application/ports/itemRepository.defs.ts';
  const refused = await persistDefinitions(102047, [
    { definition, defPath },
    { definition, defPath },
  ]);
  assert.equal(refused.written.length, 0);
  assert.equal(host.writes.length, 0);
  assert.equal(refused.issues.some(issue => issue.startsWith('Duplicate defPath')), true);

  const stored = await persistDefinitions(102047, [{ definition, defPath }]);
  assert.deepEqual(stored.issues, []);
  assert.equal(stored.written.length, 1);
  const sample = stored.written[0];
  assert.ok(sample);
  assert.deepEqual(artifactFile(102047, defPath), sample);
  assert.equal(fileKey(artifactFile(102047, defPath)!), fileKey(sample));
  const rendered = renderDefinition(definition, defPath);
  assert.equal('issues' in rendered, false);
  if ('source' in rendered) {
    const parsed = parseRendered(host.files[fileKey(sample)]?.content || '');
    assert.deepEqual(parsed?.definition, definition);
  }
});
