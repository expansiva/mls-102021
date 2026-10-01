/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/structure/emittedTypecheck.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

import { parseD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import { M1_DEFINITION_SCHEMA, parseDefinitionSource, readDefinition, receiptFolder, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import {
  emitAccess,
  emitAuthority,
  emitController,
  emitDomain,
  emitPort,
  emitRequestService,
  emitUsecase,
} from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import type { MaterializeReadIo } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import { handlerFor } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import { decideProfile } from '/_102021_/l2/agentMaterializeL1/run/budget.js';
import type { HandlerCall } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { simulate, type SimulatedUnit } from '/_102021_/l2/agentMaterializeL1/simulate/simulate.js';
import { runStructure, structureHandlerIds } from '/_102021_/l2/agentMaterializeL1/handlers/structure/runners.js';
import { catalogWithheld, deriveCatalog } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';
import { moduleSpecifier, renderMonitorCatalog, renderScenarioTest } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import { fixtureLogicalRel } from '/_102021_/l2/agentDefsL1/fixtures/fixtureDisk.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../../../..');
const FIXTURE = join(HERE, '../../../agentDefsL1/fixtures/agendaClinica-3f4f677');
const PROJECT = '102047';
const MODULE = 'agendaClinica';

void test('structure output of the clinic fixture typechecks on the official configs', async () => {
  // The frozen fixture predates d1_36: controllers60 now adds the authority map to a controller with grants.
  const texts = withAuthorityDependency(loadDefs(FIXTURE));
  assert.ok(texts.has(`_${PROJECT}_/l2/${MODULE}/web/contracts/agenda.defs.ts`));
  const units: PlanUnitInput[] = [];
  const definitions = new Map<string, M1Definition>();
  for (const [defPath, text] of texts) {
    const parsed = parseDefinitionSource(text);
    if (!('definition' in parsed)) continue;
    const definition = readDefinition(parsed.definition);
    if ('issues' in definition || definition.moduleName !== MODULE) continue;
    units.push({ defPath, definition });
    definitions.set(defPath, definition);
  }
  const snapshot = await simulate({ moduleName: MODULE, units, io: diskIo(texts) });
  const withheld = catalogWithheld(snapshot.units, new Set(structureHandlerIds()));
  const authority = snapshot.units.find(unit => unit.artifactType === 'authorityMap');
  assert.ok(authority);
  assert.doesNotMatch(authority.reason, /NO_CONSUMER/);
  assert.equal(withheld.has(authority.defPath), false);
  const derived = deriveCatalog(MODULE, units, Object.fromEntries(texts), withheld);
  assert.equal(derived.gaps.some(gap => gap.artifactId === 'authorityMap'), false);
  const catalogRef = `_${PROJECT}_/${receiptFolder(MODULE)}/scenarioCatalog.ts`;
  const catalogSource = renderMonitorCatalog(derived.catalog, catalogRef);
  const read = async (ref: string): Promise<string | null> => ref === catalogRef ? catalogSource : texts.get(ref) ?? null;
  const files = new Map<string, string>();
  for (const unit of units) {
    if (withheld.has(unit.defPath)) continue;
    const definition = definitions.get(unit.defPath);
    const handler = handlerFor(definition.artifactType, 'structure');
    if (!definition || !handler || !handler.id.startsWith('structure.')) continue;
    const outcome = await runStructure(callFor(unit.defPath, definition, read));
    assert.equal(outcome.failure, null, `${unit.defPath} ${outcome.failure?.detail ?? ''}`);
    for (const [path, source] of Object.entries(outcome.files)) files.set(path, source);
  }
  files.set(catalogRef, catalogSource);
  let tests = 0;
  for (const scenario of derived.catalog.scenarios) {
    if (!files.has(scenario.productionFile)) continue;
    files.set(scenario.testFile, renderScenarioTest(scenario));
    tests += 1;
  }
  assert.ok(tests > 0);
  assert.equal([...files.keys()].some(path => path.endsWith('/authorityMap.ts')), true);
  assert.equal([...files].some(([path, source]) => path.includes('/controllers/') && source.includes('actorRefFor(grantId)')), true);

  const sandbox = mkdtempSync(join(tmpdir(), 'm1-15-'));
  try {
    writeFileSync(join(sandbox, 'tsconfig.base.json'), readFileSync(join(ROOT, 'tsconfig.base.json')));
    writeFileSync(join(sandbox, 'tsconfig.backend.json'), readFileSync(join(ROOT, 'tsconfig.backend.json')));
    mkdirSync(join(sandbox, 'test'));
    writeFileSync(join(sandbox, 'test/tsconfig.runtime.json'), readFileSync(join(ROOT, 'test/tsconfig.runtime.json')));
    symlinkSync(join(ROOT, 'node_modules'), join(sandbox, 'node_modules'));
    for (const entry of readdirSync(ROOT)) {
      if (!/^mls-\d+$/.test(entry) || entry === `mls-${PROJECT}`) continue;
      symlinkSync(join(ROOT, entry), join(sandbox, entry));
    }
    mkdirSync(join(sandbox, `mls-${PROJECT}`));
    symlinkSync(join(ROOT, `mls-${PROJECT}`, 'l2'), join(sandbox, `mls-${PROJECT}`, 'l2'));
    const production: string[] = [];
    const testFiles: string[] = [];
    for (const [qualified, source] of files) {
      const relativePath = qualified.replace(new RegExp(`^_${PROJECT}_/`), `mls-${PROJECT}/`);
      const full = join(sandbox, relativePath);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, source);
      if (relativePath.endsWith('.test.ts')) testFiles.push(relativePath);
      else production.push(relativePath);
    }
    const backend = compile(sandbox, 'backend', {
      extends: './tsconfig.backend.json',
      include: production,
      exclude: ['**/*.test.ts'],
    });
    assert.equal(backend, '', backend);
    const runtime = compile(sandbox, 'runtime', {
      extends: './test/tsconfig.runtime.json',
      include: [...testFiles, ...production],
    });
    assert.equal(runtime, '', runtime);

    for (const relativePath of [...testFiles, ...production]) {
      const full = join(sandbox, relativePath);
      writeFileSync(full, readFileSync(full, 'utf8').replaceAll("from '/_", "from '_"));
    }
    const stripped = compile(sandbox, 'stripped', {
      extends: './test/tsconfig.runtime.json',
      include: [...testFiles, ...production],
    });
    assert.match(stripped, /TS2307/);
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
});

void test('m1_32/m1_35: the test of a unit promoted once and blocked now compiles whether the catalog keeps its scenario or not', async () => {
  const texts = withAuthorityDependency(loadDefs(FIXTURE));
  const units: PlanUnitInput[] = [];
  const definitions = new Map<string, M1Definition>();
  for (const [defPath, text] of texts) {
    const parsed = parseDefinitionSource(text);
    if (!('definition' in parsed)) continue;
    const definition = readDefinition(parsed.definition);
    if ('issues' in definition || definition.moduleName !== MODULE) continue;
    units.push({ defPath, definition });
    definitions.set(defPath, definition);
  }
  const bound = new Set(structureHandlerIds());
  const snapshot = await simulate({ moduleName: MODULE, units, io: diskIo(texts) });
  const sources = Object.fromEntries(texts);
  // The /structure run: outputs and tests on disk.
  const structured = deriveCatalog(MODULE, units, sources, catalogWithheld(snapshot.units, bound));
  const catalogRef = `_${PROJECT}_/${receiptFolder(MODULE)}/scenarioCatalog.ts`;
  const structureCatalog = renderMonitorCatalog(structured.catalog, catalogRef);
  const read = async (ref: string): Promise<string | null> => ref === catalogRef ? structureCatalog : texts.get(ref) ?? null;
  const files = new Map<string, string>();
  for (const scenario of structured.catalog.scenarios) {
    const definition = definitions.get(scenario.source);
    if (!definition || definition.artifactType !== 'domainEntity') continue;
    const outcome = await runStructure(callFor(scenario.source, definition, read));
    assert.equal(outcome.failure, null, `${scenario.source} ${outcome.failure?.detail ?? ''}`);
    for (const [path, source] of Object.entries(outcome.files)) files.set(path, source);
    files.set(scenario.testFile, renderScenarioTest(scenario));
  }
  const target = structured.catalog.scenarios.find(scenario => files.has(scenario.testFile));
  assert.ok(target, 'the fixture has an entity scenario with a test');
  // The next run plans that unit blocked (STATUS_BLOCKED, as a case that did not run leaves it).
  const blocked = snapshot.units.map(unit => unit.defPath === target.source
    ? { ...unit, action: 'blocked' as const, reason: 'STATUS_BLOCKED: BLOCKED: case did not run.' }
    : unit);
  const kept = deriveCatalog(MODULE, units, sources, catalogWithheld(blocked, bound, new Set([target.source])));
  const dropped = deriveCatalog(MODULE, units, sources, catalogWithheld(blocked, bound));
  assert.equal(kept.catalog.scenarios.some(item => item.scenarioId === target.scenarioId), true);
  assert.equal(dropped.catalog.scenarios.some(item => item.scenarioId === target.scenarioId), false);

  const keptErrors = compileRuntime(files, catalogRef, renderMonitorCatalog(kept.catalog, catalogRef));
  assert.equal(keptErrors, '', keptErrors);
  const droppedErrors = compileRuntime(files, catalogRef, renderMonitorCatalog(dropped.catalog, catalogRef));
  // m1_35: the test is data and imports nothing, so a withheld scenario no longer breaks it.
  assert.equal(droppedErrors, '', droppedErrors);
});

void test('a qualified output path keeps the leading slash and a bare name is refused', () => {
  assert.equal(moduleSpecifier('_102047_/l1/agendaClinica/scope/accessScope.ts'), '/_102047_/l1/agendaClinica/scope/accessScope.js');
  assert.equal(moduleSpecifier('/_102047_/l1/agendaClinica/scope/accessScope.js'), '/_102047_/l1/agendaClinica/scope/accessScope.js');
  assert.equal(moduleSpecifier('./accessScope.ts'), '');
});

function withAuthorityDependency(texts: Map<string, string>): Map<string, string> {
  const authority = [...texts.keys()].find(path => path.endsWith('/authorityMap.defs.ts'));
  assert.ok(authority);
  const out = new Map<string, string>();
  for (const [path, text] of texts) {
    const isController = text.includes('"artifactType": "httpController"') && text.includes('"grantIds"');
    out.set(path, isController ? text.replace('"dependencies": [', `"dependencies": [\n    "${authority}",`) : text);
  }
  return out;
}

/** Runtime typecheck (tests and outputs) of `files` plus one catalog, in a sandbox that links the repo. */
function compileRuntime(files: ReadonlyMap<string, string>, catalogRef: string, catalogSource: string): string {
  const sandbox = mkdtempSync(join(tmpdir(), 'm1-32-'));
  try {
    writeFileSync(join(sandbox, 'tsconfig.base.json'), readFileSync(join(ROOT, 'tsconfig.base.json')));
    mkdirSync(join(sandbox, 'test'));
    writeFileSync(join(sandbox, 'test/tsconfig.runtime.json'), readFileSync(join(ROOT, 'test/tsconfig.runtime.json')));
    symlinkSync(join(ROOT, 'node_modules'), join(sandbox, 'node_modules'));
    for (const entry of readdirSync(ROOT)) {
      if (!/^mls-\d+$/.test(entry) || entry === `mls-${PROJECT}`) continue;
      symlinkSync(join(ROOT, entry), join(sandbox, entry));
    }
    mkdirSync(join(sandbox, `mls-${PROJECT}`));
    symlinkSync(join(ROOT, `mls-${PROJECT}`, 'l2'), join(sandbox, `mls-${PROJECT}`, 'l2'));
    const include: string[] = [];
    for (const [qualified, source] of [...files, [catalogRef, catalogSource] as const]) {
      const relativePath = qualified.replace(new RegExp(`^_${PROJECT}_/`), `mls-${PROJECT}/`);
      const full = join(sandbox, relativePath);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, source);
      include.push(relativePath);
    }
    return compile(sandbox, 'runtime', { extends: './test/tsconfig.runtime.json', include });
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

function compile(root: string, name: string, config: { extends: string; include: string[]; exclude?: string[] }): string {
  const configPath = join(root, `.tsconfig.m1-15-${name}.json`);
  writeFileSync(configPath, `${JSON.stringify({ ...config, compilerOptions: { noEmit: true } }, null, 2)}\n`);
  const tsc = join(root, 'node_modules/typescript/bin/tsc');
  const result = spawnSync(process.execPath, [tsc, '-p', configPath, '--pretty', 'false'], { cwd: root, encoding: 'utf8' });
  return `${result.stdout ?? ''}\n${result.stderr ?? ''}`.split('\n').filter(line => line.includes('error TS')).join('\n');
}

function callFor(defPath: string, definition: M1Definition, read: HandlerCall['read']): HandlerCall {
  const handler = handlerFor(definition.artifactType, 'structure');
  if (!handler) throw new Error(definition.artifactType);
  const unit: SimulatedUnit = {
    defPath,
    artifactType: definition.artifactType,
    artifactId: definition.artifactId,
    action: 'generate',
    reason: '',
    handlerId: handler.id,
    needsLlm: false,
    unresolved: [],
    contextRefs: [],
    blockedBy: [],
    prompt: '',
  };
  return {
    handler,
    unit,
    definition,
    read,
    catalogRef: `_${PROJECT}_/${receiptFolder(MODULE)}/scenarioCatalog.ts`,
    repair: false,
    signal: new AbortController().signal,
    eventId: defPath,
    profile: decideProfile('development', true),
    modelText: null,
  };
}

function diskIo(defs: ReadonlyMap<string, string>): MaterializeReadIo {
  return {
    async read(ref: string): Promise<string | null> {
      const own = defs.get(ref);
      if (own !== undefined) return own;
      const match = /^_(\d+)_\/(.+)$/.exec(ref);
      if (!match) return null;
      const disk = join(ROOT, `mls-${match[1]}`, match[2]);
      if (!existsSync(disk) || !statSync(disk).isFile()) return null;
      return readFileSync(disk, 'utf8');
    },
  };
}

void test('service, controller and usecase typecheck against the v2 contract', async () => {
  const original = readFileSync(join(HERE, '../../fixtures/controleEstoque-39a5166/l2/controleEstoque/web/contracts/produtos.defs.txt'), 'utf8');
  for (const source of [original, renamedContract(original)]) {
    const emitted = await emitTrio(source);
    assert.equal(adapterGuard(emitted.controller), true);
    assert.equal(emitted.usecases.some(file => /from '[^']*\/l2\//.test(file)), false);
    const errors = compileQualified(emitted.files);
    assert.equal(errors, '', errors);
  }

  const emitted = await emitTrio(original);
  let castFailed = false;
  try {
    assert.equal(adapterGuard(emitted.controller.replace(' as ', ' as unknown as ')), true);
  } catch (error) {
    castFailed = error instanceof assert.AssertionError;
  }
  assert.equal(castFailed, true, 'as unknown as must fail the adapter guard');

  const derived = emitted.controller
    .replace(/[A-Za-z0-9_]*Contracts\['[^']+'\]\['input'\]/g, 'LoadInput')
    .replace(/[A-Za-z0-9_]*Contracts\['[^']+'\]\['output'\]/g, 'LoadOutput');
  const files = new Map(emitted.files);
  const controllerPath = [...files.keys()].find(path => path.includes('/controllers/'));
  assert.ok(controllerPath);
  files.set(controllerPath, derived);
  assert.match(compileQualified(files), /error TS/);
});

interface Trio {
  controller: string;
  usecases: string[];
  files: Map<string, string>;
}

async function emitTrio(contractSource: string): Promise<Trio> {
  const parsed = parseD2ContractV2(contractSource);
  const contractInterface = /export interface ([A-Za-z0-9_]*Contracts)\b/.exec(contractSource)?.[1] ?? '';
  assert.match(contractInterface, /Contracts$/);
  const project = '_102099_';
  const moduleName = parsed.module;
  const pageId = parsed.pageId;
  const query = parsed.routes.find(route => route.kind === 'qry');
  const command = parsed.routes.find(route => route.kind === 'cmd');
  assert.ok(query && command);
  const entity = Object.values(query.meta.output)[0]?.entity ?? '';
  assert.equal(entity, Object.values(command.meta.output)[0]?.entity);
  const port = `${entity}Repository`;
  const entityFile = camel(entity);
  const qualify = (path: string) => `${project}/${path}`;
  const entityDef = qualify(`l1/${moduleName}/layer_3_domain/entities/${entityFile}.defs.ts`);
  const portDef = qualify(`l1/${moduleName}/layer_2_application/ports/${entityFile}Repository.defs.ts`);
  const scopeDef = qualify(`l1/${moduleName}/layer_2_application/scope/accessScope.defs.ts`);
  const authorityDef = qualify(`l1/${moduleName}/layer_1_external/auth/authorityMap.defs.ts`);
  const contractDef = qualify(`l2/${moduleName}/web/contracts/${pageId}.defs.ts`);
  const listId = `list${entity}`;
  const createId = `create${entity}`;
  const listDef = qualify(`l1/${moduleName}/layer_2_application/usecases/${listId}.defs.ts`);
  const createDef = qualify(`l1/${moduleName}/layer_2_application/usecases/${createId}.defs.ts`);
  const serviceDef = qualify(`l1/${moduleName}/layer_2_application/requests/${pageId}.defs.ts`);
  const controllerDef = qualify(`l1/${moduleName}/layer_1_external/adapters/http/controllers/${pageId}.defs.ts`);
  const grantId = query.access.grants[0] ?? command.access.grants[0] ?? '';
  assert.ok(grantId);

  const definition = (artifactType: string, artifactId: string, dependencies: string[], data: Record<string, unknown>): M1Definition => ({
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: artifactType as M1Definition['artifactType'],
    artifactId,
    moduleName,
    status: 'pending',
    dependencies,
    data,
  });
  const entityDefinition = definition('domainEntity', entityFile, [], {
    entityId: entity,
    fields: [{ name: 'id', type: 'string' }, { name: 'name', type: 'string' }],
  });
  const portDefinition = definition('repositoryPort', entityFile, [entityDef], {
    interfaceName: port,
    entityId: entity,
    methods: [{ name: 'get', params: ['string'], returns: entity }],
  });
  const scopeDefinition = definition('accessScope', 'accessScope', [], {
    grants: [{ grantId, actorRef: 'actor', scopeMode: 'organization', session: 'verified', pending: '', disclosure: 'fullRecord' }],
  });
  const authorityDefinition = definition('authorityMap', 'authorityMap', [], {
    entries: [{ grantId, actorRef: 'actor' }],
  });
  const signature = (operation: 'list' | 'create') => operation === 'list'
    ? {
      input: [{ name: 'name', type: 'string' }, { name: 'page', type: 'number' }, { name: 'pageSize', type: 'number' }],
      output: [{ name: 'items', type: entity }, { name: 'hasMore', type: 'boolean' }],
    }
    : {
      input: [{ name: 'name', type: 'string' }],
      output: [{ name: 'id', type: 'string' }, { name: 'name', type: 'string' }],
    };
  const usecaseDefinition = (usecaseId: string, operation: 'list' | 'create') => definition('usecase', usecaseId, [entityDef, portDef], {
    usecaseId,
    entityId: entity,
    operation,
    ports: [port],
    functions: [{ functionName: usecaseId, ...signature(operation) }],
  });
  const requestOf = (route: typeof query) => {
    const outputKey = Object.keys(route.meta.output)[0] ?? '';
    const list = Object.values(route.meta.lists).find(item => item.key === outputKey);
    const operation = route.kind === 'qry' ? 'list' : 'create';
    return {
      route: route.route,
      kind: route.kind,
      uses: [operation === 'list' ? listId : createId],
      transaction: route.kind === 'cmd' ? 'single' : 'none',
      outputs: [{
        key: outputKey,
        entity,
        fields: ['id'],
        ...(list ? { page: list.page, pageSize: list.pageSize, hasMore: list.hasMore } : {}),
      }],
      params: list ? [
        { name: 'page', target: outputKey, pages: 'list' },
        { name: 'pageSize', target: outputKey, pages: 'list' },
      ] : [],
    };
  };
  const serviceDefinition = definition('requestService', pageId, [listDef, createDef].sort(), {
    pageId,
    requests: [requestOf(query), requestOf(command)],
  });
  const controllerDefinition = definition('httpController', pageId, [serviceDef, scopeDef, authorityDef].sort(), {
    pageId,
    handlers: [query, command].map(route => ({
      route: route.route,
      kind: route.kind === 'cmd' ? 'command' : 'query',
      grantIds: route.access.grants,
      serviceFunction: route.route,
      contractPath: `l2/${moduleName}/web/contracts/${pageId}.defs.ts`,
      contractInterface,
    })),
  });
  const texts = new Map<string, string>([
    [entityDef, `export const definition = ${JSON.stringify(entityDefinition)} as const;\n`],
    [portDef, `export const definition = ${JSON.stringify(portDefinition)} as const;\n`],
    [scopeDef, `export const definition = ${JSON.stringify(scopeDefinition)} as const;\n`],
    [authorityDef, `export const definition = ${JSON.stringify(authorityDefinition)} as const;\n`],
    [listDef, `export const definition = ${JSON.stringify(usecaseDefinition(listId, 'list'))} as const;\n`],
    [createDef, `export const definition = ${JSON.stringify(usecaseDefinition(createId, 'create'))} as const;\n`],
    [serviceDef, `export const definition = ${JSON.stringify(serviceDefinition)} as const;\n`],
    [contractDef, contractSource],
  ]);
  const read = async (ref: string) => texts.get(ref) ?? null;
  const registration = definition('repositoryRegistration', 'registerRepositories', [portDef], {
    registrationId: 'registerRepositories',
    adapters: [{ portId: port, adapterArtifactId: port }],
  });
  const produced = new Map<string, string>([[contractDef, contractSource]]);
  const take = (result: { source: string } | { code: string; detail: string }, defPath: string) => {
    assert.equal('code' in result, false, 'code' in result ? result.detail : defPath);
    if ('code' in result) return '';
    const output = defPath.replace(/\.defs\.ts$/, '.ts');
    produced.set(output, result.source);
    return result.source;
  };
  take(emitDomain(entityDefinition, entityDef.replace(/\.defs\.ts$/, '.ts')), entityDef);
  take(emitPort(portDefinition, portDef.replace(/\.defs\.ts$/, '.ts')), portDef);
  take(emitAccess(scopeDefinition, scopeDef.replace(/\.defs\.ts$/, '.ts')), scopeDef);
  take(emitAuthority(authorityDefinition, authorityDef.replace(/\.defs\.ts$/, '.ts')), authorityDef);
  const usecases = [
    take(await emitUsecase(usecaseDefinition(listId, 'list'), listDef.replace(/\.defs\.ts$/, '.ts'), read), listDef),
    take(await emitUsecase(usecaseDefinition(createId, 'create'), createDef.replace(/\.defs\.ts$/, '.ts'), read), createDef),
  ];
  take(await emitRequestService(serviceDefinition, serviceDef.replace(/\.defs\.ts$/, '.ts'), read, [registration], 'implement'), serviceDef);
  const controller = take(await emitController(controllerDefinition, controllerDef.replace(/\.defs\.ts$/, '.ts'), read), controllerDef);
  assert.equal(controller.includes('resolveRepository'), false);
  assert.equal(controller.includes(listId), false);
  assert.equal(controller.includes(createId), false);
  return { controller, usecases, files: produced };
}

function adapterGuard(source: string): boolean {
  assert.equal(source.includes('as unknown as'), false);
  assert.equal(source.includes('resolveRepository'), false);
  assert.match(source, /requests\[/);
  assert.match(source, /Contracts\['[^']+'\]\['input'\]/);
  assert.match(source, /Contracts\['[^']+'\]\['output'\]/);
  return true;
}

function compileQualified(files: ReadonlyMap<string, string>): string {
  const sandbox = mkdtempSync(join(tmpdir(), 'm1-39-'));
  try {
    writeFileSync(join(sandbox, 'tsconfig.base.json'), readFileSync(join(ROOT, 'tsconfig.base.json')));
    symlinkSync(join(ROOT, 'node_modules'), join(sandbox, 'node_modules'));
    for (const entry of readdirSync(ROOT)) {
      if (/^mls-\d+$/.test(entry)) symlinkSync(join(ROOT, entry), join(sandbox, entry));
    }
    const include: string[] = [];
    for (const [qualified, source] of files) {
      const relativePath = qualified.replace(/^_102099_\//, 'mls-102099/');
      const full = join(sandbox, relativePath);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, source);
      include.push(relativePath);
    }
    const base = ts.readConfigFile(join(ROOT, 'tsconfig.base.json'), ts.sys.readFile);
    const paths = (base.config?.compilerOptions?.paths ?? {}) as Record<string, string[]>;
    const configPath = join(sandbox, '.tsconfig.m1-39-v2.json');
    writeFileSync(configPath, `${JSON.stringify({
      extends: './tsconfig.base.json',
      compilerOptions: { noEmit: true, paths: { ...paths, '/_102099_/*': ['./mls-102099/*'] } },
      include,
    }, null, 2)}\n`);
    const tsc = join(sandbox, 'node_modules/typescript/bin/tsc');
    const result = spawnSync(process.execPath, [tsc, '-p', configPath, '--pretty', 'false'], { cwd: sandbox, encoding: 'utf8' });
    return `${result.stdout ?? ''}\n${result.stderr ?? ''}`.split('\n').filter(line => line.includes('error TS')).join('\n');
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

function renamedContract(source: string): string {
  return source.replaceAll('controleEstoque', 'ledgerDesk').replaceAll('Produto', 'Widget').replaceAll('produtos', 'cards');
}

function camel(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function loadDefs(root: string): Map<string, string> {
  const texts = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.defs.ts') || entry.name.endsWith('.defs.txt')) {
        texts.set(`_${PROJECT}_/${fixtureLogicalRel(relative(root, full))}`, readFileSync(full, 'utf8'));
      }
    }
  };
  walk(root);
  return texts;
}
