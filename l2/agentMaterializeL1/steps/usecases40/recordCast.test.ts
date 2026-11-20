/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/usecases40/recordCast.test.ts" enhancement="_blank"/>

// d1_227: the record the code saves is built from the type of the port, with no cast, and a request service uses no repository. The files are the
// real output of the regeneration of `conteudo` (generator 102021@16756f5, resolver 102035@aaf1dc3; fixtures/conteudo131): `updateContentFile` hides the
// missing `id`, `version` and `publishedAt` of the publication with `as Parameters<PublicationRepository['create']>[0]`, `createContentFile` casts the
// object and two of its fields, and the request service of the page tried to record the publication itself.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { recordCastProblems, requestRepositoryProblems } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '../../../../..');
const real = (name: string): string => readFileSync(path.join(HERE, 'fixtures/conteudo131', `${name}.recorded.txt`), 'utf8');
const CREATE = real('createContentFile');
const UPDATE = real('updateContentFile');
const REQUEST = real('arquivosConteudoRequest');
const GITHUB = readFileSync(path.join(HERE, 'fixtures/githubDeclaration.recorded.txt'), 'utf8');

const FOLDER = "  const knownFolder = folder === 'blog' || folder === 'docs' || folder === 'site' ? folder : undefined;\n  if (!knownFolder) {\n    throw new AppError('INVALID_FOLDER', 'The folder to record is not one of blog, docs or site.', 400, { ruleIds: ['publicationRecordedOnSave'] });\n  }\n";
const record = (operation: string, variable: string): string => `${FOLDER}  const ${variable}: PublicationRecord = {
    id: ctx.idGenerator.newId(),
    version: 1,
    editorId,
    filePath,
    folder: knownFolder,
    publishedAt: ctx.clock.nowIso(),
    operation: '${operation}',
    details,
  };`;
const FIXED_CREATE = CREATE.replace(/  const publication = \{[\s\S]*?\n  \};/u, record('create', 'publication')).replace('await repository.create(publication as PublicationRecord);', 'await repository.create(publication);');
const FIXED_UPDATE = UPDATE
  .replace("  const record = {\n    editorId,\n    filePath,\n    folder,\n    operation,\n    details,\n  };", `${record('update', 'record')}`)
  .replace("await repository.create(record as Parameters<PublicationRepository['create']>[0]);", 'await repository.create(record);')
  .replace("import type { PublicationRepository } from '/_102047_/l1/conteudo/layer_2_application/ports/publicationRepository.js';", "import type { PublicationRepository } from '/_102047_/l1/conteudo/layer_2_application/ports/publicationRepository.js';\n\ntype PublicationRecord = Parameters<PublicationRepository['create']>[0];");

