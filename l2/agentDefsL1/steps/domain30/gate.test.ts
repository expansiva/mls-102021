/// <mls fileReference="_102021_/l2/agentDefsL1/steps/domain30/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  definitionIssues,
  domainImportIssues,
  type D1Field,
} from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { parseRendered, renderDefinition } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { lowerFirst, type D1InputArtifacts, type D1InputSnapshot, type D1SourceDigest } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { buildD1InputSnapshot } from '/_102021_/l2/agentDefsL1/steps/input20/gate.js';
import { parseD1Source, sha256Text } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import type { D1DomainBuild, D1DomainEntityPlan } from '/_102021_/l2/agentDefsL1/steps/domain30/contracts.js';
import { buildD1Domain, type D1DomainRequest } from '/_102021_/l2/agentDefsL1/steps/domain30/gate.js';
import {
  ambiguousRefEntity,
  cycleEntities,
  fieldCollisionEntity,
  missingRefEntity,
  moduleRulesWithCamelTwin,
  nestedEnumEntity,
  ns4Entity,
  platformRole,
  sharedCatalog,
  suffixEntities,
  timeEntity,
  timeKeptEntity,
} from '/_102021_/l2/agentDefsL1/steps/domain30/fixtures/cases.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, '../input20/fixtures/head');
const MODULE = 'agendaClinica';
const PROJECT = 102047;

interface EntityData {
  storageTarget: string;
  fields: D1Field[];
  lifecycle: {
    states: Array<{ state: string; reachedBy: string }>;
    transitions: Array<{ transitionId: string; from: string[]; to: string; by: string[]; ruleRefs: string[] }>;
  };
  invariants: string[];
  imports: string[];
}

function walk(dir: string, prefix: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(abs).isDirectory()) out.push(...walk(abs, rel));
    else out.push(rel);
  }
  return out;
}

function logical(rel: string): string {
  return rel.endsWith('.defs.txt') ? `${rel.slice(0, -4)}.ts` : rel;
}

async function loadHead(): Promise<D1InputArtifacts> {
  const sources: D1SourceDigest[] = [];
  const parsed = new Map<string, unknown>();
  for (const rel of walk(FIXTURE, '')) {
    const file = logical(rel);
    const text = readFileSync(path.join(FIXTURE, rel), 'utf8');
    const kind = file.endsWith('.defs.ts') ? 'defs' : 'json';
    const value = parseD1Source(text, kind);
    sources.push({
      path: file,
      sha256: await sha256Text(text),
      bytes: new TextEncoder().encode(text).length,
      schemaVersion: value && typeof value === 'object' && !Array.isArray(value) ? String((value as { schemaVersion?: string }).schemaVersion || '') : '',
      state: value ? 'present' : 'invalid',
    });
    parsed.set(file, value);
  }
  const journeys: Record<string, unknown> = {};
  const entities: Record<string, unknown> = {};
  for (const [file, value] of parsed) {
    if (file.includes('/journeys/') && !file.endsWith('/index.defs.ts')) journeys[path.basename(file, '.defs.ts')] = value;
    if (file.includes('/ontology/') && !file.endsWith('/index.defs.ts')) entities[path.basename(file, '.defs.ts')] = value;
  }
  const root = `l4/${MODULE}`;
  return {
    sources,
    module: parsed.get(`${root}/module.defs.ts`) ?? null,
    journeyIndex: parsed.get(`${root}/journeys/index.defs.ts`) ?? null,
    journeys,
    ontologyIndex: parsed.get(`${root}/ontology/index.defs.ts`) ?? null,
    entities,
    rules: parsed.get(`${root}/rules.defs.ts`) ?? null,
    workflows: parsed.get(`${root}/workflows.defs.ts`) ?? null,
    access: parsed.get(`${root}/access.defs.ts`) ?? null,
    integration: parsed.get(`${root}/integration.defs.ts`) ?? null,
    menu: parsed.get(`${root}/pool/l2/web/menu.json`) ?? null,
    needs: parsed.get(`${root}/pool/l1/web/needs.json`) ?? null,
    backend: parsed.get(`${root}/pool/l2/web/backend.json`) ?? null,
    effort: parsed.get(`${root}/pool/l2/web/effort.json`) ?? null,
    planner: parsed.get(`l1/${MODULE}/pipeline/pipeline.json`) ?? null,
    contracts: {},
    presentDefs: [],
  };
}

