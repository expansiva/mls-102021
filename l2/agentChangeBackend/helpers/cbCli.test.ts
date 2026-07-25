/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbCli.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCli } from './cbCli.js';

test('parseCli: command detection with the optional [module] argument', () => {
  // Empty / bare mention -> autonomous run, no explicit module (auto-scope to first pending).
  assert.deepEqual(parseCli('@@changeBackend'), { kind: 'run', module: '', noAssets: false });
  assert.deepEqual(parseCli(''), { kind: 'run', module: '', noAssets: false });

  // Commands without a module keep module empty.
  assert.deepEqual(parseCli('@@changeBackend /rebuild all'), { kind: 'rebuild-all', module: '', noAssets: false });
  assert.deepEqual(parseCli('@@changeBackend /rebuild defs'), { kind: 'rebuild-defs', module: '', noAssets: false });
  assert.deepEqual(parseCli('@@changeBackend /rebuild seeds'), { kind: 'rebuild-seeds', module: '', noAssets: false });
  assert.deepEqual(parseCli('@@changeBackend /rebuild seeds cafeFlow'), { kind: 'rebuild-seeds', module: 'cafeFlow', noAssets: false });
  // 'seeds' is a keyword, never a module name.
  assert.deepEqual(parseCli('@@changeBackend rebuild seeds'), { kind: 'rebuild-seeds', module: '', noAssets: false });
  assert.deepEqual(parseCli('@@changeBackend /run'), { kind: 'run', module: '', noAssets: false });
  assert.deepEqual(parseCli('@@changeBackend /help'), { kind: 'help', module: '', noAssets: false });

  // Commands WITH a module — case is preserved (module names are case-sensitive).
  assert.deepEqual(parseCli('@@changeBackend /rebuild all cafeFlow'), { kind: 'rebuild-all', module: 'cafeFlow', noAssets: false });
  assert.deepEqual(parseCli('@@changeBackend /rebuild defs petShop'), { kind: 'rebuild-defs', module: 'petShop', noAssets: false });
  assert.deepEqual(parseCli('@@changeBackend /run cafeFlow'), { kind: 'run', module: 'cafeFlow', noAssets: false });

  // A bare non-keyword token means: run (continue) that module.
  assert.deepEqual(parseCli('@@changeBackend cafeFlow'), { kind: 'run', module: 'cafeFlow', noAssets: false });

  // 'all' is a CLI keyword, never a module.
  assert.deepEqual(parseCli('@@changeBackend all'), { kind: 'help', module: '', noAssets: false });
  assert.deepEqual(parseCli('@@changeBackend /rebuild all all'), { kind: 'rebuild-all', module: '', noAssets: false });

  // Command keywords are case-insensitive; the module token keeps its original case.
  assert.deepEqual(parseCli('@@changeBackend /REBUILD ALL CafeFlow'), { kind: 'rebuild-all', module: 'CafeFlow', noAssets: false });
});

test('parseCli T11: --no-assets is a FLAG — never a module, and never turns a run into help', () => {
  // The flag alone is a valid autonomous run (not keyword-less noise).
  assert.deepEqual(parseCli('@@changeBackend --no-assets'), { kind: 'run', module: '', noAssets: true });
  // Combines with any command, before or after the module; the module still parses correctly.
  assert.deepEqual(parseCli('@@changeBackend cafeFlow --no-assets'), { kind: 'run', module: 'cafeFlow', noAssets: true });
  assert.deepEqual(parseCli('@@changeBackend --no-assets cafeFlow'), { kind: 'run', module: 'cafeFlow', noAssets: true });
  assert.deepEqual(parseCli('@@changeBackend /rebuild all cafeFlow --no-assets'), { kind: 'rebuild-all', module: 'cafeFlow', noAssets: true });
  assert.deepEqual(parseCli('@@changeBackend /rebuild seeds --no-assets'), { kind: 'rebuild-seeds', module: '', noAssets: true });
  // Slash style and the compact spelling are accepted too.
  assert.deepEqual(parseCli('@@changeBackend /no-assets cafeFlow'), { kind: 'run', module: 'cafeFlow', noAssets: true });
  assert.deepEqual(parseCli('@@changeBackend cafeFlow --noassets'), { kind: 'run', module: 'cafeFlow', noAssets: true });
  // Absent -> false (assets generated as before).
  assert.equal(parseCli('@@changeBackend cafeFlow').noAssets, false);
  // An unrelated dash-flag is ignored as a module but does NOT enable the skip.
  assert.deepEqual(parseCli('@@changeBackend --verbose cafeFlow'), { kind: 'run', module: 'cafeFlow', noAssets: false });
});
