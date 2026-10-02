/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/behavior/v2Controller.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { contentHash } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import type { MaterializeStateStore } from '/_102021_/l2/agentMaterializeL1/core/state.js';
import { behaviorRunners } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/runners.js';
import { structureRunners } from '/_102021_/l2/agentMaterializeL1/handlers/structure/runners.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { runMaterialize, type MaterializeRunHost, type MaterializeRunRequest } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import { simulate } from '/_102021_/l2/agentMaterializeL1/simulate/simulate.js';
import { hashEvidence } from '/_102021_/l2/agentMaterializeL1/state/maintain.js';
import { parseDefinitionSource, receiptPathFor, type MaterializationReceipt } from '/_102021_/l2/helpers/l1Defs/definition.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../../../..');
const FIXTURE = join(HERE, '../../fixtures/v2ControleEstoque');
const CONTRACT = join(HERE, '../../fixtures/controleEstoque-39a5166/l2/controleEstoque/web/contracts/produtos.defs.txt');
const MODULE = 'controleEstoque';
const PROJECT = 102047;
const PAGE = `_${PROJECT}_/l2/${MODULE}/web/desktop/page11/produtos.defs.ts`;
const CONTROLLER = `_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/http/controllers/produtos.defs.ts`;
const PAGE_TEXT = 'export const definition = { "intent": "stock page" } as const;\n';

