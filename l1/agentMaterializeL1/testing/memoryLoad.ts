/// <mls fileReference="_102021_/l1/agentMaterializeL1/testing/memoryLoad.ts" enhancement="_blank"/>

/**
 * Test support (node): emits the neutral module (l2 testing/oracleModule.ts) through the M1
 * handlers into a scratch copy and imports the emitted routes and memory stores.
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { outputPathFromDefPath } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { emitBehavior } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';
import { emitController, emittedValueExports, type EmitFailure, type EmitResult } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import type { Fixture } from '/_102021_/l2/agentMaterializeL1/testing/oracleModule.js';

function ok(result: EmitResult | EmitFailure): EmitResult {
  assert.equal('code' in result, false, 'code' in result ? `${result.code} ${result.detail}` : '');
  return result as EmitResult;
}

export type Handler = (input: unknown) => Promise<{ data: unknown }>;
/** One emitted memory store: the port object, the exact-key delete and the test-only reset. */
export interface LoadedStore {
  create(record: Record<string, unknown>): Promise<unknown>;
  remove(id: string): Promise<boolean>;
  list(): Promise<unknown[]>;
  /** Test only: preloads rows of another execution. The harness never calls it. */
  reset(rows: Record<string, unknown>[]): void;
}
export interface Loaded {
  routes: Map<string, Handler>;
  /** Main entity store reset, kept for the m1_27 tests. */
  reset: (rows: Record<string, unknown>[]) => void;
  stores: Record<string, LoadedStore>;
  sources: Map<string, string>;
  dispose: () => void;
}

/** Emits the fixture through the M1 handlers into a scratch copy; `edit` changes that copy. */
export async function load(fx: Fixture, edit: (ref: string, source: string) => string = (_ref, source) => source): Promise<Loaded> {
  const read = async (ref: string) => fx.texts[ref] ?? null;
  const sources = new Map<string, string>();
  for (const [id, ref, definition] of fx.defs) sources.set(ref, ok(await emitBehavior(id, definition, outputPathFromDefPath(ref), read)).source);
  for (const [ref, definition] of fx.controllers) sources.set(ref, ok(await emitController(definition, outputPathFromDefPath(ref), read)).source);
  const dir = mkdtempSync(join(tmpdir(), 'm1-27-'));
  const fileOf = (qualified: string) => join(dir, qualified.replace(`${fx.n.project}/`, ''));
  const P = fx.n.project;
  for (const [ref, source] of sources) {
    const target = fileOf(outputPathFromDefPath(ref));
    mkdirSync(dirname(target), { recursive: true });
    const edited = edit(ref, source);
    sources.set(ref, edited);
    writeFileSync(target, edited.replace(new RegExp(`from '/${P}/([^']+)\\.js'`, 'g'), (_all, rest: string) => `from '${pathToFileURL(fileOf(`${P}/${rest}.ts`)).href}'`));
  }
  const routes = new Map<string, Handler>();
  for (const [ref] of fx.controllers) {
    const module = await import(pathToFileURL(fileOf(outputPathFromDefPath(ref))).href) as { routes: Array<{ key: string; handler: Handler }> };
    for (const item of module.routes) routes.set(item.key, item.handler);
  }
  const stores: Record<string, LoadedStore> = {};
  for (const [, ref, definition] of fx.defs) {
    if (definition.artifactType !== 'repositoryPort') continue;
    const module = await import(pathToFileURL(fileOf(outputPathFromDefPath(ref))).href) as Record<string, unknown> & {
      resetMemory: (seed: Record<string, unknown>[]) => void;
      removeMemory: (id: string) => Promise<boolean>;
    };
    const port = module[emittedValueExports(definition)[0] ?? ''] as {
      create: (record: Record<string, unknown>) => Promise<unknown>;
      list: (filter: Record<string, unknown>) => Promise<unknown[]>;
    };
    stores[String(definition.data.entityId)] = {
      create: record => port.create(record),
      remove: id => module.removeMemory(id),
      list: () => port.list({}),
      reset: rows => module.resetMemory(rows),
    };
  }
  const main = stores[fx.n.Entity];
  assert.ok(main, 'main store was not emitted');
  return { routes, reset: rows => main.reset(rows), stores, sources, dispose: () => rmSync(dir, { recursive: true, force: true }) };
}
