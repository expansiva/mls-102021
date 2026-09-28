/// <mls fileReference="_102021_/l2/agentMaterializeL1/studioHost.test.ts" enhancement="_blank"/>

/**
 * m1_31: the Studio host reads the platform and the l5 root with the same ref policy as the CLI.
 * Two stors: the browser one (another project is indexed only after loadProjectInfoIfNeeded) and
 * the collab-msg one (every project indexed at start).
 */

import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { createDiskHost } from '/_102021_/l1/agentMaterializeL1/nodejsMaterializeL1.js';
import { installStudio, seed, fileKey, type StoredFile, type TestHost } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import type { MaterializeRunHost } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import { createStudioHost, readStudioProfile } from '/_102021_/l2/agentMaterializeL1/studioHost.js';

const PROJECT = 102047;
const MODULE = 'salaEnsaio';

interface Row { ref: string; read: boolean; write: boolean }

/** The table of the spec. `read`/`write` is the expected verdict in both hosts. */
const TABLE: Row[] = [
  { ref: '_102034_/l4/ontology/mdm.defs.ts', read: true, write: false },
  { ref: '_102034_/l1/server/layer_1_external/db.ts', read: true, write: false },
  { ref: '_102027_/l2/libStor.ts', read: true, write: false },
  { ref: `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/nota.ts`, read: true, write: true },
  { ref: `l1/${MODULE}/pipeline/agentMaterializeL1/receipt.json`, read: true, write: true },
  { ref: `_${PROJECT}_/l5/project.json`, read: true, write: true },
  { ref: `_${PROJECT}_/l5/runtime.project.json`, read: true, write: true },
  { ref: `_${PROJECT}_/l5/m1-project-lock.json`, read: true, write: true },
  { ref: '_102099_/l1/x.ts', read: false, write: false },
];

interface Info { project: number; level: number; folder: string; shortName: string; extension: string }

/** Stor key the test expects for a ref (independent of the host's parser). */
function infoOf(ref: string): Info {
  const qualified = /^_(\d+)_\/l(\d)\/(.+)$/.exec(ref);
  const local = /^l(\d)\/(.+)$/.exec(ref)!;
  const project = qualified ? Number(qualified[1]) : PROJECT;
  const level = Number(qualified ? qualified[2] : local[1]);
  const rest = qualified ? qualified[3] : local[2];
  const slash = rest.lastIndexOf('/');
  const folder = slash >= 0 ? rest.slice(0, slash) : '';
  const name = rest.slice(slash + 1);
  const ext = ['.defs.ts', '.json', '.ts'].find(item => name.endsWith(item))!;
  return { project, level, folder, shortName: name.slice(0, -ext.length), extension: ext };
}

function bodyOf(ref: string): string {
  return `body of ${ref}\n`;
}

/** Browser stor: files of another project enter `files` only when the host loads that project. */
function browserStor(host: TestHost, refs: readonly string[], loads: number[]): void {
  const pending = new Map<number, Array<[Info, string]>>();
  for (const ref of refs) {
    const info = infoOf(ref);
    if (info.project === PROJECT) seed(host, info, bodyOf(ref));
    else pending.set(info.project, [...(pending.get(info.project) || []), [info, bodyOf(ref)]]);
  }
  (mls.stor as unknown as { server: unknown }).server = {
    async loadProjectInfoIfNeeded(project: number): Promise<boolean> {
      loads.push(project);
      for (const [info, body] of pending.get(project) || []) seed(host, info, body);
      pending.delete(project);
      return true;
    },
  };
}

/** collab-msg stor: every project indexed at start; loading is a no-op. */
function eagerStor(host: TestHost, refs: readonly string[], loads: number[]): void {
  for (const ref of refs) seed(host, infoOf(ref), bodyOf(ref));
  (mls.stor as unknown as { server: unknown }).server = {
    async loadProjectInfoIfNeeded(project: number): Promise<boolean> {
      loads.push(project);
      return false;
    },
  };
}

async function captureWarn<T>(run: () => Promise<T>): Promise<{ value: T; warnings: string[] }> {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { warnings.push(args.map(String).join(' ')); };
  try {
    return { value: await run(), warnings };
  } finally {
    console.warn = original;
  }
}

