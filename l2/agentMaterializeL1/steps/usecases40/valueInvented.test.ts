/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/usecases40/valueInvented.test.ts" enhancement="_blank"/>

// d1_224 s1: the code of the model does not silence the compiler with an empty record cast, and does not fill a required field of a usecase with
// an empty literal. The files are the real output of the generation of `conteudo` (mls-102047@1ed8ee26, in fixtures/conteudo1ed8ee26): two usecases
// that build the publication with `Object.assign({} as PublicationRecord, fields)`, and a route that calls `updateContentFile` with `conteudo: ''`.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { emptyCastProblems, emptyRequiredProblems, usecaseGate } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { inputFieldsOf, usecaseInputsOf } from '/_102021_/l2/agentMaterializeL1/helpers/m12Required.js';
import { requestGate } from '/_102021_/l2/agentMaterializeL1/steps/requests50/context.js';
import { workflowGate } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/context.js';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const real = (name: string): string => readFileSync(path.join(HERE, 'fixtures/conteudo1ed8ee26', `${name}.recorded.txt`), 'utf8');
const CREATE = real('createContentFile');
const UPDATE = real('updateContentFile');
const ROUTE = real('repoHost');
const GITHUB = readFileSync(path.join(HERE, 'fixtures/githubDeclaration.recorded.txt'), 'utf8');

const TYPED = `  const knownFolder = folder === 'blog' || folder === 'docs' || folder === 'site' ? folder : undefined;
  if (!knownFolder) {
    throw new AppError('PUBLICATION_FOLDER_INVALID', 'The folder to record is not one of blog, docs or site.', 400, { ruleIds: ['recordPublicationOnWrite'] });
  }
  const publication: PublicationRecord = {
    id: ctx.idGenerator.newId(),
    version: 1,
    editorId: publishedBy,
    contentPath,
    folder: knownFolder,
    publishedAt: ctx.clock.nowIso(),
    details: { operation: 'create' },
  };`;
