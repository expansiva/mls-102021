/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/usecases40/eventPublishDispatch.test.ts" enhancement="_blank"/>

// d1_216 s3: the phases run as the agent runs them, for a module like repoHost: persistence20 writes the publisher, usecases40 sends the
// usecase that does the `on` to a worker with the event in its prompt, and the worker's answer is gated on the call.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { buildM12PlannedSteps as planSteps } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import type { M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { createAgent as domainAgent } from '/_102021_/l2/agentMaterializeL1/steps/domain10/agentM12Domain.js';
import { createAgent as persistenceAgent } from '/_102021_/l2/agentMaterializeL1/steps/persistence20/agentM12Persistence.js';
import { createAgent as usecasesAgent } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/agentM12Usecases.js';
import { createAgent as usecaseUnitAgent } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/agentM12UsecaseUnit.js';
import { M1_DEFINITION_SCHEMA, renderDefinition, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { MODULE_EVENT_PUBLISH } from '/_102021_/l2/helpers/l1Defs/moduleEvent.js';

const PROJECT = 102099;
const MODULE = 'repoHost';
const RECORDED = readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures/repoHostCreatePublishes.recorded.txt'), 'utf8');

interface FakeFile extends M12FileInfo { status: string; content: string; getContent(): Promise<string>; getValueInfo(): Promise<{ content: string }> }
const keyOf = (info: M12FileInfo) => `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;

function install(files: Record<string, FakeFile>): void {
  (globalThis as { mls: unknown }).mls = {
    actualProject: PROJECT,
    stor: {
      files,
      getKeyToFile: keyOf,
      addOrUpdateFile: async (info: M12FileInfo) => {
        const key = keyOf(info);
        if (!files[key]) {
          const file: FakeFile = { ...info, status: 'new', content: '', getContent: async () => file.content, getValueInfo: async () => ({ content: file.content }) };
          files[key] = file;
        }
        return files[key];
      },
      localStor: { setContent: async (file: FakeFile, value: { content?: string | null }) => { file.content = value.content ?? ''; return true; } },
      server: { loadProjectInfoIfNeeded: async () => undefined },
    },
  };
}

function put(files: Record<string, FakeFile>, folder: string, shortName: string, extension: string, content: string): void {
  const info = { project: PROJECT, level: 1, folder, shortName, extension };
  const file: FakeFile = { ...info, status: 'changed', content, getContent: async () => file.content, getValueInfo: async () => ({ content: file.content }) };
  files[keyOf(info)] = file;
}

function putDef(files: Record<string, FakeFile>, folder: string, definition: M1Definition, fileName = definition.artifactId): void {
  const rendered = renderDefinition(definition, `_${PROJECT}_/l1/${folder}/${fileName}.defs.ts`);
  assert.ok('source' in rendered, 'issues' in rendered ? rendered.issues.join(' ') : '');
  if ('source' in rendered) put(files, folder, fileName, '.defs.ts', rendered.source);
}

function def(artifactType: string, artifactId: string, data: Record<string, unknown>, dependencies: string[] = []): M1Definition {
  return { schemaVersion: M1_DEFINITION_SCHEMA, artifactType, artifactId, moduleName: MODULE, status: 'pending', dependencies, data } as M1Definition;
}

const meta = { agentName: 'x', agentDescription: 'x', visibility: 'private' } as IAgentMeta;
const context = { message: { orderAt: 'm', threadId: 't', content: '' }, task: { PK: 'task' } } as unknown as mls.msg.ExecutionContext;
const parent = { stepId: 1 } as mls.msg.AIAgentStep;
type Hook = (a: IAgentMeta, c: mls.msg.ExecutionContext, p: mls.msg.AIAgentStep, s: mls.msg.AIAgentStep, h: number, args?: string) => Promise<Array<Record<string, any>>>;

void test('d1_216: persistence20 writes the publisher, usecases40 sends the usecase with the event, and the answer is gated on the call', async () => {
  const files: Record<string, FakeFile> = {};
  install(files);
  putDef(files, `${MODULE}/layer_1_external/adapters/integration`, def('integrationOutbound', 'outbound', {
    integrationId: 'outbound',
    events: [{
      eventId: 'repositorioAlterado', on: 'RepositoryChange.create', entityId: 'RepositoryChange',
      mechanism: MODULE_EVENT_PUBLISH.symbol, consumer: 'createRepositoryChange', mechanismRef: MODULE_EVENT_PUBLISH.path,
    }],
  }));
  putDef(files, `${MODULE}/layer_3_domain/entities`, def('domainEntity', 'RepositoryChange', {
    entityId: 'RepositoryChange',
    storageTarget: 'moduleDatabase',
    fields: [{ name: 'id', type: 'uuid', derived: true }, { name: 'version', type: 'integer', derived: true }, { name: 'changedAt', type: 'timestamp' }, { name: 'details', type: 'object' }, { name: 'details.commitMessage', type: 'text' }],
    lifecycle: { states: [], transitions: [] },
    invariants: [],
    imports: [],
  }), 'repositoryChange');
  putDef(files, `${MODULE}/layer_2_application/ports`, def('repositoryPort', 'RepositoryChangeRepository', {
    entityId: 'RepositoryChange',
    interfaceName: 'RepositoryChangeRepository',
    methods: [{ name: 'create', params: ['RepositoryChange'], returns: 'RepositoryChange' }],
  }, [`_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/repositoryChange.defs.ts`]), 'repositoryChangeRepository');
  putDef(files, `${MODULE}/layer_2_application/usecases`, def('usecase', 'createRepositoryChange', {
    usecaseId: 'createRepositoryChange', entityId: 'RepositoryChange', operation: 'create', rulesApplied: [],
    effects: [{ eventId: 'repositorioAlterado', path: 'l4/repoHost/integration.defs.ts', symbol: 'repositorioAlterado' }],
  }, [
    `_${PROJECT}_/l1/${MODULE}/layer_2_application/ports/repositoryChangeRepository.defs.ts`,
    `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/repositoryChange.defs.ts`,
  ]));

  const steps = planSteps(PROJECT, { scope: MODULE, target: '', force: false }, [{ module: MODULE, layers: ['domain', 'persistence', 'usecases'], register: false }]);
  const at = (agentName: string): number => steps.findIndex(step => step.agentName === agentName);
  assert.ok(at('agentM12Persistence') >= 0 && at('agentM12Persistence') < at('agentM12Usecases'), 'the publisher phase comes before the usecase phase');
  const run = async (agent: { beforePromptStep?: unknown }, index: number) => {
    const step = { ...steps[index], stepId: 10 + index } as mls.msg.AIAgentStep;
    return (agent.beforePromptStep as Hook)(meta, context, parent, step, index, step.prompt);
  };

  await run(domainAgent(), at('agentM12Domain'));
  await run(persistenceAgent(), at('agentM12Persistence'));
  const outbound = files[keyOf({ project: PROJECT, level: 1, folder: `${MODULE}/layer_1_external/adapters/integration`, shortName: 'outbound', extension: '.ts' })];
  assert.ok(outbound?.content.includes('export async function publishRepositorioAlterado('), 'the publisher is written before the usecase phase');

  const dispatched = await run(usecasesAgent(), at('agentM12Usecases'));
  const workers = dispatched.filter(item => item.type === 'add-step');
  assert.equal(workers.length, 1, 'one worker');
  assert.equal(workers[0].step.agentName, 'agentM12UsecaseUnit');

  const answer = async (code: string, stepId: number) => {
    const answered = {
      ...workers[0].step,
      stepId,
      interaction: { payload: [{ type: 'flexible', result: { toolName: 'writeUsecase', arguments: { code, notApplicable: [] } } }] },
    } as mls.msg.AIAgentStep;
    return (usecaseUnitAgent().afterPromptStep as Hook)(meta, context, parent, answered, stepId);
  };
  const usecaseKey = keyOf({ project: PROJECT, level: 1, folder: `${MODULE}/layer_2_application/usecases`, shortName: 'createRepositoryChange', extension: '.ts' });

  const refused = await answer(RECORDED.replace('await publishRepositorioAlterado(saved, bound, { requestId: bound.requestMeta?.requestId });', 'void saved;'), 21);
  assert.equal(files[usecaseKey]?.content ?? '', '', 'an answer that does not publish is not written');
  assert.ok(refused.some(item => item.type === 'add-step' && String(item.step.stepTitle).includes('repair 1')), 'the refusal opens a repair');
  const receipt = JSON.parse(Object.values(files).find(file => file.shortName === 'createRepositoryChange' && file.extension === '.json')?.content ?? '{}') as { status?: string; diagnostic?: string };
  assert.equal(receipt.status, 'failed');
  assert.match(receipt.diagnostic ?? '', /EVENT_NOT_PUBLISHED: the usecase must publish repositorioAlterado/u, 'the repair carries the problem');

  await answer(RECORDED, 22);
  assert.equal(files[usecaseKey]?.content, RECORDED, 'the recorded answer that publishes is written');
});
