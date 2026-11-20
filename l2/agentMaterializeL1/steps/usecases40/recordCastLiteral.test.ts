/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/usecases40/recordCastLiteral.test.ts" enhancement="_blank"/>

// d1_229: the whole literal cast to the type (`const record = { … } as Type;`) and then saved hides what the cast per field hid: a text that becomes a
// closed value with nobody checking it. The files are the real output of the round c90c87d2 of `conteudo` (fixtures/conteudoC90): `folder` and
// `operation` come from strings and the cast narrows them to the union of the port.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { recordCastProblems } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '../../../../..');
const real = (name: string): string => readFileSync(path.join(HERE, 'fixtures/conteudoC90', `${name}.recorded.txt`), 'utf8');
const CREATE = real('createContentFile');
const UPDATE = real('updateContentFile');
const GITHUB = readFileSync(path.join(HERE, 'fixtures/githubDeclaration.recorded.txt'), 'utf8');

const CHECK_FOLDER = "  const knownFolder = folder === 'blog' || folder === 'docs' || folder === 'site' ? folder : undefined;\n  if (!knownFolder) {\n    throw new AppError('PUBLICATION_FOLDER_INVALID', `The folder ${folder} is not one of blog, docs or site.`, 400, { ruleId: 'publicationRecordedOnSave' });\n  }\n";
const CHECK_OPERATION = "  const knownOperation = operation === 'create' || operation === 'update' ? operation : undefined;\n  if (!knownOperation) {\n    throw new AppError('PUBLICATION_OPERATION_INVALID', `The operation ${operation} is not create or update.`, 400, { ruleId: 'publicationRecordedOnSave' });\n  }\n";
const typed = (code: string, checks: string, operation: string): string => code
  .replace('  const record = {', `${checks}  const record: PublicationRecord = {`)
  .replace('    folder,\n', '    folder: knownFolder,\n')
  .replace(/    operation(?:: '[a-z]+')?,\n/u, `    operation: ${operation},\n`)
  .replace('  } as PublicationRecord;', '  };');
const FIXED_CREATE = typed(CREATE, CHECK_FOLDER + CHECK_OPERATION, 'knownOperation');
const FIXED_UPDATE = typed(UPDATE, CHECK_FOLDER, "'update'");

void test('d1_229: the literal cast to the type and then saved is refused, with the line of the record, in both usecases of the round', () => {
  for (const [name, code, line] of [['createContentFile', CREATE, 62], ['updateContentFile', UPDATE, 61]] as const) {
    const problems = recordCastProblems(code);
    assert.equal(problems.length, 1, name);
    assert.match(problems[0], new RegExp(`^CAST_ON_RECORD \\(line ${line}\\): the record \`record\` is a literal cast with \`as PublicationRecord\` and then saved\\.`, 'u'), name);
    assert.match(problems[0], /A text that must be a closed value is checked \(`if \(value !== 'a' && value !== 'b'\) throw …`\) and then has the type/u);
  }
});

void test('d1_229: what is not the class is left alone: a typed literal, `as const`, a literal that is not saved, a `satisfies`, and a cast that is not on a literal', () => {
  const save = '\n  await publications.create(record);\n';
  assert.deepEqual(recordCastProblems(`const record: Publication = { id: 1 };${save}`), []);
  assert.deepEqual(recordCastProblems(`const record = { id: 1 } as const;${save}`), []);
  assert.deepEqual(recordCastProblems("const view = { id: 1 } as ViewRow;\nreturn view;\n"), [], 'not saved');
  assert.deepEqual(recordCastProblems(`const record = { id: 1 } satisfies Publication;${save}`), []);
  assert.deepEqual(recordCastProblems(`const record = build(input) as Publication;${save}`), [], 'a cast on a call is not a literal');
  assert.equal(recordCastProblems(`const record = { id: 1 } satisfies Partial<Publication> as Publication;${save}`).length, 1);
  assert.equal(recordCastProblems(`let record: Publication = {\n  id: 1,\n  details: { a: 1 },\n} as Publication;\nawait repository.update(record);\n`).length, 1);
  assert.equal(recordCastProblems(`const record = { id: 1 } as Publication;\nawait repository.create(record, ctx);\n`).length, 1, 'by its name, with other arguments');
});

void test('d1_229: the versions that check the text against the union and give the record the type pass the gate and compile', () => {
  assert.deepEqual(recordCastProblems(FIXED_CREATE), []);
  assert.deepEqual(recordCastProblems(FIXED_UPDATE), []);
  assert.equal(FIXED_CREATE.includes('as PublicationRecord;'), false);
  const dir = mkdtempSync(path.join(ROOT, '.literal-proof-'));
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
