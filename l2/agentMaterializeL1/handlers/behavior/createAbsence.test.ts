/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/behavior/createAbsence.test.ts" enhancement="_blank"/>

/**
 * m1_29: a create stores the server assignments and the input leaves the contract permits and the
 * caller sent; nothing else. An omitted optional leaf or parent stays absent in the stored row,
 * a present 0/false/'' is kept, a required member under an optional parent is only required when
 * the parent comes, and the initial state is assigned. The emitted files run from a scratch folder
 * and compile against the emitted domain type. The fixture names nothing of the bench.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { M1_DEFINITION_SCHEMA, outputPathFromDefPath, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { emitBehavior } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';
import { emitController, type EmitFailure, type EmitResult } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import { createRequestContext } from '/_102034_/l1/server/layer_2_controllers/execBff.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../../../..');
const P = '_102097_';
const MOD = 'harborLog';
const L1 = `${P}/l1/${MOD}`;
const ENTITY = `${L1}/layer_3_domain/entities/crate.defs.ts`;
const PORT = `${L1}/layer_2_application/ports/crateRepository.defs.ts`;
const SCOPE = `${L1}/layer_2_application/scope/accessScope.defs.ts`;
const AUTHORITY = `${L1}/layer_1_external/auth/authorityMap.defs.ts`;
const UC = `${L1}/layer_2_application/usecases/createCrate.defs.ts`;
const CTRL = `${L1}/layer_1_external/adapters/http/controllers/dock.defs.ts`;
const DOCK = `${P}/l2/${MOD}/web/contracts/dock.defs.ts`;
const ONTOLOGY = `${P}/l4/${MOD}/ontology/Crate.defs.ts`;
const ROUTE = `${MOD}.dock.cmdCreateCrate`;

function def(artifactType: string, artifactId: string, dependencies: string[], data: Record<string, unknown>): M1Definition {
  return { schemaVersion: M1_DEFINITION_SCHEMA, artifactType, artifactId, moduleName: MOD, status: 'pending', dependencies: [...dependencies].sort(), data } as M1Definition;
}

// No transition reaches `packed`: it is the initial state, though it is not declared first.
const lifecycle = {
  states: [{ state: 'shipped', reachedBy: 'actor' }, { state: 'held', reachedBy: 'actor' }, { state: 'packed', reachedBy: 'actor' }],
  transitions: [
    { transitionId: 'ship', from: ['packed'], to: 'shipped', by: ['clerk'], ruleRefs: [] },
    { transitionId: 'hold', from: ['packed'], to: 'held', by: ['clerk'], ruleRefs: [] },
  ],
};
const entity = def('domainEntity', 'Crate', [], {
  entityId: 'Crate',
  storageTarget: 'moduleDatabase',
  fields: [
    { name: 'id', type: 'uuid', derived: true },
    { name: 'version', type: 'integer', derived: true },
    { name: 'dockId', type: 'record', ref: 'Dock' },
    { name: 'status', type: 'enum' },
    { name: 'label', type: 'text' },
    { name: 'weight', type: 'number' },
    { name: 'fragile', type: 'boolean' },
    { name: 'notes', type: 'text' },
    { name: 'specs', type: 'object' },
    { name: 'specs.width', type: 'number' },
    { name: 'specs.sealed', type: 'boolean' },
    { name: 'specs.memo', type: 'text' },
    { name: 'specs.inspection', type: 'object' },
    { name: 'specs.inspection.passed', type: 'boolean' },
    { name: 'specs.inspection.score', type: 'number' },
    { name: 'audit', type: 'object' },
    { name: 'audit.flagged', type: 'boolean' },
  ],
  lifecycle,
  invariants: [],
  imports: [],
});
const port = def('repositoryPort', 'CrateRepository', [ENTITY], {
  entityId: 'Crate',
  interfaceName: 'CrateRepository',
  methods: [
    { name: 'create', params: ['Crate'], returns: 'Crate' },
    { name: 'list', params: ['CrateFilter'], returns: 'Crate[]' },
  ],
});
const createCrate = def('usecase', 'createCrate', [PORT, ENTITY, DOCK, ONTOLOGY], {
  usecaseId: 'createCrate',
  entityId: 'Crate',
  operation: 'create',
  ports: ['CrateRepository'],
  functions: [{ functionName: 'createCrate', input: [], output: [], contractRefs: [{ route: ROUTE, symbol: 'CreateCrateOutput' }] }],
  routeProjections: [{ route: ROUTE, contractPath: DOCK.replace(`${P}/`, ''), projection: 'declared', outputFields: ['id', 'version', 'dockId', 'status', 'label', 'specs'] }],
  portCalls: ['create'],
  effects: [],
  uses: [{ path: 'id', role: 'selector', source: 'input' }],
  rulesApplied: [],
  rules: [],
  rulePlan: [],
  sequence: [{ kind: 'port', call: 'create', port: 'CrateRepository' }],
  transactional: false,
  transaction: { boundary: 'none' },
});
const scope = def('accessScope', 'accessScope', [], {
  scopeId: 'accessScope',
  grants: [{
    grantId: 'clerkDock', actorRef: 'clerk', entityRefs: ['Crate'], disclosure: 'fieldsOnly',
    allowedFields: ['Crate.id', 'Crate.version', 'Crate.dockId', 'Crate.status', 'Crate.label', 'Crate.specs'],
    scopeMode: 'organization', session: 'verified', path: [{ entityId: 'Crate', steps: [], pending: '' }], pending: '',
  }],
});
const authority = def('authorityMap', 'authorityMap', [SCOPE], { mapId: 'authorityMap', entries: [{ grantId: 'clerkDock', actorRef: 'clerk' }] });
const dock = def('httpController', 'dock', [AUTHORITY, SCOPE, UC], {
  pageId: 'dock',
  handlers: [{ route: ROUTE, kind: 'command', usecaseId: 'createCrate', grantIds: ['clerkDock'] }],
});

const DOCK_SOURCE = [
  'export interface CreateCrateInput {\n  "dockId": string;\n  "label"?: string;\n  "weight"?: number;\n  "fragile"?: boolean;\n  "specs": {\n    "width"?: number;\n    "sealed"?: boolean;\n    "memo"?: string;\n    "inspection"?: {\n      "passed": boolean;\n      "score"?: number;\n    };\n  };\n}',
  'export interface CreateCrateOutput {\n  "id": string;\n  "version": number;\n  "dockId": string;\n  "status": "shipped" | "held" | "packed";\n  "label"?: string;\n  "specs": {\n    "width"?: number;\n    "sealed"?: boolean;\n    "memo"?: string;\n    "inspection"?: {\n      "passed": boolean;\n      "score"?: number;\n    };\n  };\n}',
].join('\n\n');

type Fields = Record<string, { type: string; required?: boolean; derived?: boolean; fields?: Fields }>;
const RECORD: Fields = {
  id: { type: 'uuid', required: true, derived: true },
  version: { type: 'integer', required: true, derived: true },
  dockId: { type: 'record', required: true },
  status: { type: 'enum', required: true },
  label: { type: 'text' },
  weight: { type: 'number' },
  fragile: { type: 'boolean' },
  notes: { type: 'text' },
  specs: {
    type: 'object', required: true, fields: {
      width: { type: 'number' }, sealed: { type: 'boolean' }, memo: { type: 'text' },
      inspection: { type: 'object', fields: { passed: { type: 'boolean', required: true }, score: { type: 'number' } } },
    },
  },
  audit: { type: 'object', fields: { flagged: { type: 'boolean' } } },
};
const ontologySource = (fields: Fields) => `export const ${MOD}EntityCrate = ${JSON.stringify({
  schemaVersion: '2026-09-17-ns5-ontology-v3.1', moduleName: MOD, entityId: 'Crate', kind: 'entity',
  record: { fields }, lifecycleStates: lifecycle.states, transitions: lifecycle.transitions,
}, null, 2)} as const;\n`;

const asSource = (definition: M1Definition) => `export const definition = ${JSON.stringify(definition)} as const;\n`;

function reader(overrides: Map<string, string> = new Map()): (ref: string) => Promise<string | null> {
  const files = new Map<string, string>([
    [ENTITY, asSource(entity)], [PORT, asSource(port)], [SCOPE, asSource(scope)], [AUTHORITY, asSource(authority)],
    [UC, asSource(createCrate)], [CTRL, asSource(dock)], [DOCK, DOCK_SOURCE], [ONTOLOGY, ontologySource(RECORD)],
  ]);
  for (const [ref, source] of overrides) files.set(ref, source);
  return async ref => files.get(ref) ?? null;
}

function ok(result: EmitResult | EmitFailure): EmitResult {
  assert.equal('code' in result, false, 'code' in result ? `${result.code} ${result.detail}` : '');
  return result as EmitResult;
}

type Handler = (input: unknown) => Promise<{ data: unknown }>;
type Row = Record<string, unknown>;

async function emitAll(contract = DOCK_SOURCE): Promise<Map<string, string>> {
  const read = reader(new Map([[DOCK, contract]]));
  const units: Array<[string, string, M1Definition]> = [
    ['implement.domainEntity', ENTITY, entity],
    ['implement.repositoryPort', PORT, port],
    ['implement.accessScope', SCOPE, scope],
    ['implement.authorityMap', AUTHORITY, authority],
    ['implement.usecase', UC, createCrate],
  ];
  const sources = new Map<string, string>();
  for (const [id, ref, definition] of units) sources.set(ref, ok(await emitBehavior(id, definition, outputPathFromDefPath(ref), read)).source);
  sources.set(CTRL, ok(await emitController(dock, outputPathFromDefPath(CTRL), read)).source);
  return sources;
}

/** Writes the emitted files (after `edit`) to a scratch folder and loads the controller and the store. */
async function load(edit: (defPath: string, source: string) => string = (_ref, source) => source, contract = DOCK_SOURCE) {
  const sources = await emitAll(contract);
  const dir = mkdtempSync(join(tmpdir(), 'm1-29-'));
  const fileOf = (qualified: string) => join(dir, qualified.replace(`${P}/`, ''));
  for (const [ref, source] of sources) {
    const target = fileOf(outputPathFromDefPath(ref));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, edit(ref, source).replace(new RegExp(`from '/${P}/([^']+)\\.js'`, 'g'), (_all, rest: string) => `from '${pathToFileURL(fileOf(`${P}/${rest}.ts`)).href}'`));
  }
  const controller = await import(pathToFileURL(fileOf(outputPathFromDefPath(CTRL))).href) as { routes: Array<{ key: string; handler: Handler }> };
  const memory = await import(pathToFileURL(fileOf(outputPathFromDefPath(PORT))).href) as {
    resetMemory: (seed: Row[]) => void;
    pendingCrateRepository: { list: (filter: Row) => Promise<Row[]> };
  };
  const handler = controller.routes.find(item => item.key === ROUTE)?.handler;
  assert.ok(handler, ROUTE);
  memory.resetMemory([]);
  const create = async (params: Row): Promise<{ code?: string; row?: Row }> => {
    const ctx = createRequestContext();
    ctx.sessionContext.actorId = 'k-1';
    try {
      const response = await handler({ request: { routine: ROUTE, params, meta: { source: 'http', verifiedAuthorities: [`${MOD}:clerk`] } }, ctx });
      const id = (response.data as { id: string }).id;
      return { row: (await memory.pendingCrateRepository.list({})).find(item => item.id === id) };
    } catch (error) {
      return { code: String((error as { code?: string }).code ?? error) };
    }
  };
  return { create, sources, rows: () => memory.pendingCrateRepository.list({}), dispose: () => rmSync(dir, { recursive: true, force: true }) };
}

