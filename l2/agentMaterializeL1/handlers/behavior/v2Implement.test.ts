/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/behavior/v2Implement.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { clearRepositories, registerRepository, resolveRepository } from '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';
import { parseDefinitionSource, readDefinition, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { emitUsecase } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import { emitBehavior } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../../../..');
const FIXTURE = join(HERE, '../../fixtures/v2ControleEstoque');

const RENAMES: readonly (readonly [string, string])[] = [
  ['MovimentacaoEstoque', 'LedgerLine'],
  ['movimentacaoEstoque', 'ledgerLine'],
  ['controleEstoque', 'ledgerDesk'],
  ['produtoId', 'itemId'],
  ['movimentadoEm', 'postedAt'],
  ['Produto', 'Widget'],
  ['produto', 'widget'],
  ['quantidade', 'units'],
  ['tipo', 'kind'],
];

void test('v2 implement emits the stock service and usecases without a contract', async () => {
  const original = loadFixture();
  assert.equal([...original.values()].some(text => text.includes('contractRefs')), false);
  for (const texts of [original, renamed(original)]) await assertBundle(texts);
});

async function assertBundle(texts: Map<string, string>): Promise<void> {
  const read = reader(texts);
  const defs = new Map<string, M1Definition>();
  for (const [path, text] of texts) {
    if (!path.endsWith('.defs.ts')) continue;
    const parsed = parseDefinitionSource(text);
    if (!('definition' in parsed)) continue;
    const definition = readDefinition(parsed.definition);
    if (!('issues' in definition)) defs.set(path, definition);
  }
  const usecases = [...defs.entries()].filter(([, definition]) => definition.artifactType === 'usecase'
    && Array.isArray(definition.data.ports) && definition.data.ports.length === 1
    && (definition.data.operation === 'create' || definition.data.operation === 'list'));
  assert.equal(usecases.length, 2);
  const service = [...defs.entries()].find(([, definition]) => definition.artifactType === 'requestService'
    && definition.dependencies.includes(usecases[0][0]));
  assert.ok(service);
  const registration = [...defs.values()].find(definition => definition.artifactType === 'repositoryRegistration');
  assert.ok(registration);
  const produced = new Map<string, string>();
  const take = async (id: string, definition: M1Definition, defPath: string, modules: readonly unknown[] = []) => {
    const result = await emitBehavior(id, definition, defPath.replace(/\.defs\.ts$/, '.ts'), read, modules);
    assert.equal('code' in result, false, 'code' in result ? `${result.code} ${result.detail}` : defPath);
    if ('code' in result) return;
    produced.set(defPath.replace(/\.defs\.ts$/, '.ts'), result.source);
  };
  const entityPath = usecases[0][1].dependencies.find(path => path.includes('/entities/')) ?? '';
  const portPath = usecases[0][1].dependencies.find(path => path.includes('/ports/')) ?? '';
  const entity = defs.get(entityPath);
  const port = defs.get(portPath);
  assert.ok(entity && port);
  await take('implement.domainEntity', entity, entityPath);
  await take('implement.repositoryPort', port, portPath);
  for (const [path, definition] of usecases) await take('implement.usecase', definition, path);
  const used = new Set(usecases.map(([, definition]) => definition.artifactId));
  const uses = Array.isArray(service[1].data.requests)
    ? service[1].data.requests.flatMap(row => row && typeof row === 'object' && Array.isArray((row as { uses?: unknown }).uses) ? (row as { uses: unknown[] }).uses : [])
    : [];
  for (const id of uses) {
    if (typeof id !== 'string' || used.has(id)) continue;
    const found = [...defs.entries()].find(([, definition]) => definition.artifactId === id);
    assert.ok(found, id);
    const otherEntity = found[1].dependencies.find(path => path.includes('/entities/'));
    if (otherEntity && defs.has(otherEntity) && !produced.has(otherEntity.replace(/\.defs\.ts$/, '.ts'))) {
      await take('implement.domainEntity', defs.get(otherEntity) as M1Definition, otherEntity);
    }
    const stub = await emitUsecase(found[1], found[0].replace(/\.defs\.ts$/, '.ts'), read);
    assert.equal('code' in stub, false, 'code' in stub ? stub.detail : id);
    if (!('code' in stub)) produced.set(found[0].replace(/\.defs\.ts$/, '.ts'), stub.source);
  }
  await take('implement.requestService', service[1], service[0], [registration]);
  const serviceSource = produced.get(service[0].replace(/\.defs\.ts$/, '.ts')) ?? '';
  assert.match(serviceSource, /runInTransaction/);
  assert.equal(serviceSource.includes('contractRefs'), false);
  const createSource = produced.get(usecases.find(([, definition]) => definition.data.operation === 'create')?.[0].replace(/\.defs\.ts$/, '.ts') ?? '') ?? '';
  assert.match(createSource, /as [A-Za-z0-9_]+;/);
  assert.doesNotMatch(createSource, /route\.split|contractRefs|CONTRACT_UNREAD/);
  const errors = compile(produced);
  assert.equal(errors, '', errors);
  await assertTransaction(serviceSource);
}

function reader(texts: Map<string, string>): (ref: string) => Promise<string | null> {
  return async ref => {
    const own = texts.get(ref);
    if (own !== undefined) return own;
    const match = /^_(\d+)_\/(.+)$/.exec(ref);
    if (!match) return null;
    try {
      return readFileSync(join(ROOT, `mls-${match[1]}`, match[2]), 'utf8');
    } catch {
      return null;
    }
  };
}

function loadFixture(): Map<string, string> {
  const texts = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.txt')) {
        const text = readFileSync(full, 'utf8');
        const ref = /fileReference="([^"]+)"/.exec(text)?.[1];
        if (ref) texts.set(ref, text);
      }
    }
  };
  walk(FIXTURE);
  return texts;
}

