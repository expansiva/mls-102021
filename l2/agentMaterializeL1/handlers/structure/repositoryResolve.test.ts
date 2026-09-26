/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/structure/repositoryResolve.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { emitController } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';

const PORT = 'WidgetRepository';
const SCOPE = '_102099_/l1/sampleModule/layer_2_application/scope/accessScope.defs.ts';
const USECASE = '_102099_/l1/sampleModule/layer_2_application/usecases/listWidget.defs.ts';
const PORT_DEF = '_102099_/l1/sampleModule/layer_2_application/ports/widgetRepository.defs.ts';
const CONTRACT = '_102099_/l2/sampleModule/web/contracts/widgets.defs.ts';
const ROUTE = 'sampleModule.widgets.qryListWidget';

const files = new Map<string, string>([
  [SCOPE, 'export const definition = { "dependencies": [], "data": {} } as const;\n'],
  [USECASE, `export const definition = ${JSON.stringify({
    schemaVersion: '2026-09-24-d1-definition-v2',
    artifactType: 'usecase',
    artifactId: 'listWidget',
    moduleName: 'sampleModule',
    status: 'pending',
    dependencies: [PORT_DEF, CONTRACT],
    data: {
      ports: [PORT],
      functions: [{
        functionName: 'listWidget',
        contractRefs: [{ route: ROUTE, symbol: 'ListWidgetOutput' }],
      }],
      routeProjections: [{
        route: ROUTE,
        contractPath: CONTRACT,
        outputFields: ['title'],
      }],
    },
  })} as const;\n`],
  [CONTRACT, 'export interface ListWidgetInput {\n  title: string;\n}\nexport interface ListWidgetOutput {\n  title: string;\n}\n'],
]);

const controller = {
  schemaVersion: '2026-09-24-d1-definition-v2',
  artifactType: 'httpController',
  artifactId: 'widgets',
  moduleName: 'sampleModule',
  status: 'pending' as const,
  dependencies: [SCOPE, USECASE],
  data: {
    pageId: 'widgets',
    handlers: [{ route: ROUTE, kind: 'query', usecaseId: 'listWidget', grantIds: ['readWidget'] }],
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

void test('a registered port is resolved and an unregistered port stays pending', async () => {
  const bound = await emitController(controller, 'l1/sampleModule/widgets.ts', read, [registration(PORT)]);
  assert.equal('code' in bound, false, 'code' in bound ? bound.detail : '');
  if ('code' in bound) return;
  assert.match(bound.source, new RegExp(`resolveRepository<${PORT}>\\(input\\.ctx, '${PORT}'\\)`));
  assert.equal(bound.source.includes(`pending${PORT}`), false);

  const renamed = `${PORT}Renamed`;
  const open = await emitController(controller, 'l1/sampleModule/widgets.ts', read, [registration(renamed)]);
  assert.equal('code' in open, false, 'code' in open ? open.detail : '');
  if ('code' in open) return;
  assert.match(open.source, new RegExp(`pending${PORT}`));
  assert.equal(open.source.includes('resolveRepository'), false);
});
