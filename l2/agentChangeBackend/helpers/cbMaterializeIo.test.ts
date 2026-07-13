/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { syntaxDiagnostics } from './cbSyntaxValidation.js';

test('syntaxDiagnostics rejects TS5076 even when Monaco is unavailable', () => {
  assert.match(syntaxDiagnostics('const page = input.cursor ?? fallback || "start";')[0] || '', /TS5076/);
  assert.deepEqual(syntaxDiagnostics('const page = (input.cursor ?? fallback) || "start";'), []);
});
