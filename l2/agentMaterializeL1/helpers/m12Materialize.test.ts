/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Materialize.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import type { M12Layer } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { blockingDependencies, type M12Context } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { fileRef, type M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';

function keyOf(info: M12FileInfo): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function install(present: M12FileInfo[]): void {
  const files: Record<string, { status: string }> = {};
  for (const info of present) files[keyOf(info)] = { status: 'changed' };
  (globalThis as { mls: unknown }).mls = { stor: { files, getKeyToFile: keyOf } };
}

function unit(layer: M12Layer, shortName: string, dependencies: string[]): M12Unit {
  const def: M12FileInfo = { project: 1, level: 1, folder: `mod/${layer}`, shortName, extension: '.defs.ts' };
  const output: M12FileInfo = { ...def, extension: '.ts' };
  const definition = { dependencies } as M1Definition;
  return {
    layer, unitId: shortName, def, defRef: fileRef(def), output, outputRef: fileRef(output),
    definition, declared: definition, planIssue: '', text: '',
  };
}

void test('a dependency .ts with no receipt does not block', async () => {
  const dep = unit('domain', 'item', []);
  const caller = unit('usecases', 'openItem', [dep.defRef]);
  install([dep.def, dep.output]);
  const ctx = { run: { project: 1, module: 'mod' }, units: [dep, caller] } as M12Context;
  assert.deepEqual(await blockingDependencies(ctx, caller), []);
});

void test('a dependency that has only its .defs.ts blocks', async () => {
  const dep = unit('domain', 'item', []);
  const caller = unit('usecases', 'openItem', [dep.defRef]);
  install([dep.def]);
  const ctx = { run: { project: 1, module: 'mod' }, units: [dep, caller] } as M12Context;
  assert.deepEqual(await blockingDependencies(ctx, caller), [`${dep.defRef} (not materialized)`]);
});
