/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/compare.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createAgent } from '/_102021_/l2/agentNewReleaseL1/agentNewReleaseL1.js';
import { structureOf } from '/_102021_/l2/agentNewReleaseL1/helpers/compare.js';
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

function installStor(): { texts: () => Record<string, string>; add: (level: number, folder: string, shortName: string, extension: string, content: string) => void; restore: () => void } {
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
  host.actualProject = PROJECT;
  host.stor.files = files;
  host.stor.getKeyToFile = keyOf;
  host.stor.addOrUpdateFile = async (params: MemFile) => {
    const key = keyOf(params);
    if (!files[key]) {
      const file: MemFile = {
        ...params, status: 'new', content: '',
        getContent() { return Promise.resolve(this.content); },
        getValueInfo() { return Promise.resolve({ content: this.content }); },
      };
      files[key] = file;
    }
    return files[key];
  };
  host.stor.localStor = {
    setContent: async (file: MemFile, info: { content: string }) => {
      file.content = info.content;
      if (file.status === 'new') file.status = 'changed';
    },
    deleteFile: async (file: MemFile) => { file.status = 'deleted'; },
  };
  const add = (level: number, folder: string, shortName: string, extension: string, content: string) => {
    const file: MemFile = {
      project: PROJECT, level, folder, shortName, extension, status: 'published', content,
      getContent() { return Promise.resolve(this.content); },
      getValueInfo() { return Promise.resolve({ content: this.content }); },
    };
    files[keyOf(file)] = file;
  };
  return {
    add,
    texts: () => Object.fromEntries(Object.values(files).filter(file => file.status !== 'deleted').map(file => [`l${file.level}/${file.folder}/${file.shortName}${file.extension}`, file.content])),
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

function defText(body: unknown): string {
  return `/// <mls fileReference="_102047_/l1/tarefas/copied.defs.ts" enhancement="_blank"/>\n\nexport const definition = ${JSON.stringify(body, null, 2)} as const;\n\nexport default definition;\n`;
}

/** Copied from mls-102047 `l1/tarefas/layer_2_application/usecases/createTarefa.defs.ts`. */
const createTarefa = {
  schemaVersion: '2026-09-24-d1-definition-v2',
  artifactType: 'usecase',
  artifactId: 'createTarefa',
  moduleName: 'tarefas',
  status: 'pending',
  dependencies: [
    '_102047_/l1/tarefas/layer_2_application/ports/tarefaRepository.defs.ts',
    '_102047_/l1/tarefas/layer_3_domain/entities/tarefa.defs.ts',
    '_102047_/l4/tarefas/rules.defs.ts',
  ],
  data: {
    usecaseId: 'createTarefa',
    entityId: 'Tarefa',
    operation: 'create',
    rulesApplied: [
      'avisoNaoSobrepostoPorPessoa',
      'edicaoNaoMudaSituacao',
      'escolhaResponsavelPeloNome',
    ],
    effects: [] as string[],
  },
};

/** One route copied from `l1/tarefas/layer_2_application/requests/inicio.defs.ts` (`carregarInicio`). */
const inicio = {
  schemaVersion: '2026-09-24-d1-definition-v2',
  artifactType: 'requestService',
  artifactId: 'inicio',
  moduleName: 'tarefas',
  status: 'pending',
  dependencies: ['_102047_/l1/tarefas/layer_2_application/usecases/listTarefa.defs.ts'],
  data: {
    pageId: 'inicio',
    requests: [{
      route: 'tarefas.inicio.carregarInicio',
      kind: 'qry',
      uses: ['listTarefa', 'getParticipante'],
      rules: ['membroVeResponsavelOuCriador', 'quemAgeAgoraPorSituacao'],
      input: [],
      output: [{ kind: 'list', path: 'pendencias', entity: 'Tarefa', fields: [{ field: 'id', path: 'id' }, { field: 'status', path: 'status' }] }],
      doc: { raw: 'Carrega a tela.', purpose: 'Carrega a tela.', input: 'Nenhuma.', processing: 'Restringe.', output: 'Lista.' },
    }],
  },
};

const ORIGINAL_BACKEND = '{"usecases":[{"usecaseId":"a","status":"done"}]}\n';
const ORIGINAL_EFFORT = '{"usecases":[{"usecaseId":"a","status":"done"}],"totals":{}}\n';
const ORIGINAL_PLANNER = '{"thread":"kept"}\n';
const CREATION_BACKEND = '{"usecases":[{"usecaseId":"a","status":"toCreate","existing":""}]}\n';

function seedPlan(add: ReturnType<typeof installStor>['add'], plannerAbsent = false, kept: Array<{ id: string; routes: string[] }> = []): void {
  add(4, 'tarefas/pool/l2/web', 'backend', '.json', CREATION_BACKEND);
  add(4, 'tarefas/pool/l2/web', 'effort', '.json', CREATION_BACKEND);
  add(1, 'tarefas_old/pipeline/agentNewReleaseL1/saved/l4/tarefas/pool/l2/web', 'backend', '.json', ORIGINAL_BACKEND);
  add(1, 'tarefas_old/pipeline/agentNewReleaseL1/saved/l4/tarefas/pool/l2/web', 'effort', '.json', ORIGINAL_EFFORT);
  const record = { at: '2026-10-26T00:00:00.000Z', moved: [], saved: [], plannerAbsent, kept };
  add(1, 'tarefas_old/pipeline/agentNewReleaseL1', 'prepared', '.json', `${JSON.stringify(record)}\n`);
  if (plannerAbsent) {
    add(4, 'tarefas/pool/l1', 'pipeline', '.json', '{"thread":"created"}\n');
    add(1, 'tarefas_old/pipeline/agentNewReleaseL1/saved', 'plannerAbsent', '.json', '{}\n');
  } else {
    add(4, 'tarefas/pool/l1', 'pipeline', '.json', '{"thread":"created"}\n');
    add(1, 'tarefas_old/pipeline/agentNewReleaseL1/saved/l4/tarefas/pool/l1', 'pipeline', '.json', ORIGINAL_PLANNER);
  }
}

function completeReport(add: ReturnType<typeof installStor>['add']): void {
  add(1, 'tarefas/pipeline/agentDefsL1', 'report', '.json', '{"outcome":"complete","defsStatus":"complete","blocking":""}\n');
}

const meta: IAgentMeta = {
  agentName: 'agentNewReleaseL1',
  agentProject: 102021,
  agentFolder: 'agentNewReleaseL1',
  agentDescription: 'test',
  visibility: 'public',
};
const context = {
  message: { orderAt: 'msg-1', threadId: 'thread-1', content: '@@agentNewReleaseL1 tarefas /compare', senderId: 'u' },
  task: { PK: 'task-1', iaCompressed: { nextSteps: [], longMemory: {} } },
} as mls.msg.ExecutionContext;

async function run(): Promise<string> {
  const intents = await createAgent().beforePromptImplicit!(meta, context, '@@agentNewReleaseL1 tarefas /compare');
  const step = intents.find((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  return String(step?.step.result || '');
}

describe('compare', { concurrency: 1 }, () => {

test('structureOf ignores doc and status and keeps derived fields', () => {
  const withDoc = structuredClone(createTarefa) as typeof createTarefa & { data: { doc?: { plan: string } } };
  withDoc.status = 'approved';
  withDoc.data.doc = { plan: 'model prose that must not count' };
  assert.deepEqual(structureOf(defText(withDoc)), structureOf(defText(createTarefa)));
  const rules = structuredClone(createTarefa);
  rules.data.rulesApplied = ['onlyOne'];
  assert.notDeepEqual(structureOf(defText(rules)), structureOf(defText(createTarefa)));
  const route = structuredClone(inicio);
  route.data.requests[0].route = 'tarefas.inicio.other';
  const prose = structuredClone(inicio);
  prose.data.requests[0].doc = { raw: 'other', purpose: 'other', input: 'other', processing: 'other', output: 'other' };
  assert.deepEqual(structureOf(defText(prose)), structureOf(defText(inicio)));
  assert.notDeepEqual(structureOf(defText(route)), structureOf(defText(inicio)));
  const shaped = structureOf(defText(inicio)) as { data: { requests: Array<{ route: string; doc?: unknown; output: unknown }> } };
  assert.equal(shaped.data.requests[0].route, 'tarefas.inicio.carregarInicio');
  assert.equal(shaped.data.requests[0].doc, undefined);
});

test('doc-only change is igual and restores the old bytes', async (t) => {
  const stor = installStor();
  t.after(() => stor.restore());
  seedPlan(stor.add);
  completeReport(stor.add);
  const oldDef = defText(createTarefa);
  const next = structuredClone(createTarefa) as typeof createTarefa & { data: { doc?: { plan: string } } };
  next.data.doc = { plan: 'prose' };
  stor.add(1, 'tarefas_old/layer_2_application/usecases', 'createTarefa', '.defs.ts', oldDef);
  stor.add(1, 'tarefas_old/layer_2_application/usecases', 'createTarefa', '.ts', 'OLD_TS\n');
  stor.add(1, 'tarefas/layer_2_application/usecases', 'createTarefa', '.defs.ts', defText(next));
  stor.add(1, 'tarefas/layer_2_application/usecases', 'createTarefa', '.ts', 'NEW_TS\n');
  stor.add(1, 'tarefas_old/pipeline/agentMaterializeL1/usecases', 'createTarefa', '.json', '{"receipt":"old"}\n');
  const page = defText({ ...inicio, artifactType: 'controller', artifactId: 'inicio' });
  stor.add(1, 'tarefas_old/layer_1_interface/controllers', 'inicio', '.defs.ts', page);
  stor.add(1, 'tarefas_old/layer_1_interface/controllers', 'inicio', '.test.ts', 'OLD_TEST\n');
  const pageNext = structuredClone(inicio) as typeof inicio & { data: { requests: Array<{ doc: { raw: string } }> } };
  pageNext.artifactType = 'controller';
  pageNext.artifactId = 'inicio';
  pageNext.data.requests[0].doc = { ...pageNext.data.requests[0].doc, raw: 'other prose' };
  stor.add(1, 'tarefas/layer_1_interface/controllers', 'inicio', '.defs.ts', defText(pageNext));
  stor.add(1, 'tarefas/layer_1_interface/controllers', 'inicio', '.test.ts', 'NEW_TEST\n');
  const result = await run();
  assert.match(result, /usecase createTarefa: igual l1\/tarefas\/layer_2_application\/usecases\/createTarefa\.defs\.ts/);
  assert.match(result, /@@agentMaterializeL1 \{"scope":"tarefas"\}$/);
  const texts = stor.texts();
  assert.equal(texts['l1/tarefas/layer_2_application/usecases/createTarefa.defs.ts'], oldDef);
  assert.equal(texts['l1/tarefas/layer_2_application/usecases/createTarefa.ts'], 'OLD_TS\n');
  assert.equal(texts['l1/tarefas/pipeline/agentMaterializeL1/usecases/createTarefa.json'], '{"receipt":"old"}\n');
  assert.equal(texts['l1/tarefas/layer_1_interface/controllers/inicio.defs.ts'], page);
  assert.equal(texts['l1/tarefas/layer_1_interface/controllers/inicio.test.ts'], 'OLD_TEST\n');
  assert.equal(Object.keys(texts).some(path => path.includes('tarefas_old')), false);
  assert.equal(texts['l4/tarefas/pool/l2/web/backend.json'], ORIGINAL_BACKEND);
  assert.equal(texts['l4/tarefas/pool/l1/pipeline.json'], ORIGINAL_PLANNER);
});

test('a changed rule drops the source, a new def stays, a removed def leaves', async (t) => {
  const stor = installStor();
  t.after(() => stor.restore());
  seedPlan(stor.add);
  completeReport(stor.add);
  const changed = structuredClone(createTarefa);
  changed.data.rulesApplied = ['other'];
  stor.add(1, 'tarefas_old/layer_2_application/usecases', 'createTarefa', '.defs.ts', defText(createTarefa));
  stor.add(1, 'tarefas_old/layer_2_application/usecases', 'createTarefa', '.ts', 'OLD_TS\n');
  stor.add(1, 'tarefas/layer_2_application/usecases', 'createTarefa', '.defs.ts', defText(changed));
  stor.add(1, 'tarefas/layer_2_application/usecases', 'createTarefa', '.ts', 'NEW_TS\n');
  const added = structuredClone(inicio);
  added.artifactId = 'novaPagina';
  stor.add(1, 'tarefas/layer_2_application/requests', 'novaPagina', '.defs.ts', defText(added));
  stor.add(1, 'tarefas/layer_2_application/requests', 'novaPagina', '.ts', 'NEW_PAGE\n');
  stor.add(1, 'tarefas_old/layer_1_interface/controllers', 'antiga', '.defs.ts', defText({ ...createTarefa, artifactType: 'controller', artifactId: 'antiga' }));
  stor.add(1, 'tarefas_old/layer_1_interface/controllers', 'antiga', '.ts', 'OLD_CTRL\n');
  stor.add(1, 'tarefas_old/layer_1_interface/controllers', 'antiga', '.test.ts', 'OLD_TEST\n');
  stor.add(1, 'tarefas_old/pipeline/agentMaterializeL1/controllers', 'antiga', '.json', '{"gone":true}\n');
  stor.add(1, 'tarefas_old/pipeline/agentMaterializeL1', 'registration', '.json', '{"all":true}\n');
  stor.add(1, 'tarefas_old/materialization/agentMaterializeL1', 'outbound', '.json', '{"out":1}\n');
  const result = await run();
  assert.match(result, /usecase createTarefa: mudou /);
  assert.match(result, /requestService novaPagina: nova /);
  assert.match(result, /controller antiga: removida /);
  const texts = stor.texts();
  assert.equal(texts['l1/tarefas/layer_2_application/usecases/createTarefa.defs.ts'], defText(changed));
  assert.equal(texts['l1/tarefas/layer_2_application/usecases/createTarefa.ts'], undefined);
  assert.equal(texts['l1/tarefas/layer_2_application/requests/novaPagina.defs.ts'], defText(added));
  assert.equal(texts['l1/tarefas/layer_2_application/requests/novaPagina.ts'], undefined);
  assert.equal(texts['l1/tarefas/layer_1_interface/controllers/antiga.defs.ts'], undefined);
  assert.equal(texts['l1/tarefas/layer_1_interface/controllers/antiga.ts'], undefined);
  assert.equal(texts['l1/tarefas/layer_1_interface/controllers/antiga.test.ts'], undefined);
  assert.equal(texts['l1/tarefas/pipeline/agentMaterializeL1/registration.json'], undefined);
  assert.equal(texts['l1/tarefas/materialization/agentMaterializeL1/outbound.json'], undefined);
  assert.equal(Object.keys(texts).some(path => path.includes('_old')), false);
});

test('when every def is equal, registration and materialization come back', async (t) => {
  const stor = installStor();
  t.after(() => stor.restore());
  seedPlan(stor.add);
  completeReport(stor.add);
  const body = defText(createTarefa);
  stor.add(1, 'tarefas_old/layer_2_application/usecases', 'createTarefa', '.defs.ts', body);
  stor.add(1, 'tarefas/layer_2_application/usecases', 'createTarefa', '.defs.ts', body);
  stor.add(1, 'tarefas_old/pipeline/agentMaterializeL1', 'registration', '.json', '{"all":true}\n');
  stor.add(1, 'tarefas_old/pipeline/agentMaterializeL1', 'report', '.json', '{"m12":1}\n');
  stor.add(1, 'tarefas_old/materialization/agentMaterializeL1', 'outbound', '.json', '{"out":1}\n');
  stor.add(1, 'tarefas_old/pipeline/agentMaterializeL1/seedRows', 'tarefa', '.json', '{"rows":1}\n');
  const result = await run();
  assert.match(result, /creation plan: written and undone/);
  assert.match(result, /planner run: written and undone/);
  const texts = stor.texts();
  assert.equal(texts['l1/tarefas/pipeline/agentMaterializeL1/registration.json'], '{"all":true}\n');
  assert.equal(texts['l1/tarefas/pipeline/agentMaterializeL1/report.json'], '{"m12":1}\n');
  assert.equal(texts['l1/tarefas/materialization/agentMaterializeL1/outbound.json'], '{"out":1}\n');
  assert.equal(texts['l1/tarefas/pipeline/agentMaterializeL1/seedRows/tarefa.json'], '{"rows":1}\n');
  assert.equal(texts['l4/tarefas/pool/l2/web/effort.json'], ORIGINAL_EFFORT);
});

test('an incomplete report undoes the module and the plan', async (t) => {
  const stor = installStor();
  t.after(() => stor.restore());
  seedPlan(stor.add, true);
  stor.add(1, 'tarefas/pipeline/agentDefsL1', 'report', '.json', '{"outcome":"held","defsStatus":"incomplete","blocking":"DONE_ABSENT:2"}\n');
  stor.add(1, 'tarefas/pipeline/agentDefsL1', 'pipeline', '.json', '{"awaitingStep":"input20","error":"PLANNER_RUN_DIVERGENT"}\n');
  stor.add(1, 'tarefas_old/note', 'keep', '.md', 'OLD_NOTE\n');
  stor.add(1, 'tarefas/note', 'junk', '.md', 'NEW\n');
  const beforeOld = stor.texts()['l1/tarefas_old/note/keep.md'];
  const result = await run();
  assert.equal(result, 'failed: DONE_ABSENT:2');
  const texts = stor.texts();
  assert.equal(beforeOld, 'OLD_NOTE\n');
  assert.equal(texts['l1/tarefas/note/keep.md'], 'OLD_NOTE\n');
  assert.equal(texts['l1/tarefas/note/junk.md'], undefined);
  assert.equal(texts['l4/tarefas/pool/l2/web/backend.json'], ORIGINAL_BACKEND);
  assert.equal(texts['l4/tarefas/pool/l1/pipeline.json'], undefined);
  assert.equal(Object.keys(texts).some(path => path.includes('_old')), false);
});

test('a missing report uses the pipeline and still undoes', async (t) => {
  const stor = installStor();
  t.after(() => stor.restore());
  seedPlan(stor.add);
  stor.add(1, 'tarefas/pipeline/agentDefsL1', 'pipeline', '.json', '{"awaitingStep":"finalize80","error":"stopped"}\n');
  stor.add(1, 'tarefas_old/note', 'keep', '.md', 'OLD\n');
  const result = await run();
  assert.equal(result, 'failed: awaitingStep finalize80; stopped');
  assert.equal(Object.keys(stor.texts()).some(path => path.includes('_old')), false);
});

function effortFile(units: { create?: unknown[]; regenerateDefs?: unknown[]; remove?: unknown[] }): string {
  return `${JSON.stringify({
    perItem: [{
      answers: [{
        master: { project: '102021', kind: 'l1' },
        create: units.create || [],
        regenerateDefs: units.regenerateDefs || [],
        remove: units.remove || [],
      }],
    }],
  })}\n`;
}

function workflowDef(id: string): string {
  return defText({ ...createTarefa, artifactType: 'workflowProcess', artifactId: id, data: { workflowId: id } });
}

test('the close names effort gaps, a recorded cost, and restores the workflow engine only when every workflow is unchanged', async (t) => {
  const changedPath = 'l1/tarefas/layer_2_application/usecases/createTarefa.defs.ts';
  const samePath = 'l1/tarefas/layer_2_application/requests/inicio.defs.ts';
  const changed = structuredClone(createTarefa);
  changed.data.rulesApplied = ['other'];
  const same = defText(inicio);
  const flow = workflowDef('avisar');

  const stor = installStor();
  t.after(() => stor.restore());
  seedPlan(stor.add);
  stor.add(1, 'tarefas/pipeline/agentDefsL1', 'report', '.json', '{"outcome":"complete","defsStatus":"complete","cost":{"total":1.25,"byPhase":{"usecases50":{"calls":2,"cost":0.5},"resolve25":{"calls":3,"cost":0.75}}}}\n');
  stor.add(1, 'tarefas_old/layer_2_application/usecases', 'createTarefa', '.defs.ts', defText(createTarefa));
  stor.add(1, 'tarefas/layer_2_application/usecases', 'createTarefa', '.defs.ts', defText(changed));
  stor.add(1, 'tarefas_old/layer_2_application/requests', 'inicio', '.defs.ts', same);
  stor.add(1, 'tarefas/layer_2_application/requests', 'inicio', '.defs.ts', same);
  stor.add(1, 'tarefas_old/layer_2_application/workflows', 'avisar', '.defs.ts', flow);
  stor.add(1, 'tarefas/layer_2_application/workflows', 'avisar', '.defs.ts', flow);
  stor.add(1, 'tarefas_old/layer_1_external/adapters/workflow', 'engine', '.ts', 'OLD_ENGINE\n');
  stor.add(1, 'tarefas_old/layer_1_external/adapters/persistence', 'moduleTick', '.ts', 'OLD_TICK\n');
  stor.add(1, 'tarefas/layer_1_external/adapters/workflow', 'engine', '.ts', 'NEW_ENGINE\n');
  stor.add(1, 'tarefas/layer_1_external/adapters/persistence', 'moduleTick', '.ts', 'NEW_TICK\n');
  stor.add(4, 'tarefas/pool/l4', 'changeEffort', '.json', effortFile({
    regenerateDefs: [{ kind: 'request', id: 'inicio', path: samePath }],
  }));
  const gaps = await run();
  assert.match(gaps, new RegExp(`effort missing: usecase createTarefa ${changedPath}: changed and not in the effort \\(defect\\)`));
  assert.match(gaps, new RegExp(`effort extra: request inicio ${samePath}: in the effort and unchanged \\(inefficiency\\)`));
  assert.match(gaps, /run cost: 1\.25/);
  assert.match(gaps, /model calls: resolve25 3 \$0\.75; usecases50 2 \$0\.5/);
  assert.ok(gaps.indexOf('effort missing:') < gaps.indexOf('creation plan:'));
  assert.equal(stor.texts()['l1/tarefas/layer_1_external/adapters/workflow/engine.ts'], 'OLD_ENGINE\n');
  assert.equal(stor.texts()['l1/tarefas/layer_1_external/adapters/persistence/moduleTick.ts'], 'OLD_TICK\n');
  stor.restore();

  const matched = installStor();
  t.after(() => matched.restore());
  seedPlan(matched.add);
  completeReport(matched.add);
  const body = defText(createTarefa);
  matched.add(1, 'tarefas_old/layer_2_application/usecases', 'createTarefa', '.defs.ts', body);
  matched.add(1, 'tarefas/layer_2_application/usecases', 'createTarefa', '.defs.ts', body);
  matched.add(4, 'tarefas/pool/l4', 'changeEffort', '.json', effortFile({
    remove: [{ kind: 'usecase', id: 'ausente', path: 'l1/tarefas/missing.defs.ts' }],
  }));
  const even = await run();
  assert.match(even, /effort check: matches/);
  assert.match(even, /run cost: not recorded by the defs generator; read it from the \/run task/);
  matched.restore();

  const broken = installStor();
  t.after(() => broken.restore());
  seedPlan(broken.add);
  completeReport(broken.add);
  broken.add(1, 'tarefas_old/layer_2_application/workflows', 'avisar', '.defs.ts', flow);
  broken.add(1, 'tarefas/layer_2_application/workflows', 'avisar', '.defs.ts', defText({
    ...createTarefa, artifactType: 'workflowProcess', artifactId: 'avisar', data: { workflowId: 'other' },
  }));
  broken.add(1, 'tarefas_old/layer_1_external/adapters/workflow', 'engine', '.ts', 'OLD_ENGINE\n');
  broken.add(1, 'tarefas/layer_1_external/adapters/workflow', 'engine', '.ts', 'NEW_ENGINE\n');
  broken.add(1, 'tarefas_old/layer_1_external/adapters/persistence', 'moduleTick', '.ts', 'OLD_TICK\n');
  broken.add(1, 'tarefas/layer_1_external/adapters/persistence', 'moduleTick', '.ts', 'NEW_TICK\n');
  broken.add(4, 'tarefas/pool/l4', 'changeEffort', '.json', '{');
  const unread = await run();
  assert.match(unread, /effort check: not available \(Expected property name or '}' in JSON at position 1/);
  assert.match(unread, /run cost: not recorded by the defs generator; read it from the \/run task/);
  assert.equal(broken.texts()['l1/tarefas/layer_1_external/adapters/workflow/engine.ts'], undefined);
  assert.equal(broken.texts()['l1/tarefas/layer_1_external/adapters/persistence/moduleTick.ts'], undefined);
});

test('the compare close repeats a usecase kept for creation', async (t) => {
  const stor = installStor();
  t.after(() => stor.restore());
  seedPlan(stor.add, false, [{ id: 'getParticipante', routes: ['tarefas.minhas.listar', 'tarefas.minhas.abrir'] }]);
  completeReport(stor.add);
  const body = defText(createTarefa);
  stor.add(1, 'tarefas_old/layer_2_application/usecases', 'createTarefa', '.defs.ts', body);
  stor.add(1, 'tarefas/layer_2_application/usecases', 'createTarefa', '.defs.ts', body);
  const result = await run();
  assert.match(result, /kept for creation: usecase getParticipante \(toRemove, used by 2 routes: tarefas\.minhas\.listar, tarefas\.minhas\.abrir\)/);
  assert.equal(stor.texts()['l4/tarefas/pool/l2/web/backend.json'], ORIGINAL_BACKEND);
});

test('without a prepared tree the compare refuses and writes nothing', async (t) => {
  const stor = installStor();
  t.after(() => stor.restore());
  stor.add(1, 'tarefas/usecases', 'criar', '.defs.ts', 'export const definition = {} as const;\n');
  const before = stor.texts();
  const result = await run();
  assert.equal(result, 'refused: no prepared run');
  assert.deepEqual(stor.texts(), before);
});

function fieldEffort(op: 'removed' | 'changed', fieldId: string, before: Record<string, unknown>, after?: Record<string, unknown>): string {
  return `${JSON.stringify({
    request: { items: [{ changeId: `field:${fieldId}`, kind: 'field', op, before, after }] },
    perItem: [{ answers: [{ master: { project: '102021', kind: 'l1' }, create: [], regenerateDefs: [], remove: [] }] }],
  })}\n`;
}

test('a removed field cited in old source marks the equal def as mudou and restores only the def', async (t) => {
  const stor = installStor();
  t.after(() => stor.restore());
  seedPlan(stor.add);
  completeReport(stor.add);
  const body = defText(createTarefa);
  stor.add(1, 'tarefas_old/layer_2_application/usecases', 'createTarefa', '.defs.ts', body);
  stor.add(1, 'tarefas_old/layer_2_application/usecases', 'createTarefa', '.ts', 'const tags = row.etiquetas;\n');
  stor.add(1, 'tarefas/layer_2_application/usecases', 'createTarefa', '.defs.ts', body);
  stor.add(1, 'tarefas/layer_2_application/usecases', 'createTarefa', '.ts', 'NEW_TS\n');
  stor.add(1, 'tarefas_old/pipeline/agentMaterializeL1/usecases', 'createTarefa', '.json', '{"receipt":"old"}\n');
  stor.add(4, 'tarefas/pool/l4', 'changeEffort', '.json', fieldEffort('removed', 'details.etiquetas', { fieldId: 'details.etiquetas' }));
  const result = await run();
  assert.match(result, /usecase createTarefa: mudou \(code cites removed field etiquetas\) l1\/tarefas\/layer_2_application\/usecases\/createTarefa\.defs\.ts/);
  const texts = stor.texts();
  assert.equal(texts['l1/tarefas/layer_2_application/usecases/createTarefa.defs.ts'], body);
  assert.equal(texts['l1/tarefas/layer_2_application/usecases/createTarefa.ts'], undefined);
  assert.equal(texts['l1/tarefas/pipeline/agentMaterializeL1/usecases/createTarefa.json'], undefined);
  assert.equal(Object.keys(texts).some(path => path.includes('_old')), false);
});

test('etiquetasX in old source does not count as a cite of etiquetas', async (t) => {
  const stor = installStor();
  t.after(() => stor.restore());
  seedPlan(stor.add);
  completeReport(stor.add);
  const body = defText(createTarefa);
  stor.add(1, 'tarefas_old/layer_2_application/usecases', 'createTarefa', '.defs.ts', body);
  stor.add(1, 'tarefas_old/layer_2_application/usecases', 'createTarefa', '.ts', 'const tags = row.etiquetasX + metiquetas;\n');
  stor.add(1, 'tarefas/layer_2_application/usecases', 'createTarefa', '.defs.ts', body);
  stor.add(1, 'tarefas/layer_2_application/usecases', 'createTarefa', '.ts', 'NEW_TS\n');
  stor.add(4, 'tarefas/pool/l4', 'changeEffort', '.json', fieldEffort('removed', 'details.etiquetas', { fieldId: 'details.etiquetas' }));
  const result = await run();
  assert.match(result, /usecase createTarefa: igual /);
  assert.equal(stor.texts()['l1/tarefas/layer_2_application/usecases/createTarefa.ts'], 'const tags = row.etiquetasX + metiquetas;\n');
});

test('a failed restore keeps _old and names the path', async (t) => {
  const stor = installStor();
  t.after(() => stor.restore());
  seedPlan(stor.add);
  completeReport(stor.add);
  const body = defText(createTarefa);
  stor.add(1, 'tarefas_old/layer_2_application/usecases', 'createTarefa', '.defs.ts', body);
  stor.add(1, 'tarefas/layer_2_application/usecases', 'createTarefa', '.defs.ts', body);
  const files = (globalThis as { mls: { stor: { files: Record<string, unknown> } } }).mls.stor.files;
  delete files['102047|1|tarefas_old/pipeline/agentNewReleaseL1/saved/l4/tarefas/pool/l2/web|backend|.json'];
  const result = await run();
  assert.match(result, /kept tarefas_old: restore failed at l1\/tarefas_old\/pipeline\/agentNewReleaseL1\/saved\/l4\/tarefas\/pool\/l2\/web\/backend\.json/);
  assert.equal(Object.keys(stor.texts()).some(path => path.includes('tarefas_old')), true);
});

test('a controller of a page whose request is in the effort is not missing', async (t) => {
  const stor = installStor();
  t.after(() => stor.restore());
  seedPlan(stor.add);
  completeReport(stor.add);
  const req = defText(inicio);
  const changedCtrl = defText({ ...inicio, artifactType: 'controller', artifactId: 'inicio', data: { ...inicio.data, pageId: 'inicio' } });
  const oldCtrl = defText({ ...inicio, artifactType: 'controller', artifactId: 'inicio', data: { ...inicio.data, pageId: 'inicio', requests: [] } });
  stor.add(1, 'tarefas_old/layer_2_application/requests', 'inicio', '.defs.ts', req);
  stor.add(1, 'tarefas/layer_2_application/requests', 'inicio', '.defs.ts', req);
  stor.add(1, 'tarefas_old/layer_1_external/adapters/http/controllers', 'inicio', '.defs.ts', oldCtrl);
  stor.add(1, 'tarefas/layer_1_external/adapters/http/controllers', 'inicio', '.defs.ts', changedCtrl);
  stor.add(4, 'tarefas/pool/l4', 'changeEffort', '.json', effortFile({
    regenerateDefs: [{ kind: 'request', id: 'inicio', path: 'l1/tarefas/layer_2_application/requests/inicio.defs.ts' }],
  }));
  const result = await run();
  assert.match(result, /controller inicio: mudou /);
  assert.equal(result.includes('effort missing: controller inicio'), false);
  assert.match(result, /effort extra: request inicio /);
});

});
