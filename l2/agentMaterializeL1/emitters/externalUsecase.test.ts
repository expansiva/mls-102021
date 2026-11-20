/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/externalUsecase.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { catalogTypeFields } from '/_102021_/l2/agentMaterializeL1/emitters/connectionCatalog.js';
import { emitRequestService, emitUsecase } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import { usecasePlan } from '/_102021_/l2/agentMaterializeL1/emitters/usecaseIntent.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const CM_SOURCE = readFileSync(path.join(ROOT, 'mls-102034/l2/shared/contracts/connections/cm.ts'), 'utf8');
const ENTITY_DEF = '_102099_/l1/agents/layer_3_domain/entities/agentDraft.defs.ts';
const OUTBOUND_DEF = '_102099_/l1/agents/layer_1_external/adapters/integration/outbound.defs.ts';

function envelope(definition: Omit<M1Definition, 'schemaVersion' | 'moduleName' | 'status'>): M1Definition {
  return { schemaVersion: M1_DEFINITION_SCHEMA, moduleName: 'agents', status: 'pending', ...definition };
}

function source(definition: M1Definition): string {
  return `export const definition = ${JSON.stringify(definition, null, 2)} as const;\n`;
}

function usecase(usecaseId: string, operation: string, transitionRef = ''): M1Definition {
  return envelope({
    artifactType: 'usecase',
    artifactId: usecaseId,
    dependencies: [ENTITY_DEF],
    data: { usecaseId, entityId: 'AgentDraft', operation, ...(transitionRef ? { transitionRef } : {}), rulesApplied: [], effects: [] },
  } as unknown as Omit<M1Definition, 'schemaVersion' | 'moduleName' | 'status'>);
}

function files(connections: Array<Record<string, unknown>>): Record<string, string> {
  return {
    [ENTITY_DEF]: source(envelope({
      artifactType: 'domainEntity',
      artifactId: 'AgentDraft',
      dependencies: [],
      data: { entityId: 'AgentDraft', storageTarget: 'external', fields: [{ name: 'name', type: 'string' }] },
    } as unknown as Omit<M1Definition, 'schemaVersion' | 'moduleName' | 'status'>)),
    [OUTBOUND_DEF]: source(envelope({
      artifactType: 'integrationOutbound',
      artifactId: 'outbound',
      dependencies: [],
      data: { connections },
    } as unknown as Omit<M1Definition, 'schemaVersion' | 'moduleName' | 'status'>)),
    '/_102034_/l2/shared/contracts/connections/cm.ts': CM_SOURCE,
  };
}

const read = (all: Record<string, string>) => async (ref: string): Promise<string | null> => all[ref] ?? all[`/${ref}`] ?? null;

void test('catalogTypeFields reads the top-level members, and an empty Record', () => {
  const activate = catalogTypeFields(CM_SOURCE, 'CmActivateAgentInput');
  assert.ok(activate && activate.length > 0);
  assert.equal(catalogTypeFields(CM_SOURCE, 'CmListCmToolsInput')?.length, 0);
  assert.equal(catalogTypeFields(CM_SOURCE, 'CmNoSuchType'), null);
});