const own = (value: unknown, key: string) => Boolean(value) && typeof value === 'object' && Object.hasOwn(value as object, key);

/** The stored row of a minimal create: server assignments, the sent leaves and the required container. */
async function assertMinimalCreate(create: (params: Row) => Promise<{ code?: string; row?: Row }>): Promise<void> {
  const { code, row } = await create({ dockId: 'd-1', specs: {} });
  assert.equal(code, undefined, code);
  assert.ok(row);
  assert.deepEqual(Object.keys(row).sort(), ['dockId', 'id', 'specs', 'status', 'version']);
  assert.equal(row.status, 'packed', 'the initial state is the one no transition reaches');
  assert.equal(row.version, 1);
  assert.equal(typeof row.id, 'string');
  for (const key of ['label', 'weight', 'fragile', 'notes', 'audit']) assert.equal(own(row, key), false, `${key} was not sent`);
  assert.deepEqual(row.specs, {}, 'the sent empty object stays empty');
}

void test('an omitted optional leaf or parent is not stored; the initial state and identity are assigned', async () => {
  const loaded = await load();
  try {
    await assertMinimalCreate(loaded.create);
    // m1_26 regression, renamed: the object sent empty holds none of the leaves the entity knows.
    const { row } = await loaded.create({ dockId: 'd-2', specs: { sealed: true } });
    const specs = row?.specs as Row;
    assert.deepEqual(specs, { sealed: true }, 'an explicit sibling is kept; the absent optional parent is not materialized');
    assert.equal(own(specs, 'inspection'), false);
  } finally {
    loaded.dispose();
  }
});