void test('d1_227: the casts of the real regeneration are refused with the line: the whole record, a field to its enum, and `Parameters<…>[0]`', () => {
  const update = recordCastProblems(UPDATE);
  assert.equal(update.length, 1);
  assert.match(update[0], /^CAST_ON_RECORD \(line 66\): `as Parameters<PublicationRepository\['create'\]>\[0\]` casts a value to the type of a field of a record\./u);
  assert.match(update[0], /Build the record as `const record: <Type of the port> = \{ … \}` with every field of the type \(the identity and the version included/u);
  const create = recordCastProblems(CREATE);
  assert.deepEqual(create.map(item => /^CAST_ON_RECORD \(line (\d+)\)/u.exec(item)?.[1]), ['58', '59', '64']);
  assert.match(create[0], /`as PublicationRecord\['folder'\]`/u);
  assert.match(create[2], /the record passed to `\.create` is cast with `as PublicationRecord`/u);
});

void test('d1_227: what is not the class is left alone: `as const`, a widening of a list, a narrowing of a value, a typed record and a call that is not a save', () => {
  assert.deepEqual(recordCastProblems(REQUEST), [], 'the request service of the evidence has `as string[]` and `as string`');
  const code = [
    "const folders = ['a', 'b'] as const;",
    "const known = (folders as readonly string[]).includes(value);",
    "const last = stack.pop() as string;",
    "const record: Publication = { id: ctx.idGenerator.newId() };",
    "await repository.create(record);",
    "await repository.update({ ...record, version: 2 });",
    "await client.post(body as Payload);",
    "// await repository.create(record as Publication);",
    '',
  ].join('\n');
  assert.deepEqual(recordCastProblems(code), []);
  assert.equal(recordCastProblems("await repository.update({ id } as Publication);\n").length, 1);
  assert.equal(recordCastProblems("await ctx.mdm.entity.create(data as MdmInput);\n").length, 1);
});

void test('d1_227: the versions that build the record from the type pass the gate and compile against the port and the entity', () => {
  assert.deepEqual(recordCastProblems(FIXED_CREATE), []);
  assert.deepEqual(recordCastProblems(FIXED_UPDATE), []);
  assert.equal(FIXED_UPDATE.includes('Parameters<PublicationRepository[\'create\']>[0]);'), false);
  const dir = mkdtempSync(path.join(ROOT, '.record-proof-'));
  try {
    const flat = (source: string): string => source
      .replace(/\/_102047_\/l1\/repoHost\/layer_1_external\/connections\/github\.js/gu, './github.js')
      .replace(/\/_102047_\/l1\/conteudo\/layer_1_external\/adapters\/integration\/outbound\.js/gu, './outbound.js')
      .replace(/\/_102047_\/l1\/conteudo\/layer_2_application\/ports\/publicationRepository\.js/gu, './publicationRepository.js');
    writeFileSync(path.join(dir, 'github.ts'), GITHUB);
    writeFileSync(path.join(dir, 'publication.ts'), "export type Publication = { id: string; version: number; editorId: string; filePath: string; folder: 'blog' | 'docs' | 'site'; publishedAt: string; operation: 'create' | 'update'; details: { title?: string; commitId?: string } };\n");
    writeFileSync(path.join(dir, 'publicationRepository.ts'), "import type { Publication } from './publication.js';\nexport interface PublicationRepository { create(record: Publication): Promise<Publication>; }\n");
    writeFileSync(path.join(dir, 'outbound.ts'), "import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';\nimport type { GravarArquivoInput, GravarArquivoOutput } from './github.js';\nexport interface GithubGateway { gravarArquivo(input: GravarArquivoInput, ctx: RequestContext): Promise<GravarArquivoOutput>; }\n");
    writeFileSync(path.join(dir, 'createContentFile.ts'), flat(FIXED_CREATE));
    writeFileSync(path.join(dir, 'updateContentFile.ts'), flat(FIXED_UPDATE));
    writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({ extends: '../tsconfig.base.json', compilerOptions: { noEmit: true, skipLibCheck: true }, files: ['createContentFile.ts', 'updateContentFile.ts'] }));
    let diagnostics = '';
    try { execFileSync(path.join(ROOT, 'node_modules', '.bin', 'tsc'), ['--pretty', 'false', '-p', path.join(dir, 'tsconfig.json')], { cwd: ROOT, encoding: 'utf8' }); } catch (error) {
      const failed = error as { stdout?: string; stderr?: string };
      diagnostics = `${failed.stdout ?? ''}${failed.stderr ?? ''}`;
    }
    assert.equal(diagnostics, '');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

void test('d1_227: the request service that resolves the repository of the publication is refused, and the repair names the usecases to call', () => {
  const usecases = ['createContentFile', 'getContentFile', 'listContentFile', 'updateContentFile'];
  const problems = requestRepositoryProblems(REQUEST, ['ContentFileRepository', 'PublicationRepository'], usecases);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /^REQUEST_USES_REPOSITORY \(line 136\): a request service does not use `PublicationRepository`: it writes and reads through the usecases of the module \(createContentFile, getContentFile, listContentFile, updateContentFile\)\./u);
  assert.match(problems[0], /Call the usecase of the route with its input and return its output\. If the text of the contract says this route records something, the usecase it calls does it: do not record it here\./u);
  const calling = REQUEST.replace(/  const repository = resolveRepository<PublicationRepository>\(ctx, 'PublicationRepository'\);/u, '  // the usecase records');
  assert.deepEqual(requestRepositoryProblems(calling, ['PublicationRepository'], usecases), []);
  assert.deepEqual(requestRepositoryProblems("const gateway = resolveRepository<GithubGateway>(ctx, 'GithubGateway');", ['PublicationRepository'], usecases), [], 'a gateway is not a repository');
});
