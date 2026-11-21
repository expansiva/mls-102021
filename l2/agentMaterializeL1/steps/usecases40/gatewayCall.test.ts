/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/usecases40/gatewayCall.test.ts" enhancement="_blank"/>

// d1_219 s1: the usecase the def names `consumer` of a call makes it, and the text follows the storage of the entity.
// Defs and answers of the `conteudo` module of the T1 (mls-102047@6b31bb06): the model's createContentFile never touched the gateway.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { emitPersistence } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { repositoryProblems } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { consumerCallsOf, connectionGatewaySection, loadUsecaseContext, usecaseAnswerProblems } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';

const PROJECT = 102099;
const MODULE = 'conteudo';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const fixture = (name: string): string => readFileSync(path.join(HERE, 'fixtures', name), 'utf8');
const NO_GATEWAY = fixture('createContentFileNoGateway.recorded.txt');
const CALLS_GATEWAY = fixture('createContentFileCallsGateway.recorded.txt');
const keyOf = (info: M12FileInfo): string => `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;

function unit(artifactType: string, artifactId: string, data: Record<string, unknown>, outputRef: string): M12Unit {
  const definition = { artifactType, artifactId, moduleName: MODULE, data, dependencies: [] as string[] };
  return { definition, declared: definition, outputRef, defRef: outputRef.replace(/\.ts$/u, '.defs.ts'), output: { project: PROJECT, level: 1, folder: '', shortName: artifactId, extension: '.ts' } } as unknown as M12Unit;
}

const connection = (operationId: string, consumer: string, entityRefs: string[], effect: string) => ({ connectionId: 'github', operationId, consumer, entityRefs, effect });
const CONNECTIONS = [
  connection('gravarArquivo', 'createContentFile', ['ContentFile'], 'update'),
  connection('gravarArquivo', 'updateContentFile', ['ContentFile'], 'update'),
  connection('lerArquivo', 'listContentFile', ['ContentFile'], 'read'),
  connection('lerArquivo', 'listContentFolder', ['ContentFile'], 'read'),
  connection('listarConteudo', 'listContentFile', ['ContentFolder', 'ContentFile'], 'list'),
  connection('listarConteudo', 'listContentFolder', ['ContentFolder', 'ContentFile'], 'list'),
];

const L4 = (modules: string[]) => `export const x = ${JSON.stringify({ modules: modules.map(moduleName => ({ moduleName })) })} as const;`;
const REPO_L4 = `export const repoHostIntegration = ${JSON.stringify({ externalSystems: [{ id: 'github', title: 'GitHub', description: 'Repository', settings: [], operations: [{ operationId: 'gravarArquivo', direction: 'call' }, { operationId: 'lerArquivo', direction: 'call' }, { operationId: 'listarConteudo', direction: 'call' }] }] })} as const;`;

function usecase(id: string, operation: string): M12Unit {
  return unit('usecase', id, {
    usecaseId: id, entityId: 'ContentFile', operation, rulesApplied: [], effects: [],
    functions: [{ functionName: id, input: [{ name: 'path', type: 'string' }], output: [{ name: 'id', type: 'string' }] }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/${id}.ts`);
}

