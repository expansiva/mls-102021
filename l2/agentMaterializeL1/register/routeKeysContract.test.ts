/// <mls fileReference="_102021_/l2/agentMaterializeL1/register/routeKeysContract.test.ts" enhancement="_blank"/>

/**
 * m1_41 c2 (m1_39 item 5): the `routeKeys` the L5 reconciler registers are the routes of the v2 page
 * contracts, the same set finalize80 of the D1 checks. Read on the frozen v2 controleEstoque seed:
 * the controllers are emitted by the M1, the contracts are parsed by the promoted v2 parser.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import { outputPathFromDefPath, parseDefinitionSource, readDefinition, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { emitController } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import { reconcileL5Backend, roleFromArtifactType, type L5FileFact } from '/_102021_/l2/agentMaterializeL1/register/reconcileL5.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../../../..');
const SEED = join(HERE, '../fixtures/v2ControleEstoque');
const UPSTREAM = join(HERE, '../../agentDefsL1/fixtures/controleEstoque-39a5166');
const PROJECT = 102047;
const MODULE = 'controleEstoque';
const PREFIX = `_${PROJECT}_/l1/${MODULE}/`;

function seed(): Map<string, string> {
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
  walk(SEED);
  walk(UPSTREAM);
  return texts;
}

void test('routeKeys of the emitted v2 controllers are the routes of the v2 page contracts', async () => {
  const texts = seed();
  const read = async (ref: string): Promise<string | null> => {
    const own = texts.get(ref);
    if (own !== undefined) return own;
    const match = /^_(\d+)_\/(.+)$/.exec(ref);
    // The client project is never read from disk; a platform file is.
    if (!match || Number(match[1]) === PROJECT) return null;
    try {
      return readFileSync(join(ROOT, `mls-${match[1]}`, match[2]), 'utf8');
    } catch {
      return null;
    }
  };
  const defs: Array<[string, M1Definition]> = [];
  for (const [path, text] of texts) {
    if (!path.startsWith(PREFIX)) continue;
    const parsed = parseDefinitionSource(text);
    assert.ok('definition' in parsed, path);
    const definition = readDefinition(parsed.definition);
    assert.equal('issues' in definition, false, path);
    defs.push([path, definition as M1Definition]);
  }

  const files: L5FileFact[] = [];
  const handlerRoutes: string[] = [];
  for (const [path, definition] of defs) {
    const output = outputPathFromDefPath(path);
    assert.ok(output, path);
    const role = roleFromArtifactType(definition.artifactType);
    if (definition.artifactType === 'httpController') {
      const emitted = await emitController(definition, output, read);
      assert.equal('code' in emitted, false, 'code' in emitted ? `${path}: ${emitted.code} ${emitted.detail}` : path);
      files.push({ ref: output, source: (emitted as { source: string }).source, role });
      const handlers = Array.isArray(definition.data.handlers) ? definition.data.handlers : [];
      for (const handler of handlers) handlerRoutes.push(String((handler as { route: unknown }).route));
    } else {
      // Same-module imports of the controllers and the persistence files only need to be present.
      files.push({ ref: output, source: `// ${definition.artifactId}\n`, role });
    }
  }

  const contractRoutes: string[] = [];
  const pages = new Set(defs.filter(([, definition]) => definition.artifactType === 'httpController').map(([, definition]) => String(definition.data.pageId)));
  for (const pageId of pages) {
    const contract = texts.get(`_${PROJECT}_/l2/${MODULE}/web/contracts/${pageId}.defs.ts`);
    assert.ok(contract, pageId);
    const parsed = parseD2ContractV2(contract);
    assert.equal(parsed.pageId, pageId);
    contractRoutes.push(...parsed.routes.map(route => route.route));
  }

  const reconciled = reconcileL5Backend({
    project: PROJECT,
    moduleName: MODULE,
    allowStructureStub: true,
    phase: 'structure',
    projectJson: `${JSON.stringify({ modules: [{ moduleName: MODULE }] }, null, 2)}\n`,
    files,
    catalogRef: null,
  });
  assert.equal(reconciled.action, 'patch', reconciled.detail);
  const routeKeys = (reconciled.backend as { routeKeys: string[] }).routeKeys;
  assert.equal(pages.size, 2);
  assert.equal(routeKeys.length, 4);
  assert.deepEqual(routeKeys, [...new Set(contractRoutes)].sort());
  assert.deepEqual(routeKeys, [...new Set(handlerRoutes)].sort());
});