function requestFrom(entities: Record<string, unknown>, rules: unknown = { rules: {} }, catalogs: Record<string, unknown> = {}): D1DomainRequest {
  const ids = Object.keys(entities);
  return {
    project: PROJECT,
    moduleName: 'sampleModule',
    selection: {
      entities: ids,
      tables: [],
      files: ids.map(id => ({
        artifactType: 'domainEntity',
        identity: id,
        defPath: `l1/sampleModule/layer_3_domain/entities/${lowerFirst(id)}.defs.ts`,
        action: 'create',
      })),
    },
    entities,
    ontologyIndex: {
      entities: ids.map(id => ({ entityId: id, kind: (entities[id] as { kind?: string }).kind || '' })),
    },
    rules,
    catalogs,
  };
}

function dataOf(plan: D1DomainEntityPlan): EntityData {
  return plan.definition!.data as unknown as EntityData;
}

function codes(build: D1DomainBuild, severity: 'error' | 'review'): string[] {
  return build.problems.filter(problem => problem.severity === severity).map(problem => problem.code);
}

void test('Consulta keeps the unique key, four states and three named transitions', async () => {
  const artifacts = await loadHead();
  const snapshot = buildD1InputSnapshot({ project: PROJECT, moduleName: MODULE }, artifacts, null);
  const first = agendaBuild(artifacts, snapshot);
  const second = agendaBuild(artifacts, snapshot);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(first.llmCalls, 0);
  assert.equal(first.ok, true, JSON.stringify(first.problems.filter(problem => problem.severity === 'error')));
  assert.deepEqual(codes(first, 'error'), []);

  const consulta = first.entities.find(entity => entity.entityId === 'Consulta');
  assert.ok(consulta?.definition);
  const data = dataOf(consulta);
  assert.equal(data.storageTarget, 'moduleDatabase');
  assert.deepEqual(consulta.uniqueKeys, [['professionalId', 'scheduledAt']]);
  assert.deepEqual(data.invariants, ['uniqueProfessionalSchedule', 'consultationTransitionFlow']);
  assert.equal(consulta.derivedInitial, 'scheduled');
  assert.deepEqual(data.lifecycle.states, [
    { state: 'scheduled', reachedBy: 'actor' },
    { state: 'confirmed', reachedBy: 'actor' },
    { state: 'noShow', reachedBy: 'actor' },
    { state: 'attended', reachedBy: 'actor' },
  ]);
  assert.deepEqual(data.lifecycle.transitions.map(transition => transition.transitionId), [
    'confirmarConsulta',
    'registrarFalta',
    'registrarAtendimento',
  ]);
  assert.equal(data.lifecycle.transitions.some(transition => transition.transitionId === 'setStatus'), false);
  assert.deepEqual(data.lifecycle.transitions[0], {
    transitionId: 'confirmarConsulta',
    from: ['scheduled'],
    to: 'confirmed',
    by: ['recepcionista'],
    ruleRefs: ['consultationTransitionFlow'],
  });
  assert.deepEqual(data.lifecycle.transitions[2].ruleRefs, [
    'consultationTransitionFlow',
    'attendanceNoteRequired',
    'professionalOwnAppointment',
  ]);
  const placed = consulta.rules.filter(rule => rule.placement === 'application').map(rule => rule.ruleId);
  assert.deepEqual(placed, ['attendanceNoteRequired', 'professionalOwnAppointment']);
  assert.equal(data.imports.length, 0);

  const roles = first.entities.filter(entity => entity.storageTarget === 'mdm');
  assert.deepEqual(roles.map(entity => entity.entityId), ['ContatoPaciente', 'Paciente', 'Profissional', 'Recepcionista']);
  assert.equal(roles.every(entity => entity.emitsLocalPersistence === false), true);
  assert.equal(first.emit.some(part => part.definition.artifactType === 'table'), false);
  assert.equal(first.emit.some(part => part.pipeline[0].defPath.includes('/persistence/') || part.pipeline[0].defPath.includes('Repository')), false);
  for (const role of roles) {
    const invariants = (role.definition!.data as unknown as EntityData).invariants;
    assert.equal(invariants.includes('rule-foreign-namespace-refused'), false);
    assert.equal(invariants.includes('ruleForeignNamespaceRefused'), false);
    assert.equal(role.rules.some(rule => rule.ruleId === 'rule-foreign-namespace-refused' && rule.owner === 'platform' && rule.placement === 'platform'), true);
    assert.equal(role.rules.some(rule => rule.ruleId === 'ruleForeignNamespaceRefused'), false);
  }

  const consultaFields = data.fields;
  assert.equal(consultaFields.some(field => field.name === 'attendanceNote'), false);
  assert.equal(consultaFields.some(field => field.name === 'details'), true);
  assert.deepEqual(consultaFields.find(field => field.name === 'details.attendanceNote'), { name: 'details.attendanceNote', type: 'text' });
  assert.deepEqual(consultaFields.find(field => field.name === 'patientId'), { name: 'patientId', type: 'record', ref: 'Paciente' });
  assert.equal(first.normalizations.some(item => item.code === 'FIELD_OF_NOT_REFERENCE' && item.path === 'Consulta.record.fields.patientId'), true);
  assert.notEqual((consultaFields.find(field => field.name === 'patientId') as { ref?: string }).ref, 'Address');

  const paciente = first.entities.find(entity => entity.entityId === 'Paciente');
  const subtype = (paciente!.definition!.data as unknown as EntityData).fields.find(field => field.name === 'details.identification.subtype');
  assert.deepEqual(subtype, { name: 'details.identification.subtype', type: 'enum', derived: true });
  assert.equal(Object.hasOwn(subtype || {}, 'values'), false);
  assert.deepEqual(paciente?.enumerations.find(item => item.path === 'details.identification.subtype')?.values, ['Person']);
  assert.equal(first.valueObjects.length, 0);
  assert.equal(first.normalizations.some(item => item.code === 'NESTED_KEPT'), true);

  for (const part of first.emit) {
    const rendered = renderDefinition(part.definition, part.pipeline[0]?.defPath || '');
    assert.equal('issues' in rendered, false);
    if ('issues' in rendered) continue;
    assert.equal(definitionIssues(part.definition).length, 0);
    assert.deepEqual(domainImportIssues(MODULE, (part.definition.data as unknown as EntityData).imports || [], rendered.source), []);
    const parsed = parseRendered(rendered.source);
    assert.deepEqual(parsed?.definition, part.definition);
    assert.equal(rendered.source.includes('import '), false);
    assert.equal(/\bctx\b|runtime|\bhttp\b|\bSQL\b|SELECT /.test(rendered.source), false);
    assert.equal(rendered.source.includes('setStatus'), false);
    assert.equal(rendered.source.includes('agentChangeBackend'), false);
  }
});