async function verdicts(host: MaterializeRunHost, rows: readonly Row[]): Promise<Array<{ ref: string; read: boolean; write: boolean }>> {
  const out: Array<{ ref: string; read: boolean; write: boolean }> = [];
  for (const row of rows) {
    const text = await host.io.read(row.ref);
    let wrote = true;
    try {
      await host.state.writeOwned(row.ref, new TextEncoder().encode(`written ${row.ref}\n`));
    } catch {
      wrote = false;
    }
    out.push({ ref: row.ref, read: text !== null, write: wrote });
  }
  return out;
}

void test('browser stor: platform reads load the project context once per project', async () => {
  const host = installStudio(PROJECT);
  const loads: number[] = [];
  const platform = TABLE.filter(row => !row.ref.startsWith(`_${PROJECT}_`) && !row.ref.startsWith('l1/') && row.read).map(row => row.ref);
  browserStor(host, platform, loads);
  assert.equal(host.files[fileKey(infoOf(platform[0]))], undefined, 'the platform file is not indexed before the load');
  const studio = createStudioHost(PROJECT);
  const { value, warnings } = await captureWarn(async () => {
    const texts: Array<string | null> = [];
    for (const ref of [...platform, ...platform]) texts.push(await studio.io.read(ref));
    return texts;
  });
  assert.deepEqual(value, [...platform, ...platform].map(bodyOf));
  assert.deepEqual([...loads].sort(), [102027, 102034], 'one load per platform project');
  assert.deepEqual(warnings, []);
  assert.equal(host.writes.length, 0);
});

void test('collab-msg stor: platform indexed at start is read the same way', async () => {
  const host = installStudio(PROJECT);
  const loads: number[] = [];
  eagerStor(host, ['_102034_/l4/ontology/mdm.defs.ts'], loads);
  const studio = createStudioHost(PROJECT);
  assert.equal(await studio.io.read('_102034_/l4/ontology/mdm.defs.ts'), bodyOf('_102034_/l4/ontology/mdm.defs.ts'));
  assert.deepEqual(loads, [102034]);
});

void test('no platform context warns with the ref and the project and reads absent', async () => {
  const ref = '_102034_/l4/ontology/mdm.defs.ts';
  installStudio(PROJECT);
  const noServer = await captureWarn(() => createStudioHost(PROJECT).io.read(ref));
  assert.equal(noServer.value, null);
  assert.equal(noServer.warnings.length, 1);
  assert.match(noServer.warnings[0], /_102034_\/l4\/ontology\/mdm\.defs\.ts/);
  assert.match(noServer.warnings[0], /102034/);

  installStudio(PROJECT);
  (mls.stor as unknown as { server: unknown }).server = { loadProjectInfoIfNeeded: () => Promise.reject(new Error('offline')) };
  const failed = await captureWarn(() => createStudioHost(PROJECT).io.read(ref));
  assert.equal(failed.value, null);
  assert.match(failed.warnings.join('\n'), /mdm\.defs\.ts.*102034.*offline/);

  const empty = installStudio(PROJECT);
  eagerStor(empty, [], []);
  const absent = await captureWarn(() => createStudioHost(PROJECT).io.read(ref));
  assert.equal(absent.value, null);
  assert.match(absent.warnings.join('\n'), /mdm\.defs\.ts is absent in project 102034/);

  const quiet = await captureWarn(() => createStudioHost(PROJECT).io.read(`l1/${MODULE}/pipeline/agentMaterializeL1/receipt.json`));
  assert.equal(quiet.value, null);
  assert.deepEqual(quiet.warnings, [], 'a missing file of the target project is not a context failure');
});

