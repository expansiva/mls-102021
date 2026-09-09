/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbMdmL4I18nGuard.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const files = [
  fileURLToPath(new URL('./cbDefsSource.ts', import.meta.url)),
  fileURLToPath(new URL('./cbAccess.ts', import.meta.url)),
  fileURLToPath(new URL('./cbMdmL4.test.ts', import.meta.url)),
  fileURLToPath(new URL('./cbInferenceRatchet.test.ts', import.meta.url)),
  fileURLToPath(new URL('../steps/gen-usecase/usecaseOwnerItem.ts', import.meta.url)),
  fileURLToPath(new URL('../steps/gen-usecase/prompt.md', import.meta.url)),
  fileURLToPath(new URL('../steps/scan/agentCbValidateL4Readiness.ts', import.meta.url)),
  fileURLToPath(new URL('./fixtures/n09/ce01SessionScope.ts', import.meta.url)),
  fileURLToPath(new URL('./fixtures/n09/ce05SessionScope.ts', import.meta.url)),
  fileURLToPath(new URL('./fixtures/n09/ce09SessionScope.ts', import.meta.url)),
];

test('n05 touched files stay English in comments and identifiers', () => {
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /portuguese\s*\?/, file);
    for (const line of source.split('\n')) {
      const trimmed = line.trim();
      const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('<!--');
      if (!isComment) continue;
      assert.doesNotMatch(line, /[À-ÿ]/, `${file}: ${trimmed}`);
    }
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/`(?:\\.|[^`])*`/g, '')
      .replace(/'(?:\\.|[^'\\])*'/g, '')
      .replace(/"(?:\\.|[^"\\])*"/g, '');
    assert.doesNotMatch(stripped, /[À-ÿ]/, file);
  }
});