void test('the definition field schema did not grow a singleton for a one-value enum', () => {
  const schema = JSON.parse(readFileSync(path.join(HERE, '../../schemas/definition-v1.schema.json'), 'utf8')) as {
    $defs: { field: { properties: Record<string, unknown> } };
  };
  assert.deepEqual(Object.keys(schema.$defs.field.properties).sort(), ['derived', 'name', 'ref', 'type']);
});

void test('a missing reference, an ambiguous target, a structural cycle and a name collision are refused', () => {
  const missing = buildD1Domain(requestFrom(missingRefEntity));
  assert.equal(missing.ok, false);
  assert.equal(missing.emit.length, 0);
  assert.equal(codes(missing, 'error').includes('REFERENCE_MISSING'), true);
  assert.match(missing.problems.find(problem => problem.code === 'REFERENCE_MISSING')?.path || '', /Holder\.record\.fields\.other\.to/);

  const ambiguous = buildD1Domain(requestFrom(ambiguousRefEntity));
  assert.equal(codes(ambiguous, 'error').includes('AMBIGUOUS_REFERENCE'), true);
  assert.equal(ambiguous.emit.length, 0);

  const cycle = buildD1Domain(requestFrom(cycleEntities));
  assert.equal(codes(cycle, 'error').includes('STRUCTURAL_CYCLE'), true);
  assert.equal(cycle.emit.length, 0);

  const collision = buildD1Domain(requestFrom({
    Consulta: { entityId: 'Consulta', kind: 'entity', storage: { target: 'moduleDatabase' }, record: { fields: { id: { type: 'uuid', derived: true } } } },
    consulta: { entityId: 'consulta', kind: 'entity', storage: { target: 'moduleDatabase' }, record: { fields: { id: { type: 'uuid', derived: true } } } },
  }));
  assert.equal(codes(collision, 'error').includes('NAME_COLLISION'), true);
  assert.equal(collision.emit.length, 0);

  const fields = buildD1Domain(requestFrom(fieldCollisionEntity));
  assert.equal(codes(fields, 'error').includes('NAME_COLLISION'), true);
});

