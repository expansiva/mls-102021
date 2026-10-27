/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/prepare.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { loadD1Artifacts, loadD1Fixture } from '/_102021_/l2/agentDefsL1/fixtures/readFixture.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { createAgent } from '/_102021_/l2/agentNewReleaseL1/agentNewReleaseL1.js';
import { keptLines, usedRemovedUsecases } from '/_102021_/l2/agentNewReleaseL1/helpers/keptUsecases.js';
import { undoPrepared } from '/_102021_/l2/agentNewReleaseL1/helpers/undo.js';
import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';

const PROJECT = 102047;

interface MemFile {
  project: number;
  level: number;
  folder: string;
  shortName: string;
  extension: string;
  status: string;
  content: string;
  getContent: () => Promise<string>;
  getValueInfo: () => Promise<{ content: string }>;
}

function keyOf(file: { project?: number; level?: number; folder?: string; shortName?: string; extension?: string }): string {
  return `${file.project}|${file.level}|${file.folder}|${file.shortName}|${file.extension}`;
}

function installStor(options?: { failOnCopy?: number }): { files: Record<string, MemFile>; texts: () => Record<string, string>; restore: () => void } {
  const host = (globalThis as { mls: { actualProject: number; events?: { fireFileAction?: (...args: unknown[]) => void }; stor: { files: Record<string, MemFile>; getKeyToFile: typeof keyOf; addOrUpdateFile: (params: MemFile) => Promise<MemFile>; localStor: { setContent: (file: MemFile, info: { content: string }) => Promise<void>; deleteFile: (file: MemFile) => Promise<void> } } } }).mls;
  const hadEvents = !!host.events;
  const previousAction = host.events?.fireFileAction;
  if (!host.events) host.events = { fireFileAction() {} };
  else if (typeof host.events.fireFileAction !== 'function') host.events.fireFileAction = () => {};
  const previousFiles = host.stor.files;
  const previousProject = host.actualProject;
  const previousKey = host.stor.getKeyToFile;
  const previousAdd = host.stor.addOrUpdateFile;
  const previousLocal = host.stor.localStor;
  const files: Record<string, MemFile> = {};
  let copies = 0;
  host.actualProject = PROJECT;
  host.stor.files = files;
  host.stor.getKeyToFile = keyOf;
  host.stor.addOrUpdateFile = async (params: MemFile) => {
    const key = keyOf(params);
    if (!files[key]) {
      const file: MemFile = {
        ...params,
        status: 'new',
        content: '',
        getContent() { return Promise.resolve(this.content); },
        getValueInfo() { return Promise.resolve({ content: this.content }); },
      };
      files[key] = file;
    }
    return files[key];
  };
  host.stor.localStor = {
    setContent: async (file: MemFile, info: { content: string }) => {
      if (file.level === 1 && String(file.folder).includes('_old') && options?.failOnCopy) {
        copies += 1;
        if (copies === options.failOnCopy) throw new Error('disk full');
      }
      file.content = info.content;
      if (file.status === 'new') file.status = 'changed';
    },
    deleteFile: async (file: MemFile) => {
      file.status = 'deleted';
    },
  };
  return {
    files,
    texts: () => Object.fromEntries(Object.values(files).filter(file => file.status !== 'deleted').map(file => [pathOf(file), file.content])),
    restore() {
      if (!hadEvents) delete host.events;
      else if (host.events) host.events.fireFileAction = previousAction;
      host.stor.files = previousFiles;
      host.stor.getKeyToFile = previousKey;
      host.stor.addOrUpdateFile = previousAdd;
      host.stor.localStor = previousLocal;
      host.actualProject = previousProject;
    },
  };
}

function pathOf(file: { level: number; folder: string; shortName: string; extension: string }): string {
  return `l${file.level}/${file.folder}/${file.shortName}${file.extension}`;
}

