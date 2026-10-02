/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/structure/domainOptional.test.ts" enhancement="_blank"/>

/**
 * m1_41 b1-P1: a v2 usecase types as optional exactly what the domain types with `?`: the fields the
 * l4 entity does not require and the server does not assign. The rows carry no `optional` flag (the
 * D1 does not write one). Ids are arbitrary on purpose.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';

import { M1_DEFINITION_SCHEMA, outputPathFromDefPath, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { emitBehavior } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';
import { emitPort, emitUsecase, type EmitFailure, type EmitResult } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';

const P = '_900002_';
const MOD = 'zzQuay';
const L1 = `${P}/l1/${MOD}`;
const ENTITY = `${L1}/layer_3_domain/entities/qqBox.defs.ts`;
const PORT = `${L1}/layer_2_application/ports/qqBoxRepository.defs.ts`;
const UC = `${L1}/layer_2_application/usecases/createQqBox.defs.ts`;
const ONTOLOGY = `${P}/l4/${MOD}/ontology/QqBox.defs.ts`;

const def = (artifactType: string, artifactId: string, dependencies: string[], data: Record<string, unknown>): M1Definition =>
  ({ schemaVersion: M1_DEFINITION_SCHEMA, artifactType, artifactId, moduleName: MOD, status: 'pending', dependencies, data } as M1Definition);

const entity = def('domainEntity', 'QqBox', [], {
  entityId: 'QqBox',
  storageTarget: 'moduleDatabase',
  fields: [
    { name: 'id', type: 'uuid', derived: true },
    { name: 'version', type: 'integer', derived: true },
    { name: 'kkOwner', type: 'record', ref: 'KkOwner' },
    { name: 'memo', type: 'text' },
    { name: 'shelf', type: 'object' },
    { name: 'shelf.depth', type: 'number' },
    { name: 'shelf.tag', type: 'text' },
  ],
  lifecycle: { states: [], transitions: [] },
  invariants: [],
  imports: [],
});
const port = def('repositoryPort', 'QqBoxRepository', [ENTITY], {
  entityId: 'QqBox',
  interfaceName: 'QqBoxRepository',
  methods: [{ name: 'create', params: ['QqBox'], returns: 'QqBox' }, { name: 'list', params: ['QqBoxFilter'], returns: 'QqBox[]' }],
});
// Rows as the D1 writes them: name, type, fieldRef. No optional flag.
const row = (name: string, type: string) => ({ name, type, fieldRef: `QqBox.${name}` });
const signature = [row('kkOwner', 'record'), row('memo', 'text'), row('shelf', 'object'), row('shelf.depth', 'number'), row('shelf.tag', 'text')];
const usecase = def('usecase', 'createQqBox', [PORT, ENTITY, ONTOLOGY], {
  usecaseId: 'createQqBox',
  entityId: 'QqBox',
  operation: 'create',
  ports: ['QqBoxRepository'],
  functions: [{ functionName: 'createQqBox', input: signature, output: [row('id', 'uuid'), row('version', 'integer'), ...signature] }],
  portCalls: ['create'],
  effects: [],
  uses: [],
  rulesApplied: [],
  rules: [],
  rulePlan: [],
  sequence: [{ kind: 'port', call: 'create', port: 'QqBoxRepository' }],
  transactional: false,
  transaction: { boundary: 'none' },
});

type Spec = Record<string, { type: string; required?: boolean; fields?: Spec }>;
const ontology = (fields: Spec) => `export const ${MOD}EntityQqBox = ${JSON.stringify({ entityId: 'QqBox', record: { fields } })} as const;\n`;
const PARTIAL: Spec = {
  id: { type: 'uuid', required: true }, version: { type: 'integer', required: true }, kkOwner: { type: 'record', required: true },
  memo: { type: 'text' }, shelf: { type: 'object', required: true, fields: { depth: { type: 'number' }, tag: { type: 'text', required: true } } },
};
const ALL: Spec = {
  ...PARTIAL, memo: { type: 'text', required: true },
  shelf: { type: 'object', required: true, fields: { depth: { type: 'number', required: true }, tag: { type: 'text', required: true } } },
};

const asSource = (definition: M1Definition) => `export const definition = ${JSON.stringify(definition)} as const;\n`;
const reader = (spec: Spec) => {
  const files = new Map([[ENTITY, asSource(entity)], [PORT, asSource(port)], [UC, asSource(usecase)], [ONTOLOGY, ontology(spec)]]);
  return async (ref: string) => files.get(ref) ?? null;
};

function ok(result: EmitResult | EmitFailure): string {
  assert.equal('code' in result, false, 'code' in result ? `${result.code} ${result.detail}` : '');
  return (result as EmitResult).source;
}

async function implement(spec: Spec): Promise<{ domain: string; port: string; create: string }> {
  const read = reader(spec);
  return {
    domain: ok(await emitBehavior('implement.domainEntity', entity, outputPathFromDefPath(ENTITY), read)),
    // The structure port: its interface is what the create types against, without the memory runtime.
    port: ok(emitPort(port, outputPathFromDefPath(PORT))),
    create: ok(await emitBehavior('implement.usecase', usecase, outputPathFromDefPath(UC), read)),
  };
}

const PRELUDE = [
  'declare class AppError extends Error { constructor(code: string, message: string, status: number, details?: unknown); }',
  'interface RequestContext { idGenerator: { newId(): string } }',
].join('\n');
const body = (source: string) => source.split('\n').filter(line => !line.startsWith('import ') && !line.startsWith('///')).join('\n');

/** Domain, port and usecase in one strict in-memory program. */
function diagnostics(files: { domain: string; port: string; create: string }): string[] {
  const file = 'check.ts';
  const source = [PRELUDE, body(files.domain), body(files.port), body(files.create)].join('\n');
  const host = ts.createCompilerHost({});
  const original = host.getSourceFile;
  host.getSourceFile = (name, version) => name === file ? ts.createSourceFile(file, source, version) : original(name, version);
  const program = ts.createProgram([file], { strict: true, noEmit: true, types: [], lib: ['lib.es2022.d.ts'] }, host);
  return ts.getPreEmitDiagnostics(program).map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n'));
}

