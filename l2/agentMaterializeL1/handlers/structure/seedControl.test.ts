/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/structure/seedControl.test.ts" enhancement="_blank"/>

/**
 * m1_41 b1-P1/P3 control: the v2 controleEstoque seed declares every field `required` and its one
 * grant is `fullRecord`. Its structure and implement outputs are pinned by sha256, as measured on
 * `1b5cb14` (before b1-P1). A change here is a change of the generated code: say why, then re-pin.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseDefinitionSource, readDefinition, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { emitBehavior } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';
import { emitController, emitRequestService, emitUsecase, type EmitFailure, type EmitResult } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../../../..');
const SEED = join(HERE, '../../fixtures/v2ControleEstoque');
const CONTRACT = join(HERE, '../../fixtures/controleEstoque-39a5166/l2/controleEstoque/web/contracts/produtos.defs.txt');
const PREFIX = '_102047_/l1/controleEstoque/';
const BEHAVIOR = new Set(['domainEntity', 'authorityMap', 'accessScope', 'repositoryPort', 'usecase', 'requestService']);

const PINNED = new Map<string, string>([
  ['s layer_1_external/adapters/http/controllers/movimentacoes.defs.ts', '676c9489195076e0392499031f1a5fb07518eabfd6fcc128e909702ee700d5fe'],
  ['s layer_1_external/adapters/http/controllers/produtos.defs.ts', 'ddf8081425d4bffa1a0962a88870c27a45f29940aa80cf6974b4fb7407b84e64'],
  ['i layer_1_external/auth/authorityMap.defs.ts', '2c3855fe45f464434524f0f198b71e31ec82cefd6b6a0c425941bc63e206fcb0'],
  ['i layer_2_application/ports/movimentacaoEstoqueRepository.defs.ts', '3dc2871cc660ec3f74c9bd02891c588c38c32bf4ad27c7f1b56bea2919f97f9e'],
  ['s layer_2_application/requests/movimentacoes.defs.ts', '3102e951fe99adc9355cbf9dd156d3aa759b39f47857a76226d13c7153bbc346'],
  ['i layer_2_application/requests/movimentacoes.defs.ts', '69d1c86e0a0c21e7304af2251c99b70a7f4ca456f9b0ce07d397115b8a89b238'],
  ['s layer_2_application/requests/produtos.defs.ts', '09719ad5d9ab53485307e2d5f32239d995f6100c59b19d86563d4b1839a15861'],
  ['i layer_2_application/requests/produtos.defs.ts', '7906ca451801e4b365e2f18aed631b01d7bf9de950418caec27e4a5d8f118d0e'],
  ['i layer_2_application/scope/accessScope.defs.ts', '21859a2f5108bb67668a57228b836393d20f9e7e9a552d1d86a479ac70f76593'],
  ['s layer_2_application/usecases/createMovimentacaoEstoque.defs.ts', '760b02283aeca08743e3147d707bedc7727035ba65a74b6922a9ff7fddd445da'],
  ['i layer_2_application/usecases/createMovimentacaoEstoque.defs.ts', '2ed0cf060d714fe702f7845ae97f8a88a0f5166b31db66aa7f20e9029294699c'],
  ['s layer_2_application/usecases/createProduto.defs.ts', '16a8509b13d350978e9c41d38896a871e50a4a3d27ee9b11d1d733ec747edbd8'],
  ['i layer_2_application/usecases/createProduto.defs.ts', '2fcb394f60cf16ff28005bc856c5518971c72607e92f357dd47fd4595a416eca'],
  ['s layer_2_application/usecases/listMovimentacaoEstoque.defs.ts', '8b6b77b5011562904738ce3913b510c44d9d0cf285ae23598c5dbc0148b0de38'],
  ['i layer_2_application/usecases/listMovimentacaoEstoque.defs.ts', '635b2485847f5112bea1c403ea9a7f35b3355309854622e25f07d6f988fcc5d9'],
  ['s layer_2_application/usecases/listProduto.defs.ts', 'b0c0907bdc7b846c672fb098e74092501be141115bd51ce58d980b3eb333b514'],
  ['i layer_2_application/usecases/listProduto.defs.ts', '087d62932a8f0703efcadaa56d5a84b4a94e3697e4c8b79f6a6af8c8b2aac8f6'],
  ['i layer_3_domain/entities/movimentacaoEstoque.defs.ts', '8de5393d406efbcad7b35d3f0095530713c88594fb6dc130fa8e0e3a6a19e2ba'],
  ['i layer_3_domain/entities/produto.defs.ts', 'adb1f0a5fdab395facb8074c94826d9cd88aa21420ae28be0c8d5527d9d7e39e'],
]);

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
  texts.set('_102047_/l2/controleEstoque/web/contracts/produtos.defs.ts', readFileSync(CONTRACT, 'utf8'));
  return texts;
}

const hash = (result: EmitResult | EmitFailure, key: string): string => {
  assert.equal('code' in result, false, 'code' in result ? `${key}: ${result.code} ${result.detail}` : key);
  return createHash('sha256').update((result as EmitResult).source).digest('hex');
};

void test('the all-required seed generates byte for byte what it generated before b1-P1', async () => {
  const texts = seed();
  const read = async (ref: string): Promise<string | null> => {
    const own = texts.get(ref);
    if (own !== undefined) return own;
    const match = /^_(\d+)_\/(.+)$/.exec(ref);
    if (!match) return null;
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
  const modules = defs.map(([, definition]) => definition);
  const measured = new Map<string, string>();
  for (const [path, definition] of defs) {
    const output = path.replace(/\.defs\.ts$/, '.ts');
    const rel = path.slice(PREFIX.length);
    const type = definition.artifactType;
    if (type === 'usecase') measured.set(`s ${rel}`, hash(await emitUsecase(definition, output, read), rel));
    if (type === 'requestService') measured.set(`s ${rel}`, hash(await emitRequestService(definition, output, read, modules, 'structure'), rel));
    if (type === 'httpController') measured.set(`s ${rel}`, hash(await emitController(definition, output, read, modules), rel));
    if (BEHAVIOR.has(type)) measured.set(`i ${rel}`, hash(await emitBehavior(`implement.${type}`, definition, output, read, modules), rel));
  }
  assert.deepEqual([...measured].sort(), [...PINNED].sort());
});
