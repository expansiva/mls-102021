/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Defs.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { parseDefsSource } from '/_102021_/l2/agentChangeBackend/helpers/cbDefsSource.js';
import { createPlannerToolSchema } from '/_102021_/l2/agentChangeBackend/helpers/cbPlanner.js';
import { readL1Inventory } from '/_102021_/l2/agentPlannerL1/helpers/l1Inventory.js';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { fileKey, installStudio } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import {
  D1_ARTIFACT_TYPES,
  D1_DEFINITION_SCHEMA,
  D1_FORECAST_CORE,
  accessAnchorIssues,
  adapterLinkIssues,
  authorityGrantIssues,
  definitionIssues,
  derivedFieldIssues,
  domainImportIssues,
  integrationMechanismIssues,
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
import {
  agendaExamples,
  listConsultaWithContracts,
} from '/_102021_/l2/agentDefsL1/examples/agendaClinicaExamples.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SCHEMA_FILES = ['definition-v1.schema.json', 'pipeline-item-v1.schema.json', 'catalog-v1.schema.json'];

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

function syntaxIssues(source: string, fileName: string): string[] {
  const transpiled = ts.transpileModule(source, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: {
      strict: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  });
  return (transpiled.diagnostics ?? [])
    .filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error)
    .map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
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

void test('definition and pipeline schemas are closed and have no draft status or materializer', () => {
  for (const name of SCHEMA_FILES) assertObjectsClosed(readSchema(name), name);
  const definition = readSchema('definition-v1.schema.json');
  const properties = definition.properties as Record<string, unknown>;
  assert.deepEqual(definition.required, ['schemaVersion', 'artifactType', 'artifactId', 'moduleName', 'data']);
  assert.equal(Object.hasOwn(properties, 'status'), false);
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
  assert.equal(plan.selection.routes.length, 26);
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
    plan.selection.routes.map(route => route.route).sort(),
  );
  assert.equal(catalog.items.some(item => item.outputAvailability !== 'future'), false);
  assert.equal(JSON.stringify(catalog).includes('agentCbMaterialize'), false);
  assert.equal(JSON.stringify(catalog).includes('.d.ts'), false);
  for (const item of catalog.items) {
    assert.deepEqual(item.skills, skillPaths(item.type));
    for (const skill of item.skills) assert.equal(existsSync(path.join(ROOT, 'skills', path.basename(skill))), true, skill);
  }
});

void test('examples render, parse without eval and typecheck', () => {
  const plan = loadAgendaPlan();
  const examples = agendaExamples(agendaCatalog(plan), plan);
  assert.equal(examples.length, 11);
  for (const example of examples) {
    const rendered = renderDefinition(example.definition, example.pipeline);
    assert.equal('issues' in rendered, false, 'issues' in rendered ? rendered.issues.join('\n') : '');
    if (!('source' in rendered)) continue;
    const parsed = parseRendered(rendered.source);
    assert.ok(parsed);
    assert.deepEqual(parsed?.definition, example.definition);
    assert.deepEqual(parsed?.pipeline, example.pipeline);
    assert.deepEqual(parseDefsSource(rendered.source), example.definition);
    assert.deepEqual(syntaxIssues(rendered.source, `${example.definition.artifactId}.defs.ts`), []);
    assert.equal(rendered.source.includes('"status":'), false);
    assert.equal(rendered.source.includes('agentCbMaterialize'), false);
  }
});

