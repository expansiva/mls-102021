/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbCli.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCli } from './cbCli.js';

test('parseCli: command detection with the optional [module] argument', () => {
  // Empty / bare mention -> autonomous run, no explicit module (auto-scope to first pending).
  assert.deepEqual(parseCli('@@changeBackend'), { kind: 'run', module: '' });
  assert.deepEqual(parseCli(''), { kind: 'run', module: '' });

  // Commands without a module keep module empty.
  assert.deepEqual(parseCli('@@changeBackend /rebuild all'), { kind: 'rebuild-all', module: '' });
  assert.deepEqual(parseCli('@@changeBackend /rebuild defs'), { kind: 'rebuild-defs', module: '' });
  assert.deepEqual(parseCli('@@changeBackend /run'), { kind: 'run', module: '' });
  assert.deepEqual(parseCli('@@changeBackend /help'), { kind: 'help', module: '' });

  // Commands WITH a module — case is preserved (module names are case-sensitive).
  assert.deepEqual(parseCli('@@changeBackend /rebuild all cafeFlow'), { kind: 'rebuild-all', module: 'cafeFlow' });
  assert.deepEqual(parseCli('@@changeBackend /rebuild defs petShop'), { kind: 'rebuild-defs', module: 'petShop' });
  assert.deepEqual(parseCli('@@changeBackend /run cafeFlow'), { kind: 'run', module: 'cafeFlow' });

  // A bare non-keyword token means: run (continue) that module.
  assert.deepEqual(parseCli('@@changeBackend cafeFlow'), { kind: 'run', module: 'cafeFlow' });

  // 'all' is a CLI keyword, never a module.
  assert.deepEqual(parseCli('@@changeBackend all'), { kind: 'help', module: '' });
  assert.deepEqual(parseCli('@@changeBackend /rebuild all all'), { kind: 'rebuild-all', module: '' });

  // Command keywords are case-insensitive; the module token keeps its original case.
  assert.deepEqual(parseCli('@@changeBackend /REBUILD ALL CafeFlow'), { kind: 'rebuild-all', module: 'CafeFlow' });
});
