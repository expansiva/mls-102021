/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/derive.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseDefinitionSource, type M1Definition } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { M1_CATALOG_SCHEMA, M1_CATALOG_SCHEMA_V11, M1_EXISTING_RECORD, parseCatalog } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import { catalogBytes, deriveCatalog } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';
import { fixtureLogicalRel } from '/_102021_/l2/agentDefsL1/fixtures/fixtureDisk.js';

const AGENDA = join(dirname(fileURLToPath(import.meta.url)), '../register/fixtures/agendaClinica-8d8729d');
const CLIENT = join(dirname(fileURLToPath(import.meta.url)), `../../../../mls-${102047}`);

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), '../handlers/structure/fixtures');

void test('derived catalog follows the defs and ignores array order', () => {
  const loaded = loadFixtures();
  assert.equal(loaded.units.some(unit => unit.defPath.includes('catalogFixture')), false);
  const first = deriveCatalog('agendaClinica', loaded.units, loaded.texts);
  const reversed = deriveCatalog('agendaClinica', [...loaded.units].reverse(), loaded.texts);
  assert.equal(catalogBytes(first.catalog), catalogBytes(reversed.catalog));
  assert.equal(first.catalog.scenarios.some(item => item.artifactId === 'createConsulta'), true);
  const created = first.catalog.scenarios.find(item => item.artifactId === 'createConsulta');
  assert.ok(created);
  assert.equal(created.cases.some(item => item.caseId === 'createConsulta.reachesStub'), true);
  assert.equal(created.cases.some(item => item.synthetic.length > 0), false);
  assert.equal(first.gaps.some(gap => gap.reason.includes('not an oracle')), true);

  const renamed = loaded.units.map(unit => rename(unit, 'agendaClinica', 'visitQueue', 'Consulta', 'Visita'));
  const renamedTexts = Object.fromEntries(Object.entries(loaded.texts).map(([key, value]) => [key, value.split('agendaClinica').join('visitQueue').split('Consulta').join('Visita')]));
  const other = deriveCatalog('visitQueue', renamed, renamedTexts);
  const body = catalogBytes(other.catalog);
  assert.equal(body.includes('agendaClinica'), false);
  assert.equal(body.includes('Consulta'), false);

  const controller = loaded.units.find(unit => unit.definition.artifactId === 'consultas_recepcionista');
  assert.ok(controller);
  const trimmed = {
    ...controller,
    definition: {
      ...controller.definition,
      data: {
        ...controller.definition.data,
        handlers: (controller.definition.data.handlers as unknown[]).filter(item => {
          const route = item && typeof item === 'object' ? (item as { route?: string }).route : '';
          return route !== 'agendaClinica.consultas_recepcionista.cmdCreateConsulta';
        }),
      },
    },
  };
  const without = deriveCatalog('agendaClinica', loaded.units.map(unit => unit.defPath === trimmed.defPath ? trimmed : unit), loaded.texts);
  const before = first.catalog.scenarios.find(item => item.artifactId === 'consultas_recepcionista');
  const after = without.catalog.scenarios.find(item => item.artifactId === 'consultas_recepcionista');
  assert.ok(before && after);
  const removed = before.cases.filter(item => !after.cases.some(next => next.caseId === item.caseId));
  assert.equal(removed.length > 0, true);
  assert.equal(removed.every(item => item.routine.endsWith('cmdCreateConsulta')), true);
  assert.equal(after.cases.some(item => item.routine.endsWith('cmdCreateConsulta')), false);
});

