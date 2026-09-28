/// <mls fileReference="_102021_/l1/agentMaterializeL1/testing/memoryLoad.ts" enhancement="_blank"/>

/**
 * Node loader of emitted code for the memory harness (testing/fixture.ts).
 * - `loadEmitted`: writes the given emitted bytes to a scratch copy of its own, rewrites the
 *   same-project imports to that copy and imports the routes and memory stores. Each call is a
 *   fresh module instance, so its stores are isolated from any other execution; no reset is used.
 * - `runEmittedFixture`: the implement run (run/fixtureRun.ts) reaches it through the node host
 *   (`host.workspace`), the same capability as caseRun. Setup -> cases -> cleanup, then the copy is
 *   removed in `finally`.
 * - `load`: test support; emits the neutral module (l2 testing/oracleModule.ts) through the M1
 *   handlers and loads it with `loadEmitted`.
 */

import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { outputPathFromDefPath, type M1Definition } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { emitBehavior } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';
import { emitController, emittedValueExports, type EmitFailure, type EmitResult } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import { runFixture, type M1FixtureModel, type M1FixtureReceipt } from '/_102021_/l2/agentMaterializeL1/testing/fixture.js';
import type { M1Obligation } from '/_102021_/l2/agentMaterializeL1/testing/obligations.js';
import type { Fixture } from '/_102021_/l2/agentMaterializeL1/testing/oracleModule.js';
import { createRequestContext } from '/_102034_/l1/server/layer_2_controllers/execBff.js';

/** Prefix of every scratch copy; a test counts them to prove the copy is removed. */
export const SCRATCH_PREFIX = 'm1-fixture-';

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

/** Emitted bytes of one module: output ref -> source, plus which outputs are controllers and memory ports. */
export interface EmittedModule {
  /** `_NNNNN_` of the module's project. */
  project: string;
  files: Readonly<Record<string, string>>;
  controllers: readonly string[];
  ports: ReadonlyArray<{ ref: string; entityId: string; exportName: string }>;
}

/** Scratch copy + import. Throws when a file is missing or does not import. */
export async function loadEmitted(module: EmittedModule): Promise<Omit<Loaded, 'reset' | 'sources'>> {
  const dir = mkdtempSync(join(tmpdir(), SCRATCH_PREFIX));
  const dispose = () => rmSync(dir, { recursive: true, force: true });
  try {
    const P = module.project;
    const fileOf = (qualified: string) => join(dir, qualified.replace(`${P}/`, ''));
    for (const [ref, source] of Object.entries(module.files)) {
      const target = fileOf(ref);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, source.replace(new RegExp(`from '/${P}/([^']+)\\.js'`, 'g'), (_all, rest: string) => `from '${pathToFileURL(fileOf(`${P}/${rest}.ts`)).href}'`));
    }
    const routes = new Map<string, Handler>();
    for (const ref of module.controllers) {
      if (module.files[ref] === undefined) throw new Error(`controller ${ref} was not emitted`);
      const loaded = await import(pathToFileURL(fileOf(ref)).href) as { routes?: Array<{ key: string; handler: Handler }> };
      for (const item of loaded.routes ?? []) routes.set(item.key, item.handler);
    }
    const stores: Record<string, LoadedStore> = {};
    for (const port of module.ports) {
      if (module.files[port.ref] === undefined) throw new Error(`port ${port.ref} was not emitted`);
      const loaded = await import(pathToFileURL(fileOf(port.ref)).href) as Record<string, unknown>;
      const object = loaded[port.exportName] as { create?: unknown; list?: unknown } | undefined;
      const remove = loaded.removeMemory;
      const reset = loaded.resetMemory;
      if (!object || typeof object.create !== 'function' || typeof object.list !== 'function' || typeof remove !== 'function' || typeof reset !== 'function') {
        throw new Error(`port ${port.ref} has no memory store (${port.exportName}, removeMemory, resetMemory)`);
      }
      const store = object as { create: (record: Record<string, unknown>) => Promise<unknown>; list: (filter: Record<string, unknown>) => Promise<unknown[]> };
      stores[port.entityId] = {
        create: record => store.create(record),
        remove: id => (remove as (id: string) => Promise<boolean>)(id),
        list: () => store.list({}),
        reset: rows => (reset as (seed: Record<string, unknown>[]) => void)(rows),
      };
    }
    return { routes, stores, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}

export interface EmittedFixtureRun {
  receipt: M1FixtureReceipt | null;
  /** Load or import failure; the cases did not run. */
  error: string;
}

/** Loads the emitted bytes once and runs the obligations; the copy is removed in `finally`. */
export async function runEmittedFixture(input: {
  module: EmittedModule;
  model: M1FixtureModel;
  obligations: readonly M1Obligation[];
  runId: string;
  mode: unknown;
}): Promise<EmittedFixtureRun> {
  let loaded: Omit<Loaded, 'reset' | 'sources'>;
  try {
    loaded = await loadEmitted(input.module);
  } catch (error) {
    return { receipt: null, error: `FIXTURE_LOAD_FAILED: ${error instanceof Error ? error.message : String(error)}` };
  }
  try {
    const receipt = await runFixture(input.model, input.obligations, {
      runId: input.runId,
      mode: input.mode,
      target: 'memory',
      stores: loaded.stores,
      routes: loaded.routes,
      context: () => createRequestContext(),
    });
    return { receipt, error: '' };
  } catch (error) {
    return { receipt: null, error: `FIXTURE_RUN_FAILED: ${error instanceof Error ? error.message : String(error)}` };
  } finally {
    loaded.dispose();
  }
}

/** Emits the fixture through the M1 handlers into a scratch copy; `edit` changes that copy. */
export async function load(fx: Fixture, edit: (ref: string, source: string) => string = (_ref, source) => source): Promise<Loaded> {
  const read = async (ref: string) => fx.texts[ref] ?? null;
  const sources = new Map<string, string>();
  for (const [id, ref, definition] of fx.defs) sources.set(ref, ok(await emitBehavior(id, definition, outputPathFromDefPath(ref), read)).source);
  for (const [ref, definition] of fx.controllers) sources.set(ref, ok(await emitController(definition, outputPathFromDefPath(ref), read)).source);
  const files: Record<string, string> = {};
  for (const [ref, source] of sources) {
    const edited = edit(ref, source);
    sources.set(ref, edited);
    files[outputPathFromDefPath(ref)] = edited;
  }
  const ports = fx.defs
    .filter(([, , definition]) => definition.artifactType === 'repositoryPort')
    .map(([, ref, definition]: [string, string, M1Definition]) => ({ ref: outputPathFromDefPath(ref), entityId: String(definition.data.entityId), exportName: emittedValueExports(definition)[0] ?? '' }));
  const loaded = await loadEmitted({ project: fx.n.project, files, controllers: fx.controllers.map(([ref]) => outputPathFromDefPath(ref)), ports });
  const main = loaded.stores[fx.n.Entity];
  assert.ok(main, 'main store was not emitted');
  return { ...loaded, reset: rows => main.reset(rows), sources };
}