void test('v2 plan keeps l1 defs and reads an l2 dependency without making it a unit', async () => {
  const texts = loadFixture();
  texts.set(PAGE, PAGE_TEXT);
  const controller = texts.get(CONTROLLER);
  assert.ok(controller);
  texts.set(CONTROLLER, withDependency(controller, PAGE));
  const units = unitsOf(texts);
  assert.ok(units.some(unit => unit.defPath === PAGE));
  const snapshot = await simulate({
    moduleName: MODULE,
    stage: 'implement',
    units,
    io: { async read(ref) { return texts.get(ref) ?? readProject(ref); } },
  });
  assert.equal(snapshot.units.some(unit => unit.defPath.includes('/l2/')), false);
  const planned = snapshot.units.find(unit => unit.defPath === CONTROLLER);
  assert.ok(planned);
  assert.match(planned.prompt, new RegExp(PAGE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(planned.prompt, new RegExp(await contentHash(PAGE_TEXT)));
  assert.doesNotMatch(planned.reason, /NO_NAMED_HANDLER/);
});

void test('v2 controller is reused on implement and does not require a usecase id', async () => {
  const texts = loadFixture();
  texts.set(PAGE, PAGE_TEXT);
  texts.set(`_${PROJECT}_/l2/${MODULE}/web/contracts/produtos.defs.ts`, readFileSync(CONTRACT, 'utf8'));
  const controller = texts.get(CONTROLLER);
  assert.ok(controller);
  texts.set(CONTROLLER, withDependency(controller, PAGE));
  const keep = new Set([
    CONTROLLER,
    `_${PROJECT}_/l1/${MODULE}/layer_1_external/auth/authorityMap.defs.ts`,
    `_${PROJECT}_/l1/${MODULE}/layer_2_application/scope/accessScope.defs.ts`,
  ]);
  const units = unitsOf(texts).filter(unit => keep.has(unit.defPath) || unit.defPath === PAGE);
  assert.ok(units.some(unit => unit.defPath === PAGE));
  const store = world(texts);
  const host = memoryHost(store);
  const structure = await runMaterialize(request(units, 'structure'), host);
  const structured = structure.units.find(unit => unit.defPath === CONTROLLER);
  assert.equal(structured?.code, 'PROMOTED', structure.units.map(unit => `${unit.defPath} ${unit.code} ${unit.detail}`).join('\n'));
  assert.equal(structure.units.some(unit => unit.defPath.includes('/l2/')), false);
  const receipt = JSON.parse(store.map.get(receiptPathFor(CONTROLLER) ?? '') ?? 'null') as MaterializationReceipt;
  assert.equal(receipt.dependencyHashes[PAGE], await hashEvidence(PAGE_TEXT));
  const implement = await runMaterialize(request(units, 'implement'), host);
  const implemented = implement.units.find(unit => unit.defPath === CONTROLLER);
  assert.equal(implemented?.code, 'REUSE', implement.units.map(unit => `${unit.defPath} ${unit.code} ${unit.detail}`).join('\n'));
  assert.equal(implement.units.some(unit => unit.defPath.includes('/l2/')), false);
  assert.doesNotMatch(`${implemented?.code} ${implemented?.detail}`, /ROUTE_MISSING|usecaseId/);
});

function request(units: readonly PlanUnitInput[], stage: 'structure' | 'implement'): MaterializeRunRequest {
  return {
    project: PROJECT,
    moduleName: MODULE,
    stage,
    flow: '',
    resume: false,
    units,
    profileMode: 'development',
    profileDeclared: true,
    budget: { timeoutMs: 20000 },
  };
}

function memoryHost(store: ReturnType<typeof world>): MaterializeRunHost {
  return {
    io: {
      async read(ref: string) {
        return store.map.get(ref) ?? readProject(ref);
      },
    },
    state: store.state,
    runners: { ...structureRunners, ...behaviorRunners },
    now: () => '2026-10-02T12:00:00.000Z',
    catalogRef: `_${PROJECT}_/l1/${MODULE}/materialization/agentMaterializeL1/scenarioCatalog.ts`,
    commit: 'm1_43',
    monitorError: null,
  };
}

function world(seed: Map<string, string>) {
  const map = new Map(seed);
  const state: MaterializeStateStore = {
    async readReceipt(defPath: string): Promise<MaterializationReceipt | null> {
      const path = receiptPathFor(defPath);
      const text = path ? map.get(path) : undefined;
      if (!text) return null;
      return JSON.parse(text) as MaterializationReceipt;
    },
    async writeReceipt(receipt: MaterializationReceipt): Promise<void> {
      const path = receiptPathFor(receipt.defPath);
      if (path) map.set(path, JSON.stringify(receipt));
    },
    async readOwned(path: string): Promise<Uint8Array | null> {
      const text = map.get(path);
      return text === undefined ? null : new TextEncoder().encode(text);
    },
    async writeOwned(path: string, body: Uint8Array): Promise<void> {
      map.set(path, new TextDecoder().decode(body));
    },
    async removeOwned(): Promise<{ removed: string[]; kept: string[] }> {
      return { removed: [], kept: [] };
    },
    async readRevision(): Promise<string | null> {
      return null;
    },
  };
  return { map, state };
}

function unitsOf(texts: Map<string, string>): PlanUnitInput[] {
  const units: PlanUnitInput[] = [];
  for (const [defPath, text] of texts) {
    if (!defPath.endsWith('.defs.ts')) continue;
    const parsed = parseDefinitionSource(text);
    if (!('definition' in parsed)) continue;
    units.push({ defPath, definition: parsed.definition });
  }
  return units;
}

function withDependency(text: string, dep: string): string {
  const parsed = parseDefinitionSource(text);
  if (!('definition' in parsed)) throw new Error('controller def did not parse');
  const definition = JSON.parse(JSON.stringify(parsed.definition)) as { dependencies: string[] };
  if (!definition.dependencies.includes(dep)) definition.dependencies.push(dep);
  return `export const definition = ${JSON.stringify(definition, null, 2)} as const;\n`;
}

function loadFixture(): Map<string, string> {
  const texts = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.txt')) {
        const text = readFileSync(full, 'utf8');
        const ref = /fileReference="([^"]+)"/.exec(text)?.[1];
        if (ref) texts.set(ref, text);
      }
    }
  };
  walk(FIXTURE);
  return texts;
}

function readProject(ref: string): string | null {
  const match = /^_(\d+)_\/(.+)$/.exec(ref);
  if (!match) return null;
  try {
    return readFileSync(join(ROOT, `mls-${match[1]}`, match[2]), 'utf8');
  } catch {
    return null;
  }
}
