/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/promptMarkers.test.ts" enhancement="_blank"/>

// Every prompt this agent loads must DECLARE its model, and every tool-calling prompt whose output
// crosses a gate must ask for server-side schema validation (skills/modelTypes.md).
//
// The marker is not cosmetic: an omitted `modelType` may be routed to a deployment-specific alias that
// is absent or inactive, and the step fails before the model ever produces a payload. A prompt added
// after the initial implementation (the judge batch worker, the repairs, the seed planner) is exactly
// the one at risk, which is why this test enumerates the folder instead of listing names.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODEL_TYPES = new Set(['classifier', 'general', 'reasoning', 'code', 'design', 'image', 'translate', 'audio']);

/** Every prompt file the agent owns: `steps/<step>/prompt*.md`. */
function promptFiles(): Array<{ rel: string; source: string }> {
  return readdirSync(HERE, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .flatMap(entry => readdirSync(path.join(HERE, entry.name))
      .filter(name => /^prompt.*\.md$/.test(name))
      .map(name => ({ rel: `${entry.name}/${name}`, source: readFileSync(path.join(HERE, entry.name, name), 'utf8') })));
}

const markerOf = (source: string, key: string): string =>
  (new RegExp(`<!--\\s*${key}:\\s*([A-Za-z0-9_-]+)\\s*-->`).exec(source)?.[1] || '');

void test('every prompt of the agent declares an active modelType', () => {
  const prompts = promptFiles();
  assert.ok(prompts.length >= 8, `expected the step prompts to be found, got ${prompts.length}`);
  for (const prompt of prompts) {
    const modelType = markerOf(prompt.source, 'modelType');
    assert.ok(MODEL_TYPES.has(modelType), `${prompt.rel}: missing or unknown modelType marker (got '${modelType}')`);
  }
});

void test('every tool-calling prompt asks for server-side schema validation', () => {
  // These are the steps whose output crosses a deterministic gate: a malformed argument costs a repair
  // round, and ajv + one alternate-alias retry in collab-llm is free.
  const gated = ['gen-domain', 'gen-port', 'gen-table', 'gen-adapter', 'gen-usecase', 'gen-seeds', 'judge'];
  for (const prompt of promptFiles()) {
    const step = prompt.rel.split('/')[0];
    if (!gated.includes(step)) continue;
    assert.equal(markerOf(prompt.source, 'x-tool-strict'), 'true', `${prompt.rel}: missing <!-- x-tool-strict: true -->`);
  }
});

void test('the system prompts built in code carry the marker too', () => {
  // Not every prompt is a file: the materializer composes its system prompt, and the fan-out parent
  // carries a placeholder interaction. Both must declare the model.
  const core = readFileSync(path.join(HERE, '..', 'helpers', 'cbMaterializeCore.ts'), 'utf8');
  const shared = readFileSync(path.join(HERE, '..', 'helpers', 'cbShared.ts'), 'utf8');
  assert.match(core, /<!-- modelType: \$\{modelType\} -->/);
  assert.match(shared, /content: '<!-- modelType: code -->'/);
});
