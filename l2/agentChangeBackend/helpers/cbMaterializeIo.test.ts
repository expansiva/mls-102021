/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { syntaxDiagnostics } from './cbSyntaxValidation.js';
import { compileSavedTsAndGetErrors, readExistingModelValue, refreshExistingModel, storDiskPath } from './cbMaterializeIo.js';

test('syntaxDiagnostics rejects TS5076 even when Monaco is unavailable', () => {
  assert.match(syntaxDiagnostics('const page = input.cursor ?? fallback || "start";')[0] || '', /TS5076/);
  assert.deepEqual(syntaxDiagnostics('const page = (input.cursor ?? fallback) || "start";'), []);
});

test('saveGeneratedTs/saveGeneratedFile createStorFile without a model (compile loads on demand)', () => {
  const io = readFileSync(new URL('cbMaterializeIo.ts', import.meta.url), 'utf8');
  assert.equal((io.match(/createStorFile\(\{ \.\.\.fileInfo, source: content \}, false, false, false\)/g) || []).length, 2);
  assert.doesNotMatch(io, /createStorFile\([^;]*?,\s*true\b/);
});

test('compile syncs a resident model from stor (hooks no longer mirror mls.editor)', async () => {
  const PROJECT = 102099;
  const FOLDER = 'mod/layer_1_external/adapters/persistence';
  const shortName = 'itemA';
  const storContent = 'export const fromStor = 1;\n';
  let modelValue = 'export const stale = 1;\n';
  const keyModel = (project: number, name: string, folder: string, level: number) => `${project}:${level}:${folder}:${name}`;
  const editorKey = keyModel(PROJECT, shortName, FOLDER, 1);
  const fileKey = `${PROJECT}:1:${FOLDER}:${shortName}:.ts`;
  const model = {
    getValue: () => modelValue,
    setValue: (value: string) => { modelValue = value; },
  };
  const g = globalThis as { mls?: unknown };
  const prev = g.mls;
  g.mls = {
    actualProject: PROJECT,
    stor: {
      files: {
        [fileKey]: {
          project: PROJECT, level: 1, folder: FOLDER, shortName, extension: '.ts', status: 'changed',
          getContent: async () => storContent,
        },
      },
      getKeyToFile: (info: { project: number; level: number; folder: string; shortName: string; extension: string }) =>
        `${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`,
      localStor: { setContent: async () => undefined },
    },
    editor: {
      models: { [editorKey]: { ts: { model, compilerResults: { errors: [] } } } },
      getKeyModel: keyModel,
      addModels: async () => undefined,
      deleteModels: () => undefined,
      forceModelUpdate: () => undefined,
    },
    l2: { typescript: { compileAndPostProcess: async () => true, getTypeScriptWorker: async () => ({}) } },
  };
  try {
    await compileSavedTsAndGetErrors(PROJECT, FOLDER, shortName);
    assert.equal(modelValue, storContent);
  } finally {
    g.mls = prev;
  }
});

function withMls<T>(mls: unknown, fn: () => T): T {
  const g = globalThis as { mls?: unknown };
  const prev = g.mls;
  g.mls = mls;
  try { return fn(); } finally { g.mls = prev; }
}

const STUB_FILE = { project: 1, level: 1, folder: 'mod', shortName: 'x', extension: '.ts' } as mls.stor.IFileInfo;

void test('refreshExistingModel / readExistingModelValue no-op when getModel is not a function', () => {
  withMls({
    editor: { models: {}, getKeyModel: () => 'k' },
    stor: { files: {}, getKeyToFile: () => 'k' },
  }, () => {
    refreshExistingModel(STUB_FILE, 'src');
    assert.deepEqual(readExistingModelValue(STUB_FILE), { present: false, value: null, failed: false });
  });
});

void test('refreshExistingModel / readExistingModelValue use getModel when it exists', () => {
  let value = 'old';
  const model = { model: { getValue: () => value, setValue: (next: string) => { value = next; } } };
  withMls({
    editor: {
      models: {},
      getKeyModel: () => 'k',
      getModel: () => model,
    },
    stor: { files: {}, getKeyToFile: () => 'k' },
  }, () => {
    refreshExistingModel(STUB_FILE, 'new');
    assert.equal(value, 'new');
    assert.deepEqual(readExistingModelValue(STUB_FILE), { present: true, value: 'new', failed: false });
  });
});

void test('compileModuleAndGetErrors prefers Monaco when the worker exists and falls back to project tsc without host sniffing', () => {
  const io = readFileSync(new URL('cbMaterializeIo.ts', import.meta.url), 'utf8');
  assert.match(io, /function monacoCompileAvailable\(/);
  assert.match(io, /if \(!monacoCompileAvailable\(\)\) return \{ errors: \[\], infraErrors: \[\], available: false \}/);
  assert.match(io, /typeof ts\?\.getTypeScriptWorker === 'function'/);
  assert.match(io, /typeof mls\.editor\?\.getModel !== 'function'/);
  assert.match(io, /compileModuleViaProjectTsc/);
  assert.match(io, /const childProcessSpec = 'node:child_process'/);
  assert.match(io, /await import\(childProcessSpec\)/);
  assert.match(io, /tsconfig\.backend\.json/);
  assert.match(io, /traceProjectTscResult/);
  assert.match(io, /path: 'monaco'/);
  assert.match(io, /'spawn-null'/);
  assert.doesNotMatch(io, /typeof Deno/);
  assert.doesNotMatch(io, /"Deno" in globalThis/);
  assert.doesNotMatch(io, /user-agent/i);
});


// The host's diskPath is a class method over a private field: detaching it throws and
// the catch turns the project-tsc gate off in silence (`no-diskPath`). This test fails
// if the call is ever detached again.
void test('storDiskPath calls diskPath as a method (host class, private field)', () => {
  class HostStor {
    readonly #base = '/data/mls-base';
    diskPath(info: { project: number; shortName: string }): string {
      return `${this.#base}/mls-${info.project}/${info.shortName}.ts`;
    }
  }
  const info = { project: 102043, level: 1, folder: 'mod', shortName: 'chamado', extension: '.ts' };
  withMls({ stor: new HostStor() }, () => {
    assert.equal(storDiskPath(info), '/data/mls-base/mls-102043/chamado.ts');
  });
  withMls({ stor: {} }, () => {
    assert.equal(storDiskPath(info), null);
  });
});
