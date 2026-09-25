/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/enumerations.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { projectEnumerations, type D1EnumSnapshot } from '/_102021_/l2/agentDefsL1/steps/support70/enumerations.js';
import { AGENDA_CLINICA_F35E28A } from '/_102021_/l2/agentDefsL1/fixtures/agendaClinica-f35e28a/root.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLINIC = path.join(AGENDA_CLINICA_F35E28A, 'l4/agendaClinica');
const CATALOG_PATH = '/_102034_/l4/ontology/mdm.defs.ts';
const CATALOG_DISK = path.resolve(HERE, '../../../../../mls-102034/l4/ontology/mdm.defs.ts');
const L1 = path.join(AGENDA_CLINICA_F35E28A, 'l1/agendaClinica');

function text(file: string): string {
  return readFileSync(file, 'utf8');
}

function clinicSources(): Record<string, string> {
  const sources: Record<string, string> = {
    [CATALOG_PATH]: text(CATALOG_DISK),
    'l4/agendaClinica/ontology/index.defs.ts': text(path.join(CLINIC, 'ontology/index.defs.ts')),
    'l4/agendaClinica/rules.defs.ts': text(path.join(CLINIC, 'rules.defs.ts')),
  };
  for (const entity of ['Consulta', 'ContatoPaciente', 'Paciente', 'Profissional', 'Recepcionista']) {
    sources[`l4/agendaClinica/ontology/${entity}.defs.ts`] = text(path.join(CLINIC, 'ontology', `${entity}.defs.ts`));
  }
  return sources;
}

function snapshot(extra: Partial<D1EnumSnapshot> = {}): D1EnumSnapshot {
  return {
    sources: clinicSources(),
    definitions: extra.definitions || [],
    contracts: extra.contracts || [],
    tables: extra.tables || [{ tableId: 'consulta', entityId: 'Consulta' }],
  };
}

/**
 * The classifier removed by d1_25. One set of literals, shared by every field.
 * A homonym of one scenario marked every enum whose values all sat in the set.
 */
function previousGlobalSetConsumed(values: readonly string[], cited: ReadonlySet<string>): boolean {
  return values.length > 0 && values.every(value => cited.has(value));
}

void test('a shared literal credits only the scenario that names the field', () => {
  const cited = new Set(['shared']);
  assert.equal(previousGlobalSetConsumed(['shared'], cited), true);
  assert.equal(previousGlobalSetConsumed(['shared'], cited), true);
  const rows = projectEnumerations({
    enumerations: [
      { entityId: 'Alpha', path: 'code', values: ['shared'] },
      { entityId: 'Beta', path: 'code', values: ['shared'] },
    ],
    seedCitations: [{ entityId: 'Alpha', path: 'code', scenarioId: 'onlyAlpha', values: ['shared'] }],
  });
  assert.equal(rows.find(item => item.entityId === 'Alpha')?.uses.some(use => use.purpose === 'seedScenario'), true);
  assert.equal(rows.find(item => item.entityId === 'Beta')?.consumed, false);
  assert.notEqual(rows.find(item => item.entityId === 'Beta')?.origin.owner, 'platform');
});

void test('an explicit seed field does not transfer a homonym on the same entity', () => {
  const seed = `export const definition = ${JSON.stringify({
    artifactType: 'persistenceSeeds',
    data: {
      scenarios: [{
        scenarioId: 'one',
        tableId: 'alpha',
        entityId: 'Alpha',
        stateField: 'left',
        states: ['shared'],
      }],
    },
  })};\n`;
  const rows = projectEnumerations({
    enumerations: [
      { entityId: 'Alpha', path: 'left', values: ['shared'] },
      { entityId: 'Alpha', path: 'right', values: ['shared'] },
    ],
    snapshot: { sources: {}, definitions: [seed], contracts: [], tables: [] },
  });
  assert.equal(rows.find(item => item.path === 'left')?.consumed, true);
  assert.equal(rows.find(item => item.path === 'right')?.consumed, false);
});

