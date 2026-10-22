/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/seedRows25/seedRowKeys.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { referenceSeedUnit, seedRowProblems, seedRowsHuman } from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/context.js';
import { settleReferenceSeed, uuidV5 } from '/_102021_/l2/agentMaterializeL1/steps/seedRows25/agentM12SeedRowUnit.js';

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
