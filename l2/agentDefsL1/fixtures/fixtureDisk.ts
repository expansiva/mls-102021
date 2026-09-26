/// <mls fileReference="_102021_/l2/agentDefsL1/fixtures/fixtureDisk.ts" enhancement="_blank"/>

import { cpSync, existsSync, readdirSync, renameSync, statSync } from 'node:fs';
import path from 'node:path';

/** Client copies are stored as `.txt` so `scanImportRefs` does not compile them. */
export function fixtureLogicalName(storedName: string): string {
  if (storedName.endsWith('.defs.txt')) return `${storedName.slice(0, -4)}.ts`;
  if (storedName.endsWith('.txt')) {
    const base = storedName.split(/[\\/]/).pop() ?? storedName;
    if (base === 'README.txt') return storedName;
    return `${storedName.slice(0, -4)}.ts`;
  }
  return storedName;
}

export function fixtureLogicalRel(rel: string): string {
  const parts = rel.split('/');
  const last = parts[parts.length - 1] ?? '';
  parts[parts.length - 1] = fixtureLogicalName(last);
  return parts.join('/');
}

export function resolveFixtureFile(abs: string): string {
  if (existsSync(abs)) return abs;
  let stored = abs;
  if (abs.endsWith('.defs.ts')) stored = `${abs.slice(0, -3)}.txt`;
  else if (abs.endsWith('.ts') && !abs.endsWith('.d.ts') && !abs.endsWith('.test.ts')) stored = `${abs.slice(0, -3)}.txt`;
  return existsSync(stored) ? stored : abs;
}

export function restoreFixtureTree(root: string): void {
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const abs = path.join(dir, name);
      if (statSync(abs).isDirectory()) {
        walk(abs);
        continue;
      }
      const logical = fixtureLogicalName(name);
      if (logical !== name) renameSync(abs, path.join(dir, logical));
    }
  };
  walk(root);
}

export function copyFixtureSources(src: string, dest: string): void {
  cpSync(src, dest, { recursive: true });
  restoreFixtureTree(dest);
}