void test('agenda sources keep seed use, the docType subset and the Phone restriction', () => {
  const create = text(path.join(L1, 'layer_2_application/usecases/createRecepcionista.defs.ts'));
  const contractFile = path.join(AGENDA_CLINICA_F35E28A, 'l2/agendaClinica/web/contracts/dados_recepcionista.defs.ts');
  const seeds = text(path.join(L1, 'layer_1_external/adapters/persistence/seeds.defs.ts'));
  const rows = projectEnumerations({
    enumerations: [
      { entityId: 'Consulta', path: 'status', values: ['scheduled', 'confirmed', 'noShow', 'attended'] },
      { entityId: 'Recepcionista', path: 'details.identification.docType', values: ['CPF', 'Passport', 'NationalId', 'Other'] },
      { entityId: 'Recepcionista', path: 'details.identification.status', values: ['Active', 'Inactive', 'Merged', 'Blocked'] },
      { entityId: 'Recepcionista', path: 'details.identification.subtype', values: ['Person'] },
      { entityId: 'ContatoPaciente', path: 'details.contactChannel.contactType', values: ['Phone'] },
    ],
    snapshot: snapshot({
      definitions: [create, seeds],
      contracts: [{ path: 'l2/agendaClinica/web/contracts/dados_recepcionista.defs.ts', text: text(contractFile) }],
    }),
  });
  const status = rows.find(item => item.entityId === 'Consulta' && item.path === 'status');
  assert.equal(status?.origin.owner, 'module');
  assert.equal(status?.origin.restriction, 'own');
  assert.equal(status?.uses.some(use => use.purpose === 'seedScenario' && use.consumer === 'agendarConsulta'), true);
  const docType = rows.find(item => item.entityId === 'Recepcionista' && item.path === 'details.identification.docType');
  assert.equal(docType?.origin.catalogValues.length, 9);
  assert.deepEqual(docType?.values, ['CPF', 'Passport', 'NationalId', 'Other']);
  assert.equal(docType?.origin.restriction, 'subset');
  assert.equal(docType?.origin.owner, 'platform');
  assert.equal(docType?.uses.some(use => use.purpose === 'usecaseDef' && use.consumer === 'createRecepcionista#input'), true);
  assert.equal(docType?.uses.some(use => use.purpose === 'routeContract'), true);
  assert.equal(docType?.uses.some(use => use.purpose === 'seedScenario'), false);
  const derived = rows.find(item => item.path === 'details.identification.status');
  assert.equal(derived?.origin.derived, true);
  assert.equal(derived?.origin.writer, 'derived');
  assert.equal(derived?.uses.every(use => use.editable === false), true);
  const subtype = rows.find(item => item.path === 'details.identification.subtype');
  assert.equal(subtype?.origin.roleBinding, true);
  assert.equal(subtype?.origin.derived, true);
  assert.equal(subtype?.uses.every(use => use.editable === false), true);
  const phone = rows.find(item => item.entityId === 'ContatoPaciente');
  assert.equal(phone?.origin.restriction, 'subset');
  assert.equal(phone?.origin.owner, 'platform');
  assert.equal(phone?.consumed, false);
  assert.equal(JSON.stringify(rows).includes('createContatoPaciente'), false);
  const again = projectEnumerations({
    enumerations: [
      { entityId: 'Consulta', path: 'status', values: ['scheduled', 'confirmed', 'noShow', 'attended'] },
      { entityId: 'Recepcionista', path: 'details.identification.docType', values: ['CPF', 'Passport', 'NationalId', 'Other'] },
      { entityId: 'Recepcionista', path: 'details.identification.status', values: ['Active', 'Inactive', 'Merged', 'Blocked'] },
      { entityId: 'Recepcionista', path: 'details.identification.subtype', values: ['Person'] },
      { entityId: 'ContatoPaciente', path: 'details.contactChannel.contactType', values: ['Phone'] },
    ],
    snapshot: snapshot({
      definitions: [create, seeds],
      contracts: [{ path: 'l2/agendaClinica/web/contracts/dados_recepcionista.defs.ts', text: text(contractFile) }],
    }),
  });
  assert.equal(JSON.stringify(rows), JSON.stringify(again));
});

