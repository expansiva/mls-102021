/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/usecases40/ontologyShape.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { entitySubtype, mdmContextSection } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const MDM_ONTOLOGY = readFileSync(path.join(ROOT, 'mls-102034', 'l4', 'ontology', 'mdm.defs.ts'), 'utf8');

/** The flat-mapping line of the section: "a field of a platform group is `details.<field>` (from the ontology: …)". */
function flatLine(text: string): string {
  return text.split('\n').find(line => line.includes('a field of a platform group is')) ?? '';
}

// Minimal l4 entity ontology with the header of the 102056 HEAD `l4/onboarding/ontology/OrganizationMember.defs.ts`.
const ORGANIZATION_MEMBER_L4 = `export const definition = ${JSON.stringify({
  kind: 'role',
  subtype: 'Person',
  roleTag: 'onboarding.OrganizationMember',
  source: '/_102034_/l4/ontology/mdm.defs.ts',
  record: { fields: { identification: { fields: { subtype: { type: 'enum' } } } } },
}, null, 2)} as const;`;

test('a usecase of a Person entity is told where the subtype fields live in the flat read (details.privacyConsent, d1_107 s2)', () => {
  const subtype = entitySubtype(ORGANIZATION_MEMBER_L4);
  assert.equal(subtype, 'Person');
  const line = flatLine(mdmContextSection('onboarding', MDM_ONTOLOGY, null, [], null, subtype));
  assert.ok(line.includes('`details.privacyConsent`'), 'the subtype field is a flat key');
  assert.ok(line.includes('`details.birthDate`'), 'every field of subtypes.Person');
  assert.ok(line.includes('`details.updatedAt`') && line.includes('`details.notes`'), 'the group fields are not cut at 8');
  assert.ok(!line.includes('`details.legalName`'), 'no field of another subtype');
});

test('an entity without subtype keeps the group fields and gets no subtype field', () => {
  assert.equal(entitySubtype('export const definition = { "kind": "own" } as const;'), '');
  const line = flatLine(mdmContextSection('onboarding', MDM_ONTOLOGY, null));
  assert.ok(line.includes('`details.name`') && line.includes('`details.mergedInto`'), 'the group fields of today');
  assert.ok(!line.includes('`details.privacyConsent`') && !line.includes('`details.birthDate`'), 'no subtype field');
});