function renamed(texts: Map<string, string>): Map<string, string> {
  const out = new Map<string, string>();
  for (const [path, text] of withDiskDeps(texts)) {
    if (/^_10203[45]_\//.test(path)) {
      out.set(path, text);
      continue;
    }
    out.set(renameText(path), renameText(text));
  }
  return out;
}

/** Dependencies the fixture names but does not carry (ontology, rules) so a rename still resolves. */
function withDiskDeps(texts: Map<string, string>): Map<string, string> {
  const out = new Map(texts);
  const refs = new Set<string>();
  for (const text of texts.values()) {
    for (const match of text.matchAll(/"(_\d+_\/[^"]+\.defs\.ts)"/g)) refs.add(match[1]);
  }
  for (const ref of refs) {
    if (out.has(ref)) continue;
    const match = /^_(\d+)_\/(.+)$/.exec(ref);
    if (!match) continue;
    try {
      out.set(ref, readFileSync(join(ROOT, `mls-${match[1]}`, match[2]), 'utf8'));
    } catch {
      // A missing dependency stays missing; the emitter names it.
    }
  }
  return out;
}

function renameText(value: string): string {
  let next = value;
  for (const [from, to] of RENAMES) next = next.replaceAll(from, to);
  return next;
}

function compile(files: ReadonlyMap<string, string>): string {
  const sandbox = mkdtempSync(join(tmpdir(), 'm1-42-'));
  try {
    writeFileSync(join(sandbox, 'tsconfig.base.json'), readFileSync(join(ROOT, 'tsconfig.base.json')));
    symlinkSync(join(ROOT, 'node_modules'), join(sandbox, 'node_modules'));
    for (const entry of readdirSync(ROOT)) {
      if (/^mls-\d+$/.test(entry)) symlinkSync(join(ROOT, entry), join(sandbox, entry));
    }
    const include: string[] = [];
    for (const [qualified, source] of files) {
      const relocated = qualified.replace(/^_102047_\//, '_102099_/');
      const relativePath = relocated.replace(/^_102099_\//, 'mls-102099/');
      const full = join(sandbox, relativePath);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, source.replaceAll('/_102047_/', '/_102099_/'));
      include.push(relativePath);
    }
    const base = ts.readConfigFile(join(ROOT, 'tsconfig.base.json'), ts.sys.readFile);
    const paths = (base.config?.compilerOptions?.paths ?? {}) as Record<string, string[]>;
    const configPath = join(sandbox, '.tsconfig.m1-42.json');
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

interface SpyRuntime { getTable: (name: string) => Promise<unknown> }

async function assertTransaction(source: string): Promise<void> {
  const at = source.indexOf('runInTransaction');
  assert.ok(at > 0);
  const route = [...source.slice(0, at).matchAll(/"([^"]+)": async function/g)].pop()?.[1];
  const port = /resolveRepository\(bound, "([^"]+)"\)/.exec(source.slice(at))?.[1];
  const binding = /([A-Za-z_][A-Za-z0-9_]*): resolveRepository\(bound,/.exec(source.slice(at))?.[1];
  const names = usecaseNames(source);
  assert.ok(route && port && binding && names.length > 0, source);
  const seen = await run(source, route, port, binding, names);
  assert.equal(seen.entered, 1, route);
  assert.equal(seen.outside, 0, route);
  const hoisted = resolveOutside(source, route);
  const leaked = await run(hoisted, route, port, binding, names);
  assert.equal(leaked.entered, 1, route);
  assert.ok(leaked.outside > 0, `${route} resolved outside the callback and getTable stayed at 0`);
}

function usecaseNames(source: string): string[] {
  const names: string[] = [];
  for (const match of source.matchAll(/import \{([^}]+)\} from '[^']+';/g)) {
    for (const part of match[1].split(',')) {
      const name = part.trim();
      if (!name || name.startsWith('type ') || name === 'AppError' || name === 'resolveRepository') continue;
      names.push(name);
    }
  }
  return names;
}

async function run(source: string, route: string, port: string, binding: string, names: readonly string[]): Promise<{ outside: number; entered: number }> {
  let outside = 0;
  let entered = 0;
  const tx: SpyRuntime = { async getTable(_name: string) { return {}; } };
  const request = {
    async getTable(_name: string) {
      outside += 1;
      return {};
    },
    async runInTransaction(fn: (runtime: SpyRuntime) => Promise<unknown>) {
      return fn(tx);
    },
  };
  const usecases = Object.fromEntries(names.map(name => [name, async (_input: unknown, _ctx: unknown, ports?: Record<string, { touch: () => Promise<void> }>) => {
    entered += 1;
    if (ports?.[binding]) await ports[binding].touch();
    return { id: 'row', items: [], hasMore: false };
  }]));
  clearRepositories();
  try {
    registerRepository(port, ctx => {
      const runtime = ctx.data.moduleData as unknown as SpyRuntime;
      void runtime.getTable(port);
      return { async touch() { await runtime.getTable(port); } };
    });
    const requests = loadRequests(source, usecases);
    await requests[route]({}, { data: { moduleData: request } } as unknown as RequestContext);
    return { outside, entered };
  } finally {
    clearRepositories();
  }
}

function loadRequests(source: string, usecases: Record<string, unknown>): Record<string, (input: Record<string, unknown>, ctx: RequestContext) => Promise<Record<string, unknown>>> {
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const body = js.replace(/^import[\s\S]*?;$/gm, '').replace(/^export\s+/gm, '');
  const prelude = `const { ${Object.keys(usecases).join(', ')} } = usecases;`;
  return new Function('resolveRepository', 'usecases', `${prelude}\n${body}\nreturn requests;`)(resolveRepository, usecases);
}

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
  return `${source.slice(0, start)}${block.slice(0, at)}${lines.join('\n')}\n  ${body}${source.slice(end)}`;
}
