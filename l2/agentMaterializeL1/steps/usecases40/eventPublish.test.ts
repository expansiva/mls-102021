/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/usecases40/eventPublish.test.ts" enhancement="_blank"/>

// d1_216 s3: the usecase that does the `on` of a bound event publishes it, with a gate that reads the file.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { emitPersistence } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';
import type { M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { loadUsecaseContext, usecaseAnswerProblems } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { MODULE_EVENT_PUBLISH } from '/_102021_/l2/helpers/l1Defs/moduleEvent.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { registerRepository, clearRepositories } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import { recordedModuleEvents } from '/_102034_/testing/events/eventFixtures.js';

const PROJECT = 102099;
const MODULE = 'repoHost';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../..');
const TSC = path.join(ROOT, 'node_modules', '.bin', 'tsc');
const OUTBOUND_REF = `_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/integration/outbound.ts`;
const RECORDED = readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures/repoHostCreatePublishes.recorded.txt'), 'utf8');
const OUTBOUND_IMPORT = `/_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/integration/outbound.js`;

function keyOf(info: M12FileInfo): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function unit(artifactType: string, artifactId: string, data: Record<string, unknown>, outputRef: string): M12Unit {
  const definition = { artifactType, artifactId, moduleName: MODULE, data, dependencies: [] as string[] };
  return { definition, declared: definition, outputRef, defRef: outputRef.replace(/\.ts$/u, '.defs.ts'), output: { project: PROJECT, level: 1, folder: '', shortName: artifactId, extension: '.ts' } } as unknown as M12Unit;
}

const EVENT = {
  eventId: 'repositorioAlterado',
  on: 'RepositoryChange.create',
  entityId: 'RepositoryChange',
  mechanism: MODULE_EVENT_PUBLISH.symbol,
  mechanismRef: MODULE_EVENT_PUBLISH.path,
  consumer: 'createRepositoryChange',
};

function usecaseUnit(effects: unknown[]): M12Unit {
  return unit('usecase', 'createRepositoryChange', {
    usecaseId: 'createRepositoryChange',
    entityId: 'RepositoryChange',
    operation: 'create',
    functions: [{ functionName: 'createRepositoryChange', input: [{ name: 'commitMessage', type: 'string' }], output: [{ name: 'id', type: 'string' }] }],
    effects,
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/createRepositoryChange.ts`);
}

function outboundUnit(event: Record<string, unknown> = EVENT): M12Unit {
  return unit('integrationOutbound', 'outbound', { events: [event] }, `_${PROJECT}_/l1/${MODULE}/layer_1_external/adapters/integration/outbound.defs.ts`);
}

function portUnit(): M12Unit {
  return unit('repositoryPort', 'RepositoryChangeRepository', { entityId: 'RepositoryChange', interfaceName: 'RepositoryChangeRepository' }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/ports/repositoryChangeRepository.ts`);
}

async function withHost<T>(run: () => Promise<T>): Promise<T> {
  const previous = globalThis.mls;
  (globalThis as { mls: unknown }).mls = { actualProject: PROJECT, stor: { files: {}, getKeyToFile: keyOf } };
  try { return await run(); } finally { (globalThis as { mls: unknown }).mls = previous; }
}

const EFFECTS = [{ eventId: 'repositorioAlterado', path: 'l4/repoHost/integration.defs.ts', symbol: 'repositorioAlterado' }];

test('a usecase that does the on of a bound event is told to publish it, with the signature, the transaction and the bound context', async () => {
  await withHost(async () => {
    const usecase = usecaseUnit(EFFECTS);
    const ctx = { run: { project: PROJECT, module: MODULE }, units: [usecase, outboundUnit()], read: async () => null };
    const section = (await loadUsecaseContext(ctx as never, usecase)).human.split('## Events this usecase publishes')[1] ?? '';
    assert.ok(section.length > 0);
    assert.match(section, /publishRepositorioAlterado\(payload: unknown, ctx: RequestContext, opts\?: \{ requestId\?: string \}\): Promise<\{ eventId: string \}>/u);
    assert.match(section, /RepositoryChange\.create/u);
    assert.match(section, /layer_1_external\/adapters\/integration\/outbound\.js/u);
    assert.match(section, /runInTransaction/u);
    assert.match(section, /const bound: RequestContext = \{ \.\.\.ctx, data: \{ \.\.\.ctx\.data, moduleData: tx \} \}/u);
    assert.match(section, /never a copy that sets `moduleId`/u);

    const plain = usecaseUnit([]);
    const without = await loadUsecaseContext({ ...ctx, units: [plain, outboundUnit()] } as never, plain);
    assert.equal(without.human.includes('## Events this usecase publishes'), false);
    const unbound = await loadUsecaseContext({ ...ctx, units: [usecase, outboundUnit({ ...EVENT, mechanism: '', mechanismRef: undefined })] } as never, usecase);
    assert.equal(unbound.human.includes('## Events this usecase publishes'), false);
  });
});

test('the recorded usecase that publishes passes the gate, and an answer that does not publish, or publishes outside the transaction or with another context, is refused', async () => {
  await withHost(async () => {
    const usecase = usecaseUnit(EFFECTS);
    const ctx = { run: { project: PROJECT, module: MODULE }, units: [usecase, outboundUnit(), portUnit()], read: async () => null };
    assert.deepEqual(await usecaseAnswerProblems(ctx as never, usecase, RECORDED, []), []);
    const refused = (code: string): Promise<string[]> => usecaseAnswerProblems(ctx as never, usecase, code, []);
    const call = 'await publishRepositorioAlterado(saved, bound, { requestId: bound.requestMeta?.requestId });';

    const none = await refused(RECORDED.replace(call, 'void saved;'));
    assert.ok(none.some(item => item.startsWith('EVENT_NOT_PUBLISHED: the usecase must publish repositorioAlterado')), none.join('\n'));
    const commented = await refused(RECORDED.replace(call, '// await publishRepositorioAlterado(saved, bound);\n    void saved;'));
    assert.ok(commented.some(item => item.startsWith('EVENT_NOT_PUBLISHED')), commented.join('\n'));

    const plainCtx = await refused(RECORDED.replace('(saved, bound,', '(saved, ctx,'));
    assert.ok(plainCtx.some(item => item.startsWith('EVENT_OUTSIDE_TRANSACTION')), plainCtx.join('\n'));
    const literal = await refused(RECORDED.replace('(saved, bound,', "(saved, { ...bound, moduleId: 'other' },"));
    assert.ok(literal.some(item => item.startsWith('EVENT_CONTEXT_FORGED')), literal.join('\n'));
    const copy = await refused(RECORDED.replace(call, `const other: RequestContext = { ...bound, moduleId: 'other' };\n    await publishRepositorioAlterado(saved, other, {});`));
    assert.ok(copy.some(item => item.startsWith('EVENT_CONTEXT_FORGED')), copy.join('\n'));

    const unawaited = await refused(RECORDED.replace(call, 'void publishRepositorioAlterado(saved, bound, {});'));
    assert.ok(unawaited.some(item => item.startsWith('EVENT_PUBLISH_SWALLOWED')), unawaited.join('\n'));
    const caught = await refused(RECORDED.replace(call, 'await publishRepositorioAlterado(saved, bound, {}).catch(() => undefined);'));
    assert.ok(caught.some(item => item.startsWith('EVENT_PUBLISH_SWALLOWED')), caught.join('\n'));
  });
});

test('the recorded usecase compiles against the generated publisher, publishes with the bound context, and a refused event rolls the transaction back', async () => {
  const emitted = await emitPersistence('persistence.integrationOutbound', {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'integrationOutbound',
    artifactId: 'outbound',
    moduleName: MODULE,
    status: 'pending',
    dependencies: [],
    data: { integrationId: 'outbound', events: [EVENT] },
  } as M1Definition, OUTBOUND_REF, async () => null);
  assert.equal('code' in emitted, false);
  if ('code' in emitted) return;
  const dir = mkdtempSync(path.join(ROOT, '.usecase-proof-'));
  try {
    const port = [
      'export interface RepositoryChangeRepository {',
      '  create(record: { id: string; version: number; changedAt: string; details: { commitMessage: string } }): Promise<{ id: string; version: number; changedAt: string; details: { commitMessage: string } }>;',
      '}',
    ].join('\n');
    const usecase = RECORDED
      .replace(`/_${PROJECT}_/l1/${MODULE}/layer_2_application/ports/repositoryChangeRepository.js`, './port.js')
      .replace(OUTBOUND_IMPORT, './outbound.js');
    writeFileSync(path.join(dir, 'port.ts'), port);
    writeFileSync(path.join(dir, 'outbound.ts'), emitted.source);
    writeFileSync(path.join(dir, 'usecase.ts'), usecase);
    writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({
      extends: '../tsconfig.base.json',
      compilerOptions: { noEmit: true, skipLibCheck: true },
      files: ['usecase.ts'],
    }));
    let diagnostics = '';
    try {
      execFileSync(TSC, ['--pretty', 'false', '-p', path.join(dir, 'tsconfig.json')], { cwd: ROOT, encoding: 'utf8' });
    } catch (error) {
      const failed = error as { stdout?: string; stderr?: string };
      diagnostics = `${failed.stdout ?? ''}${failed.stderr ?? ''}`;
    }
    assert.equal(diagnostics, '');

    const fixtures = '/_102034_/testing/events/eventFixtures.js';
    writeFileSync(path.join(dir, 'outbound.ts'), emitted.source.replace(`from '${MODULE_EVENT_PUBLISH.importPath}'`, `from '${fixtures}'`));
    const loaded = await import(pathToFileURL(path.join(dir, 'usecase.ts')).href) as {
      createRepositoryChange: (input: { changedAt: string; commitMessage: string }, ctx: RequestContext) => Promise<{ id: string; version: number }>;
    };
    const transaction = { committed: 0, rolledBack: 0 };
    const tx = { marker: 'tx' };
    const created: unknown[] = [];
    clearRepositories();
    registerRepository('RepositoryChangeRepository', () => ({ create: async (record: Record<string, unknown>) => { created.push(record); return record; } }));
    const ctx = {
      moduleId: MODULE,
      data: { moduleData: { runInTransaction: async (callback: (runtime: unknown) => Promise<unknown>) => {
        try { const value = await callback(tx); transaction.committed += 1; return value; } catch (error) { transaction.rolledBack += 1; throw error; }
      } } },
      idGenerator: { newId: () => 'change-1' },
      requestMeta: { requestId: 'req-7' },
    } as unknown as RequestContext;
    const output = await loaded.createRepositoryChange({ changedAt: '2026-11-19T10:00:00Z', commitMessage: 'm' }, ctx);
    assert.deepEqual(output, { id: 'change-1', version: 1, changedAt: '2026-11-19T10:00:00Z' });
    const call = recordedModuleEvents().at(-1);
    assert.deepEqual(call?.ref, { module: MODULE, eventId: 'repositorioAlterado' });
    assert.equal((call?.payload as { id: string }).id, 'change-1');
    assert.equal((call?.context as { data: { moduleData: unknown } }).data.moduleData, tx);
    assert.equal((call?.context as { moduleId: string }).moduleId, MODULE);
    assert.deepEqual(call?.opts, { requestId: 'req-7' });
    assert.deepEqual(transaction, { committed: 1, rolledBack: 0 });
    assert.equal(created.length, 1);

    writeFileSync(path.join(dir, 'stub.ts'), `export async function publishModuleEvent() { return { ok: false, code: 'forbidden', message: 'the caller does not publish this event' }; }\n`);
    writeFileSync(path.join(dir, 'outboundRefused.ts'), emitted.source.replace(`from '${MODULE_EVENT_PUBLISH.importPath}'`, `from './stub.js'`));
    writeFileSync(path.join(dir, 'usecaseRefused.ts'), usecase.replace('./outbound.js', './outboundRefused.js'));
    const refusedRun = await import(pathToFileURL(path.join(dir, 'usecaseRefused.ts')).href) as typeof loaded;
    await assert.rejects(refusedRun.createRepositoryChange({ changedAt: '2026-11-19T10:00:00Z', commitMessage: 'm' }, ctx), (error: unknown) => (error as { code?: string }).code === 'forbidden');
    assert.deepEqual(transaction, { committed: 1, rolledBack: 1 });
  } finally {
    clearRepositories();
    rmSync(dir, { recursive: true, force: true });
  }
});
