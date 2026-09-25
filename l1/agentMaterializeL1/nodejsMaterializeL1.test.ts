/// <mls fileReference="_102021_/l1/agentMaterializeL1/nodejsMaterializeL1.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import type { MaterializeStateStore } from '/_102021_/l2/agentMaterializeL1/core/state.js';
import { parseCliArgs } from '/_102021_/l2/agentMaterializeL1/run/command.js';
import {
  createDiskHost,
  executeCli,
  mapOwnedPath,
  readProjectProfile,
  resolveRunRoots,
  scenarioCatalogRef,
  type CliHooks,
} from '/_102021_/l1/agentMaterializeL1/nodejsMaterializeL1.js';

const HERE = dirname(fileURLToPath(import.meta.url));

void test('help and a fake host simulate without credentials or a shared output tree', async () => {
  const source = await readFile(join(HERE, 'nodejsMaterializeL1.ts'), 'utf8');
  assert.equal(source.includes('process.env'), false);
  assert.equal(source.includes('DATABASE_URL'), true);
  assert.equal(source.includes('process.env.DATABASE_URL'), false);

  const help = await executeCli(['--help'], hooks());
  assert.equal(help.exitCode, 0);
  assert.match(help.stdout, /@@agentMaterializeL1 \/help/);
  assert.match(help.stdout, /nodejsMaterializeL1\.ts --project/);
  assert.match(help.stdout, /--source-root/);
  assert.equal(help.result, null);

  const refused = await executeCli(['--project', '102047'], hooks());
  assert.equal(refused.exitCode, 2);
  assert.match(refused.stderr, /--module/);

  let modelCalls = 0;
  const simulated = await executeCli(
    ['--project', '102047', '--module', 'agendaClinica', '--stage', 'simulate'],
    hooks({
      llm: () => {
        modelCalls += 1;
        return Promise.reject(new Error('offline'));
      },
      units: [noteUnit()],
    }),
  );
  assert.equal(simulated.exitCode, 0);
  assert.match(simulated.stdout, /ended: SIMULATED/);
  assert.match(simulated.stdout, /llmCalls: 0/);
  assert.match(simulated.stdout, /wrote: no/);
  assert.equal(modelCalls, 0);
  assert.equal(simulated.result?.profile.databaseEnv, 'DATABASE_URL_TEST');
});

