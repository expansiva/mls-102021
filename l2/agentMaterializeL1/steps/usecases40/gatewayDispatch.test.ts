/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/usecases40/eventPublishDispatch.test.ts" enhancement="_blank"/>

// d1_219 s1: the phases run as the agent runs them for a module like `conteudo` (T1): persistence20 writes the gateway of the sibling system,
// usecases40 sends the consumer usecase to a worker, and the answer is gated on the call to the gateway.

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

const PROJECT = 102099;
const MODULE = 'conteudo';
const FIXTURES = path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures');
const NO_GATEWAY = readFileSync(path.join(FIXTURES, 'createContentFileNoGateway.recorded.txt'), 'utf8').replace(/_102047_/gu, '_102099_');
const CALLS_GATEWAY = readFileSync(path.join(FIXTURES, 'createContentFileCallsGateway.recorded.txt'), 'utf8').replace(/_102047_/gu, '_102099_');

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

void test('d1_219: persistence20 writes the gateway, usecases40 sends the consumer usecase, and the answer is gated on the call', async () => {
  const files: Record<string, FakeFile> = {};
  install(files);
  const at = (level: number, folder: string, shortName: string, extension: string, content: string): void => {
    const info = { project: PROJECT, level, folder, shortName, extension };
    const file: FakeFile = { ...info, status: 'changed', content, getContent: async () => file.content, getValueInfo: async () => ({ content: file.content }) };
    files[keyOf(info)] = file;
  };
  const connection = (operationId: string) => ({ connectionId: 'github', operationId, consumer: 'createContentFile', entityRefs: ['ContentFile'], effect: 'update' });
  putDef(files, `${MODULE}/layer_1_external/adapters/integration`, def('integrationOutbound', 'outbound', { integrationId: 'outbound', events: [], connections: [connection('gravarArquivo')] }));
  putDef(files, `${MODULE}/layer_3_domain/entities`, def('domainEntity', 'ContentFile', {
    entityId: 'ContentFile',
    storageTarget: 'moduleDatabase',
    fields: [{ name: 'id', type: 'uuid', derived: true }, { name: 'version', type: 'integer', derived: true }, { name: 'path', type: 'string' }, { name: 'details', type: 'object' }, { name: 'details.fileName', type: 'string' }],
    lifecycle: { states: [], transitions: [] },
    invariants: [],
    imports: [],
  }), 'contentFile');
  putDef(files, `${MODULE}/layer_2_application/ports`, def('repositoryPort', 'ContentFileRepository', {
    entityId: 'ContentFile',
    interfaceName: 'ContentFileRepository',
    methods: [{ name: 'create', params: ['ContentFile'], returns: 'ContentFile' }],
  }, [`_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/contentFile.defs.ts`]), 'contentFileRepository');
  putDef(files, `${MODULE}/layer_2_application/usecases`, def('usecase', 'createContentFile', {
    usecaseId: 'createContentFile', entityId: 'ContentFile', operation: 'create', rulesApplied: [], effects: [],
  }, [
    `_${PROJECT}_/l1/${MODULE}/layer_2_application/ports/contentFileRepository.defs.ts`,
    `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/contentFile.defs.ts`,
  ]));
  // The system of the sibling: declared by its L4, generated by its module.
  at(4, 'organization', 'registry', '.defs.ts', `export const x = ${JSON.stringify({ modules: [{ moduleName: 'repoHost' }, { moduleName: MODULE }] })} as const;`);
  at(4, 'repoHost', 'integration', '.defs.ts', `export const x = ${JSON.stringify({ externalSystems: [{ id: 'github', title: 'GitHub', description: 'Repository', settings: [], operations: [{ operationId: 'gravarArquivo', direction: 'call' }] }] })} as const;`);
  at(1, 'repoHost/layer_1_external/connections', 'github', '.ts', readFileSync(path.join(FIXTURES, 'githubDeclaration.recorded.txt'), 'utf8'));

  const steps = planSteps(PROJECT, { scope: MODULE, target: '', force: false }, [{ module: MODULE, layers: ['domain', 'persistence', 'usecases'], register: false }]);
  const index = (agentName: string): number => steps.findIndex(step => step.agentName === agentName);
  const run = async (agent: { beforePromptStep?: unknown }, agentName: string) => {
    const step = { ...steps[index(agentName)], stepId: 10 + index(agentName) } as mls.msg.AIAgentStep;
    return (agent.beforePromptStep as Hook)(meta, context, parent, step, index(agentName), step.prompt);
  };
  await run(domainAgent(), 'agentM12Domain');
  await run(persistenceAgent(), 'agentM12Persistence');
  const gateway = files[keyOf({ project: PROJECT, level: 1, folder: `${MODULE}/layer_1_external/adapters/integration`, shortName: 'outbound', extension: '.ts' })];
  assert.ok(gateway?.content.includes('export interface GithubGateway'), 'the gateway is written before the usecase phase');
  assert.ok(gateway?.content.includes("callConnection(\"github\", \"gravarArquivo\""));

  const workers = (await run(usecasesAgent(), 'agentM12Usecases')).filter(item => item.type === 'add-step');
  assert.equal(workers.length, 1, 'one worker');
  const answer = async (code: string, stepId: number) => {
    const answered = { ...workers[0].step, stepId, interaction: { payload: [{ type: 'flexible', result: { toolName: 'writeUsecase', arguments: { code, notApplicable: [] } } }] } } as mls.msg.AIAgentStep;
    return (usecaseUnitAgent().afterPromptStep as Hook)(meta, context, parent, answered, stepId);
  };
  const usecaseKey = keyOf({ project: PROJECT, level: 1, folder: `${MODULE}/layer_2_application/usecases`, shortName: 'createContentFile', extension: '.ts' });
  const receipt = () => JSON.parse(Object.values(files).find(file => file.shortName === 'createContentFile' && file.extension === '.json')?.content ?? '{}') as { status?: string; diagnostic?: string };

  const refused = await answer(NO_GATEWAY, 21);
  assert.equal(files[usecaseKey]?.content ?? '', '', 'the model answer of the T1 is not written');
  assert.ok(refused.some(item => item.type === 'add-step' && String(item.step.stepTitle).includes('repair 1')), 'the refusal opens a repair');
  assert.match(receipt().diagnostic ?? '', /GATEWAY_CALL_MISSING: the def names this usecase the consumer of github\.gravarArquivo/u);

  await answer(CALLS_GATEWAY, 22);
  assert.equal(files[usecaseKey]?.content, CALLS_GATEWAY, 'the answer that calls the gateway is written');
});
