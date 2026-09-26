/// <mls fileReference="_102021_/l1/agentMaterializeL1/catalogResume.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import { contentHash } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import { catalogBytes } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';
import { parseCatalog } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import {
  createDiskHost,
  executeCli,
  readProjectProfile,
  loadDefUnits,
} from '/_102021_/l1/agentMaterializeL1/nodejsMaterializeL1.js';

const CLIENT_COMMIT = '84613c0';
const HERE = dirname(fileURLToPath(import.meta.url));
const PLATFORM = join(HERE, '../../..');
const CLIENT = join(PLATFORM, 'mls-102047');
const UPDATE = '_102047_/l1/agendaClinica/layer_2_application/usecases/updateConsulta.defs.ts';
const CONSULTAS = '_102047_/l1/agendaClinica/layer_1_external/adapters/http/controllers/consultas.defs.ts';

void test('a resumed client catalog is rewritten from the commit, and a hand edit conflicts', { timeout: 300_000 }, async () => {
  const before = spawnSync('git', ['-C', CLIENT, 'status', '--porcelain'], { encoding: 'utf8' });
  assert.equal(before.status, 0, before.stderr);
  const root = await mkdtemp(join(tmpdir(), 'm1-19-'));
  const project = join(root, 'mls-102047');
  try {
    await extract(project);
    const first = await implement(root);
    assert.equal(first.result?.catalog?.action, 'written', first.stdout);
    assert.match(first.stdout, /catalog matched the M1 receipt and was rewritten/);
    const catalogPath = join(project, 'l1/agendaClinica/materialization/agentMaterializeL1/scenarioCatalog.ts');
    const ledgerPath = join(project, 'l1/agendaClinica/materialization/agentMaterializeL1/run.json');
    const written = parseCatalog(await readFile(catalogPath, 'utf8'));
    assert.ok(written.catalog);
    const fileHash = await contentHash(catalogBytes(written.catalog));
    const ledger = JSON.parse(await readFile(ledgerPath, 'utf8')) as { catalogInputHash?: string };
    assert.equal(ledger.catalogInputHash, fileHash);
    const owned = JSON.parse(await readFile(join(project, 'l1/agendaClinica/materialization/agentMaterializeL1/owned.json'), 'utf8')) as { catalogHash?: string };
    assert.equal(owned.catalogHash, fileHash);
    const updateLine = lineFor(first.stdout, UPDATE);
    assert.ok(updateLine, first.stdout);
    assert.match(updateLine, /^(PROMOTED|VERIFIED|REUSE) /);
    const consultas = lineFor(first.stdout, CONSULTAS);
    assert.ok(consultas, first.stdout);
    assert.doesNotMatch(consultas, /^BLOCKED_BY /);

    const edited = (await readFile(catalogPath, 'utf8')).replace(
      'The emitted file imports. A broken import is a failure, not an expected red.',
      'hand edit of the emitted catalog',
    );
    assert.notEqual(edited, await readFile(catalogPath, 'utf8'));
    await writeFile(catalogPath, edited);
    const second = await implement(root);
    assert.equal(second.result?.catalog?.action, 'conflict', second.stdout);
    assert.equal(await readFile(catalogPath, 'utf8'), edited);
  } finally {
    await rm(root, { recursive: true, force: true });
    const after = spawnSync('git', ['-C', CLIENT, 'status', '--porcelain'], { encoding: 'utf8' });
    assert.equal(after.stdout, before.stdout);
  }
});

async function extract(project: string): Promise<void> {
  await mkdir(project, { recursive: true });
  const archived = spawnSync('git', ['-C', CLIENT, 'archive', CLIENT_COMMIT, 'l1/agendaClinica', 'l2/agendaClinica', 'l4/agendaClinica', 'l5'], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 });
  assert.equal(archived.status, 0, archived.stderr?.toString());
  const extracted = spawnSync('tar', ['-x', '-C', project], { input: archived.stdout });
  assert.equal(extracted.status, 0, extracted.stderr?.toString());
}

async function implement(root: string) {
  const host = createDiskHost(root, root, 102047, PLATFORM);
  host.catalogRef = '_102047_/l1/agendaClinica/materialization/agentMaterializeL1/scenarioCatalog.ts';
  return executeCli(
    ['--project', '102047', '--module', 'agendaClinica', '--stage', 'implement', '--source-root', root, '--output', root],
    {
      host,
      readProfile: () => readProjectProfile(root, 102047),
      loadUnits: (project, moduleName) => loadDefUnits(root, project, moduleName),
    },
  );
}

function lineFor(stdout: string, defPath: string): string {
  return stdout.split('\n').find(line => line.includes(defPath)) ?? '';
}
