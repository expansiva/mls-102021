/// <mls fileReference="_102021_/l2/agentDefsL1/fixtures/readFixture.ts" enhancement="_blank"/>

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtureLogicalRel } from '/_102021_/l2/agentDefsL1/fixtures/fixtureDisk.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Logical path (`.defs.ts`, `.json`) to the stored bytes. `SOURCE.md` is omitted. */
export function loadD1Fixture(id: string): Readonly<Record<string, string>> {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('bad fixture id.');
  const root = path.join(HERE, id);
  if (!existsSync(root)) throw new Error(`missing D1 fixture ${id}.`);
  const files: Record<string, string> = {};
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const abs = path.join(dir, name);
      if (statSync(abs).isDirectory()) {
        walk(abs);
        continue;
      }
      if (name === 'SOURCE.md' || name === 'DERIVED.md') continue;
      const rel = path.relative(root, abs).split(path.sep).join('/');
      files[fixtureLogicalRel(rel)] = readFileSync(abs, 'utf8');
    }
  };
  walk(root);
  return files;
}
