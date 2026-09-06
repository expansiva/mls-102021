/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbCli.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCli } from './cbCli.js';

function expectCli(
  raw: string,
  kind: ReturnType<typeof parseCli>['kind'],
  module: string,
  extra: { noAssets?: boolean; fast?: boolean; nochain?: boolean } = {},
) {
  assert.deepEqual(parseCli(raw), {
    kind,
    module,
    noAssets: extra.noAssets ?? false,
    fast: extra.fast ?? false,
    nochain: extra.nochain ?? false,
  });
}

test('parseCli: command detection with the optional [module] argument', () => {
  // Empty / bare mention -> autonomous run, no explicit module (auto-scope to first pending).
  expectCli('@@changeBackend', 'run', '');
  expectCli('', 'run', '');

  // Commands without a module keep module empty.
  expectCli('@@changeBackend /rebuild all', 'rebuild-all', '');
  expectCli('@@changeBackend /rebuild defs', 'rebuild-defs', '');
  expectCli('@@changeBackend /rebuild seeds', 'rebuild-seeds', '');
  expectCli('@@changeBackend /rebuild seeds cafeFlow', 'rebuild-seeds', 'cafeFlow');
  // 'seeds' is a keyword, never a module name.
  expectCli('@@changeBackend rebuild seeds', 'rebuild-seeds', '');
  expectCli('@@changeBackend /run', 'run', '');
  expectCli('@@changeBackend /help', 'help', '');

  // Commands WITH a module — case is preserved (module names are case-sensitive).
  expectCli('@@changeBackend /rebuild all cafeFlow', 'rebuild-all', 'cafeFlow');
  expectCli('@@changeBackend /rebuild defs petShop', 'rebuild-defs', 'petShop');
  expectCli('@@changeBackend /run cafeFlow', 'run', 'cafeFlow');

  // A bare non-keyword token means: run (continue) that module.
  expectCli('@@changeBackend cafeFlow', 'run', 'cafeFlow');

  // 'all' is a CLI keyword, never a module.
  expectCli('@@changeBackend all', 'help', '');
  expectCli('@@changeBackend /rebuild all all', 'rebuild-all', '');

  // Command keywords are case-insensitive; the module token keeps its original case.
  expectCli('@@changeBackend /REBUILD ALL CafeFlow', 'rebuild-all', 'CafeFlow');
});

test('parseCli T11: --no-assets is a FLAG — never a module, and never turns a run into help', () => {
  // The flag alone is a valid autonomous run (not keyword-less noise).
  expectCli('@@changeBackend --no-assets', 'run', '', { noAssets: true });
  // Combines with any command, before or after the module; the module still parses correctly.
  expectCli('@@changeBackend cafeFlow --no-assets', 'run', 'cafeFlow', { noAssets: true });
  expectCli('@@changeBackend --no-assets cafeFlow', 'run', 'cafeFlow', { noAssets: true });
  expectCli('@@changeBackend /rebuild all cafeFlow --no-assets', 'rebuild-all', 'cafeFlow', { noAssets: true });
  expectCli('@@changeBackend /rebuild seeds --no-assets', 'rebuild-seeds', '', { noAssets: true });
  // Slash style and the compact spelling are accepted too.
  expectCli('@@changeBackend /no-assets cafeFlow', 'run', 'cafeFlow', { noAssets: true });
  expectCli('@@changeBackend cafeFlow --noassets', 'run', 'cafeFlow', { noAssets: true });
  // Absent -> false (assets generated as before).
  assert.equal(parseCli('@@changeBackend cafeFlow').noAssets, false);
  // An unrelated dash-flag is ignored as a module but does NOT enable the skip.
  expectCli('@@changeBackend --verbose cafeFlow', 'run', 'cafeFlow');
});

test('parseCli: /fast is a flag, never a module, and combines with /rebuild all', () => {
  expectCli('@@changeBackend /fast', 'run', '', { fast: true });
  expectCli('@@agentChangeBackend /fast /rebuild all petShop', 'rebuild-all', 'petShop', { fast: true });
  expectCli('@@changeBackend /rebuild all petShop /fast', 'rebuild-all', 'petShop', { fast: true });
  assert.equal(parseCli('@@changeBackend cafeFlow').fast, false);
});

test('parseCli: /nochain is a flag, never a module, and does not match /nochainlane', () => {
  expectCli('@@changeBackend', 'run', '');
  expectCli('@@changeBackend /fast', 'run', '', { fast: true });
  expectCli('@@changeBackend /fast /nochain /rebuild all petShop', 'rebuild-all', 'petShop', { fast: true, nochain: true });
  expectCli('@@changeBackend /nochain', 'run', '', { nochain: true });
  expectCli('@@changeBackend /nochainlane petShop', 'run', 'petShop');
  assert.equal(parseCli('@@changeBackend cafeFlow').nochain, false);
});
