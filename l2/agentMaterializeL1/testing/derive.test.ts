/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/derive.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseDefinitionSource, type M1Definition } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { catalogBytes, deriveCatalog } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';

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

function loadFixtures(): { units: PlanUnitInput[]; texts: Record<string, string> } {
  const units: PlanUnitInput[] = [];
  const texts: Record<string, string> = {};
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.defs.ts')) {
        const text = readFileSync(path, 'utf8');
        const parsed = parseDefinitionSource(text);
        if (!('definition' in parsed)) continue;
        const rel = path.slice(FIXTURE.length + 1).split('/').join('/');
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
