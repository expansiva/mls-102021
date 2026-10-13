/// <mls fileReference="_102021_/l2/helpers/l1Defs/disclosureDenied102047.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { pathDisclosure, resolveAllowedFields, type DisclosureGrant } from '/_102021_/l2/helpers/l1Defs/disclosure.js';

/** Frozen copies of mls-102047 `ba8f255` (access + ontology of entities named by a denial). */
const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/denied102047');

const MODULES = ['compras', 'financeiro', 'manutencaoFrota', 'ordenServicio', 'hiringPipeline'] as const;

interface AccessGrant {
  grantId: string;
  entityRefs: string[];
  disclosure?: { mode?: string; allowedFields?: string[]; deniedFields?: string[] };
}

function loadConst(fileName: string): Record<string, unknown> {
  const text = readFileSync(join(FIXTURES, fileName), 'utf8');
  const start = text.indexOf('= {');
  const end = text.lastIndexOf('} as const');
  if (start < 0 || end < 0) throw new Error(`fixture is not a const object: ${fileName}`);
  return JSON.parse(text.slice(start + 2, end + 1)) as Record<string, unknown>;
}

function coveredByDenial(item: string, denied: readonly string[]): boolean {
  return denied.some(denial => item === denial || item.startsWith(`${denial}.`));
}

void test('fieldsOnly grants that only deny fields resolve to a non-empty allow-list', () => {
  const seen = readdirSync(FIXTURES).sort();
  assert.ok(seen.every(name => name.endsWith('.txt')), 'fixtures stay text copies');

  const cases: { moduleName: string; grantId: string }[] = [];
  for (const moduleName of MODULES) {
    const access = loadConst(`${moduleName}__access.defs.ts.txt`);
    const grants = access.grants as AccessGrant[];
    const entities: Record<string, unknown> = {};
    for (const grant of grants) {
      const disclosure = grant.disclosure;
      if (disclosure?.mode !== 'fieldsOnly' || !disclosure.deniedFields?.length) continue;
      for (const entity of grant.entityRefs) {
        if (entities[entity]) continue;
        entities[entity] = loadConst(`${moduleName}__${entity}.defs.ts.txt`);
      }
      const allowed = resolveAllowedFields({
        grantId: grant.grantId,
        entityRefs: grant.entityRefs,
        allowedFields: Array.isArray(disclosure.allowedFields) ? disclosure.allowedFields : undefined,
        deniedFields: disclosure.deniedFields,
      }, entities);
      assert.ok(allowed.length > 0, `${grant.grantId} resolved empty`);
      for (const item of allowed) {
        assert.equal(coveredByDenial(item, disclosure.deniedFields), false, `${grant.grantId} ${item}`);
      }
      const resolved: DisclosureGrant = { disclosure: 'fieldsOnly', entityRefs: grant.entityRefs, allowedFields: allowed };
      for (const entity of grant.entityRefs) {
        const prefix = `${entity}.`;
        const first = allowed.find(item => item.startsWith(prefix));
        assert.ok(first, `${grant.grantId} ${entity} has no released field`);
        assert.equal(pathDisclosure([resolved], entity, first.slice(prefix.length), entities[entity]), 'disclosed');
        for (const denial of disclosure.deniedFields) {
          if (denial !== entity && !denial.startsWith(prefix)) continue;
          const path = denial === entity ? '' : denial.slice(prefix.length);
          assert.equal(pathDisclosure([resolved], entity, path, entities[entity]), 'blocked', `${grant.grantId} ${denial}`);
        }
      }
      cases.push({ moduleName, grantId: grant.grantId });
    }
  }
  assert.deepEqual(cases.map(item => item.grantId), [
    'almoxarifePedidosRecebimento',
    'pagadorMeusTitulos',
    'pagadorMeusRecebimentos',
    'motoristaVeiculosAtribuidos',
    'recepcionistaOrdenes',
    'clienteMisOrdenes',
    'managerCandidates',
  ]);
  assert.equal(cases.length, 7);
});
