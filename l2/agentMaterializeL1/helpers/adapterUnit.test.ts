/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/adapterUnit.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { M1_DEFINITION_SCHEMA, renderDefinition, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { M12_LAYERS, buildM12PlannedSteps } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { blockingDependencies, createContext, unitNeedsLlm, unitInputHash } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { loadModuleUnits, selectUnits, selectedLayers, storEntries, type M12StorEntry } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import type { M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';

const PROJECT = 102099;
const MODULE = 'codeReview';

interface FakeFile extends M12FileInfo { status: string; content: string; updatedAt: string; getContent(): Promise<string>; getValueInfo(): Promise<{ content: string }> }

const keyOf = (info: M12FileInfo) => `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;

function install(): Record<string, FakeFile> {
  const files: Record<string, FakeFile> = {};
  (globalThis as { mls: unknown }).mls = { actualProject: PROJECT, stor: { files, getKeyToFile: keyOf, server: { loadProjectInfoIfNeeded: async () => undefined } } };
  // The runtime type file is an input of a declaration: its text is read, whatever it says.
  put(files, 'server/layer_1_external/connections/external', 'types', '.ts', 'export {};', 102034);
  return files;
}

function put(files: Record<string, FakeFile>, folder: string, shortName: string, extension: string, content: string, project = PROJECT): void {
  const info = { project, level: 1, folder, shortName, extension };
  const file: FakeFile = { ...info, status: 'changed', content, updatedAt: 'seed', getContent: async () => file.content, getValueInfo: async () => ({ content: file.content }) };
  files[keyOf(info)] = file;
}

const DEF: M1Definition = {
  schemaVersion: M1_DEFINITION_SCHEMA, artifactType: 'externalConnection', artifactId: 'repoHost', moduleName: MODULE, status: 'pending',
  dependencies: [],
  data: {
    systemId: 'repoHost', title: 'Repository host', description: 'Where the code lives.',
    settings: [{ id: 'accessKey', title: 'Access key', description: 'Reads it.', secret: true }],
    operations: [{ operationId: 'listChanges', direction: 'call', description: 'The latest changes.' }],
  },
};
const FOLDER = `${MODULE}/layer_1_external/connections`;

function defText(): string {
  const rendered = renderDefinition(DEF, `_${PROJECT}_/l1/${FOLDER}/repoHost.defs.ts`);
  assert.ok('source' in rendered);
  return rendered.source;
}

void test('d1_209: a system def is two units, the declaration and the adapter, and the adapter comes after the declaration', async () => {
  const files = install();
  put(files, FOLDER, 'repoHost', '.defs.ts', defText());
  const loaded = await loadModuleUnits(PROJECT, MODULE, storEntries());
  assert.deepEqual(loaded.problems, []);
  assert.deepEqual(loaded.units.map(unit => [unit.layer, unit.unitId, unit.outputRef.split('/').pop()]), [
    ['external', 'repoHost', 'repoHost.ts'],
    ['adapter', 'repoHostAdapter', 'repoHostAdapter.ts'],
  ]);
  assert.equal(loaded.units.every(unit => unit.defRef.endsWith('/repoHost.defs.ts')), true, 'both come from the one def');
  assert.equal(loaded.units.every(unit => unitNeedsLlm(unit)), true);
  assert.equal(M12_LAYERS.indexOf('adapter') > M12_LAYERS.indexOf('external'), true);
  assert.equal(M12_LAYERS.indexOf('adapter') < M12_LAYERS.indexOf('persistence'), true, 'before the gateways');
  const run = { project: PROJECT, module: MODULE, scope: MODULE, target: '', force: false };
  assert.deepEqual(selectedLayers(selectUnits(PROJECT, MODULE, loaded.units, run)), ['external', 'adapter']);
  // A target on the def regenerates both files.
  const target = { ...run, scope: '', target: `_${PROJECT}_/l1/${FOLDER}/repoHost.defs.ts` };
  assert.deepEqual(selectUnits(PROJECT, MODULE, loaded.units, target).map(unit => unit.unitId), ['repoHost', 'repoHostAdapter']);
  const steps = buildM12PlannedSteps(PROJECT, run, [{ module: MODULE, layers: ['external', 'adapter'], register: false }]);
  assert.deepEqual(steps.map(step => step.stepTitle), [`Materialize the declarations of the outside systems (${MODULE})`, `Materialize the adapters of the outside systems (${MODULE})`, `Materialization report (${MODULE})`]);
});

void test('d1_209: the adapter waits for its declaration and hashes it', async () => {
  const files = install();
  put(files, FOLDER, 'repoHost', '.defs.ts', defText());
  const loaded = await loadModuleUnits(PROJECT, MODULE, storEntries());
  const run = { project: PROJECT, module: MODULE, scope: MODULE, target: '', force: false };
  const ctx = createContext(run, loaded.units, 'presentation', undefined as never);
  const adapter = loaded.units.find(unit => unit.layer === 'adapter')!;
  const waiting = await blockingDependencies(ctx, adapter);
  assert.equal(waiting.some(item => item.includes('the declaration is not generated')), true);
  assert.deepEqual(await blockingDependencies(ctx, loaded.units.find(unit => unit.layer === 'external')!), []);
  put(files, FOLDER, 'repoHost', '.ts', 'export default {};');
  assert.deepEqual(await blockingDependencies(ctx, adapter), []);
  const before = await unitInputHash(ctx, adapter);
  put(files, FOLDER, 'repoHost', '.ts', 'export default { changed: true };');
  assert.notEqual(await unitInputHash(ctx, adapter), before, 'a new declaration is a new input of the adapter');
});