void test('dropping the union or leaving only a path removes that credit', () => {
  const entityId = 'Recepcionista';
  const pathName = 'details.identification.docType';
  const values = ['CPF', 'Passport', 'NationalId', 'Other'];
  const withUnion = definitionOf(entityId, '{ "identification"?: { "docType"?: "CPF" | "Passport" | "NationalId" | "Other" } }');
  const asString = definitionOf(entityId, '{ "identification"?: { "docType"?: string } }');
  const pathOnly = definitionOf(entityId, 'string', true);
  const credited = projectEnumerations({
    enumerations: [{ entityId, path: pathName, values }],
    snapshot: snapshot({ definitions: [withUnion], contracts: [] }),
  });
  assert.equal(credited[0]?.uses.some(use => use.purpose === 'usecaseDef'), true);
  const stripped = projectEnumerations({
    enumerations: [{ entityId, path: pathName, values }],
    snapshot: snapshot({ definitions: [asString], contracts: [] }),
  });
  assert.equal(stripped[0]?.consumed, false);
  const referred = projectEnumerations({
    enumerations: [{ entityId, path: pathName, values }],
    snapshot: snapshot({ definitions: [pathOnly], contracts: [] }),
  });
  assert.equal(referred[0]?.consumed, false);
  assert.equal(stripped[0]?.origin.restriction, 'subset');
});

void test('a value outside the catalog, a missing catalog, an unused module enum and no enums stay visible', () => {
  const sources = clinicSources();
  const invalid = projectEnumerations({
    enumerations: [{ entityId: 'Recepcionista', path: 'details.identification.docType', values: ['CPF', 'NotACode'] }],
    snapshot: { sources, definitions: [], contracts: [], tables: [] },
  });
  assert.equal(invalid[0]?.origin.restriction, 'invalid');
  assert.notEqual(invalid[0]?.origin.restriction, 'inherited');
  const missing = projectEnumerations({
    enumerations: [{ entityId: 'Recepcionista', path: 'details.identification.docType', values: ['CPF'] }],
    snapshot: {
      sources: { 'l4/agendaClinica/ontology/Recepcionista.defs.ts': sources['l4/agendaClinica/ontology/Recepcionista.defs.ts'] },
      definitions: [],
      contracts: [],
      tables: [],
    },
  });
  assert.equal(missing[0]?.origin.restriction, 'unresolved');
  assert.notEqual(missing[0]?.origin.owner, 'platform');
  const unused = projectEnumerations({
    enumerations: [{ entityId: 'Consulta', path: 'status', values: ['scheduled', 'confirmed', 'noShow', 'attended'] }],
    snapshot: { sources, definitions: [], contracts: [], tables: [] },
  });
  assert.equal(unused[0]?.origin.owner, 'module');
  assert.equal(unused[0]?.consumed, false);
  assert.deepEqual(projectEnumerations({ enumerations: [] }), []);
});

void test('a module namespace keeps its own origin when the codes match the catalog', () => {
  const sources = clinicSources();
  const parsed = parseD1Source(sources['l4/agendaClinica/ontology/Recepcionista.defs.ts'], 'defs') as {
    record: { fields: { details: { fields: { agendaClinica: { fields: Record<string, unknown> } } } } };
  };
  parsed.record.fields.details.fields.agendaClinica.fields = {
    code: {
      type: 'enum',
      values: ['SSN', 'EIN', 'Passport', 'DriversLicense', 'NationalId', 'CPF', 'CNPJ', 'VAT', 'Other'],
    },
  };
  sources['l4/agendaClinica/ontology/Recepcionista.defs.ts'] = `export const agendaClinicaEntityRecepcionista = ${JSON.stringify(parsed)};\n`;
  const rows = projectEnumerations({
    enumerations: [{
      entityId: 'Recepcionista',
      path: 'details.agendaClinica.code',
      values: ['SSN', 'EIN', 'Passport', 'DriversLicense', 'NationalId', 'CPF', 'CNPJ', 'VAT', 'Other'],
    }],
    snapshot: { sources, definitions: [], contracts: [], tables: [] },
  });
  assert.equal(rows[0]?.origin.owner, 'module');
  assert.equal(rows[0]?.origin.writer, 'module');
  assert.equal(rows[0]?.origin.restriction, 'own');
  assert.notEqual(rows[0]?.origin.owner, 'platform');
});

function definitionOf(entityId: string, type: string, pathOnly = false): string {
  const data = {
    usecaseId: 'createRecepcionista',
    entityId,
    functions: [{
      functionName: 'createRecepcionista',
      input: [{ name: 'details', type, fieldRef: `${entityId}.details` }],
      output: [],
      contractRefs: [],
      ...(pathOnly ? {
        arguments: [{ name: 'docType', path: 'details.identification.docType' }],
      } : {}),
    }],
  };
  return `export const definition = ${JSON.stringify({ artifactType: 'usecase', data })};\n`;
}
