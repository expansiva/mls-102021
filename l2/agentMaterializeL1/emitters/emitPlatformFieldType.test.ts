/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/emitPlatformFieldType.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { emitDomain } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';

const ROOT_FOR_MDM = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

function entity(fields: Array<{ name: string; type: string; of?: string }>): M1Definition {
  return {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'domainEntity',
    artifactId: 'Member',
    moduleName: 'onboarding',
    status: 'pending',
    dependencies: [],
    data: { entityId: 'Member', storageTarget: 'mdm', fields, lifecycle: { states: [], transitions: [] }, invariants: [], imports: [] },
  };
}

test('an object of PrivacyConsent is typed as PrivacyConsentValue from the MDM module', () => {
  const emitted = emitDomain(entity([{ name: 'privacyConsent', type: 'object', of: 'PrivacyConsent' }]), '_102056_/l1/onboarding/layer_3_domain/entities/member.ts');
  assert.match(emitted.source, /import type \{ PrivacyConsentValue \} from '\/_102034_\/l1\/mdm\/module\.js';/);
  assert.match(emitted.source, /privacyConsent: PrivacyConsentValue;/);
  assert.equal(emitted.source.includes('Record<string, unknown>'), false);
  assert.deepEqual(emitted.imports, ['/_102034_/l1/mdm/module.js']);
});

test('a platform type is named <of>Value and imported; its existence is the compile gate, not a list in the generator', () => {
  const emitted = emitDomain(entity([{ name: 'geo', type: 'object', of: 'GeoPoint' }]), '_102056_/l1/onboarding/layer_3_domain/entities/member.ts');
  assert.ok(!('code' in emitted));
  assert.match(emitted.source, /import type \{ GeoPointValue \} from '\/_102034_\/l1\/mdm\/module\.js';/);
  assert.equal(emitted.source.includes('Record<string, unknown>'), false);
  const moduleText = readFileSync(path.join(ROOT_FOR_MDM, 'mls-102034', 'l1', 'mdm', 'module.ts'), 'utf8');
  // GeoPoint has no Value interface on the module today: the unit compile refuses the import by name.
  assert.equal(/export\s+interface\s+GeoPointValue\b/.test(moduleText), false);
});

test('an object of PrivacyConsent with leaves is still typed PrivacyConsentValue; without of the nested object stays', () => {
  const emitted = emitDomain(entity([
    { name: 'privacyConsent', type: 'object', of: 'PrivacyConsent' },
    { name: 'privacyConsent.accepted', type: 'boolean' },
    { name: 'privacyConsent.version', type: 'string' },
    { name: 'address', type: 'object' },
    { name: 'address.city', type: 'string' },
  ]), '_102056_/l1/onboarding/layer_3_domain/entities/member.ts');
  assert.match(emitted.source, /import type \{ PrivacyConsentValue \} from '\/_102034_\/l1\/mdm\/module\.js';/);
  assert.match(emitted.source, /privacyConsent: PrivacyConsentValue;/);
  assert.equal(emitted.source.includes('accepted'), false);
  assert.match(emitted.source, /address: \{\n\s+city: string;\n\s+\};/);
});