void test('agendaClinica v1.1 names module cases and the route caller from the grant', () => {
  const loaded = loadTree(AGENDA, '_102047_/');
  for (const unit of loaded.units) {
    for (const dependency of unit.definition.dependencies) {
      if (loaded.texts[dependency]) continue;
      const full = join(CLIENT, dependency.replace(/^_\d+_\/?/, ''));
      if (existsSync(full)) loaded.texts[dependency] = readFileSync(full, 'utf8');
    }
  }
  const authority = loaded.units.find(unit => unit.definition.artifactType === 'authorityMap');
  assert.ok(authority);
  const derived = deriveCatalog('agendaClinica', loaded.units, loaded.texts, new Map([[authority.defPath, 'NO_CONSUMER: authorityMap']]));
  assert.equal(derived.catalog.schemaVersion, M1_CATALOG_SCHEMA_V11);
  const cases = derived.catalog.scenarios.flatMap(item => item.cases);
  const moduleCases = cases.filter(item => item.runner === 'module');
  const routeCases = cases.filter(item => item.runner === 'route');
  assert.equal(moduleCases.length, 28);
  // m1_27: only the denials without authority stay executable; the authenticated cases are obligations.
  assert.equal(routeCases.length, 10);
  assert.equal(derived.gaps.some(gap => gap.origin.includes('.qry') && gap.reason === 'contract required field was not read'), false);
  assert.equal(moduleCases.every(item => item.caller === undefined), true);
  const denied = routeCases.filter(item => item.gate === 'auth');
  assert.equal(denied.length, 10);
  assert.equal(denied.every(item => item.caller?.source === 'http' && item.caller.authorities.length === 0), true);
  const scope = loaded.units.find(unit => unit.definition.artifactType === 'accessScope');
  assert.ok(scope);
  const actorByGrant = new Map<string, string>();
  const grants = Array.isArray(scope.definition.data.grants) ? scope.definition.data.grants : [];
  for (const grant of grants) {
    if (grant && typeof grant === 'object' && typeof (grant as { grantId?: string }).grantId === 'string') {
      actorByGrant.set((grant as { grantId: string }).grantId, String((grant as { actorRef?: string }).actorRef ?? ''));
    }
  }
  assert.equal(cases.every(item => item.actorId === '' && (item.runner === 'module' || item.caller?.authorities.length === 0)), true);
  assert.equal(cases.some(item => item.gate === 'contract'), false);
  const positive = derived.obligations.filter(entry => entry.kind === 'contract');
  assert.equal(positive.length, 5);
  assert.equal(derived.obligations.every(entry => entry.blocker === 'RUNTIME_IDENTITY_PENDING' && entry.expect.ruleId === null), true);
  assert.equal(derived.obligations.every(entry => derived.gaps.some(gap => gap.reason.includes(`${entry.caseId} is declared, not executed`))), true);
  const kinds = new Map<string, number>();
  for (const entry of derived.obligations) kinds.set(entry.kind, (kinds.get(entry.kind) ?? 0) + 1);
  console.log(`m1_27 agendaClinica: catalog ${cases.length} (module ${moduleCases.length}, route denials ${denied.length}); obligations ${derived.obligations.length} ${JSON.stringify(Object.fromEntries(kinds))}`);
  for (const item of positive) {
    assert.equal(item.caller?.source, 'http');
    assert.equal(item.identity === 'member' || item.identity === 'owner', true);
    const controller = derived.catalog.scenarios.find(scenario => item.caseId.startsWith(`${scenario.artifactId}.`));
    const unit = loaded.units.find(entry => entry.definition.artifactId === controller?.artifactId);
    const handlers = Array.isArray(unit?.definition.data.handlers) ? unit.definition.data.handlers : [];
    const handler = handlers.find(entry => entry && typeof entry === 'object' && (entry as { route?: string }).route === item.routine) as { grantIds?: string[] } | undefined;
    const expected = [...new Set((handler?.grantIds ?? []).map(id => `agendaClinica:${actorByGrant.get(id) ?? ''}`))].sort();
    assert.deepEqual(item.caller?.authorities, expected);
    assert.equal(expected.every(authority => authority !== 'agendaClinica:'), true);
  }
  const legacy = parseCatalog(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'catalogFixture.json'), 'utf8'));
  assert.equal(legacy.issues.length, 0);
  assert.equal(legacy.catalog?.schemaVersion, M1_CATALOG_SCHEMA);
  assert.equal(legacy.catalog?.scenarios[0]?.cases[0]?.runner, undefined);
  const again = parseCatalog(JSON.stringify(derived.catalog));
  assert.deepEqual(again.issues, []);
  assert.equal(again.catalog?.scenarios.flatMap(item => item.cases).filter(item => item.runner === 'module').length, 28);
});

