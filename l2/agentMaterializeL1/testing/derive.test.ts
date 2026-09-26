/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/derive.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseDefinitionSource, type M1Definition } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { emitBehavior } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';
import { observeImplement } from '/_102021_/l1/agentMaterializeL1/caseRun.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { M1_EXISTING_RECORD } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import { catalogBytes, deriveCatalog } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';

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

void test('update positive uses a stored record and the missing id stays 404', async () => {
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

  const copy = mkdtempSync(join(tmpdir(), 'm1-18-'));
  cpSync(AGENDA, copy, { recursive: true });
  try {
    const definition = loaded.units.find(unit => unit.definition.artifactId === 'updateConsulta')?.definition;
    const port = loaded.units.find(unit => unit.definition.artifactType === 'repositoryPort' && unit.definition.artifactId === 'ConsultaRepository');
    assert.ok(definition && port);
    for (const ref of definition.dependencies) copyDep(copy, ref);
    for (const ref of port.definition.dependencies) copyDep(copy, ref);
    const read = async (ref: string) => {
      if (loaded.texts[ref]) return loaded.texts[ref];
      const full = join(copy, ref.replace(/^_\d+_\/?/, ''));
      return existsSync(full) ? readFileSync(full, 'utf8') : null;
    };
    const emitted = await emitBehavior('implement.usecase', definition, port.defPath.replace(/ports\/.*$/, 'usecases/updateConsulta.ts'), read);
    const emittedPort = await emitBehavior('implement.repositoryPort', port.definition, port.defPath.replace(/\.defs\.ts$/, '.ts'), read);
    assert.equal('code' in emitted, false, 'code' in emitted ? `${emitted.code} ${emitted.detail}` : '');
    assert.equal('code' in emittedPort, false, 'code' in emittedPort ? `${emittedPort.code} ${emittedPort.detail}` : '');
    if ('code' in emitted || 'code' in emittedPort) return;
    const files = {
      [port.defPath.replace(/ports\/.*$/, 'usecases/updateConsulta.ts')]: emitted.source,
      [port.defPath.replace(/\.defs\.ts$/, '.ts')]: emittedPort.source,
    };
    const ran = await observeImplement({
      repoRoot: copy,
      projectDir: copy,
      projectId: '102047',
      catalogText: catalogBytes(derived.catalog),
      definition,
      defPath: port.defPath.replace(/ports\/.*$/, 'usecases/updateConsulta.defs.ts'),
      files,
    });
    const ok = ran.find(item => item.caseId === 'updateConsulta.reachesStub');
    const missing = ran.find(item => item.caseId === 'updateConsulta.missingRecord');
    assert.equal(ok?.ok, true, ok?.reason);
    assert.equal(ok?.status, 200);
    assert.equal(missing?.ok, false, missing?.reason);
    assert.equal(missing?.status, 404);
    assert.equal(missing?.errorCode, 'NOT_FOUND');

    const stripped = {
      ...derived.catalog,
      scenarios: derived.catalog.scenarios.map(scenario => scenario.artifactId === 'updateConsulta'
        ? {
          ...scenario,
          cases: scenario.cases.map(item => item.caseId === 'updateConsulta.reachesStub'
            ? { ...item, preconditions: item.preconditions.filter(entry => entry !== M1_EXISTING_RECORD) }
            : item),
        }
        : scenario),
    };
    const control = await observeImplement({
      repoRoot: copy,
      projectDir: copy,
      projectId: '102047',
      catalogText: catalogBytes(stripped),
      definition,
      defPath: port.defPath.replace(/ports\/.*$/, 'usecases/updateConsulta.defs.ts'),
      files,
    });
    const bare = control.find(item => item.caseId === 'updateConsulta.reachesStub');
    assert.equal(bare?.ok, false);
    assert.equal(bare?.status, 404);
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
});

function copyDep(copy: string, ref: string): void {
  const rel = ref.replace(/^_\d+_\/?/, '');
  const target = join(copy, rel);
  if (existsSync(target)) return;
  const source = join(CLIENT, rel);
  if (!existsSync(source)) return;
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target);
}

function loadTree(root: string, prefix: string): { units: PlanUnitInput[]; texts: Record<string, string> } {
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
        const rel = path.slice(root.length + 1).split('/').join('/');
        const defPath = `${prefix}${rel}`;
        texts[defPath] = text;
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
