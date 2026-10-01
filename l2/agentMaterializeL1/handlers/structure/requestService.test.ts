/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/structure/requestService.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { parseD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import type { D2ContractV2Route } from '/_102020_/l2/helpers/contractV2/types.js';
import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { clearRepositories, registerRepository, resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { contractMembers, emitRequestService } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTRACT = readFileSync(join(
  HERE,
  '../../fixtures/controleEstoque-39a5166/l2/controleEstoque/web/contracts/produtos.defs.txt',
), 'utf8');

/**
 * The generated adapter calls `getTable` on the runtime captured when `resolveRepository` runs.
 * `outside` counts those calls on the request runtime. The object passed to `runInTransaction`
 * is a different runtime, so a command that resolves inside the callback stays at 0.
 */
interface Spy {
  request: SpyRuntime & { runInTransaction: (fn: (tx: SpyRuntime) => Promise<unknown>) => Promise<unknown> };
  outside: () => number;
}
interface SpyRuntime { getTable: (name: string) => Promise<unknown> }

interface RoutePlan {
  route: string;
  operation: 'list' | 'create';
  entity: string;
  usecaseId: string;
  outputKey: string;
  fields: string[];
  page: string;
  pageSize: string;
  hasMore: string;
}

interface Prepared {
  source: string;
  port: string;
  binding: string;
  command: RoutePlan;
  query: RoutePlan;
}

void test('emitted request service', async (t) => {
  await t.test('a command calls getTable on the transaction runtime only', async () => {
    for (const source of [CONTRACT, renamed(CONTRACT)]) await assertTransaction(source);
  });

  await t.test('service output is the contract paths plus the three pagination keys', async () => {
    for (const source of [CONTRACT, renamed(CONTRACT)]) await assertProjection(source);
  });
});

async function assertTransaction(contractSource: string): Promise<void> {
  const prepared = await prepare(contractSource);
  const seen = await run(prepared, prepared.command.route, () => ({ id: 'row' }), {});
  assert.equal(seen.entered, 1, prepared.command.route);
  assert.equal(seen.outside, 0, prepared.command.route);

  const hoisted = resolveOutside(prepared.source, prepared.command.route);
  const leaked = await run(prepared, prepared.command.route, () => ({ id: 'row' }), {}, hoisted);
  assert.equal(leaked.entered, 1, prepared.command.route);
  assert.ok(leaked.outside > 0, `${prepared.command.route} resolved outside the callback and getTable stayed at 0`);
}

async function assertProjection(contractSource: string): Promise<void> {
  const prepared = await prepare(contractSource);
  const query = prepared.query;
  const record = inflated(query.fields);
  const seen = await run(prepared, query.route, () => ({ items: [record], hasMore: false, beyondContract: 'envelope' }), {
    page: 3,
    pageSize: 4,
  });
  assertProjected(seen.output, query);

  let thrown: unknown;
  try {
    const whole = await run(
      prepared,
      query.route,
      () => ({ items: [record], hasMore: false, beyondContract: 'envelope' }),
      { page: 3, pageSize: 4 },
      returnWholeRecord(prepared.source),
    );
    assertProjected(whole.output, query);
  } catch (error) {
    thrown = error;
  }
  assert.equal(thrown instanceof assert.AssertionError, true, 'returning the whole record must fail the projection check');
  assert.match(String(thrown), /beyondContract/);
}

async function prepare(contractSource: string): Promise<Prepared> {
  const contract = parseD2ContractV2(contractSource);
  const query = planRoute(contract.routes, contract.projections, 'qry');
  const command = planRoute(contract.routes, contract.projections, 'cmd');
  if (query.entity !== command.entity) throw new Error('the fixture command and query do not share an entity.');
  const port = `${query.entity}Repository`;
  const files = new Map<string, string>([
    [usecasePath(contract.module, query.usecaseId), usecaseSource(contract.module, query, port)],
    [usecasePath(contract.module, command.usecaseId), usecaseSource(contract.module, command, port)],
  ]);
  const definition: M1Definition = {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'requestService',
    artifactId: contract.pageId,
    moduleName: contract.module,
    status: 'pending',
    dependencies: [query, command].map(item => usecasePath(contract.module, item.usecaseId)).sort(),
    data: {
      pageId: contract.pageId,
      requests: [query, command].map(item => ({
        route: item.route,
        kind: item.operation === 'list' ? 'qry' : 'cmd',
        uses: [item.usecaseId],
        transaction: item.operation === 'list' ? 'none' : 'single',
        outputs: [{
          key: item.outputKey,
          entity: item.entity,
          fields: item.fields,
          ...(item.page ? { page: item.page, pageSize: item.pageSize, hasMore: item.hasMore } : {}),
        }],
        params: item.page ? [
          { name: 'page', target: item.outputKey, pages: 'list' },
          { name: 'pageSize', target: item.outputKey, pages: 'list' },
        ] : [],
      })),
    },
  };
  const registration = {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'repositoryRegistration',
    artifactId: 'registerRepositories',
    moduleName: contract.module,
    status: 'generated',
    dependencies: [`_102099_/l1/${contract.module}/layer_1_external/adapters/persistence/${port}.defs.ts`],
    data: { registrationId: 'registerRepositories', adapters: [{ portId: port, adapterArtifactId: port }] },
  };
  const emitted = await emitRequestService(
    definition,
    `l1/${contract.module}/layer_2_application/requests/${contract.pageId}.ts`,
    async ref => files.get(ref) ?? null,
    [registration],
    'implement',
  );
  assert.equal('code' in emitted, false, 'code' in emitted ? emitted.detail : '');
  if ('code' in emitted) throw new Error(emitted.detail);
  const binding = new RegExp(`([A-Za-z_][A-Za-z0-9_]*): resolveRepository\\(bound, ${JSON.stringify(port)}\\)`).exec(emitted.source)?.[1];
  if (!binding) throw new Error(emitted.source);
  return { source: emitted.source, port, binding, command, query };
}

function planRoute(
  routes: readonly D2ContractV2Route[],
  projections: readonly { name: string; body: string }[],
  kind: 'qry' | 'cmd',
): RoutePlan {
  const route = routes.find(item => item.kind === kind && Object.keys(item.meta.output).length === 1);
  if (!route) throw new Error(`no ${kind} route.`);
  const [outputKey, meta] = Object.entries(route.meta.output)[0];
  const lists = Object.values(route.meta.lists).filter(item => item.key === outputKey);
  if (kind === 'qry' && lists.length !== 1) throw new Error(`${route.route} has ${lists.length} lists.`);
  if (kind === 'cmd' && lists.length !== 0) throw new Error(`${route.route} is a command with a list.`);
  const typeName = new RegExp(`\\b${outputKey}\\s*:\\s*([A-Z][A-Za-z0-9]*)`).exec(route.output)?.[1];
  const projection = projections.find(item => item.name === typeName);
  if (!typeName || !projection) throw new Error(`${route.route} output ${outputKey} has no interface.`);
  const fields = interfaceLeaves(typeName, projection.body);
  const readonlyNames = [...projection.body.matchAll(/\breadonly\s+([A-Za-z_][A-Za-z0-9_]*)/g)].map(item => item[1]);
  for (const name of readonlyNames) {
    if (!fields.some(field => field === name || field.endsWith(`.${name}`))) throw new Error(`${typeName}.${name} missing.`);
  }
  const list = lists[0];
  const operation = meta.many ? 'list' : 'create';
  return {
    route: route.route,
    operation,
    entity: meta.entity,
    usecaseId: `${operation}${meta.entity}`,
    outputKey,
    fields,
    page: list?.page ?? '',
    pageSize: list?.pageSize ?? '',
    hasMore: list?.hasMore ?? '',
  };
}

function interfaceLeaves(name: string, body: string): string[] {
  const source = `export interface ${name} {\n${body.replaceAll(/\breadonly /g, '')}\n}\n`;
  const members = contractMembers(source, name);
  if (!members) throw new Error(`unreadable interface ${name}.`);
  const paths = members.allowedPaths;
  const leaves = paths.filter(path => !paths.some(other => other.startsWith(`${path}.`)));
  if (leaves.length === 0) throw new Error(`${name} has no fields.`);
  return leaves;
}

function usecasePath(moduleName: string, usecaseId: string): string {
  return `_102099_/l1/${moduleName}/layer_2_application/usecases/${usecaseId}.defs.ts`;
}

function usecaseSource(moduleName: string, plan: RoutePlan, port: string): string {
  return `export const definition = ${JSON.stringify({
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'usecase',
    artifactId: plan.usecaseId,
    moduleName,
    status: 'pending',
    dependencies: [],
    data: {
      entityId: plan.entity,
      operation: plan.operation,
      ports: [port],
      functions: [{ functionName: plan.usecaseId }],
    },
  })} as const;\n`;
}

async function run(
  prepared: Prepared,
  route: string,
  body: (ports: Record<string, { touch: () => Promise<void> }>) => unknown,
  input: Record<string, unknown>,
  source = prepared.source,
): Promise<{ outside: number; entered: number; output: Record<string, unknown> }> {
  const spy = makeSpy();
  let entered = 0;
  const fn = async (
    _input: unknown,
    _ctx: unknown,
    ports: Record<string, { touch: () => Promise<void> }>,
  ): Promise<unknown> => {
    entered += 1;
    await ports[prepared.binding].touch();
    return body(ports);
  };
  clearRepositories();
  try {
    registerRepository(prepared.port, ctx => {
      const runtime = ctx.data.moduleData as unknown as SpyRuntime;
      void runtime.getTable(prepared.port);
      return { async touch() { await runtime.getTable(prepared.port); } };
    });
    const requests = loadRequests(source, {
      [prepared.command.usecaseId]: fn,
      [prepared.query.usecaseId]: fn,
    });
    const output = await requests[route](input, { data: { moduleData: spy.request } } as unknown as RequestContext);
    return { outside: spy.outside(), entered, output };
  } finally {
    clearRepositories();
  }
}

function makeSpy(): Spy {
  let outside = 0;
  const tx: SpyRuntime = { async getTable(_name: string) { return {}; } };
  const request = {
    async getTable(_name: string) {
      outside += 1;
      return {};
    },
    async runInTransaction(fn: (tx: SpyRuntime) => Promise<unknown>) {
      return fn(tx);
    },
  };
  return { request, outside: () => outside };
}

function loadRequests(source: string, usecases: Record<string, unknown>): Record<string, (input: Record<string, unknown>, ctx: RequestContext) => Promise<Record<string, unknown>>> {
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const body = js.replace(/^import[\s\S]*?;$/gm, '').replace(/^export\s+/gm, '');
  const prelude = `const { ${Object.keys(usecases).join(', ')} } = usecases;`;
  try {
    return new Function('resolveRepository', 'usecases', `${prelude}\n${body}\nreturn requests;`)(resolveRepository, usecases);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}\n${body}`);
  }
}

/** Moves each `resolveRepository` of one command to before `runInTransaction`, on the request ctx. */
function resolveOutside(source: string, route: string): string {
  const start = source.indexOf(`${JSON.stringify(route)}:`);
  const end = source.indexOf('\n  },\n', start);
  if (start < 0 || end < 0) throw new Error(`missing ${route}`);
  const block = source.slice(start, end);
  const marker = 'return ctx.data.moduleData.runInTransaction(async (tx) => {';
  const at = block.indexOf(marker);
  const calls = [...block.matchAll(/resolveRepository\(bound, ("[^"]+")\)/g)];
  if (at < 0 || calls.length === 0) throw new Error(block);
  const lines = calls.map((call, index) => `  const resolved${index} = resolveRepository(ctx, ${call[1]});`);
  let body = block.slice(at);
  for (let index = 0; index < calls.length; index += 1) body = body.replace(calls[index][0], `resolved${index}`);
  if (body.includes('resolveRepository(bound,')) throw new Error(body);
  return `${source.slice(0, start)}${block.slice(0, at)}${lines.join('\n')}\n  ${body}${source.slice(end)}`;
}

/** Drops the projection call so the usecase record is returned whole. */
function returnWholeRecord(source: string): string {
  const next = source.replace(/projectOutput\(([\s\S]*?), \[[\s\S]*?\]\)/g, '($1)');
  if (next === source) throw new Error('projection call missing');
  return next;
}

function inflated(fields: readonly string[]): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const field of fields) writePath(record, field, field);
  writePath(record, 'beyondContract', 'no');
  const nested = fields.find(field => field.includes('.'));
  if (nested) {
    const parts = nested.split('.');
    parts[parts.length - 1] = `${parts[parts.length - 1]}Beyond`;
    writePath(record, parts.join('.'), 'no');
  }
  return record;
}

function assertProjected(output: Record<string, unknown>, query: RoutePlan): void {
  assert.deepEqual(
    Object.keys(output).sort(),
    [query.outputKey, query.page, query.pageSize, query.hasMore].sort(),
  );
  const items = output[query.outputKey];
  assert.ok(Array.isArray(items) && items.length === 1);
  assert.deepEqual(leavesOf(items[0]).sort(), [...query.fields].sort());
  assert.equal(output[query.page], 3);
  assert.equal(output[query.pageSize], 4);
  assert.equal(output[query.hasMore], false);
}

function leavesOf(value: unknown): string[] {
  const found: string[] = [];
  const walk = (node: unknown, prefix: string): void => {
    if (node && typeof node === 'object') {
      for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
        walk(child, prefix ? `${prefix}.${key}` : key);
      }
      return;
    }
    if (prefix) found.push(prefix);
  };
  walk(value, '');
  return [...new Set(found)];
}

function writePath(record: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let cursor = record;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const next = cursor[parts[index]];
    if (!next || typeof next !== 'object') cursor[parts[index]] = {};
    cursor = cursor[parts[index]] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = value;
}

function renamed(source: string): string {
  return source.replaceAll('controleEstoque', 'ledgerDesk').replaceAll('Produto', 'Widget').replaceAll('produtos', 'cards');
}