void test('present 0, false and empty text are stored as sent at every depth', async () => {
  const loaded = await load();
  try {
    const { code, row } = await loaded.create({
      dockId: 'd-1', label: '', weight: 0, fragile: false,
      specs: { width: 0, sealed: false, memo: '', inspection: { passed: false, score: 0 } },
    });
    assert.equal(code, undefined, code);
    assert.ok(row);
    assert.strictEqual(row.label, '');
    assert.strictEqual(row.weight, 0);
    assert.strictEqual(row.fragile, false);
    assert.deepEqual(row.specs, { width: 0, sealed: false, memo: '', inspection: { passed: false, score: 0 } });
    assert.equal(own(row, 'notes'), false);
    assert.equal(own(row, 'audit'), false);
  } finally {
    loaded.dispose();
  }
});

void test('a required member under an optional parent is required only when the parent comes', async () => {
  const loaded = await load();
  try {
    assert.equal((await loaded.create({ dockId: 'd-1', specs: { inspection: { score: 2 } } })).code, 'VALIDATION_ERROR');
    assert.equal((await loaded.create({ specs: {} })).code, 'VALIDATION_ERROR', 'a required top-level leaf is required');
    assert.equal((await loaded.create({ dockId: 'd-1', status: 'shipped', specs: {} })).code, 'VALIDATION_ERROR', 'the contract does not take the state');
    assert.equal((await loaded.rows()).length, 0);
    const { code, row } = await loaded.create({ dockId: 'd-1', specs: { inspection: { passed: true } } });
    assert.equal(code, undefined, code);
    assert.deepEqual(row?.specs, { inspection: { passed: true } });
  } finally {
    loaded.dispose();
  }
});