const TYPED_UPDATE = TYPED.replace("operation: 'create'", "operation: 'update'");
const REBUILD = /  const fields = \{[\s\S]*?Object\.assign\(\{\} as PublicationRecord, fields\);/u;
const FIXED_CREATE = CREATE.replace(REBUILD, TYPED);
const FIXED_UPDATE = UPDATE.replace(REBUILD, TYPED_UPDATE);
const CALL = /        await updateContentFile\(\n[\s\S]*?          bound,\n        \);/u;
const FIXED_ROUTE = ROUTE.replace(CALL, "        // the message carries the path of each file and not its text: without the text there is nothing to write\n        throw new MessageFieldError('INVALID_MESSAGE_FILE_TEXT', `details.files[${file.path}]`, `repositorioAlterado: the message does not carry the text of ${file.path}`);");

const ctxFor = (name: string, source: string) => ({
  units: [{ definition: { artifactType: 'usecase' }, outputRef: `_102047_/l1/conteudo/layer_2_application/usecases/${name}.ts` }],
  read: async (ref: string): Promise<string | null> => {
    if (ref.endsWith(`/usecases/${name}.ts`)) return source;
    if (ref.endsWith('/repoHost/layer_1_external/connections/github.ts')) return GITHUB;
    return null;
  },
});

void test('d1_224 s1: the two usecases of the generation, which cast an empty object to the publication, are refused with the line', () => {
  for (const [name, code] of [['createContentFile', CREATE], ['updateContentFile', UPDATE]] as const) {
    const problems = emptyCastProblems(code);
    assert.equal(problems.length, 1, name);
    assert.match(problems[0], /^CAST_EMPTY_RECORD \(line 56\): `\{\} as PublicationRecord`/u, name);
    assert.match(problems[0], /Build the record as `const record: PublicationRecord = \{ … \}`/u);
    assert.match(problems[0], /throw an error that names it/u);
  }
});

void test('d1_224 s1: the same usecases with the record built from the fields of the type, and the route that refuses the missing text, pass and compile', () => {
  assert.deepEqual(emptyCastProblems(FIXED_CREATE), []);
  assert.deepEqual(emptyCastProblems(FIXED_UPDATE), []);
  assert.equal(FIXED_CREATE.includes('Object.assign'), false);
  const root = path.resolve(HERE, '../../../../..');
  const dir = mkdtempSync(path.join(root, '.invented-proof-'));
  try {
    const flat = (source: string): string => source
      .replace(/\/_102047_\/l1\/repoHost\/layer_1_external\/connections\/github\.js/gu, './github.js')
      .replace(/\/_102047_\/l1\/conteudo\/layer_1_external\/adapters\/integration\/outbound\.js/gu, './outbound.js')
      .replace(/\/_102047_\/l1\/conteudo\/layer_2_application\/ports\/publicationRepository\.js/gu, './publicationRepository.js')
      .replace(/\/_102047_\/l1\/conteudo\/layer_3_domain\/entities\/publication\.js/gu, './publication.js')
      .replace(/\/_102047_\/l1\/conteudo\/layer_2_application\/usecases\/updateContentFile\.js/gu, './updateContentFile.js');
    writeFileSync(path.join(dir, 'github.ts'), GITHUB);
    writeFileSync(path.join(dir, 'publication.ts'), real('publication'));
    writeFileSync(path.join(dir, 'publicationRepository.ts'), "import type { Publication } from './publication.js';\nexport interface PublicationRepository { create(record: Publication): Promise<Publication>; list(filter: object): Promise<Publication[]>; }\n");
    writeFileSync(path.join(dir, 'outbound.ts'), "import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';\nimport type { GravarArquivoInput, GravarArquivoOutput } from './github.js';\nexport interface GithubGateway { gravarArquivo(input: GravarArquivoInput, ctx: RequestContext): Promise<GravarArquivoOutput>; }\n");
    writeFileSync(path.join(dir, 'createContentFile.ts'), flat(FIXED_CREATE));
    writeFileSync(path.join(dir, 'updateContentFile.ts'), flat(FIXED_UPDATE));
    writeFileSync(path.join(dir, 'repoHost.ts'), flat(FIXED_ROUTE));
    writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({ extends: '../tsconfig.base.json', compilerOptions: { noEmit: true, skipLibCheck: true }, files: ['createContentFile.ts', 'updateContentFile.ts', 'repoHost.ts'] }));
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

void test('d1_224 s1: the route that calls the usecase with an empty text for a required field is refused, naming the field and what to do', async () => {
  const inputs = await usecaseInputsOf(ctxFor('updateContentFile', UPDATE));
  const fields = inputs.get('updateContentFile');
  assert.ok(fields, 'the input of the usecase is read');
  assert.equal(fields.find(field => field.name === 'conteudo')?.optional, false);
  const problems = emptyRequiredProblems(ROUTE, inputs);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /^EMPTY_REQUIRED_VALUE \(line 84\): `updateContentFile` is called with `conteudo: ''`/u);
  assert.match(problems[0], /throw a distinct error that names it/u);
  assert.match(problems[0], /write nothing/u);
  assert.deepEqual(emptyRequiredProblems(FIXED_ROUTE, inputs), []);
  assert.equal(FIXED_ROUTE.includes("conteudo: ''"), false);
});

void test('d1_224 s1: the three gates carry the cast and the empty literal, with the same messages', async () => {
  const inputs = await usecaseInputsOf(ctxFor('updateContentFile', UPDATE));
  const requests = requestGate(ROUTE, { header: ROUTE.split('\n')[0], routes: [], project: 102047, moduleName: 'conteudo', pageId: 'repoHost', waived: new Set(), usecaseInputs: inputs });
  assert.equal(requests.some(item => item.startsWith('EMPTY_REQUIRED_VALUE')), true);
  const usecase = usecaseGate(CREATE, { header: CREATE.split('\n')[0], functionName: 'createContentFile', project: 102047, moduleName: 'conteudo', ruleIds: [] });
  assert.equal(usecase.some(item => item.startsWith('CAST_EMPTY_RECORD')), true);
  const workflow = workflowGate(`${ROUTE.split('\n')[0]}\nconst x = {} as Record<string, string>;\n`, { header: ROUTE.split('\n')[0], facts: { processId: 'p', trigger: { kind: 'manual', actorRef: '', event: '', schedule: '' }, occurrence: '', functions: [], operations: [] }, project: 102047, moduleName: 'conteudo', ports: [] });
  assert.equal(workflow.some(item => item.startsWith('CAST_EMPTY_RECORD')), true);
});

void test('d1_224 s1: what is not the class does not pass for it: `as const`, a typed literal, `{}` for optional members, `0`, `false`, a text, a call that is not a usecase', async () => {
  assert.deepEqual(emptyCastProblems("const a = {} as const;\nconst b: Record<string, string> = {};\n// const c = {} as Foo;\nconst d = { x: 1 } as Foo;\n"), []);
  const inputs = new Map([['saveThing', inputFieldsOf('{\n  name: string;\n  tags: string[];\n  details: {\n    note?: string;\n  };\n  strict: {\n    id: string;\n  };\n  count: number;\n  flag: boolean;\n  label?: string;\n}')]]);
  const imported = "import { saveThing } from '/_1_/l1/m/layer_2_application/usecases/saveThing.js';\n";
  const call = (body: string): string[] => emptyRequiredProblems(`${imported}await saveThing({ ${body} }, ctx);\n`, inputs);
  assert.deepEqual(call("name: 'a', tags: ['x'], details: {}, strict: { id: 'i' }, count: 0, flag: false, label: ''"), [], 'values, `{}` of optional members, 0, false and an optional text');
  assert.equal(call("name: ''").length, 1);
  assert.equal(call("tags: []").length, 1);
  assert.equal(call("strict: {}").length, 1);
  assert.equal(call('name: ``').length, 1);
  assert.deepEqual(emptyRequiredProblems("await saveThing({ name: '' }, ctx);\n", inputs), [], 'a function that is not imported from usecases is not a usecase');
  assert.deepEqual(emptyRequiredProblems(`${imported}const summary = pick ? text : '';\nawait other({ name: '' }, ctx);\n`, inputs), []);
});

void test('d1_224 s1: the input fields are read as the compiler sees them: optional, string, list, object with required members', () => {
  const fields = inputFieldsOf('{\n  a: string;\n  b?: string;\n  c: string[];\n  d: Array<string>;\n  e: {\n    x?: string;\n    y: number;\n  };\n  f: \'p\' | \'q\';\n  [key: string]: unknown;\n}');
  assert.deepEqual(fields.map(field => [field.name, field.optional, field.kind, field.requiredMembers]), [
    ['a', false, 'string', 0], ['b', true, 'string', 0], ['c', false, 'array', 0], ['d', false, 'array', 0], ['e', false, 'object', 1], ['f', false, 'other', 0],
  ]);
  assert.deepEqual(inputFieldsOf('string'), []);
});