const backend = {
  usecases: [
    { usecaseId: 'a', status: 'done', existing: 'l1/tarefas/a.defs.ts', entity: 'task' },
    { usecaseId: 'b', status: 'toRemove', existing: 'l1/tarefas/b.defs.ts' },
    { usecaseId: 'c', status: 'toCreate', existing: '' },
  ],
  endpoints: [{ route: '/a', status: 'toUpdate', existing: 'old' }],
  ports: [{ portId: 'p', status: 'done', existing: 'port' }],
  tables: [{ tableId: 't', status: 'toRemove' }],
  testSupport: [{ id: 's', status: 'toUpdate', existing: 'x' }],
  removed: [
    { kind: 'usecase', id: 'orphan', status: 'toRemove' },
    { kind: 'table', id: 't', status: 'toRemove' },
    { kind: 'endpoint', id: 'keep', status: 'toRemove' },
  ],
};
const effort = {
  ...backend,
  screens: [{ pageId: 'home', status: 'done', existing: 'page' }],
  totals: {
    screens: { toCreate: 0, toUpdate: 0, toRemove: 0, done: 1 },
    endpoints: { toCreate: 0, toUpdate: 1, toRemove: 0, done: 0 },
    usecases: { toCreate: 1, toUpdate: 0, toRemove: 1, done: 1 },
    tables: { toCreate: 0, toUpdate: 0, toRemove: 1, done: 0 },
  },
};
const planner = {
  flowId: 'agentPlannerL1',
  thread: 'thread-9',
  schemaVersion: '2026-09-20-p1-pipeline-v1',
  note: 'see l4/tarefas/tobe/plan/pool/l2/web/notes.md',
  steps: {
    plan20: {
      status: 'approved',
      artifactPaths: ['l4/tarefas/tobe/plan/pool/l2/web/backend.json'],
    },
  },
};

function seed(stor: ReturnType<typeof installStor>, withPlanner: boolean): void {
  const { files } = stor;
  const add = (level: number, folder: string, shortName: string, extension: string, content: string) => {
    const file: MemFile = {
      project: PROJECT, level, folder, shortName, extension, status: 'published', content,
      getContent() { return Promise.resolve(this.content); },
      getValueInfo() { return Promise.resolve({ content: this.content }); },
    };
    files[keyOf(file)] = file;
  };
  add(4, 'tarefas/pool/l4', 'changeEffort', '.json', '{"schemaVersion":"x"}\n');
  add(4, 'tarefas/pool/l2/web', 'backend', '.json', `${JSON.stringify(backend, null, 2)}\n`);
  add(4, 'tarefas/pool/l2/web', 'effort', '.json', `${JSON.stringify(effort, null, 2)}\n`);
  add(1, 'tarefas', 'note', '.md', 'header keep-me\n');
  add(1, 'tarefas/pipeline/agentDefsL1', 'input20', '.json', '{"checkpoint":true}\n');
  add(1, 'tarefas/usecases', 'criar', '.defs.ts', 'export const def = 1;\n');
  if (withPlanner) add(4, 'tarefas/pool/l1', 'pipeline', '.json', `${JSON.stringify(planner)}\n`);
  else add(4, 'tarefas/tobe/plan/pool/l1', 'pipeline', '.json', `${JSON.stringify(planner)}\n`);
}

const meta: IAgentMeta = {
  agentName: 'agentNewReleaseL1',
  agentProject: 102021,
  agentFolder: 'agentNewReleaseL1',
  agentDescription: 'test',
  visibility: 'public',
};
const context = {
  message: { orderAt: 'msg-1', threadId: 'thread-1', content: '@@agentNewReleaseL1 tarefas', senderId: 'u' },
  task: { PK: 'task-1', iaCompressed: { nextSteps: [], longMemory: {} } },
} as mls.msg.ExecutionContext;

async function run(prompt: string): Promise<string> {
  const intents = await createAgent().beforePromptImplicit!(meta, context, prompt);
  const step = intents.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  return String(step?.step.result || '');
}