void test('listConsulta keeps one inventory projection and per-route outputs', () => {
  const plan = loadAgendaPlan();
  const examples = agendaExamples(agendaCatalog(plan), plan);
  const list = examples.find(example => example.definition.artifactId === 'listConsulta');
  assert.ok(list);
  const data = list?.definition.data as {
    functions: Array<{ functionName: string; output: Array<{ name: string }> }>;
    routeProjections: Array<{ route: string; projection: string; outputFields: string[] }>;
  };
  assert.equal(data.functions.length, 1);
  assert.equal(data.functions[0]?.functionName, 'listConsulta');
  assert.deepEqual(data.functions[0]?.output.map(field => field.name), ['id', 'status', 'attendanceNote']);
  const professional = data.routeProjections.find(item => item.route === 'agendaClinica.consultas_profissional.qryListConsulta');
  const reception = data.routeProjections.find(item => item.route === 'agendaClinica.consultas_recepcionista.qryListConsulta');
  assert.deepEqual(professional?.outputFields, ['id', 'status', 'attendanceNote']);
  assert.deepEqual(reception?.outputFields, ['id', 'status']);
  assert.equal(reception?.outputFields.includes('attendanceNote'), false);
  const unresolved = data.routeProjections.filter(item => item.projection === 'unresolved');
  assert.ok(unresolved.length >= 1);
  for (const item of unresolved) assert.deepEqual(item.outputFields, []);
});

void test('refs separate a future output from a missing contract and reject an uncontracted declaration', () => {
  const plan = loadAgendaPlan();
  const catalog = agendaCatalog(plan);
  const examples = agendaExamples(catalog, plan);
  const list = examples.find(example => example.definition.artifactId === 'listConsulta');
  assert.ok(list);
  const withContracts = listConsultaWithContracts(list!);
  const items = catalog.items.map(item => item.id === withContracts.pipeline[0]?.id ? withContracts.pipeline[0] : item);
  const broken = {
    ...items[0],
    dependsFiles: [...items[0].dependsFiles, '_102047_/l1/agendaClinica/layer_3_domain/entities/consulta.d.ts'],
  };
  const findings = resolveCatalogRefs({ ...catalog, items: [broken, ...items.slice(1)] });
  assert.equal(findings.some(item => item.kind === 'futureOutput' && item.path.endsWith('/listConsulta.ts')), true);
  assert.equal(findings.some(item => item.kind === 'plannedDef' && item.path.endsWith('/consulta.defs.ts')), true);
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

  const external = structuredClone(agendaExamples(agendaCatalog(loadAgendaPlan()), loadAgendaPlan())[0].definition);
  (external.data as { imports: string[] }).imports = ['l1/agendaClinica/layer_1_external/adapters/persistence/consulta.defs.ts'];
  assert.equal(definitionIssues(external).some(issue => issue.includes('outside the domain')), true);
  assert.equal(domainImportIssues('agendaClinica', ['l1/agendaClinica/layer_1_external/adapters/persistence/consulta.defs.ts']).length, 1);
});

void test('unknown fields, draft status and an empty value object are refused without being stripped', () => {
  const draft = { schemaVersion: D1_DEFINITION_SCHEMA, artifactType: 'domainEntity', artifactId: 'Consulta', moduleName: 'agendaClinica', status: 'draft', data: {} };
  const issues = definitionIssues(draft);
  assert.equal(issues.some(issue => issue.includes('Unknown field definition.status')), true);
  assert.equal((draft as { status?: string }).status, 'draft');
  assert.equal(valueObjectIssues({ valueObjectId: 'Slot', fields: [], referencedBy: [] }).some(issue => issue.includes('referencedBy')), true);
  assert.equal(recordFieldIssues({ fields: [{ name: 'patientId', type: 'record' }] }).some(issue => issue.includes('ref')), true);
  assert.equal(seedScenarioIssues({
    seedId: 'seeds',
    scenarios: [{ scenarioId: 'people', tableId: 'consulta', constraints: ['password:secret'] }],
  }).some(issue => issue.includes('constraint')), true);
});

