/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/seedRows25/seedRowKeys.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { draftScenarioRow, referenceSeedUnit, seedRowProblems, seedRowsHuman } from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/context.js';
import { settleReferenceSeed, uuidV5 } from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/agentM12SeedRowUnit.js';
import { seedTableColumns } from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/agentM12SeedRows.js';
import type { M12Layer } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function unitOf(file: string, tableId: string) {
  const source = readFileSync(path.join(HERE, 'fixture', file), 'utf8');
  const unit = referenceSeedUnit({
    scenarioId: tableId,
    tableId,
    ontologySource: source,
    states: tableId === 'country' ? ['active'] : [],
    stateField: tableId === 'country' ? 'status' : '',
  });
  assert.ok(unit);
  return unit;
}

test('a privacy text unit gets no sentence of its own', () => {
  const privacy = unitOf('PrivacyText.defs.ts', 'privacyText');
  const country = unitOf('Country.defs.ts', 'country');
  const privacyLines = seedRowsHuman(privacy).split('\n');
  const countryLines = seedRowsHuman(country).split('\n');
  assert.equal(privacyLines.length, countryLines.length);
  assert.equal(privacyLines.some(line => /placeholder|provisional/i.test(line)), false);
  const rows = [{ version: 1, publishedAt: '2026-01-01T00:00:00Z', details: { title: 'Title', body: 'the text', language: 'en' } }];
  assert.equal(seedRowProblems(privacy, rows).some(problem => /provisional|privacy/i.test(problem)), false);
});