void test('disk writes stay inside the isolated output and a database url is not a path', async () => {
  const root = await mkdtemp(join(tmpdir(), 'm1-02-'));
  const writeRoot = join(root, 'out');
  const readRoot = join(root, 'src');
  try {
    assert.equal(mapOwnedPath(writeRoot, 102047, '../outside.ts'), null);
    assert.equal(mapOwnedPath(writeRoot, 102047, 'postgres://localhost/app'), null);
    const inside = mapOwnedPath(writeRoot, 102047, '_102047_/l1/agendaClinica/layer_3_domain/entities/note.ts');
    assert.ok(inside?.includes(`${join('out', 'mls-102047', 'l1')}`));

    await mkdir(join(readRoot, 'mls-102047', 'l5'), { recursive: true });
    await mkdir(join(readRoot, 'mls-102047', 'l1', 'agendaClinica', 'layer_3_domain', 'entities'), { recursive: true });
    await writeFile(join(readRoot, 'mls-102047', 'l5', 'project.json'), JSON.stringify({ appEnv: 'production' }));
    const profile = await readProjectProfile(readRoot, 102047);
    assert.equal(profile.mode, 'production');
    assert.equal(profile.declared, true);
    const absent = await readProjectProfile(readRoot, 102099);
    assert.equal(absent.declared, false);

    const disk = createDiskHost(readRoot, writeRoot, 102047);
    const ran = await executeCli(['--project', '102047', '--module', 'agendaClinica', '--stage', 'simulate'], {
      host: disk,
      readProfile: () => readProjectProfile(readRoot, 102047),
      loadUnits: async () => [noteUnit()],
    });
    assert.match(ran.stdout, /profile: production/);
    assert.match(ran.stdout, /databaseEnv: DATABASE_URL/);
    assert.match(ran.stdout, /wrote: no/);
    await assert.rejects(() => disk.state.writeOwned('../note.ts', new TextEncoder().encode('x')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test('source root reads this project and leaves platform projects on the repository root', async () => {
  const root = await mkdtemp(join(tmpdir(), 'm1-05-'));
  const repo = join(root, 'repo');
  const sandbox = join(root, 'sandbox');
  try {
    const absent = parseCliArgs(['--project', '102047', '--module', 'agendaClinica']);
    assert.equal(absent.refusal, '');
    assert.equal(absent.sourceRoot, '');
    const parsed = parseCliArgs(['--project', '102047', '--module', 'agendaClinica', '--source-root', sandbox, '--flow', 'consultas_recepcionista']);
    assert.equal(parsed.refusal, '');
    assert.equal(parsed.sourceRoot, sandbox);
    assert.equal(parsed.flow, 'consultas_recepcionista');
    assert.match(parseCliArgs(['--project', '102047', '--module', 'agendaClinica', '--source-root', '../out']).refusal, /Source root/);
    assert.match(parseCliArgs(['--project', '102047', '--module', 'agendaClinica', '--flow', 'a/b']).refusal, /Flow id/);

    const roots = resolveRunRoots(repo, sandbox, sandbox);
    assert.equal(roots.readRoot, sandbox);
    assert.equal(roots.writeRoot, sandbox);
    assert.equal(roots.platformRoot, repo);
    const same = resolveRunRoots(repo, '', '');
    assert.equal(same.readRoot, repo);
    assert.equal(same.writeRoot, repo);
    assert.equal(same.platformRoot, null);
    assert.equal(scenarioCatalogRef(102047, 'agendaClinica'), '_102047_/l1/agendaClinica/materialization/agentMaterializeL1/scenarioCatalog.ts');

    const marker = '_102034_/l1/server/marker.ts';
    const own = '_102047_/l2/agendaClinica/web/contracts/note.defs.ts';
    await mkdir(join(sandbox, 'mls-102034', 'l1', 'server'), { recursive: true });
    await mkdir(join(sandbox, 'mls-102047', 'l2', 'agendaClinica', 'web', 'contracts'), { recursive: true });
    await mkdir(join(repo, 'mls-102034', 'l1', 'server'), { recursive: true });
    await writeFile(join(sandbox, 'mls-102034', 'l1', 'server', 'marker.ts'), 'decoy');
    await writeFile(join(repo, 'mls-102034', 'l1', 'server', 'marker.ts'), 'platform');
    await writeFile(join(sandbox, 'mls-102047', 'l2', 'agendaClinica', 'web', 'contracts', 'note.defs.ts'), 'sandbox-contract');

    const split = createDiskHost(sandbox, sandbox, 102047, repo);
    assert.equal(await split.io.read(marker), 'platform');
    assert.equal(await split.io.read(own), 'sandbox-contract');
    assert.equal(await split.io.read('_102099_/l1/other.ts'), null);

    const current = createDiskHost(sandbox, sandbox, 102047);
    assert.equal(await current.io.read(marker), null);
    assert.equal(await current.io.read(own), 'sandbox-contract');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

function noteUnit(): { defPath: string; definition: M1Definition } {
  return {
    defPath: '_102047_/l1/agendaClinica/layer_3_domain/entities/note.defs.ts',
    definition: {
      schemaVersion: M1_DEFINITION_SCHEMA,
      artifactType: 'domainEntity',
      artifactId: 'Note',
      moduleName: 'agendaClinica',
      status: 'pending',
      dependencies: [],
      data: {
        entityId: 'Note',
        storageTarget: 'moduleDatabase',
        fields: [{ name: 'id', type: 'uuid' }],
        lifecycle: { states: [], transitions: [] },
        invariants: [],
        imports: [],
      },
    },
  };
}

function hooks(patch: { llm?: CliHooks['host']['llm']; units?: CliHooks extends never ? never : ReturnType<typeof noteUnit>[] } = {}): CliHooks {
  const files = new Map<string, string>();
  const state = {
    async readReceipt() { return null; },
    async writeReceipt() { throw new Error('simulate must not write a receipt'); },
    async readOwned() { return null; },
    async writeOwned() { throw new Error('simulate must not write'); },
    async removeOwned() { return { removed: [], kept: [] }; },
    async readRevision() { return null; },
  } as MaterializeStateStore;
  return {
    host: {
      io: { async read(ref: string) { return files.get(ref) ?? null; } },
      state,
      runners: {},
      llm: patch.llm,
      now: () => '2026-09-25T12:00:00.000Z',
      commit: '1b94018',
      monitorError: null,
    },
    readProfile: async () => ({ mode: 'development', declared: true }),
    loadUnits: async () => patch.units ?? [noteUnit()],
  };
}
