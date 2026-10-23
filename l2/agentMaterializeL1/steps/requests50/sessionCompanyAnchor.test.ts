/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/requests50/sessionCompanyAnchor.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseDefinitionSource, readDefinition, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { sessionCompanyAnchor } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';

// 102056 onboarding frozen at its commit dd06abf (byte copies, .txt so tsc skips them).
const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'onboarding_dd06abf');

function readFixture(rel: string): string {
  return readFileSync(path.join(FIXTURE, `${rel}.txt`), 'utf8');
}

function unitFrom(rel: string): M12Unit {
  const parsed = parseDefinitionSource(readFixture(rel));
  if (!('definition' in parsed)) throw new Error(`${rel}: ${parsed.issues.join(' ')}`);
  const read = readDefinition(parsed.definition);
  if ('issues' in read) throw new Error(`${rel}: ${read.issues.join(' ')}`);
  return { unitId: read.artifactId, definition: read } as unknown as M12Unit;
}

function requestDef(rel: string): M1Definition {
  return unitFrom(rel).definition;
}

const ONBOARDING = [
  'l1/onboarding/layer_3_domain/entities/company.defs.ts',
  'l1/onboarding/layer_3_domain/entities/organizationMember.defs.ts',
].map(unitFrom);

const ENTITY_IDS = ONBOARDING.map(unit => String(unit.definition.data.entityId ?? ''));
const L5 = readFixture('l5/config.json');

test('a request that reads Company carries the session company anchor from l5 companyType', () => {
  const request = requestDef('l1/onboarding/layer_2_application/requests/company_preparation.defs.ts');
  const routes = Array.isArray(request.data.requests) ? request.data.requests : [];
  const readsCompany = routes.some(row => JSON.stringify(row).includes('Company'));
  assert.equal(readsCompany, true);

  const text = sessionCompanyAnchor('onboarding', L5, ENTITY_IDS);
  assert.match(text, /`onboarding\.Company`/);
  assert.match(text, /ctx\.sessionContext\.activeCompanyId/);
  assert.match(text, /ctx\.sessionContext\.person\.mdmId/);
  assert.match(text, /FORBIDDEN/);
  assert.match(text, /is absent, refuse with an AppError that names it; never use the person of the session as the company/);
});

test('a module without companyType gets no session company anchor', () => {
  const config = JSON.stringify({ onboarding: { moduleId: 'onboarding' } });
  assert.equal(sessionCompanyAnchor('onboarding', config, ENTITY_IDS), '');
  assert.equal(sessionCompanyAnchor('tarefas', L5, ENTITY_IDS), '');
});
