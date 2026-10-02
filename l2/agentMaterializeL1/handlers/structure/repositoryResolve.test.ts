/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/structure/repositoryResolve.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { emitRequestService } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';

// v2 (m1_41 b1): the page request resolves the repository; the controller only calls the request.
const PORT = 'WidgetRepository';
const USECASE = '_102099_/l1/sampleModule/layer_2_application/usecases/listWidget.defs.ts';
const PORT_DEF = '_102099_/l1/sampleModule/layer_2_application/ports/widgetRepository.defs.ts';
const ROUTE = 'sampleModule.widgets.widgetRows';

const files = new Map<string, string>([
  [USECASE, `export const definition = ${JSON.stringify({
    schemaVersion: '2026-09-24-d1-definition-v2',
    artifactType: 'usecase',
    artifactId: 'listWidget',
    moduleName: 'sampleModule',
    status: 'pending',
    dependencies: [PORT_DEF],
    data: {
      usecaseId: 'listWidget',
      entityId: 'Widget',
      operation: 'list',
      ports: [PORT],
      functions: [{
        functionName: 'listWidget',
        input: [{ name: 'title', type: 'string', fieldRef: 'Widget.title' }],
        output: [{ name: 'title', type: 'string', fieldRef: 'Widget.title' }],
      }],
    },
  })} as const;\n`],
]);

const service = {
  schemaVersion: '2026-09-24-d1-definition-v2',
  artifactType: 'requestService',
  artifactId: 'widgets',
  moduleName: 'sampleModule',
  status: 'pending' as const,
  dependencies: [USECASE],
  data: {
    pageId: 'widgets',
    requests: [{ route: ROUTE, kind: 'qry', uses: ['listWidget'], transaction: 'none', outputs: [{ key: 'widgets', entity: 'Widget', fields: ['title'] }], params: [] }],
  },
};

function registration(portId: string) {
  return {
    schemaVersion: '2026-09-24-d1-definition-v2',
    artifactType: 'repositoryRegistration',
    artifactId: 'registerRepositories',
    moduleName: 'sampleModule',
    status: 'generated',
    dependencies: ['_102099_/l1/sampleModule/layer_1_external/adapters/persistence/widgetRepositoryAdapter.defs.ts'],
    data: {
      registrationId: 'registerRepositories',
      adapters: [{ portId, adapterArtifactId: 'WidgetRepository' }],
    },
  };
}

const read = async (ref: string) => files.get(ref) ?? null;

void test('a registered port is resolved by the request and an unregistered port is refused', async () => {
  const bound = await emitRequestService(service, 'l1/sampleModule/widgets.ts', read, [registration(PORT)], 'implement');
  assert.equal('code' in bound, false, 'code' in bound ? bound.detail : '');
  if ('code' in bound) return;
  assert.match(bound.source, new RegExp(`resolveRepository\\(bound, "${PORT}"\\)`));

  const renamed = `${PORT}Renamed`;
  const open = await emitRequestService(service, 'l1/sampleModule/widgets.ts', read, [registration(renamed)], 'implement');
  assert.equal('code' in open && open.code, 'PORT_UNBOUND');
});
