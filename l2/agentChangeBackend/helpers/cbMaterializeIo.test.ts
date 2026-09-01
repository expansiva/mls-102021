/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { syntaxDiagnostics } from './cbSyntaxValidation.js';
import { compileSavedTsAndGetErrors } from './cbMaterializeIo.js';

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
      deleteModels: () => undefined,
      forceModelUpdate: () => undefined,
    },
    l2: { typescript: { compileAndPostProcess: async () => true } },
  };
  try {
    await compileSavedTsAndGetErrors(PROJECT, FOLDER, shortName);
    assert.equal(modelValue, storContent);
  } finally {
    g.mls = prev;
  }
});

