/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1Adopt.test.ts" enhancement="_blank"/>

// d1_270: `/adopt` records a receipt with the hash of the disk for each product def of the module, only on a clean tree, and the D1 then rewrites the def when its
// plan changes and still refuses one edited after the adoption. repoHost at 74f17ca3: its inventory holds no hash for the defs and its progress predates the source key, so
// the D1 refused to write a def it had written itself.

import assert from 'node:assert/strict';
import test from 'node:test';

import { seedD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { adoptDefs, adoptReport } from '/_102021_/l2/agentDefsL1/helpers/d1Adopt.js';
import { parseD1Invocation } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';
import { commitD1Unit, progressFile, readAdoptedReceipts } from '/_102021_/l2/agentDefsL1/helpers/d1Receipt.js';
import { fileKey, installStudio, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { artifactFile } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';

const PROJECT = 102047;
const MODULE = 'repoHost';
const PORT = 'l1/repoHost/layer_2_application/ports/repositoryEntryRepository.defs.ts';

function seeded(clean: boolean): TestHost {
  const host = installStudio(PROJECT);
  seedD1Fixture(host, 'repoHost-74f17ca3', PROJECT);
  if (clean) for (const file of Object.values(host.files)) file.status = 'nochange';
  return host;
}

/** Bytes the plan changes (a comment after the export does not: the identity of a def is its semantic hash). */
const changed = (text: string, mark: string): string => text.replace('"interfaceName": "RepositoryEntryRepository"', `"interfaceName": "RepositoryEntryRepository${mark}"`);

async function writePort(source: string) {
  return commitD1Unit({
    project: PROJECT,
    moduleName: MODULE,
    step: 'persistence40',
    unitId: 'persistence40',
    draftText: source,
    parts: [{ defPath: `_${PROJECT}_/${PORT}`, source }],
  });
}

void test('the command is /adopt, one module, no step', () => {
  assert.deepEqual(parseD1Invocation('@@agentDefsL1 repoHost /adopt'), { module: 'repoHost', command: 'adopt', refused: '' });
  assert.match(parseD1Invocation('@@agentDefsL1 repoHost /adopt now').refused, /Unexpected argument/u);
});

void test('a dirty tree refuses the command, lists the files, and adopts nothing', async () => {
  const host = seeded(true);
  const port = artifactFile(PROJECT, `_${PROJECT}_/${PORT}`)!;
  host.files[fileKey(port)].status = 'changed';
  const result = await adoptDefs(PROJECT, MODULE);
  assert.deepEqual(result, { adopted: [], unchanged: [], dirty: [PORT] });
  assert.match(adoptReport(MODULE, result), /refused\. These files of l1\/repoHost are not the git HEAD, and nothing was adopted: l1\/repoHost\/layer_2_application\/ports\/repositoryEntryRepository\.defs\.ts/u);
  assert.equal((await readAdoptedReceipts(PROJECT, MODULE)).size, 0);
  assert.equal(host.files[fileKey(progressFile(PROJECT, MODULE, 'adopt', 'adopt'))], undefined, 'no trace is written');
});

void test('before the adoption the D1 refuses to write a def it has no honoured receipt for; after it, it writes, and the adopted receipt gives way to the new one', async () => {
  const host = seeded(true);
  const port = host.files[fileKey(artifactFile(PROJECT, `_${PROJECT}_/${PORT}`)!)];
  const original = port.content;
  const refused = await writePort(changed(original, 'A'));
  assert.match(refused.issues.join(' '), /exists without a receipt/u);
  assert.equal(port.content, original);

  const result = await adoptDefs(PROJECT, MODULE);
  assert.equal(result.dirty.length, 0);
  assert.ok(result.adopted.includes(PORT), result.adopted.join(', '));
  assert.equal((await readAdoptedReceipts(PROJECT, MODULE)).has(PORT), true);

  const written = await writePort(changed(original, 'A'));
  assert.deepEqual(written.issues, []);
  assert.equal(port.content, changed(original, 'A'));
  assert.equal((await readAdoptedReceipts(PROJECT, MODULE)).has(PORT), false, 'the unit that wrote it has a receipt of its own now');
  assert.equal((await readAdoptedReceipts(PROJECT, MODULE)).size, result.adopted.length - 1, 'the others stay adopted');
});

void test('a def edited after the adoption is still refused, and the adoption is idempotent', async () => {
  const host = seeded(true);
  const first = await adoptDefs(PROJECT, MODULE);
  assert.ok(first.adopted.length > 0);
  const port = host.files[fileKey(artifactFile(PROJECT, `_${PROJECT}_/${PORT}`)!)];
  port.content = changed(port.content, 'ByHand');
  const refused = await writePort(port.content.replace('ByHand', 'Regenerated'));
  assert.match(refused.issues.join(' '), /does not match the bytes on disk/u);
  assert.match(port.content, /ByHand/u);
  // Same tree, same answer: what an earlier adoption holds is not adopted again.
  const clean = seeded(true);
  const once = await adoptDefs(PROJECT, MODULE);
  const twice = await adoptDefs(PROJECT, MODULE);
  assert.deepEqual(twice.adopted, []);
  assert.deepEqual(twice.unchanged, once.adopted.slice().sort());
  assert.ok(clean);
});