type Row = Record<string, unknown>;

/** Runs the emitted create against a port that keeps what it is given. */
async function runCreate(create: string, input: Row): Promise<Row> {
  const js = ts.transpileModule(body(create), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace(/^export\s+/gm, '');
  const AppError = class extends Error { constructor(public code: string, message: string) { super(message); } };
  const fn = new Function('AppError', `${js}\nreturn createQqBox;`)(AppError) as (input: Row, ctx: unknown, ports: unknown) => Promise<Row>;
  let stored: Row = {};
  const repository = { async create(record: Row) { stored = record; return record; }, async list() { return []; } };
  await fn(input, { idGenerator: { newId: () => 'n-1' } }, { qqBoxRepository: repository });
  return stored;
}

void test('a field the l4 entity does not require is optional in the usecase as in the domain, and the create compiles', async () => {
  const files = await implement(PARTIAL);
  assert.match(files.domain, /\n {2}memo\?: string;\n/);
  assert.match(files.create, /export interface CreateQqBoxInput[^]*\n {2}memo\?: string;\n[^]*\n {4}depth\?: number;\n[^]*\n {4}tag: string;\n/);
  assert.match(files.create, /export interface CreateQqBoxOutput[^]*\n {2}memo\?: string;\n/);
  assert.match(files.create, /\n {2}kkOwner: string;\n/);
  assert.deepEqual(diagnostics(files), []);
  // The structure stub reads the same source.
  const stub = ok(await emitUsecase(usecase, outputPathFromDefPath(UC), reader(PARTIAL)));
  assert.match(stub, /\n {2}memo\?: string;\n/);
});

void test('the create does not read an absent optional field without a guard', async () => {
  const { create } = await implement(PARTIAL);
  const stored = await runCreate(create, { kkOwner: 'o-1', shelf: { tag: 't' } });
  assert.deepEqual(stored, { id: 'n-1', version: 1, kkOwner: 'o-1', shelf: { tag: 't' } });
  const full = await runCreate(create, { kkOwner: 'o-1', memo: '', shelf: { depth: 0, tag: 't' } });
  assert.deepEqual(full, { id: 'n-1', version: 1, kkOwner: 'o-1', memo: '', shelf: { depth: 0, tag: 't' } });
});

void test('control: with every field required nothing is optional and the program still compiles', async () => {
  const files = await implement(ALL);
  assert.equal(/\?: /.test(files.create), false, files.create);
  assert.equal(/\?: /.test(files.domain), false, files.domain);
  assert.deepEqual(diagnostics(files), []);
});