/** `null` where the contract does not declare it is a 400 naming the path; nothing is stored. */
async function assertNullRefused(loaded: Awaited<ReturnType<typeof load>>): Promise<void> {
  for (const params of [{ dockId: 'd-1', specs: { inspection: null } }, { dockId: 'd-1', label: null, specs: {} }, { dockId: 'd-1', specs: null }]) {
    assert.equal((await loaded.create(params)).code, 'VALIDATION_ERROR', JSON.stringify(params));
  }
  assert.equal((await loaded.rows()).length, 0);
}

void test('null is refused where the contract does not declare it and stored as null where it does', async () => {
  const strict = await load();
  try {
    await assertNullRefused(strict);
  } finally {
    strict.dispose();
  }
  const declared = DOCK_SOURCE
    .replace('    "memo"?: string;\n    "inspection"?: {', '    "memo"?: string | null;\n    "inspection"?: {')
    .replace('      "score"?: number;\n    };\n  };\n}\n\nexport interface CreateCrateOutput', '      "score"?: number;\n    } | null;\n  };\n}\n\nexport interface CreateCrateOutput');
  assert.notEqual(declared, DOCK_SOURCE);
  const open = await load(undefined, declared);
  try {
    const { code, row } = await open.create({ dockId: 'd-1', specs: { memo: null, inspection: null } });
    assert.equal(code, undefined, code);
    const specs = row?.specs as Row;
    assert.equal(own(specs, 'memo') && specs.memo === null, true, 'a declared null leaf is stored as null');
    assert.equal(own(specs, 'inspection') && specs.inspection === null, true, 'a declared null object is stored as null, not {} nor absent');
    assert.equal((await open.create({ dockId: 'd-1', label: null, specs: {} })).code, 'VALIDATION_ERROR', 'only the declared paths admit null');
  } finally {
    open.dispose();
  }
  const unguarded = await load((ref, source) => {
    if (ref !== CTRL) return source;
    const changed = source.replace(/\n[^\n]*must not be null[^\n]*/, '');
    assert.notEqual(changed, source, 'the mutation removes the null refusal from the emitted controller');
    return changed;
  });
  try {
    await assert.rejects(assertNullRefused(unguarded));
  } finally {
    unguarded.dispose();
  }
});