void test('update positive requires a stored record and the missing id expects 404', () => {
  const loaded = loadTree(AGENDA, '_102047_/');
  const derived = deriveCatalog('agendaClinica', loaded.units, loaded.texts);
  const update = derived.catalog.scenarios.find(item => item.artifactId === 'updateConsulta');
  assert.ok(update);
  const positive = update.cases.find(item => item.caseId === 'updateConsulta.reachesStub');
  const negative = update.cases.find(item => item.caseId === 'updateConsulta.missingRecord');
  assert.ok(positive && negative);
  assert.equal(positive.preconditions.includes(M1_EXISTING_RECORD), true);
  assert.equal(positive.expect.ok, true);
  assert.equal(positive.expect.status, 200);
  assert.equal(negative.preconditions.includes(M1_EXISTING_RECORD), false);
  assert.equal(negative.expect.ok, false);
  assert.equal(negative.expect.status, 404);
  assert.equal(negative.expect.errorCode, 'NOT_FOUND');

  const renamed = loaded.units.map(unit => rename(unit, 'agendaClinica', 'visitQueue', 'Consulta', 'Visita'));
  const renamedTexts = Object.fromEntries(Object.entries(loaded.texts).map(([key, value]) => [
    key.split('agendaClinica').join('visitQueue').split('Consulta').join('Visita'),
    value.split('agendaClinica').join('visitQueue').split('Consulta').join('Visita'),
  ]));
  const other = deriveCatalog('visitQueue', renamed, renamedTexts);
  const renamedUpdate = other.catalog.scenarios.find(item => item.artifactId === 'updateVisita');
  assert.ok(renamedUpdate);
  assert.equal(renamedUpdate.cases.some(item => item.caseId === 'updateVisita.reachesStub' && item.preconditions.includes(M1_EXISTING_RECORD)), true);
  assert.equal(catalogBytes(other.catalog).includes('agendaClinica'), false);
  assert.equal(catalogBytes(other.catalog).includes('Consulta'), false);

});

function loadTree(root: string, prefix: string): { units: PlanUnitInput[]; texts: Record<string, string> } {
  const units: PlanUnitInput[] = [];
  const texts: Record<string, string> = {};
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.ts') || entry.name.endsWith('.txt')) {
        const text = readFileSync(path, 'utf8');
        const rel = fixtureLogicalRel(path.slice(root.length + 1).split('/').join('/'));
        const defPath = `${prefix}${rel}`;
        texts[defPath] = text;
        if (!entry.name.endsWith('.defs.ts') && !entry.name.endsWith('.defs.txt')) continue;
        const parsed = parseDefinitionSource(text);
        if (!('definition' in parsed)) continue;
        units.push({ defPath, definition: parsed.definition });
      }
    }
  };
  walk(root);
  return { units, texts };
}

function loadFixtures(): { units: PlanUnitInput[]; texts: Record<string, string> } {
  const units: PlanUnitInput[] = [];
  const texts: Record<string, string> = {};
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.defs.ts') || entry.name.endsWith('.defs.txt')) {
        const text = readFileSync(path, 'utf8');
        const parsed = parseDefinitionSource(text);
        if (!('definition' in parsed)) continue;
        const rel = fixtureLogicalRel(path.slice(FIXTURE.length + 1).split('/').join('/'));
        const defPath = `_102047_/l1/agendaClinica/${rel}`;
        texts[defPath] = text;
        units.push({ defPath, definition: parsed.definition });
      }
    }
  };
  walk(FIXTURE);
  return { units, texts };
}

function rename(unit: PlanUnitInput, moduleName: string, nextModule: string, entity: string, nextEntity: string): PlanUnitInput {
  const definition = JSON.parse(JSON.stringify(unit.definition)) as M1Definition;
  definition.moduleName = definition.moduleName === moduleName ? nextModule : definition.moduleName;
  definition.artifactId = definition.artifactId.split(entity).join(nextEntity).split(moduleName).join(nextModule);
  definition.dependencies = definition.dependencies.map(item => item.split(moduleName).join(nextModule).split(entity).join(nextEntity));
  definition.data = JSON.parse(JSON.stringify(definition.data).split(moduleName).join(nextModule).split(entity).join(nextEntity)) as M1Definition['data'];
  return {
    defPath: unit.defPath.split(moduleName).join(nextModule).split(entity).join(nextEntity),
    definition,
  };
}