describe('prepare', { concurrency: 1 }, () => {

test('prepare moves every l1 file, writes a creation plan, and rewrites the planner', async (t) => {
  const stor = installStor();
  t.after(() => stor.restore());
  seed(stor, true);
  const before = stor.texts();
  const result = await run('@@agentNewReleaseL1 tarefas');
  assert.equal(result, 'done: prepared\n@@agentDefsL1 tarefas /run\n@@agentNewReleaseL1 tarefas /compare');
  const after = stor.texts();
  assert.equal(after['l1/tarefas_old/note.md'], before['l1/tarefas/note.md']);
  assert.equal(after['l1/tarefas_old/pipeline/agentDefsL1/input20.json'], before['l1/tarefas/pipeline/agentDefsL1/input20.json']);
  assert.equal(after['l1/tarefas_old/usecases/criar.defs.ts'], 'export const def = 1;\n');
  assert.equal(Object.keys(after).some(path => path.startsWith('l1/tarefas/')), false);
  const writtenBackend = JSON.parse(after['l4/tarefas/pool/l2/web/backend.json']);
  assert.equal(writtenBackend.usecases[0].status, 'toCreate');
  assert.equal(writtenBackend.usecases[0].existing, '');
  assert.equal(writtenBackend.usecases[1].status, 'toRemove');
  assert.equal(writtenBackend.usecases[1].existing, 'l1/tarefas/b.defs.ts');
  assert.equal(writtenBackend.endpoints[0].status, 'toCreate');
  assert.equal(writtenBackend.ports[0].status, 'toCreate');
  assert.equal(writtenBackend.testSupport[0].status, 'toCreate');
  assert.deepEqual(writtenBackend.removed, [{ kind: 'endpoint', id: 'keep', status: 'toRemove' }]);
  assert.deepEqual(JSON.parse(after['l4/tarefas/pool/l2/web/effort.json']).removed, [{ kind: 'endpoint', id: 'keep', status: 'toRemove' }]);
  const writtenEffort = JSON.parse(after['l4/tarefas/pool/l2/web/effort.json']);
  assert.equal(writtenEffort.screens[0].status, 'toCreate');
  assert.deepEqual(writtenEffort.totals.usecases, { toCreate: 2, toUpdate: 0, toRemove: 1, done: 0 });
  assert.deepEqual(writtenEffort.totals.screens, { toCreate: 1, toUpdate: 0, toRemove: 0, done: 0 });
  assert.deepEqual(writtenEffort.totals.endpoints, { toCreate: 1, toUpdate: 0, toRemove: 0, done: 0 });
  const writtenPlanner = JSON.parse(after['l4/tarefas/pool/l1/pipeline.json']);
  assert.deepEqual(writtenPlanner.steps.plan20.artifactPaths, ['l4/tarefas/pool/l2/web/backend.json']);
  assert.equal(writtenPlanner.note, 'see l4/tarefas/pool/l2/web/notes.md');
  assert.equal(writtenPlanner.thread, 'thread-9');
  assert.equal(
    after['l1/tarefas_old/pipeline/agentNewReleaseL1/saved/l4/tarefas/pool/l2/web/backend.json'],
    before['l4/tarefas/pool/l2/web/backend.json'],
  );

  after['l1/tarefas/usecases/fresh.defs.ts'] = 'from run\n';
  const fresh: MemFile = {
    project: PROJECT, level: 1, folder: 'tarefas/usecases', shortName: 'fresh', extension: '.defs.ts', status: 'new', content: 'from run\n',
    getContent() { return Promise.resolve(this.content); },
    getValueInfo() { return Promise.resolve({ content: this.content }); },
  };
  stor.files[keyOf(fresh)] = fresh;
  const undone = await undoPrepared('tarefas');
  assert.equal(undone.ok, true);
  const restored = stor.texts();
  assert.equal(restored['l1/tarefas/note.md'], before['l1/tarefas/note.md']);
  assert.equal(restored['l1/tarefas/usecases/criar.defs.ts'], before['l1/tarefas/usecases/criar.defs.ts']);
  assert.equal(restored['l1/tarefas/usecases/fresh.defs.ts'], undefined);
  assert.equal(restored['l4/tarefas/pool/l2/web/backend.json'], before['l4/tarefas/pool/l2/web/backend.json']);
  assert.equal(restored['l4/tarefas/pool/l2/web/effort.json'], before['l4/tarefas/pool/l2/web/effort.json']);
  assert.equal(restored['l4/tarefas/pool/l1/pipeline.json'], before['l4/tarefas/pool/l1/pipeline.json']);
  assert.equal(Object.keys(restored).some(path => path.startsWith('l1/tarefas_old/')), false);
});

test('prepare refuses when _old exists, effort is missing, or l1 is empty', async (t) => {
  const oldPresent = installStor();
  t.after(() => oldPresent.restore());
  seed(oldPresent, true);
  const marker: MemFile = {
    project: PROJECT, level: 1, folder: 'tarefas_old', shortName: 'keep', extension: '.txt', status: 'published', content: 'x',
    getContent() { return Promise.resolve(this.content); },
    getValueInfo() { return Promise.resolve({ content: this.content }); },
  };
  oldPresent.files[keyOf(marker)] = marker;
  assert.equal(await run('@@agentNewReleaseL1 tarefas'), 'refused: l1/tarefas_old already exists');
  assert.equal(oldPresent.texts()['l1/tarefas/note.md'], 'header keep-me\n');

  oldPresent.restore();
  const noEffort = installStor();
  t.after(() => noEffort.restore());
  seed(noEffort, true);
  delete noEffort.files[keyOf({ project: PROJECT, level: 4, folder: 'tarefas/pool/l4', shortName: 'changeEffort', extension: '.json' })];
  assert.equal(await run('@@agentNewReleaseL1 tarefas'), 'refused: changeEffort.json not found: l4/tarefas/pool/l4/changeEffort.json');

  noEffort.restore();
  const empty = installStor();
  t.after(() => empty.restore());
  const effortOnly: MemFile = {
    project: PROJECT, level: 4, folder: 'tarefas/pool/l4', shortName: 'changeEffort', extension: '.json', status: 'published', content: '{}\n',
    getContent() { return Promise.resolve(this.content); },
    getValueInfo() { return Promise.resolve({ content: this.content }); },
  };
  empty.files[keyOf(effortOnly)] = effortOnly;
  assert.equal(await run('@@agentNewReleaseL1 tarefas'), 'refused: l1/tarefas has no files');
});

test('a failure while moving rolls the copies back', async (t) => {
  const stor = installStor({ failOnCopy: 2 });
  t.after(() => stor.restore());
  seed(stor, true);
  const before = stor.texts();
  const result = await run('@@agentNewReleaseL1 tarefas');
  assert.equal(result, 'failed: disk full');
  assert.deepEqual(stor.texts(), before);
});

test('a removed usecase a route uses is dropped from removed and named in the close', async (t) => {
  const stor = installStor();
  t.after(() => stor.restore());
  const moduleName = 'comandaRestaurante';
  const files = loadD1Fixture('comandaRestaurante-c0f25ee');
  for (const [path, content] of Object.entries(files)) {
    const platform = /^_(\d+)_\/(.+)$/.exec(path);
    const info = platform ? fileInfoFromDisplay(Number(platform[1]), platform[2]) : fileInfoFromDisplay(PROJECT, path);
    if (!info) continue;
    const file: MemFile = {
      project: info.project, level: info.level, folder: info.folder, shortName: info.shortName, extension: info.extension,
      status: 'published', content,
      getContent() { return Promise.resolve(this.content); },
      getValueInfo() { return Promise.resolve({ content: this.content }); },
    };
    stor.files[keyOf(file)] = file;
  }
  const artifacts = loadD1Artifacts('comandaRestaurante-c0f25ee', moduleName);
  const backend = JSON.parse(JSON.stringify(artifacts.backend)) as { usecases: Array<{ usecaseId: string }>; removed: unknown[] };
  const effort = JSON.parse(JSON.stringify(artifacts.effort)) as { usecases: Array<{ usecaseId: string }>; removed: unknown[] };
  const identity = { project: PROJECT, moduleName };
  let usedId = '';
  for (const row of backend.usecases) {
    const trialBackend = JSON.parse(JSON.stringify(backend)) as typeof backend;
    const trialEffort = JSON.parse(JSON.stringify(effort)) as typeof effort;
    trialBackend.usecases = trialBackend.usecases.filter(item => item.usecaseId !== row.usecaseId);
    trialEffort.usecases = trialEffort.usecases.filter(item => item.usecaseId !== row.usecaseId);
    trialBackend.removed = [{ kind: 'usecase', id: row.usecaseId, status: 'toRemove' }, { kind: 'usecase', id: 'orphanUsecase', status: 'toRemove' }, { kind: 'endpoint', id: 'keep', status: 'toRemove' }];
    trialEffort.removed = trialBackend.removed;
    const kept = usedRemovedUsecases(identity, { ...artifacts, backend: trialBackend, effort: trialEffort });
    if (!kept.some(item => item.id === row.usecaseId)) continue;
    usedId = row.usecaseId;
    backend.usecases = trialBackend.usecases;
    effort.usecases = trialEffort.usecases;
    backend.removed = trialBackend.removed;
    effort.removed = trialEffort.removed;
    break;
  }
  assert.ok(usedId);
  const backendText = `${JSON.stringify(backend, null, 2)}\n`;
  const effortText = `${JSON.stringify(effort, null, 2)}\n`;
  const backendFile = stor.files[keyOf({ project: PROJECT, level: 4, folder: `${moduleName}/pool/l2/web`, shortName: 'backend', extension: '.json' })];
  const effortFile = stor.files[keyOf({ project: PROJECT, level: 4, folder: `${moduleName}/pool/l2/web`, shortName: 'effort', extension: '.json' })];
  backendFile.content = backendText;
  effortFile.content = effortText;
  const change: MemFile = {
    project: PROJECT, level: 4, folder: `${moduleName}/pool/l4`, shortName: 'changeEffort', extension: '.json', status: 'published', content: '{}\n',
    getContent() { return Promise.resolve(this.content); },
    getValueInfo() { return Promise.resolve({ content: this.content }); },
  };
  stor.files[keyOf(change)] = change;
  const before = stor.texts();
  const kept = usedRemovedUsecases(identity, { ...artifacts, backend, effort });
  const result = await run(`@@agentNewReleaseL1 ${moduleName}`);
  assert.match(result, new RegExp(keptLines(kept)[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const written = JSON.parse(stor.texts()[`l4/${moduleName}/pool/l2/web/backend.json`]) as { removed: Array<{ kind: string; id: string }> };
  assert.deepEqual(written.removed, [{ kind: 'endpoint', id: 'keep', status: 'toRemove' }]);
  assert.equal(written.removed.some(row => row.id === 'orphanUsecase' || row.id === usedId), false);
  const undone = await undoPrepared(moduleName);
  assert.equal(undone.ok, true);
  assert.equal(stor.texts()[`l4/${moduleName}/pool/l2/web/backend.json`], before[`l4/${moduleName}/pool/l2/web/backend.json`]);
  assert.equal(stor.texts()[`l4/${moduleName}/pool/l2/web/effort.json`], before[`l4/${moduleName}/pool/l2/web/effort.json`]);
});

test('an unreadable plan refuses and writes nothing', async (t) => {
  const stor = installStor();
  t.after(() => stor.restore());
  seed(stor, true);
  const backend = stor.files[keyOf({ project: PROJECT, level: 4, folder: 'tarefas/pool/l2/web', shortName: 'backend', extension: '.json' })];
  backend.content = '{';
  const before = stor.texts();
  assert.equal(await run('@@agentNewReleaseL1 tarefas'), 'refused: creation artifacts are unreadable');
  assert.deepEqual(stor.texts(), before);
});

test('undo removes a planner record that did not exist', async (t) => {
  const stor = installStor();
  t.after(() => stor.restore());
  seed(stor, false);
  const before = stor.texts();
  assert.match(await run('@@agentNewReleaseL1 tarefas'), /^done: prepared\n/);
  const written = JSON.parse(stor.texts()['l4/tarefas/pool/l1/pipeline.json']);
  assert.deepEqual(written.steps.plan20.artifactPaths, ['l4/tarefas/pool/l2/web/backend.json']);
  assert.equal(written.thread, 'thread-9');
  assert.equal(await undoPrepared('tarefas').then(item => item.ok), true);
  const restored = stor.texts();
  assert.equal(restored['l4/tarefas/pool/l1/pipeline.json'], undefined);
  assert.equal(restored['l4/tarefas/pool/l2/web/backend.json'], before['l4/tarefas/pool/l2/web/backend.json']);
  assert.equal(restored['l1/tarefas/note.md'], before['l1/tarefas/note.md']);
  assert.equal(restored['l4/tarefas/tobe/plan/pool/l1/pipeline.json'], before['l4/tarefas/tobe/plan/pool/l1/pipeline.json']);
});

});