void test('a usecase on an external entity takes its signature from the call: transition, get, expectVersion only when marked', async () => {
  const all = files([
    { connectionId: 'cm', operationId: 'activateAgent', consumer: 'activate' },
    { connectionId: 'cm', operationId: 'readAgent', consumer: 'getAgentDraft' },
    { connectionId: 'cm', operationId: 'updateAgent', consumer: 'updateAgentDraft' },
  ]);
  const activate = await usecasePlan(usecase('activate', 'transition', 'activate'), read(all));
  assert.equal(activate.detail, '');
  const data = activate.definition.data as { functions: Array<{ input: Array<{ name: string }>; output: Array<{ name: string }> }>; externalCall: { inputType: string; expectsVersion: boolean }; uses: unknown[]; ports: unknown[] };
  const expected = catalogTypeFields(CM_SOURCE, 'CmActivateAgentInput')!.map(item => item.name);
  const inputNames = data.functions[0].input.map(item => item.name);
  assert.deepEqual(inputNames.filter(name => name !== 'expectVersion'), expected);
  assert.equal(inputNames.includes('id') && !expected.includes('id'), false);
  assert.deepEqual(data.uses, []);
  assert.deepEqual(data.ports, []);

  const read1 = await usecasePlan(usecase('getAgentDraft', 'get'), read(all));
  assert.equal(read1.detail, '');
  assert.equal((read1.definition.data as { externalCall: { expectsVersion: boolean } }).externalCall.expectsVersion, false);
  assert.equal((read1.definition.data as { functions: Array<{ input: Array<{ name: string }> }> }).functions[0].input.some(item => item.name === 'expectVersion'), false);

  const update = await usecasePlan(usecase('updateAgentDraft', 'update'), read(all));
  assert.equal(update.detail, '');
  assert.equal((update.definition.data as { functions: Array<{ input: Array<{ name: string }> }> }).functions[0].input.some(item => item.name === 'expectVersion'), true);

  const emitted = await emitUsecase(update.definition, '_102099_/l1/agents/layer_2_application/usecases/updateAgentDraft.ts', read(all));
  assert.ok('source' in emitted, JSON.stringify(emitted));
  assert.match(emitted.source, /import type \{ CmUpdateAgentInput, CmUpdateAgentOutput \} from '\/_102034_\/l2\/shared\/contracts\/connections\/cm\.js';/u);
  assert.match(emitted.source, /UpdateAgentDraftInput extends CmUpdateAgentInput \{\n  expectVersion: number;/u);
  // d1_203: no index signature, so a field the catalog does not declare is a compile error in a call and in a read.
  assert.match(emitted.source, /UpdateAgentDraftOutput extends CmUpdateAgentOutput \{\}/u);
  assert.equal(emitted.source.includes('Record<string, unknown>'), false);
  const emittedGet = await emitUsecase(read1.definition, '_102099_/l1/agents/layer_2_application/usecases/getAgentDraft.ts', read(all));
  assert.ok('source' in emittedGet);
  assert.equal(emittedGet.source.includes('expectVersion'), false);
});

void test('d1_203: a usecase of the module declares its input and output without an index signature', async () => {
  const definition = envelope({
    artifactType: 'usecase',
    artifactId: 'closeThing',
    dependencies: [],
    data: {
      usecaseId: 'closeThing',
      entityId: 'Thing',
      operation: 'transition',
      functions: [{ functionName: 'closeThing', input: [{ name: 'thingId', type: 'string' }], output: [{ name: 'closed', type: 'boolean' }] }],
    },
  } as unknown as Omit<M1Definition, 'schemaVersion' | 'moduleName' | 'status'>);
  const emitted = await emitUsecase(definition, '_102099_/l1/agents/layer_2_application/usecases/closeThing.ts', read({}));
  assert.ok('source' in emitted, JSON.stringify(emitted));
  assert.match(emitted.source, /export interface CloseThingInput \{\n\s*thingId: string;/u);
  assert.match(emitted.source, /export interface CloseThingOutput \{\n\s*closed: boolean;/u);
  assert.equal(emitted.source.includes('Record<string, unknown>'), false);
});

void test('a usecase on an external entity with no call is EXTERNAL_STEP_WITHOUT_CALL, never the entity signature', async () => {
  const all = files([{ connectionId: 'cm', operationId: 'readAgent', consumer: 'otherUsecase' }]);
  const plan = await usecasePlan(usecase('discard', 'transition', 'discard'), read(all));
  assert.match(plan.detail, /^EXTERNAL_STEP_WITHOUT_CALL/u);
  assert.equal(Array.isArray(plan.definition.data.functions), false);
});

void test('a usecase on an external entity that consumes two calls is EXTERNAL_USECASE_CALL_AMBIGUOUS and lists them', async () => {
  const all = files([
    { connectionId: 'cm', operationId: 'readAgent', consumer: 'getAgentDraft' },
    { connectionId: 'cm', operationId: 'listAgents', consumer: 'getAgentDraft' },
  ]);
  const plan = await usecasePlan(usecase('getAgentDraft', 'get'), read(all));
  assert.match(plan.detail, /^EXTERNAL_USECASE_CALL_AMBIGUOUS/u);
  assert.match(plan.detail, /cm\.listAgents, cm\.readAgent/u);
  assert.equal(Array.isArray(plan.definition.data.functions), false);
});

void test('a route that lists two usecases of one external entity (one per call) emits its request service', async () => {
  const all = files([
    { connectionId: 'cm', operationId: 'updateAgent', consumer: 'updateAgentAgentBehavior' },
    { connectionId: 'cm', operationId: 'undoAgentChange', consumer: 'undoAgentChange' },
  ]);
  const usecasesDir = '_102099_/l1/agents/layer_2_application/usecases';
  all[`${usecasesDir}/updateAgentAgentBehavior.defs.ts`] = source(usecase('updateAgentAgentBehavior', 'update'));
  all[`${usecasesDir}/undoAgentChange.defs.ts`] = source(usecase('undoAgentChange', 'update'));
  const service = envelope({
    artifactType: 'requestService',
    artifactId: 'agent_behavior',
    dependencies: [`${usecasesDir}/updateAgentAgentBehavior.defs.ts`, `${usecasesDir}/undoAgentChange.defs.ts`],
    data: {
      pageId: 'agent_behavior',
      requests: [{
        route: 'agents.agent_behavior.sendBehaviorChange',
        kind: 'cmd',
        uses: ['updateAgentAgentBehavior', 'undoAgentChange'],
        transaction: 'single',
        output: [{ kind: 'entity', path: 'behavior', entity: 'AgentDraft', fields: [{ field: 'name', path: 'name' }] }],
        params: [],
        rules: [],
      }],
    },
  } as unknown as Omit<M1Definition, 'schemaVersion' | 'moduleName' | 'status'>);
  const emitted = await emitRequestService(service, '_102099_/l1/agents/layer_2_application/requests/agent_behavior.ts', read(all), [], 'structure');
  assert.ok('source' in emitted, JSON.stringify(emitted));
  assert.match(emitted.source, /updateAgentAgentBehavior/u);
  assert.match(emitted.source, /undoAgentChange/u);
});