function setup(storage: string) {
  const outbound = unit('integrationOutbound', 'outbound', { connections: CONNECTIONS }, `_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/integration/outbound.defs.ts`);
  const entity = unit('domainEntity', 'ContentFile', { entityId: 'ContentFile', storageTarget: storage }, `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/contentFile.ts`);
  const port = unit('repositoryPort', 'ContentFileRepository', { entityId: 'ContentFile', interfaceName: 'ContentFileRepository' }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/ports/contentFileRepository.ts`);
  const files: Record<string, string> = {
    [`_${PROJECT}_/l4/organization/registry.defs.ts`]: L4(['repoHost', MODULE]),
    [`_${PROJECT}_/l4/repoHost/integration.defs.ts`]: REPO_L4,
    [`_${PROJECT}_/l1/repoHost/layer_1_external/connections/github.ts`]: fixture('githubDeclaration.recorded.txt'),
  };
  const create = usecase('createContentFile', 'create');
  const list = usecase('listContentFile', 'list');
  const plain = usecase('listPublication', 'list');
  const ctx = { run: { project: PROJECT, module: MODULE }, units: [create, list, plain, outbound, entity, port], read: async (ref: string) => files[ref.replace(/^\//u, '')] ?? null } as never;
  return { ctx, create, list, plain };
}

async function withHost<T>(run: () => Promise<T>): Promise<T> {
  const previous = globalThis.mls;
  (globalThis as { mls: unknown }).mls = { actualProject: PROJECT, stor: { files: {}, getKeyToFile: keyOf } };
  try { return await run(); } finally { (globalThis as { mls: unknown }).mls = previous; }
}

void test('d1_219 s1: the calls of a consumer are the operations the def gives it, once each', () => {
  const { ctx } = setup('moduleDatabase');
  assert.deepEqual(consumerCallsOf(ctx, 'createContentFile', 'createContentFile'), [{ connectionId: 'github', operationId: 'gravarArquivo' }]);
  assert.deepEqual(consumerCallsOf(ctx, 'listContentFile', 'listContentFile').map(call => call.operationId), ['lerArquivo', 'listarConteudo']);
  assert.deepEqual(consumerCallsOf(ctx, 'listPublication', 'listPublication'), []);
});

void test('d1_219 s1: the model answer of the T1 that never calls the gateway is refused, and the one that calls it passes', async () => {
  await withHost(async () => {
    const { ctx, create } = setup('moduleDatabase');
    const header = (await loadUsecaseContext(ctx, create)).header;
    const withHeader = (code: string): string => `${header}\n${code.split('\n').slice(1).join('\n')}`;
    const refused = await usecaseAnswerProblems(ctx, create, withHeader(NO_GATEWAY), []);
    assert.ok(refused.some(item => item.startsWith('GATEWAY_CALL_MISSING: the def names this usecase the consumer of github.gravarArquivo')), refused.join('\n'));
    const imported = await usecaseAnswerProblems(ctx, create, withHeader(NO_GATEWAY.replace("import type { ContentFile }", "import type { GithubGateway } from '/_102099_/l1/conteudo/layer_1_external/adapters/integration/outbound.js';\nimport type { ContentFile }")), []);
    assert.ok(imported.some(item => item.startsWith('GATEWAY_CALL_MISSING')), 'an import is not a call');
    const commented = await usecaseAnswerProblems(ctx, create, withHeader(NO_GATEWAY.replace('const created = await', '// await gateway.gravarArquivo({});\n  const created = await')), []);
    assert.ok(commented.some(item => item.startsWith('GATEWAY_CALL_MISSING')), 'a comment is not a call');
    const calling = await usecaseAnswerProblems(ctx, create, withHeader(CALLS_GATEWAY.replace(/_102047_/gu, '_102099_')), []);
    assert.deepEqual(calling.filter(item => item.startsWith('GATEWAY_CALL_MISSING')), []);
  });
});

void test('d1_219 s1: a usecase that consumes two operations is refused for the one it leaves out, and a usecase with no call is not asked for one', async () => {
  await withHost(async () => {
    const { ctx, list, plain } = setup('moduleDatabase');
    const header = (await loadUsecaseContext(ctx, list)).header;
    const one = `${header}\nexport async function listContentFile(input: { path: string }, ctx: RequestContext) {\n  const gateway = resolveRepository<GithubGateway>(ctx, 'GithubGateway');\n  return gateway.listarConteudo({ caminho: input.path }, ctx);\n}\n`;
    const problems = (await usecaseAnswerProblems(ctx, list, one, [])).filter(item => item.startsWith('GATEWAY_CALL_MISSING'));
    assert.equal(problems.length, 1);
    assert.match(problems[0], /github\.lerArquivo/u);
    const header2 = (await loadUsecaseContext(ctx, plain)).header;
    const none = `${header2}\nexport async function listPublication(input: { path: string }, ctx: RequestContext) {\n  return [];\n}\n`;
    assert.deepEqual((await usecaseAnswerProblems(ctx, plain, none, [])).filter(item => item.startsWith('GATEWAY_CALL_MISSING')), []);
  });
});

void test('d1_219 s1: the text of the section follows the storage of the entity', async () => {
  await withHost(async () => {
    const stored = setup('moduleDatabase');
    const inModule = await connectionGatewaySection(stored.ctx, 'createContentFile', 'createContentFile');
    assert.match(inModule, /The entity is stored in this module and also lives in the system outside\. Keep the repository for the module copy and call the gateway/u);
    assert.equal(inModule.includes('kept outside this module'), false);
    assert.match(inModule, /must call each one as `gateway\.<operation>/u);
    assert.match(inModule, /gravarArquivo\(input: GravarArquivoInput/u);
    const outside = setup('external');
    const external = await connectionGatewaySection(outside.ctx, 'createContentFile', 'createContentFile');
    assert.match(external, /The entity is kept outside this module\. Read and write it only through the gateway/u);
    assert.equal(external.includes('stored in this module'), false);
  });
});

