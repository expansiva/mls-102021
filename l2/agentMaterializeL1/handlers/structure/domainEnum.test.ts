/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/structure/domainEnum.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';

import type { M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { emitDomain, ontologyEnums, ontologyRef } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';

// Ids are arbitrary on purpose: the enumerated field is not called `status` and sits under `details`.
const OUTPUT = '_900001_/l1/zzMod/layer_3_domain/entities/qqItem.ts';

function entity(): M1Definition {
  return {
    schemaVersion: '2026-09-24-d1-definition-v2',
    artifactType: 'domainEntity',
    artifactId: 'QqItem',
    moduleName: 'zzMod',
    status: 'generated',
    dependencies: [],
    data: {
      entityId: 'QqItem',
      storageTarget: 'moduleDatabase',
      fields: [
        { name: 'id', type: 'uuid', derived: true },
        { name: 'details', type: 'object' },
        { name: 'details.inner', type: 'object' },
        { name: 'details.inner.kkMode', type: 'enum' },
        { name: 'details.loose', type: 'enum' },
        { name: 'details.note', type: 'string' },
      ],
      lifecycle: { states: [], transitions: [] },
    },
  } as unknown as M1Definition;
}

const ONTOLOGY = `export const x = ${JSON.stringify({
  entityId: 'QqItem',
  record: {
    fields: {
      id: { type: 'uuid', required: true },
      details: {
        type: 'object',
        fields: {
          inner: { type: 'object', fields: { kkMode: { type: 'enum', values: [{ value: 'alfa' }, { value: 'beta' }] } } },
          loose: { type: 'enum' },
          note: { type: 'string' },
        },
      },
    },
  },
})} as const;\n`;

const CONTRACT = `
export interface QqContract { details: { inner: { kkMode: 'alfa' | 'beta' }; loose: string; note: string } }
declare const item: QqItem;
export const out: QqContract['details'] = item.details;
`;

function diagnostics(source: string): string[] {
  const file = 'check.ts';
  const host = ts.createCompilerHost({});
  const original = host.getSourceFile;
  host.getSourceFile = (name, version) => name === file ? ts.createSourceFile(file, source, version) : original(name, version);
  const program = ts.createProgram([file], { strict: true, noEmit: true, types: [], lib: ['lib.es2022.d.ts'] }, host);
  return ts.getPreEmitDiagnostics(program).map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n'));
}

void test('an enum declared by the l4 entity types the domain field as its union at any depth, by source not name', () => {
  const definition = entity();
  assert.equal(ontologyRef(definition, OUTPUT), '_900001_/l4/zzMod/ontology/QqItem.defs.ts');
  const enums = ontologyEnums(ONTOLOGY);
  assert.deepEqual([...enums], [['details.inner.kkMode', ['alfa', 'beta']]]);
  const { source } = emitDomain(definition, OUTPUT, new Set(), enums);
  assert.match(source, /kkMode: 'alfa' \| 'beta';/);
  assert.match(source, /loose: string;/);
  assert.deepEqual(diagnostics(`${source}\n${CONTRACT}`), []);
});

void test('control: without declared values the enum stays string and fails against the contract union', () => {
  const { source } = emitDomain(entity(), OUTPUT);
  assert.match(source, /kkMode: string;/);
  assert.equal(diagnostics(`${source}\n${CONTRACT}`).length > 0, true);
});

void test('lifecycle states type the single top-level enum field whatever it is called', () => {
  const definition = entity();
  const data = definition.data as Record<string, unknown>;
  data.fields = [...(data.fields as unknown[]), { name: 'phaseX', type: 'enum' }];
  data.lifecycle = { states: [{ state: 'open' }, { state: 'shut' }], transitions: [] };
  const { source } = emitDomain(definition, OUTPUT);
  assert.match(source, /phaseX: 'open' \| 'shut';/);
});

void test('an unreadable ontology declares no enums', () => {
  assert.equal(ontologyEnums(null).size, 0);
  assert.equal(ontologyEnums('export const x = 1;').size, 0);
});
