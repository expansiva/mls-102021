/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/tests60/serveRoutePageTests.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import type { M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import type { M12UnitStatus } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { readUnitStatus } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import type { M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { buildM12Report, summarizeM12Report } from '/_102021_/l2/agentMaterializeL1/steps/finalize80/agentM12Finalize.js';
import { createAgent as createPageAgent } from '/_102021_/l2/agentMaterializeL1/steps/tests60/agentM12TestsPage.js';
import { createAgent } from '/_102021_/l2/agentMaterializeL1/steps/tests60/agentM12Tests.js';
import { SERVE_ROUTE_NO_PAGE_TEST } from '/_102021_/l2/agentMaterializeL1/steps/tests60/context.js';
import { routeObligations } from '/_102021_/l2/agentMaterializeL1/testing/obligations.js';

const PROJECT = 7;
const MODULE = 'modx';
const PAGE = 'home';

interface FakeFile extends M12FileInfo {
  status: string;
  content: string;
  getContent(): Promise<string>;
  getValueInfo(): Promise<{ content: string }>;
}

function keyOf(info: M12FileInfo): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function file(folder: string, shortName: string, extension: string, content: string): { info: M12FileInfo; content: string } {
  return { info: { project: PROJECT, level: extension === '.json' && folder === '' ? 5 : 1, folder, shortName, extension }, content };
}

function install(present: Array<{ info: M12FileInfo; content: string }>): void {
  const files: Record<string, FakeFile> = {};
  const put = (info: M12FileInfo, content: string): FakeFile => {
    const stored: FakeFile = {
      ...info, status: 'changed', content,
      getContent: async () => stored.content,
      getValueInfo: async () => ({ content: stored.content }),
    };
    files[keyOf(info)] = stored;
    return stored;
  };
  for (const item of present) put(item.info, item.content);
  (globalThis as { mls: unknown }).mls = {
    actualProject: PROJECT,
    stor: {
      files,
      getKeyToFile: keyOf,
      addOrUpdateFile: async (info: M12FileInfo) => files[keyOf(info)] ?? put(info, ''),
      localStor: {
        setContent: async (stored: FakeFile, value: { content?: string | null }) => { stored.content = value.content ?? ''; return true; },
      },
      server: { loadProjectInfoIfNeeded: async () => undefined },
    },
  };
}

function defSource(body: unknown): string {
  return `export const definition = ${JSON.stringify(body)} as const;\n`;
}

const envelope = {
  schemaVersion: '2026-09-24-d1-definition-v2',
  moduleName: MODULE,
  status: 'generated',
  dependencies: [] as string[],
};

function serveDefs(): void {
  const controllerFolder = `${MODULE}/layer_1_external/adapters/http/controllers`;
  const requestFolder = `${MODULE}/layer_1_external/adapters/http/requests`;
  install([
    file(controllerFolder, PAGE, '.defs.ts', defSource({
      ...envelope, artifactType: 'httpController', artifactId: PAGE,
      data: { pageId: PAGE, handlers: [{ route: `${MODULE}.${PAGE}.record`, contractPath: '', contractInterface: 'RecordRoute' }] },
    })),
    file(controllerFolder, PAGE, '.ts', 'export {}\n'),
    file(requestFolder, PAGE, '.defs.ts', defSource({
      ...envelope, artifactType: 'requestService', artifactId: PAGE,
      data: { pageId: PAGE, requests: [{ route: `${MODULE}.${PAGE}.record`, serves: 'cm.record', kind: 'cmd', uses: ['recordExecution'], outputs: [] }] },
    })),
    file(requestFolder, PAGE, '.ts', 'export {}\n'),
  ]);
}

const meta = { agentName: 'x', agentDescription: 'x', visibility: 'private' } as IAgentMeta;
const execution = { message: { orderAt: 'm', threadId: 't', content: '' }, task: { PK: 'task' } } as mls.msg.ExecutionContext;

void test('a page whose request serves a connection is skipped and does not read a page contract', async () => {
  serveDefs();
  const agent = createAgent();
  const intents = await agent.beforePromptStep!(
    meta, execution, { stepId: 1 } as mls.msg.AIAgentStep, { stepId: 2, prompt: '' } as mls.msg.AIAgentStep, 0,
    JSON.stringify({ project: PROJECT, module: MODULE, scope: MODULE, target: '', force: false }),
  ) as Array<Record<string, unknown>>;
  assert.equal(intents.filter(item => item.type === 'add-step').length, 0);
  const status = await readUnitStatus(PROJECT, MODULE, 'tests', PAGE);
  assert.equal(status?.status, 'skipped');
  assert.equal(status?.code, SERVE_ROUTE_NO_PAGE_TEST);
  assert.equal(status?.diagnostic.includes('CONTRACT_UNREAD'), false);

  const page = createPageAgent();
  const pageIntents = await page.beforePromptStep!(
    meta, execution, { stepId: 1 } as mls.msg.AIAgentStep,
    { stepId: 3, prompt: JSON.stringify({ project: PROJECT, module: MODULE, unitId: PAGE, attempt: 1, force: false }) } as mls.msg.AIAgentStep,
    0,
  ) as Array<Record<string, unknown>>;
  assert.equal(pageIntents.some(item => String(item.traceMsg ?? '').includes('M12_FAILED')), false);
  const again = await readUnitStatus(PROJECT, MODULE, 'tests', PAGE);
  assert.equal(again?.status, 'skipped');
  assert.equal(again?.code, SERVE_ROUTE_NO_PAGE_TEST);
});

void test('a serve route has no page obligation and a page route still asks for its contract', () => {
  const controller = {
    ...envelope, artifactType: 'httpController', artifactId: PAGE, data: { pageId: PAGE },
  } as M1Definition;
  const service = {
    ...envelope, artifactType: 'requestService', artifactId: PAGE,
    data: {
      pageId: PAGE,
      requests: [
        { route: `${MODULE}.${PAGE}.record`, serves: 'cm.record' },
        { route: `${MODULE}.${PAGE}.load`, kind: 'qry', uses: ['loadItem'], outputs: [{ key: 'item', entity: 'Item', fields: ['id'] }] },
      ],
    },
  } as M1Definition;
  const defs = new Map<string, M1Definition>([['service', service]]);
  const ref = {
    controller, defPath: 'controller.defs.ts', route: `${MODULE}.${PAGE}.record`, kind: 'cmd', grantIds: [],
    contractPath: 'web/contracts/home.defs.ts', contractInterface: 'RecordRoute',
  };
  const served = routeObligations(ref, defs, {});
  assert.deepEqual(served, { obligations: [], gaps: [] });
  const page = routeObligations({ ...ref, route: `${MODULE}.${PAGE}.load` }, defs, {});
  assert.ok('gap' in page && page.gap.startsWith('CONTRACT_UNREAD'));
});

void test('a skipped page test does not make the materialize report partial', () => {
  const status = (unitId: string, state: M12UnitStatus['status'], code = ''): M12UnitStatus => ({
    schemaVersion: '2026-10-05-m12-unit-v1', layer: 'tests', unitId, defRef: '', status: state, code, attempt: 0,
    diagnostic: code, inputHash: '', outputs: {}, updatedAt: '',
  });
  const report = buildM12Report(PROJECT, MODULE, [status('home', 'skipped', SERVE_ROUTE_NO_PAGE_TEST), status('other', 'done')], [], [], null);
  assert.equal(report.status, 'complete');
  assert.equal(report.counts.skipped, 1);
  assert.equal(report.counts.failed, 0);
  // d1_201: not hidden. The report lists the unit and the summary says how many have no test.
  assert.deepEqual(report.serveNotTested, ['tests/home']);
  assert.match(summarizeM12Report(report), /: complete, 1 serve unit\(s\) with no test\./u);
  assert.match(summarizeM12Report(report), /Serve units with no test \(SERVE_ROUTE_NO_PAGE_TEST\): tests\/home\./u);
  const none = buildM12Report(PROJECT, MODULE, [status('other', 'done')], [], [], null);
  assert.deepEqual(none.serveNotTested, []);
  assert.equal(summarizeM12Report(none).includes('no test'), false);
  assert.equal(buildM12Report(PROJECT, MODULE, [status('home', 'failed', 'CONTEXT_FAILED')], [], [], null).status, 'partial');
});