void test('a default written back into the emitted copy is caught', async () => {
  for (const edit of [
    (source: string) => source.replace(/\.\.\.\(input\.fragile !== undefined \? \{ fragile: input\.fragile \} : \{\}\),/, 'fragile: input.fragile ?? false,'),
    (source: string) => source.replace(/(const record: Crate = \{\n)/, "$1    notes: '',\n"),
    (source: string) => source.replace(/\.\.\.\(input\.specs\.inspection !== undefined \? \{ inspection: /, 'inspection: {}, ...(input.specs.inspection !== undefined ? { inspection: '),
  ]) {
    const mutated = await load((ref, source) => {
      if (ref !== UC) return source;
      const changed = edit(source);
      assert.notEqual(changed, source, 'the mutation applies to the emitted create');
      return changed;
    });
    try {
      await assert.rejects(assertMinimalCreate(mutated.create));
    } finally {
      mutated.dispose();
    }
  }
});

void test('the domain types what a stored record may lack; a required field with no source is refused', async () => {
  const sources = await emitAll();
  const domain = sources.get(ENTITY) ?? '';
  for (const line of ['  id: string;', '  version: number;', '  dockId: string;', '  label?: string;', '  weight?: number;', '  fragile?: boolean;', '  specs: {', '    inspection?: {', '      passed: boolean;', '  audit?: {']) {
    assert.equal(domain.includes(`\n${line}\n`), true, `${line}\n${domain}`);
  }
  assert.match(domain, /\n {2}status: 'shipped' \| 'held' \| 'packed';\n/);

  const noted: Fields = { ...RECORD, notes: { type: 'text', required: true } };
  const refused = await emitBehavior('implement.usecase', createCrate, outputPathFromDefPath(UC), reader(new Map([[ONTOLOGY, ontologySource(noted)]])));
  assert.equal('code' in refused && refused.code, 'CREATE_SOURCE_MISSING');
  // Required under an optional parent is not a missing source.
  const nested: Fields = { ...RECORD, audit: { type: 'object', fields: { flagged: { type: 'boolean', required: true } } } };
  ok(await emitBehavior('implement.usecase', createCrate, outputPathFromDefPath(UC), reader(new Map([[ONTOLOGY, ontologySource(nested)]]))));
});

void test('the emitted domain, port and create compile together against the contract', async () => {
  const sources = await emitAll();
  const dir = join(ROOT, '.generated', `.createabsence-${process.pid}`);
  const config = join(ROOT, `.tsconfig.createabsence-${process.pid}.json`);
  try {
    const files: string[] = [];
    const write = (qualified: string, source: string) => {
      const full = join(dir, qualified.replace(`${P}/`, ''));
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, source);
      files.push(`./${relative(ROOT, full)}`);
    };
    for (const ref of [ENTITY, PORT, UC]) write(outputPathFromDefPath(ref), sources.get(ref) ?? '');
    write(DOCK, DOCK_SOURCE);
    const paths = { [`/${P}/*`]: [`./${relative(ROOT, dir)}/*`], '/_102034_/*': ['./mls-102034/*'] };
    writeFileSync(config, `${JSON.stringify({ extends: './tsconfig.base.json', compilerOptions: { noEmit: true, paths }, files }, null, 2)}\n`);
    const result = spawnSync(process.execPath, [join(ROOT, 'node_modules/typescript/bin/tsc'), '-p', config, '--pretty', 'false'], { cwd: ROOT, encoding: 'utf8' });
    const problems = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.split('\n').filter(line => line.includes('.createabsence-')).join('\n').trim();
    assert.equal(problems, '', `${problems}\n${sources.get(UC)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(config, { force: true });
  }
});