void test('d1_219 s1: the usecase that calls the gateway compiles against the gateway the generator writes', async () => {
  const root = path.resolve(HERE, '../../../../..');
  const { ctx } = setup('moduleDatabase');
  const emitted = await emitPersistence('persistence.integrationOutbound', {
    schemaVersion: M1_DEFINITION_SCHEMA, artifactType: 'integrationOutbound', artifactId: 'outbound', moduleName: MODULE, status: 'pending', dependencies: [],
    data: { integrationId: 'outbound', events: [], connections: CONNECTIONS },
  } as M1Definition, `_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/integration/outbound.ts`, (ctx as unknown as { read: (ref: string) => Promise<string | null> }).read);
  assert.equal('code' in emitted, false, JSON.stringify(emitted));
  if ('code' in emitted) return;
  const dir = mkdtempSync(path.join(root, '.gateway-proof-'));
  try {
    const flat = (source: string): string => source
      .replace(/\/_102099_\/l1\/repoHost\/layer_1_external\/connections\/github\.js/gu, './github.js')
      .replace(/\/_102099_\/l1\/conteudo\/layer_1_external\/adapters\/integration\/outbound\.js/gu, './outbound.js')
      .replace(/\/_102099_\/l1\/conteudo\/layer_2_application\/ports\/contentFileRepository\.js/gu, './port.js')
      .replace(/\/_102099_\/l1\/conteudo\/layer_3_domain\/entities\/contentFile\.js/gu, './entity.js');
    writeFileSync(path.join(dir, 'github.ts'), fixture('githubDeclaration.recorded.txt'));
    writeFileSync(path.join(dir, 'outbound.ts'), flat(emitted.source));
    writeFileSync(path.join(dir, 'entity.ts'), 'export interface ContentFile { id: string; version: number; folderId: string; path: string; title: string; lastChangedAt?: string; details: { fileName: string; repositoryRevision?: string; changeOrigin?: \'module\' | \'external\'; lastPublishedAt?: string } }\n');
    writeFileSync(path.join(dir, 'port.ts'), "import type { ContentFile } from './entity.js';\nexport interface ContentFileRepository { create(record: ContentFile): Promise<ContentFile>; list(filter: { path?: string }): Promise<ContentFile[]>; }\n");
    writeFileSync(path.join(dir, 'usecase.ts'), flat(CALLS_GATEWAY.replace(/_102047_/gu, '_102099_')));
    writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({ extends: '../tsconfig.base.json', compilerOptions: { noEmit: true, skipLibCheck: true }, files: ['usecase.ts'] }));
    let diagnostics = '';
    try {
      execFileSync(path.join(root, 'node_modules', '.bin', 'tsc'), ['--pretty', 'false', '-p', path.join(dir, 'tsconfig.json')], { cwd: root, encoding: 'utf8' });
    } catch (error) {
      const failed = error as { stdout?: string; stderr?: string };
      diagnostics = `${failed.stdout ?? ''}${failed.stderr ?? ''}`;
    }
    assert.equal(diagnostics, '');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

void test('d1_219 s3: the request of the T1 that invented ports to reach the system outside is refused, and one that goes through the usecase and the port of the module is not', () => {
  const ports = ['ContentFileRepository', 'ContentFolderRepository', 'PublicationRepository'];
  const invented = [
    "interface ContentRepositoryIntegration { writeRepositoryText(input: { path: string; text: string }): Promise<{ revision?: string | null }>; }",
    "interface PublicationWriter { create(input: { id: string }): Promise<unknown>; }",
    "const integration = resolveRepository<ContentRepositoryIntegration>(ctx, 'ContentRepositoryIntegration');",
    "const writer = resolveRepository<PublicationWriter>(ctx, 'PublicationRepository');",
  ].join('\n');
  const refused = repositoryProblems(invented, ports, ['GithubGateway']);
  assert.ok(refused.some(item => item.includes('ContentRepositoryIntegration')), refused.join('\n'));
  assert.ok(refused.some(item => item.includes('PublicationWriter')), refused.join('\n'));
  const through = [
    "import type { PublicationRepository } from '/_102099_/l1/conteudo/layer_2_application/ports/publicationRepository.js';",
    "import { createContentFile } from '/_102099_/l1/conteudo/layer_2_application/usecases/createContentFile.js';",
    "const writer = resolveRepository<PublicationRepository>(ctx, 'PublicationRepository');",
    "await createContentFile(input, bound);",
  ].join('\n');
  assert.deepEqual(repositoryProblems(through, ports, ['GithubGateway']), []);
});

void test('d1_265: the entity the usecase works on decides the text, not the entities the call names', async () => {
  await withHost(async () => {
    // `createContentFile` moves ContentFile, which the module stores; the call names ContentFolder, which is external: the module copy is written too.
    const { ctx } = setup('moduleDatabase');
    const units = (ctx as unknown as { units: M12Unit[] }).units;
    const folder = unit('domainEntity', 'ContentFolder', { entityId: 'ContentFolder', storageTarget: 'external' }, `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/contentFolder.ts`);
    const outbound = units.find(item => item.definition.artifactType === 'integrationOutbound')!;
    (outbound.definition.data as { connections: unknown[] }).connections = [connection('gravarArquivo', 'createContentFile', ['ContentFolder'], 'update')];
    (ctx as unknown as { units: M12Unit[] }).units = [...units, folder];
    const text = await connectionGatewaySection(ctx, 'createContentFile', 'createContentFile');
    assert.match(text, /The entity is stored in this module and also lives in the system outside\. Keep the repository for the module copy/u);
    assert.equal(text.includes('kept outside this module'), false);
    // The usecase of the external entity itself keeps the text it had.
    const external = unit('domainEntity', 'ContentFile', { entityId: 'ContentFile', storageTarget: 'external' }, `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/contentFile.ts`);
    (ctx as unknown as { units: M12Unit[] }).units = [...units.filter(item => item.definition.artifactId !== 'ContentFile'), folder, external];
    assert.match(await connectionGatewaySection(ctx, 'createContentFile', 'createContentFile'), /The entity is kept outside this module/u);
  });
});

void test('d1_266: the section shows the fields of the catalog types of each call, not only their names', async () => {
  const { catalogTypeBody } = await import('/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js');
  const source = 'export interface CmActivateAgentInput {\n  draftId: string;\n}\nexport interface CmActivateAgentOutput {\n  /** The same id. */\n  agentId: string;\n}\nexport interface Other { a: { b: number }; }\n';
  assert.equal(catalogTypeBody(source, 'CmActivateAgentInput'), '{ draftId: string; }');
  assert.equal(catalogTypeBody(source, 'CmActivateAgentOutput'), '{ agentId: string; }', 'a comment inside is dropped');
  assert.equal(catalogTypeBody(source, 'Other'), '{ a: { b: number }; }', 'a nested brace closes at its own level');
  assert.equal(catalogTypeBody(source, 'Missing'), '');
  assert.equal(catalogTypeBody(null, 'CmActivateAgentInput'), '');
});

void test('d1_268: a cast of the input of a gateway call is refused; a value that already has the type of the operation is not', async () => {
  const { gatewayInputCastProblems } = await import('/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js');
  const shipped = "const request: Record<string, unknown> = {};\nif (folderPath) request.path = folderPath;\nconst response = await gateway.listarConteudo(request as GatewayListInput, ctx);";
  const refused = gatewayInputCastProblems(shipped, ['listarConteudo']);
  assert.equal(refused.length, 1);
  assert.match(refused[0], /^GATEWAY_INPUT_CAST: .*gateway\.listarConteudo\(/u);
  // The casts of the agents usecases (redundant, they compile without) are the same shape.
  assert.equal(gatewayInputCastProblems('return await gateway.updateAgent(catalogInput as CmUpdateAgentInput, ctx, { expectVersion });', ['updateAgent']).length, 1);
  assert.equal(gatewayInputCastProblems('await gateway.x({ a: 1 } as unknown as XInput, ctx);', ['x']).length, 1);
  // Built as the type, passed as is, a cast inside a nested value or in the options, and a comment: not a cast of the input.
  assert.deepEqual(gatewayInputCastProblems("const request: ListarConteudoInput = { caminho: folderPath };\nconst response = await gateway.listarConteudo(request, ctx);", ['listarConteudo']), []);
  assert.deepEqual(gatewayInputCastProblems('const result = await gateway.readAgent(input, ctx);', ['readAgent']), []);
  assert.deepEqual(gatewayInputCastProblems('await gateway.readAgent({ agentId: String(input.id as string) }, ctx);', ['readAgent']), [], 'a cast inside the object is not a cast of the input');
  assert.deepEqual(gatewayInputCastProblems('await gateway.readAgent(input, ctx, { expectVersion: version as number });', ['readAgent']), [], 'the options are not the input');
  assert.deepEqual(gatewayInputCastProblems('// gateway.readAgent(input as X, ctx)\nawait gateway.readAgent(input, ctx);', ['readAgent']), []);
  assert.deepEqual(gatewayInputCastProblems('await gateway.other(input as X, ctx);', ['readAgent']), [], 'only the operations the usecase consumes');
});
