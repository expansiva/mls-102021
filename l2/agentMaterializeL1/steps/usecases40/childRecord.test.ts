/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/usecases40/childRecord.test.ts" enhancement="_blank"/>

// d1_221 s2: the usecase that writes the parent records the child the L4 says it writes, after the outside call. The answers are the one of
// the T1 for `createContentFile` (mls-102047@6b31bb06, which calls the gateway and records nothing: refused) and the same file with the
// record added after the call (derived by hand from it: no model ran), which is accepted and compiles against the port.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { childRecordProblems } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { childRecordFieldsOf, childRecordSection, childRecordsOf, loadUsecaseContext, usecaseAnswerProblems } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';

const PROJECT = 102099;
const MODULE = 'conteudo';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const fixture = (name: string): string => readFileSync(path.join(HERE, 'fixtures', name), 'utf8');
const CALLS_ONLY = fixture('createContentFileCallsGateway.recorded.txt').replace(/_102047_/gu, '_102099_');
const RECORDS = fixture('createContentFileRecordsPublication.recorded.txt').replace(/_102047_/gu, '_102099_');
const keyOf = (info: M12FileInfo): string => `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;

function unit(artifactType: string, artifactId: string, data: Record<string, unknown>, outputRef: string, dependencies: string[] = []): M12Unit {
  const definition = { artifactType, artifactId, moduleName: MODULE, data, dependencies };
  return { definition, declared: definition, outputRef, defRef: outputRef.replace(/\.ts$/u, '.defs.ts'), output: { project: PROJECT, level: 1, folder: '', shortName: artifactId, extension: '.ts' } } as unknown as M12Unit;
}

const portRef = (token: string): string => `_${PROJECT}_/l1/${MODULE}/layer_2_application/ports/${token}Repository.ts`;
const CONNECTIONS = [{ connectionId: 'github', operationId: 'gravarArquivo', consumer: 'createContentFile', entityRefs: ['ContentFile'], effect: 'update' }];
const L4 = `export const x = ${JSON.stringify({ modules: [{ moduleName: 'repoHost' }, { moduleName: MODULE }] })} as const;`;
const REPO_L4 = `export const repoHostIntegration = ${JSON.stringify({ externalSystems: [{ id: 'github', title: 'GitHub', description: 'Repository', settings: [], operations: [{ operationId: 'gravarArquivo', direction: 'call' }] }] })} as const;`;

function setup(withChild: boolean) {
  const outbound = unit('integrationOutbound', 'outbound', { connections: CONNECTIONS }, `_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/integration/outbound.defs.ts`);
  const parentEntity = unit('domainEntity', 'ContentFile', { entityId: 'ContentFile', storageTarget: 'moduleDatabase' }, `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/contentFile.ts`);
  const parentPort = unit('repositoryPort', 'ContentFileRepository', { entityId: 'ContentFile', interfaceName: 'ContentFileRepository' }, portRef('contentFile'));
  const childPort = unit('repositoryPort', 'PublicationRepository', { entityId: 'Publication', interfaceName: 'PublicationRepository' }, portRef('publication'));
  const childEntity = unit('domainEntity', 'Publication', { entityId: 'Publication', storageTarget: 'moduleDatabase' }, `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/publication.ts`);
  const dependencies = [parentPort.defRef, ...(withChild ? [childPort.defRef] : [])];
  const create = unit('usecase', 'createContentFile', {
    usecaseId: 'createContentFile', entityId: 'ContentFile', operation: 'create', rulesApplied: [], effects: [],
    functions: [{ functionName: 'createContentFile', input: [{ name: 'path', type: 'string' }], output: [{ name: 'id', type: 'string' }] }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/createContentFile.ts`, dependencies);
  const files: Record<string, string> = {
    [`_${PROJECT}_/l4/organization/registry.defs.ts`]: L4,
    [`_${PROJECT}_/l4/repoHost/integration.defs.ts`]: REPO_L4,
    [`_${PROJECT}_/l1/repoHost/layer_1_external/connections/github.ts`]: fixture('githubDeclaration.recorded.txt'),
  };
  const ctx = { run: { project: PROJECT, module: MODULE }, units: [create, outbound, parentEntity, parentPort, childPort, childEntity], read: async (ref: string) => files[ref.replace(/^\//u, '')] ?? null } as never;
  return { ctx, create };
}

async function withHost<T>(run: () => Promise<T>): Promise<T> {
  const previous = globalThis.mls;
  (globalThis as { mls: unknown }).mls = { actualProject: PROJECT, stor: { files: {}, getKeyToFile: keyOf } };
  try { return await run(); } finally { (globalThis as { mls: unknown }).mls = previous; }
}

void test('d1_221 s2: the entities a usecase records are the ports of its def that are not its own entity, and only those', () => {
  const withChild = setup(true);
  assert.deepEqual(childRecordsOf(withChild.ctx, withChild.create), [{ entityId: 'Publication', port: 'PublicationRepository' }]);
  const alone = setup(false);
  assert.deepEqual(childRecordsOf(alone.ctx, alone.create), []);
});

void test('d1_221 s2: the section names the port and the order, with the outside call when there is one, and says nothing when there is no record', () => {
  const records = [{ entityId: 'Publication', port: 'PublicationRepository' }];
  const outside = childRecordSection(records, ['gravarArquivo']);
  assert.match(outside, /resolveRepository<PublicationRepository>\(ctx, 'PublicationRepository'\)/u);
  assert.match(outside, /only once the call to `gravarArquivo` has answered with success/u);
  const inside = childRecordSection(records, []);
  assert.match(inside, /same transaction/u);
  assert.equal(inside.includes('gravarArquivo'), false);
  assert.equal(childRecordSection([], ['gravarArquivo']), '');
});

void test('d1_221 s2: the answer that calls the gateway and records nothing is refused; recording after the call passes', async () => {
  await withHost(async () => {
    const { ctx, create } = setup(true);
    const loaded = await loadUsecaseContext(ctx, create);
    const header = loaded.header;
    assert.match(loaded.human, /Records this usecase writes with its entity/u, 'the prompt carries the section');
    assert.match(loaded.human, /only once the call to `gravarArquivo` has answered with success/u);
    const withHeader = (code: string): string => `${header}\n${code.split('\n').slice(1).join('\n')}`;
    const refused = (await usecaseAnswerProblems(ctx, create, withHeader(CALLS_ONLY), [])).filter(item => item.startsWith('CHILD_RECORD'));
    assert.equal(refused.length, 1);
    assert.match(refused[0], /^CHILD_RECORD_MISSING: .*Publication/u);
    const accepted = (await usecaseAnswerProblems(ctx, create, withHeader(RECORDS), [])).filter(item => item.startsWith('CHILD_RECORD'));
    assert.deepEqual(accepted, []);
    // Another usecase of a def without the child port is not asked for it.
    const none = setup(false);
    const noLoaded = await loadUsecaseContext(none.ctx, none.create);
    assert.equal(noLoaded.human.includes('Records this usecase writes'), false);
    const noHeader = noLoaded.header;
    assert.deepEqual((await usecaseAnswerProblems(none.ctx, none.create, `${noHeader}\n${CALLS_ONLY.split('\n').slice(1).join('\n')}`, [])).filter(item => item.startsWith('CHILD_RECORD')), []);
  });
});

void test('d1_221 s2: an import, a comment, a read of the port or a record before the call are not the record', () => {
  const records = [{ entityId: 'Publication', port: 'PublicationRepository' }];
  const after = ['gravarArquivo'];
  assert.deepEqual(childRecordProblems(RECORDS, records, after), []);
  const importOnly = CALLS_ONLY;
  assert.match(childRecordProblems(importOnly, records, after)[0], /^CHILD_RECORD_MISSING/u);
  const commented = RECORDS.replace('await publications.create(publication);', '// await publications.create(publication);');
  assert.match(childRecordProblems(commented, records, after)[0], /^CHILD_RECORD_MISSING/u);
  const reading = RECORDS.replace('await publications.create(publication);', 'await publications.list({});');
  assert.match(childRecordProblems(reading, records, after)[0], /^CHILD_RECORD_MISSING/u);
  const unbound = RECORDS.replace("const publications = resolveRepository<PublicationRepository>(ctx, 'PublicationRepository');", '');
  assert.match(childRecordProblems(unbound, records, after)[0], /^CHILD_RECORD_MISSING/u);
  const ownCreate = RECORDS.replace('await publications.create(publication);', 'await repository.create(publication as never);');
  assert.match(childRecordProblems(ownCreate, records, after)[0], /^CHILD_RECORD_MISSING/u, 'the create of another port is not it');
  const before = RECORDS
    .replace(/\n  \/\/ The repository accepted the file[\s\S]*?await publications\.create\(publication\);\n/u, '\n')
    .replace('  const created = await repository.create(record);', "  const publication = { id: 'p' };\n  await publications.create(publication as never);\n  const created = await repository.create(record);");
  assert.match(childRecordProblems(before, records, after)[0], /^CHILD_RECORD_BEFORE_CALL/u);
  assert.deepEqual(childRecordProblems(before, records, []), [], 'with no outside call the order is the transaction, not a call');
});

void test('d1_221 s2: the usecase that records the publication compiles against the ports', async () => {
  const root = path.resolve(HERE, '../../../../..');
  const dir = mkdtempSync(path.join(root, '.child-proof-'));
  try {
    const flat = (source: string): string => source
      .replace(/\/_102099_\/l1\/repoHost\/layer_1_external\/connections\/github\.js/gu, './github.js')
      .replace(/\/_102099_\/l1\/conteudo\/layer_1_external\/adapters\/integration\/outbound\.js/gu, './outbound.js')
      .replace(/\/_102099_\/l1\/conteudo\/layer_2_application\/ports\/contentFileRepository\.js/gu, './port.js')
      .replace(/\/_102099_\/l1\/conteudo\/layer_2_application\/ports\/publicationRepository\.js/gu, './publicationPort.js')
      .replace(/\/_102099_\/l1\/conteudo\/layer_3_domain\/entities\/contentFile\.js/gu, './entity.js')
      .replace(/\/_102099_\/l1\/conteudo\/layer_3_domain\/entities\/publication\.js/gu, './publication.js');
    writeFileSync(path.join(dir, 'github.ts'), fixture('githubDeclaration.recorded.txt'));
    writeFileSync(path.join(dir, 'outbound.ts'), "import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';\nexport interface GithubGateway { gravarArquivo(input: { caminho: string; conteudo: string; mensagemRegistro: string }, ctx: RequestContext): Promise<{ revisao: string }>; }\n");
    writeFileSync(path.join(dir, 'entity.ts'), "export interface ContentFile { id: string; version: number; folderId: string; path: string; title: string; lastChangedAt?: string; details: { fileName: string; repositoryRevision?: string; changeOrigin?: 'module' | 'external'; lastPublishedAt?: string } }\n");
    writeFileSync(path.join(dir, 'publication.ts'), 'export interface Publication { id: string; version: number; contentFileId: string; publishedAt: string; changeKind: \'created\' | \'changed\' }\n');
    writeFileSync(path.join(dir, 'port.ts'), "import type { ContentFile } from './entity.js';\nexport interface ContentFileRepository { create(record: ContentFile): Promise<ContentFile>; list(filter: { path?: string }): Promise<ContentFile[]>; }\n");
    writeFileSync(path.join(dir, 'publicationPort.ts'), "import type { Publication } from './publication.js';\nexport interface PublicationRepository { create(record: Publication): Promise<Publication>; list(filter: object): Promise<Publication[]>; }\n");
    writeFileSync(path.join(dir, 'usecase.ts'), flat(RECORDS));
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

void test('d1_224 s2: the section lists the fields of the child from the def and the type of its entity, with where each one comes from', async () => {
  const publicationDef = (JSON.parse(/definition = (\{[\s\S]*\}) as const;/u.exec(fixture('conteudo1ed8ee26/publication.defs.recorded.txt'))![1]) as { data: Record<string, unknown> }).data;
  const publicationTs = fixture('conteudo1ed8ee26/publication.recorded.txt');
  const { ctx: base, create } = setup(true);
  const entityUnit = unit('domainEntity', 'Publication', publicationDef, `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/publication.ts`);
  const baseUnits = (base as unknown as { units: M12Unit[]; read: (ref: string) => Promise<string | null>; run: unknown }).units.filter(item => !(item.definition.artifactType === 'domainEntity' && item.definition.artifactId === 'Publication'));
  const ctx = { ...(base as object), units: [...baseUnits, entityUnit] } as never;
  const previous = globalThis.mls;
  (globalThis as { mls: unknown }).mls = { actualProject: PROJECT, stor: { files: { [keyOf(entityUnit.output as M12FileInfo)]: { getContent: async () => publicationTs } }, getKeyToFile: keyOf } };
  try {
    const [records] = [await childRecordFieldsOf(ctx, create)];
    assert.equal(records.length, 1);
    const byPath = new Map(records[0].fields.map(field => [field.path, field]));
    // The platform's fields (id, version, the moment) and the object that only holds the members below it are not listed.
    assert.deepEqual([...byPath.keys()].sort(), ['contentPath', 'details.operation', 'details.revision', 'details.title', 'editorId', 'folder']);
    assert.deepEqual([byPath.get('contentPath')?.required, byPath.get('contentPath')?.type], [true, 'reference to ContentFile']);
    assert.match(byPath.get('contentPath')?.origin ?? '', /^the identity of the ContentFile this usecase writes$/u);
    assert.match(byPath.get('editorId')?.origin ?? '', /Editor, who or what the step names: from `ctx` \(the session\) or from the input; if neither carries it, throw an error that names the field/u);
    assert.equal(byPath.get('folder')?.required, true);
    assert.equal(byPath.get('details.operation')?.required, true);
    assert.equal(byPath.get('details.title')?.required, false);
    assert.equal(byPath.get('details.revision')?.required, false);
    assert.match(byPath.get('folder')?.origin ?? '', /^a value of the step: the input of this usecase or the answer of the outside call, never a default$/u);
    const text = childRecordSection(records, ['gravarArquivo']);
    assert.match(text, /Fields of Publication \(a missing one is an error that names it, not a value made up\):/u);
    assert.match(text, /- editorId \(reference to Editor, required\): Editor, who or what the step names/u);
    assert.match(text, /- details\.title \(string, optional\): a value of the step/u);
    assert.equal(text.includes('- id ('), false);
    assert.equal(text.includes('- publishedAt ('), false);
  } finally {
    (globalThis as { mls: unknown }).mls = previous;
  }
});