void test('a nested record stays nested, a one-value enum stays an enum, and Id is not a reference', () => {
  const nested = buildD1Domain(requestFrom(nestedEnumEntity));
  assert.equal(nested.ok, true, JSON.stringify(nested.problems));
  const holder = dataOf(nested.entities[0]);
  assert.deepEqual(holder.fields.map(field => field.name), ['details', 'details.note', 'details.subtype']);
  assert.equal(holder.fields.some(field => field.name === 'note' || field.name === 'subtype'), false);
  const subtype = holder.fields.find(field => field.name === 'details.subtype');
  assert.deepEqual(Object.keys(subtype || {}).sort(), ['name', 'type']);
  assert.equal(subtype?.type, 'enum');
  assert.deepEqual(nested.entities[0].enumerations, [{ path: 'details.subtype', values: ['Only'] }]);
  assert.equal(nested.valueObjects.length, 0);

  const suffix = buildD1Domain(requestFrom(suffixEntities));
  assert.equal(suffix.ok, true, JSON.stringify(suffix.problems));
  const linkOwner = dataOf(suffix.entities.find(entity => entity.entityId === 'Holder')!);
  assert.deepEqual(linkOwner.fields.find(field => field.name === 'targetId'), { name: 'targetId', type: 'string' });
  assert.deepEqual(linkOwner.fields.find(field => field.name === 'link'), { name: 'link', type: 'record', ref: 'Target' });
  assert.equal(suffix.entities.find(entity => entity.entityId === 'Target')?.storageTarget, 'mdm');
  assert.equal(suffix.emit.some(part => part.definition.artifactType === 'table'), false);
});

void test('a referenced nested object is a value object; an NS4 list and a time write are not rewritten', () => {
  const extracted = buildD1Domain(requestFrom({
    Invoice: {
      entityId: 'Invoice',
      kind: 'entity',
      storage: { target: 'moduleDatabase' },
      record: { fields: { price: { type: 'object', fields: { amount: { type: 'integer' }, currency: { type: 'string' } } } } },
    },
    Line: {
      entityId: 'Line',
      kind: 'entity',
      storage: { target: 'moduleDatabase' },
      record: { fields: { unitPrice: { type: 'record', to: ['price'] } } },
    },
  }));
  assert.equal(extracted.ok, true, JSON.stringify(extracted.problems));
  assert.equal(extracted.valueObjects.length, 1);
  const invoice = dataOf(extracted.entities.find(entity => entity.entityId === 'Invoice')!);
  assert.deepEqual(invoice.fields, [{ name: 'price', type: 'record', ref: 'price' }]);
  assert.equal(invoice.fields.some(field => field.name.includes('amount')), false);
  const value = extracted.valueObjects[0].definition!.data as { fields: D1Field[]; referencedBy: string[] };
  assert.deepEqual(value.fields.map(field => field.name), ['amount', 'currency']);
  assert.deepEqual(value.referencedBy, ['Line.unitPrice']);

  const legacy = buildD1Domain(requestFrom(ns4Entity));
  assert.equal(codes(legacy, 'error').includes('RECORD_SHAPE'), true);
  assert.equal(JSON.stringify(legacy).includes('fieldId'), false);

  const written = buildD1Domain(requestFrom(timeEntity, { rules: { expireByTime: 'time' } }));
  assert.equal(codes(written, 'error').includes('TIME_NOT_PERSISTED'), true);
  assert.equal(written.emit.length, 0);

  const kept = buildD1Domain(requestFrom(timeKeptEntity, { rules: { openOnly: 'one record' } }));
  assert.equal(kept.ok, true, JSON.stringify(kept.problems));
  const keptData = dataOf(kept.entities[0]);
  assert.deepEqual(keptData.lifecycle.states[1], { state: 'expired', reachedBy: 'time' });
  assert.equal(keptData.lifecycle.transitions.length, 0);
  assert.equal(kept.entities[0].derivedInitial, 'open');
  assert.equal(kept.normalizations.some(item => item.code === 'TIME_STATE_NOT_A_WRITE'), true);
});