void test('access keeps the contradictory anchor and integration keeps unbound events', () => {
  const examples = agendaExamples(agendaCatalog(loadAgendaPlan()), loadAgendaPlan());
  const scope = examples.find(example => example.definition.artifactType === 'accessScope');
  const authority = examples.find(example => example.definition.artifactType === 'authorityMap');
  const integration = examples.find(example => example.definition.artifactType === 'integrationOutbound');
  const adapter = examples.find(example => example.definition.artifactType === 'repositoryAdapter');
  const port = examples.find(example => example.definition.artifactType === 'repositoryPort');
  const table = examples.find(example => example.definition.artifactType === 'table');
  assert.ok(scope && authority && integration && adapter && port && table);
  const anchors = accessAnchorIssues(scope?.definition.data);
  assert.equal(anchors.length, 1);
  assert.match(anchors[0] || '', /profissionalAgendaDiaria/);
  assert.deepEqual(authorityGrantIssues(authority?.definition.data, scope?.definition.data), []);
  assert.deepEqual(adapterLinkIssues(adapter?.definition, port?.definition, table?.definition), []);
  const events = (integration?.definition.data as { events: unknown[] }).events;
  const unbound = integrationMechanismIssues(integration?.definition.data);
  assert.equal(events.length, 3);
  assert.equal(unbound.length, 3);
  assert.equal(definitionIssues(integration?.definition).length, 0);
});

void test('a derived field is rejected as a usecase input', () => {
  const examples = agendaExamples(agendaCatalog(loadAgendaPlan()), loadAgendaPlan());
  const entity = examples.find(example => example.definition.artifactType === 'domainEntity')?.definition.data;
  const usecase = structuredClone(examples.find(example => example.definition.artifactId === 'listConsulta')?.definition.data) as {
    functions: Array<{ input: Array<{ name: string }> }>;
  };
  usecase.functions[0].input.push({ name: 'id' });
  assert.equal(derivedFieldIssues(entity, [usecase]).some(issue => issue.includes('Derived field id')), true);
});

void test('round-trip through the real inventory, and a collision writes nothing', async () => {
  const host = installStudio(102047);
  const examples = agendaExamples(agendaCatalog(loadAgendaPlan()), loadAgendaPlan());
  const port = examples.find(example => example.definition.artifactType === 'repositoryPort');
  assert.ok(port);
  const refused = await persistDefinitions(102047, [port!, port!]);
  assert.equal(refused.written.length, 0);
  assert.equal(host.writes.length, 0);
  assert.equal(refused.issues.some(issue => issue.startsWith('Duplicate defPath')), true);

  const stored = await persistDefinitions(102047, examples);
  assert.deepEqual(stored.issues, []);
  assert.equal(stored.written.length, examples.length);
  const sample = stored.written[0];
  assert.ok(sample);
  assert.deepEqual(artifactFile(102047, examples[0].pipeline[0].defPath), sample);
  assert.equal(fileKey(artifactFile(102047, examples[0].pipeline[0].defPath)!), fileKey(sample));

  const inventory = await readL1Inventory(102047, 'agendaClinica');
  assert.equal(inventory.present, true);
  assert.deepEqual(inventory.ports.map(item => item.portId), ['ConsultaRepository']);
  assert.equal(inventory.ports[0]?.entity, 'Consulta');
  assert.deepEqual(inventory.tables, [{ tableId: 'consulta', entity: 'Consulta' }]);
  const list = inventory.usecases.find(item => item.usecaseId === 'listConsulta');
  assert.ok(list);
  assert.equal(list?.functions[0]?.name, 'listConsulta');
  assert.deepEqual(list?.functions[0]?.input.map(field => field.name), ['professionalId', 'scheduledAt']);
  assert.deepEqual(list?.functions[0]?.output.map(field => field.name), ['id', 'status', 'attendanceNote']);
  assert.equal(list?.functions[0]?.output.find(field => field.name === 'attendanceNote')?.fieldRef, 'Consulta.details.attendanceNote');
  assert.deepEqual(inventory.routes, [
    'agendaClinica.consultas_profissional.cmdRegistrarAtendimento',
    'agendaClinica.consultas_profissional.qryListConsulta',
  ]);
});
