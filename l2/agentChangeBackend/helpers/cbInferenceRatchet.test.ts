/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbInferenceRatchet.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * One-way ratchet: the CB must not gain name-suffix / substring inference of business meaning.
 * Counts measured 2026-09-08 after n05 removed mdmSubtypeFor / countryCodeForLanguage and routed
 * v7 FKs through relationships[]. v6 fallbacks stay until regeneration. The test fails only when
 * a count rises. Cleaning a file means lowering the number here.
 */
const ROOT = dirname(fileURLToPath(import.meta.url));

const ID_DOLLAR = /\/Id\$\/[gium]*/g;
const ENDS_WITH_ID = /\.endsWith\(\s*['"](?:Id|_id|id)['"]\s*\)/gi;
const INCLUDES_WORD = /\.includes\(\s*['"][A-Za-z]{2,}['"]\s*\)/g;

interface InferenceLegacy { idDollar: number; endsWithId: number; includesWord: number; since: string }

const LEGACY: Record<string, InferenceLegacy> = {
  'cbSeedsCore.ts': { idDollar: 3, endsWithId: 3, includesWord: 0, since: '2026-09-08' },
  'cbShared.ts': { idDollar: 1, endsWithId: 0, includesWord: 0, since: '2026-09-08' },
  'cbDefsSource.ts': { idDollar: 0, endsWithId: 0, includesWord: 0, since: '2026-09-08' },
  'cbAccess.ts': { idDollar: 0, endsWithId: 0, includesWord: 0, since: '2026-09-09' },
  '../steps/gen-usecase/usecaseOwnerItem.ts': { idDollar: 0, endsWithId: 0, includesWord: 0, since: '2026-09-08' },
};

function countsIn(source: string): { idDollar: number; endsWithId: number; includesWord: number } {
  return {
    idDollar: [...source.matchAll(ID_DOLLAR)].length,
    endsWithId: [...source.matchAll(ENDS_WITH_ID)].length,
    includesWord: [...source.matchAll(INCLUDES_WORD)].length,
  };
}

test('CB does not gain name-inference of ids, FKs or MDM subtype (one-way ratchet)', () => {
  for (const [relative, expected] of Object.entries(LEGACY)) {
    const source = readFileSync(join(ROOT, relative), 'utf8');
    const got = countsIn(source);
    if (got.idDollar > expected.idDollar) {
      assert.fail(`${relative} /Id$/ count rose from ${expected.idDollar} (since ${expected.since}) to ${got.idDollar}`);
    }
    if (got.endsWithId > expected.endsWithId) {
      assert.fail(`${relative} endsWith(Id) count rose from ${expected.endsWithId} (since ${expected.since}) to ${got.endsWithId}`);
    }
    if (got.includesWord > expected.includesWord) {
      assert.fail(`${relative} .includes('<word>') count rose from ${expected.includesWord} (since ${expected.since}) to ${got.includesWord}`);
    }
  }
});

test('mdmSubtypeFor and countryCodeForLanguage are gone', () => {
  const seeds = readFileSync(join(ROOT, 'cbSeedsCore.ts'), 'utf8');
  const owner = readFileSync(join(ROOT, '../steps/gen-usecase/usecaseOwnerItem.ts'), 'utf8');
  assert.doesNotMatch(seeds, /\bmdmSubtypeFor\b/);
  assert.doesNotMatch(seeds, /\bcountryCodeForLanguage\b/);
  assert.doesNotMatch(owner, /\bmdmSubtypeFor\b/);
  assert.doesNotMatch(owner, /\bcountryCodeForLanguage\b/);
});
