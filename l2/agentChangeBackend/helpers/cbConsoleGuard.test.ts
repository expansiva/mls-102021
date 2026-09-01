/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbConsoleGuard.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const AGENT = path.resolve(ROOT, '..');

type Kind = 'info' | 'log' | 'warn';
const CALL = /(?<![\w.])console\.(info|log|warn)\s*\(/g;

/** Remaining non-error prints on the CB run path. A NEW print outside this list fails. */
const ALLOWED: Record<string, { info?: number; log?: number; warn?: number; why: string }> = {
  'helpers/cbShared.ts': { warn: 1, why: 'saveAgentTrace failed — last-chance' },
  'helpers/cbRepair.ts': { warn: 4, why: 'best-effort persist of repair/health/cost/run report failed' },
  'helpers/cbMaterializeIo.ts': { warn: 10, info: 1, why: 'compile/import/save fallbacks + existing-model refresh/read; info is registry-key mismatch' },
  'steps/materialize/agentCbMaterialize.ts': { warn: 1, why: 'unreadable context ref omitted from the prompt' },
  'steps/judge/agentCbJudge.ts': { warn: 1, why: 'project file index refresh failed before judging' },
  'steps/gen-http/agentCbHttpController.ts': { warn: 1, why: 'project file index refresh failed before generating controllers' },
  'steps/gen-seed-assets/agentCbSeedAssets.ts': { warn: 3, why: 'optional image step degrades to warning and continues' },
  'steps/register/agentCbRegister.ts': { warn: 2, why: 'composition/config merge warning, run continues' },
  'steps/validate-all/agentCbValidateAll.ts': { warn: 2, why: 'scan warning + forceDefsStale failed' },
};

function collect(): Map<string, Record<Kind, number>> {
  const counts = new Map<string, Record<Kind, number>>();
  const walk = (current: string, relBase: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const rel = relBase ? path.join(relBase, entry.name) : entry.name;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full, rel);
        continue;
      }
      if (!entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts') || entry.name.startsWith('nodejs')) continue;
      const text = readFileSync(full, 'utf8');
      let match: RegExpExecArray | null;
      CALL.lastIndex = 0;
      while ((match = CALL.exec(text))) {
        const kind = match[1] as Kind;
        const slot = counts.get(rel) || { info: 0, log: 0, warn: 0 };
        slot[kind] += 1;
        counts.set(rel, slot);
      }
    }
  };
  walk(AGENT, '');
  return counts;
}

void test('CB run path: rebuild-all archive is not printed; remaining prints are declared', () => {
  const counts = collect();
  assert.equal(counts.get('agentChangeBackend.ts')?.info ?? 0, 0);
  const unexpected: string[] = [];
  for (const [file, slot] of counts) {
    const allow = ALLOWED[file];
    if (!allow) {
      unexpected.push(`${file} info=${slot.info} log=${slot.log} warn=${slot.warn} (not in allowlist)`);
      continue;
    }
    for (const kind of ['info', 'log', 'warn'] as Kind[]) {
      const got = slot[kind];
      const max = allow[kind] ?? 0;
      if (got > max) unexpected.push(`${file} ${kind}=${got} max=${max} (${allow.why})`);
    }
  }
  for (const [file, allow] of Object.entries(ALLOWED)) {
    if (!counts.has(file)) unexpected.push(`${file} listed in allowlist but has no console.info|log|warn — drop the exception`);
  }
  assert.equal(unexpected.length, 0, unexpected.join('\n'));
});