test('initial rows receive a stable primary key and version 1', async () => {
  const country = unitOf('Country.defs.ts', 'country');
  const privacy = unitOf('PrivacyText.defs.ts', 'privacyText');
  const countryRows = [
    { code: 'BR', name: 'Brazil', status: 'active', details: {} },
    { code: 'US', name: 'United States', status: 'active', details: {} },
  ];
  const privacyRows = [{
    version: 1,
    publishedAt: '2026-01-01T00:00:00Z',
    details: { title: 'Privacy', body: 'a provisional privacy text', language: 'en' },
  }];
  const countryModel = () => JSON.stringify({ rows: countryRows });
  const privacyModel = () => JSON.stringify({ rows: privacyRows });
  const firstCountry = await settleReferenceSeed(country, countryModel);
  const secondCountry = await settleReferenceSeed(country, countryModel);
  const firstPrivacy = await settleReferenceSeed(privacy, privacyModel);
  const secondPrivacy = await settleReferenceSeed(privacy, privacyModel);

  assert.equal(firstCountry.reason, null);
  assert.equal(firstPrivacy.reason, null);
  assert.deepEqual(firstCountry.rows.map(row => row.id), secondCountry.rows.map(row => row.id));
  assert.deepEqual(firstPrivacy.rows.map(row => row.id), secondPrivacy.rows.map(row => row.id));
  for (const row of firstCountry.rows) {
    assert.match(String(row.id), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal((row.details as { version: number }).version, 1);
  }
  assert.notEqual(firstCountry.rows[0].id, firstCountry.rows[1].id);
  for (const row of firstPrivacy.rows) {
    assert.match(String(row.id), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(row.version, 1);
  }

  const noKey = referenceSeedUnit({
    scenarioId: 'initial',
    tableId: 'zone',
    ontologySource: 'export const zone = { "moduleName": "onboarding", "entityId": "Zone", "kind": "entity", "description": "A zone.", "initialData": "rows to help fill the DB", "record": { "fields": { "id": { "type": "uuid", "required": true, "derived": true }, "code": { "type": "string" }, "version": { "type": "integer", "required": true, "derived": true } } }, "uniqueKeys": [["code"]] } as const;\n',
    states: [],
    stateField: '',
  });
  assert.ok(noKey);
  const refused = await settleReferenceSeed(noKey, () => JSON.stringify({ rows: [{ code: '' }] }));
  assert.equal(refused.calls, 2);
  assert.deepEqual(refused.rows, []);
  assert.match(refused.reason ?? '', /no primary key/);
});

test('uuid v5 is web crypto and matches the RFC 4122 DNS vector', async () => {
  const source = readFileSync(path.join(HERE, 'agentM12SeedRowUnit.ts'), 'utf8');
  assert.equal(source.includes('node:'), false);
  assert.equal(/\bBuffer\b/.test(source), false);
  assert.equal(await uuidV5('www.example.com'), '2ed6657d-e927-568b-95e1-2665a8aea6a2');
});

function defUnit(layer: M12Layer, folder: string, shortName: string, definition: M1Definition): M12Unit {
  const def = { project: 102056, level: 1, folder, shortName, extension: '.defs.ts' };
  const output = { ...def, extension: '.ts' };
  return {
    layer,
    unitId: shortName,
    def,
    defRef: `_102056_/l1/${folder}/${shortName}.defs.ts`,
    output,
    outputRef: `_102056_/l1/${folder}/${shortName}.ts`,
    definition,
    declared: definition,
    planIssue: '',
    text: '',
  };
}

/** The table and entity defs of `privacyText`. `versionKey` puts `version` in the unique key, so it becomes a column. */
function privacyTableUnits(versionKey: boolean): M12Unit[] {
  const entityRef = '_102056_/l1/onboarding/layer_3_domain/entities/privacyText.defs.ts';
  const entity: M1Definition = {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'entity',
    artifactId: 'privacyText',
    moduleName: 'onboarding',
    status: 'pending',
    dependencies: [],
    data: {
      entityId: 'PrivacyText',
      storageTarget: 'moduleDatabase',
      fields: [
        { name: 'id', type: 'uuid', indexed: true },
        { name: 'version', type: 'integer' },
        { name: 'publishedAt', type: 'timestamp', indexed: true },
        { name: 'details.title', type: 'string' },
        { name: 'details.body', type: 'string' },
        { name: 'details.language', type: 'string' },
      ],
    },
  };
  const table: M1Definition = {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'table',
    artifactId: 'privacyText',
    moduleName: 'onboarding',
    status: 'pending',
    dependencies: [entityRef],
    data: {
      tableId: 'privacyText',
      entityId: 'PrivacyText',
      physicalName: 'onboarding_privacytext',
      primaryKey: ['id'],
      uniqueKeys: versionKey ? [['version']] : [['publishedAt']],
      indexes: [],
    },
  };
  return [
    defUnit('domain', 'onboarding/layer_3_domain/entities', 'privacyText', entity),
    defUnit('persistence', 'onboarding/layer_1_external/adapters/persistence', 'privacyText', table),
  ];
}

test('a root key that is not a column of the emitted table is refused with the column list', async () => {
  const columns = seedTableColumns(privacyTableUnits(false), 'privacyText');
  assert.deepEqual(columns, ['id', 'publishedAt', 'details']);
  const privacy = { ...unitOf('PrivacyText.defs.ts', 'privacyText'), tableColumns: columns };
  assert.match(seedRowsHuman(privacy), /^Columns: id:uuid, publishedAt:timestamp required, details:object required$/m);
  const rows = [{ version: 1, publishedAt: '2026-01-01T00:00:00Z', details: { title: 'Privacy', body: 'the text', language: 'en' } }];
  const problems = seedRowProblems(privacy, rows);
  assert.deepEqual(problems, ['row 0.version is not a column of table privacyText. Columns: id, publishedAt, details.']);
  const refused = await settleReferenceSeed(privacy, () => JSON.stringify({ rows }));
  assert.equal(refused.calls, 2);
  assert.deepEqual(refused.rows, []);
  assert.match(refused.reason ?? '', /version is not a column/);
});

test('version passes at the root when the emitted table has it as a column', async () => {
  const columns = seedTableColumns(privacyTableUnits(true), 'privacyText');
  assert.deepEqual(columns, ['id', 'version', 'publishedAt', 'details']);
  const privacy = { ...unitOf('PrivacyText.defs.ts', 'privacyText'), tableColumns: columns };
  const rows = [{ version: 1, publishedAt: '2026-01-01T00:00:00Z', details: { title: 'Privacy', body: 'the text', language: 'en' } }];
  assert.deepEqual(seedRowProblems(privacy, rows), []);
  const accepted = await settleReferenceSeed(privacy, () => JSON.stringify({ rows }));
  assert.equal(accepted.reason, null);
  assert.equal(accepted.rows[0].version, 1);
  assert.equal((accepted.rows[0].details as Record<string, unknown>).version, undefined);
});

test('a table without its def is not checked against a guess', () => {
  assert.throws(() => seedTableColumns([], 'privacyText'), /M12_TABLE_UNKNOWN/);
  assert.throws(() => seedTableColumns(privacyTableUnits(true).slice(1), 'privacyText'), /M12_TABLE_UNKNOWN/);
});

test('a scenario row does not put a field that is not a column at the root', async () => {
  const columns = seedTableColumns(privacyTableUnits(false), 'privacyText');
  const ontology = readFileSync(path.join(HERE, 'fixture', 'PrivacyText.defs.ts'), 'utf8');
  const draft = referenceSeedUnit({
    scenarioId: 'completeMyAccess', tableId: 'privacyText', ontologySource: ontology, states: [], stateField: '', requireInitial: false,
  });
  assert.ok(draft);
  const scenario = { ...draft, tableColumns: columns };
  const drafted = await draftScenarioRow(scenario);
  assert.ok('row' in drafted, 'problems' in drafted ? drafted.problems.join('; ') : '');
  assert.equal('version' in drafted.row, false);
  assert.deepEqual(seedRowProblems(scenario, [{ ...drafted.row, version: 1 }]), [
    'row 0.version is not a column of table privacyText. Columns: id, publishedAt, details.',
  ]);
  const legacy = await draftScenarioRow(draft);
  assert.ok('row' in legacy);
  assert.equal(legacy.row.version, 1, 'without the table columns the l4 key went to the root');
});