void test('l5 root: project.json and runtime.project.json are read, runtime.project.json and the lock are written with folder empty', async () => {
  const host = installStudio(PROJECT);
  seed(host, { project: PROJECT, level: 5, folder: '', shortName: 'project', extension: '.json' }, '{"appEnv":"development"}\n');
  seed(host, { project: PROJECT, level: 5, folder: '', shortName: 'runtime.project', extension: '.json' }, '{"a":1}\n');
  const studio = createStudioHost(PROJECT);
  assert.equal(await studio.io.read(`_${PROJECT}_/l5/project.json`), '{"appEnv":"development"}\n');
  assert.equal(await studio.io.read(`_${PROJECT}_/l5/runtime.project.json`), '{"a":1}\n');

  assert.equal(await studio.l5!.claim(PROJECT, 'holder-1'), true);
  const lock = host.files[fileKey({ project: PROJECT, level: 5, folder: '', shortName: 'm1-project-lock', extension: '.json' })];
  assert.equal(lock?.content, '{"holder":"holder-1"}\n');
  assert.equal(await studio.l5!.compareAndSwap(`_${PROJECT}_/l5/runtime.project.json`, '{"a":1}\n', '{"a":2}\n'), 'ok');
  const runtime = host.files[fileKey({ project: PROJECT, level: 5, folder: '', shortName: 'runtime.project', extension: '.json' })];
  assert.equal(runtime.content, '{"a":2}\n');
  await studio.l5!.release(PROJECT, 'holder-1');
  assert.equal(await studio.l5!.claim(PROJECT, 'holder-2'), true, 'released lock is claimed again');
});

void test('writes stay in the target project; malformed refs stay refused', async () => {
  const host = installStudio(PROJECT);
  const loads: number[] = [];
  eagerStor(host, ['_102034_/l1/server/x.ts', '_102099_/l1/x.ts'], loads);
  const studio = createStudioHost(PROJECT);
  for (const ref of ['_102034_/l1/server/x.ts', '_102027_/l2/y.ts', '_102099_/l1/x.ts']) {
    await assert.rejects(studio.state.writeOwned(ref, new TextEncoder().encode('x')), /Refused a write outside the module tree/);
  }
  const removal = await studio.state.removeOwned(['_102034_/l1/server/x.ts'], ['_102034_/l1/server/x.ts']);
  assert.deepEqual(removal.removed, []);
  assert.equal((host.files[fileKey(infoOf('_102034_/l1/server/x.ts'))] as StoredFile).status, 'changed');
  assert.equal(await studio.io.read('_102099_/l1/x.ts'), null);
  for (const ref of [`_${PROJECT}_/l1/${MODULE}/../x.ts`, `_${PROJECT}_/l1/${MODULE}//x.ts`, `_${PROJECT}_/l1//x.ts`, `_${PROJECT}_/l1/${MODULE}/a.b.ts`, `_${PROJECT}_/l1/${MODULE}/runtime.project.json`]) {
    assert.equal(await studio.io.read(ref), null, ref);
    await assert.rejects(studio.state.writeOwned(ref, new TextEncoder().encode('x')), ref);
  }
  assert.equal(host.writes.length, 0);
});

void test('readStudioProfile reads appEnv from the l5 stor key (level 5, folder empty)', async () => {
  const host = installStudio(PROJECT);
  seed(host, { project: PROJECT, level: 5, folder: '', shortName: 'project', extension: '.json' }, '{"appEnv":"production"}\n');
  assert.deepEqual(await readStudioProfile(PROJECT), { mode: 'production', declared: true });
  installStudio(PROJECT);
  assert.deepEqual(await readStudioProfile(PROJECT), { mode: undefined, declared: false });
});

void test('parity: the same ref table gives the same read and write verdict in the CLI and the Studio host', async () => {
  const root = await mkdtemp(join(tmpdir(), 'm1-31-'));
  try {
    const source = join(root, 'src');
    for (const row of TABLE) {
      const info = infoOf(row.ref);
      const path = join(source, `mls-${info.project}`, `l${info.level}`, info.folder, `${info.shortName}${info.extension}`);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, bodyOf(row.ref), 'utf8');
    }
    const cli = await verdicts(createDiskHost(source, join(root, 'out'), PROJECT, source), TABLE);

    const host = installStudio(PROJECT);
    browserStor(host, TABLE.map(row => row.ref), []);
    const studio = await captureWarn(() => verdicts(createStudioHost(PROJECT), TABLE));

    const expected = TABLE.map(row => ({ ref: row.ref, read: row.read, write: row.write }));
    assert.deepEqual(cli, expected, 'CLI host');
    assert.deepEqual(studio.value, expected, 'Studio host');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
