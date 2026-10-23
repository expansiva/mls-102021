/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/requests50/requestPlatformSection.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseDefinitionSource, readDefinition, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { mdmPlatformSectionForRequest } from '/_102021_/l2/agentMaterializeL1/steps/requests50/context.js';

const MLS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');

function readMls(rel: string): string {
  return readFileSync(path.join(MLS, rel), 'utf8');
}

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
  'l1/onboarding/layer_3_domain/entities/organizationMember.defs.ts',
  'l1/onboarding/layer_3_domain/entities/company.defs.ts',
  'l1/onboarding/layer_3_domain/entities/companyContact.defs.ts',
  'l1/onboarding/layer_3_domain/entities/country.defs.ts',
  'l1/onboarding/layer_3_domain/entities/privacyText.defs.ts',
  'l1/onboarding/layer_2_application/usecases/getOrganizationMember.defs.ts',
  'l1/onboarding/layer_2_application/usecases/listOrganizationMember.defs.ts',
  'l1/onboarding/layer_2_application/usecases/updateOrganizationMember.defs.ts',
  'l1/onboarding/layer_2_application/usecases/listPrivacyText.defs.ts',
  'l1/onboarding/layer_2_application/usecases/createPrivacyText.defs.ts',
  'l1/onboarding/layer_2_application/usecases/updatePrivacyText.defs.ts',
  'l1/onboarding/layer_2_application/usecases/listCountry.defs.ts',
].map(unitFrom);

test('the platform MDM section follows the usecases the request def calls, not the contract text', () => {
  const ontology = readMls('mls-102034/l4/ontology/mdm.defs.ts');
  const facade = readMls('mls-102034/l1/mdm/layer_3_usecases/mdmFacade.ts');
  const moduleSource = readMls('mls-102034/l1/mdm/module.ts');
  const peopleContract = readFixture('l2/onboarding/web/contracts/organization_people.defs.ts');
  const accessContract = readFixture('l2/onboarding/web/contracts/my_access_completion.defs.ts');
  assert.equal(/\bOrganizationMember\b/u.test(peopleContract), false, 'organization_people contract does not name the entity');

  const people = mdmPlatformSectionForRequest(peopleContract, ONBOARDING, ontology, facade, moduleSource, requestDef('l1/onboarding/layer_2_application/requests/organization_people.defs.ts'));
  const access = mdmPlatformSectionForRequest(accessContract, ONBOARDING, ontology, facade, moduleSource, requestDef('l1/onboarding/layer_2_application/requests/my_access_completion.defs.ts'));
  for (const [name, text] of [['organization_people', people], ['my_access_completion', access]] as const) {
    assert.ok(text.includes('## The platform APIs for MDM data (source: the platform MDM facade)'), name);
    assert.ok(text.includes('PrivacyConsentValue'), `${name} cites PrivacyConsentValue`);
    assert.ok(text.includes('isProtectedPrivacyCountry'), `${name} cites isProtectedPrivacyCountry`);
  }

  const privacy = mdmPlatformSectionForRequest(peopleContract, ONBOARDING, ontology, facade, moduleSource, requestDef('l1/onboarding/layer_2_application/requests/privacy_texts.defs.ts'));
  assert.equal(privacy, '', 'a request that calls no MDM-entity usecase gets no section');
});