void test('platform rules keep the catalog spelling and a local table for a role is refused', () => {
  const source = '/_9_/l4/ontology/mdm.defs.ts';
  const confirmed = buildD1Domain(requestFrom(platformRole, moduleRulesWithCamelTwin, { [source]: sharedCatalog }));
  assert.equal(confirmed.ok, true, JSON.stringify(confirmed.problems));
  assert.equal(codes(confirmed, 'review').includes('CATALOG_UNREAD'), false);
  const role = confirmed.entities[0];
  assert.deepEqual((role.definition!.data as unknown as EntityData).invariants, []);
  assert.equal(role.rules[0]?.ruleId, 'rule-foreign-namespace-refused');
  assert.equal(role.rules[0]?.placement, 'platform');
  assert.equal(role.rules.some(rule => rule.ruleId === 'ruleForeignNamespaceRefused'), false);

  const unread = buildD1Domain(requestFrom(platformRole, moduleRulesWithCamelTwin, {}));
  assert.equal(codes(unread, 'review').includes('CATALOG_UNREAD'), true);
  assert.equal(unread.entities[0].rules[0]?.ruleId, 'rule-foreign-namespace-refused');

  const unknown = buildD1Domain(requestFrom(platformRole, { rules: {} }, { [source]: { rules: { other: 'x' } } }));
  assert.equal(codes(unknown, 'error').includes('RULE_UNKNOWN'), true);

  const again = buildD1Domain({
    ...requestFrom(platformRole, moduleRulesWithCamelTwin, { [source]: sharedCatalog }),
    selection: {
      ...requestFrom(platformRole).selection,
      tables: [{ tableId: 'personRole', entity: 'PersonRole' }],
    },
  });
  assert.equal(codes(again, 'error').includes('MDM_LOCAL_TABLE'), true);
  assert.equal(again.emit.length, 0);
});

void test('a preserved domain file is not part of the write set', () => {
  const base = requestFrom(nestedEnumEntity);
  base.selection.files[0].action = 'preserve';
  const build = buildD1Domain(base);
  assert.equal(build.ok, true, JSON.stringify(build.problems));
  assert.deepEqual(build.emit, []);
  assert.deepEqual(build.preserved, ['l1/sampleModule/layer_3_domain/entities/holder.defs.ts']);
  assert.ok(build.entities[0].definition);
});

function agendaBuild(artifacts: D1InputArtifacts, snapshot: D1InputSnapshot): D1DomainBuild {
  return buildD1Domain({
    project: PROJECT,
    moduleName: MODULE,
    selection: {
      entities: snapshot.selection.entities,
      tables: snapshot.selection.tables.map(table => ({ tableId: table.tableId, entity: table.entity })),
      files: snapshot.files.map(file => ({
        artifactType: file.artifactType,
        identity: file.identity,
        defPath: file.defPath,
        action: file.action,
      })),
    },
    entities: artifacts.entities,
    ontologyIndex: artifacts.ontologyIndex,
    rules: artifacts.rules,
    catalogs: {},
  });
}
