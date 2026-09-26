/// <mls fileReference="_102021_/l2/agentMaterializeL1/run/execute.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { M1_DEFINITION_SCHEMA, M1_RECEIPT_SCHEMA, outputPathFromDefPath, parseDefinitionSource, receiptPathFor, renderDefinition, semanticHash, type M1Definition } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { contentHash } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import type { MaterializeOwnedRemoval, MaterializeStateStore } from '/_102021_/l2/agentMaterializeL1/core/state.js';
import type { MaterializationReceipt } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { handlerFor } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { M1_CATALOG_SCHEMA, M1_STUB_ERROR, M1_STUB_STATUS, parseCatalog, renderMonitorCatalog, testFileFor, type M1ScenarioCatalog } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import { catalogBytes, deriveCatalog, M1_CATALOG_RECIPE } from '/_102021_/l2/agentMaterializeL1/testing/derive.js';
import type { M1Observation } from '/_102021_/l2/agentMaterializeL1/testing/verify.js';
import {
  M1_CEILING,
  MaterializeCallError,
  decideProfile,
  emptyLedger,
  encodeLedger,
  ledgerPath,
  noteModelCall,
  parseLedger,
  tightenBudget,
} from '/_102021_/l2/agentMaterializeL1/run/budget.js';
import { helpText, parseCliArgs, parseStudioPrompt, unitsForFlow } from '/_102021_/l2/agentMaterializeL1/run/command.js';
import {
  runMaterialize,
  type HandlerOutcome,
  type MaterializeHandlerRunner,
  type MaterializeRunHost,
  type MaterializeRunRequest,
} from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import { invokeModel, shouldCallModel } from '/_102021_/l2/agentMaterializeL1/run/model.js';
import { M1_OWNED_SCHEMA, ownedManifestRef, recipeForStage, renderOwnedManifest } from '/_102021_/l2/agentMaterializeL1/state/maintain.js';

const MODULE = 'agendaClinica';
const PROJECT = 102047;
const HERE = dirname(fileURLToPath(import.meta.url));

void test('cli and studio parse the same command and simulate does not call a model or write', async () => {
  const cli = parseCliArgs(['--project', '102047', '--module', 'agendaClinica', '--stage', 'simulate', '--flow', 'Note']);
  const studio = parseStudioPrompt('@@agentMaterializeL1 agendaClinica /simulate flow:Note', 102047);
  assert.equal(cli.refusal, '');
  assert.equal(studio.refusal, '');
  assert.equal(cli.project, studio.project);
  assert.equal(cli.moduleName, studio.moduleName);
  assert.equal(cli.stage, studio.stage);
  assert.equal(cli.flow, studio.flow);
  assert.equal(cli.resume, studio.resume);

  const note = entity('Note');
  const task = entity('Task');
  const left = world();
  const right = world();
  const llm = () => Promise.reject(new Error('model must not be called'));
  const request = baseRequest([note, task], { flow: 'Note', stage: 'simulate' });
  const [a, b] = await Promise.all([
    runMaterialize(request, host(left, {}, llm)),
    runMaterialize(request, host(right, {}, llm)),
  ]);
  assert.equal(a.ended, 'SIMULATED');
  assert.equal(a.llmCalls, 0);
  assert.equal(a.wrote, false);
  assert.equal(a.snapshot?.wrote, false);
  assert.deepEqual(a.snapshot, b.snapshot);
  assert.deepEqual(a.units.map(unit => unit.code), b.units.map(unit => unit.code));
  assert.equal(a.units.length, 1);
  assert.equal(left.writes.length, 0);
  assert.equal(right.writes.length, 0);
});

void test('a tighter budget wins and a higher request is cut at the ceiling', () => {
  const raised = tightenBudget({ maxWorkers: 8, callsPerRun: 100, timeoutMs: 999_999, repairsPerRun: 9 }, null);
  assert.equal(raised.maxWorkers, M1_CEILING.maxWorkers);
  assert.equal(raised.callsPerRun, M1_CEILING.callsPerRun);
  assert.equal(raised.timeoutMs, M1_CEILING.timeoutMs);
  assert.equal(raised.repairsPerRun, M1_CEILING.repairsPerRun);
  const tighter = tightenBudget({ maxWorkers: 1, callsPerRun: 3 }, { timeoutMs: 50, repairsPerArtifact: 1 });
  assert.equal(tighter.maxWorkers, 1);
  assert.equal(tighter.callsPerRun, 3);
  assert.equal(tighter.timeoutMs, 50);
  const ledger = emptyLedger(PROJECT, MODULE, tighter);
  for (let index = 0; index < 3; index += 1) assert.equal(noteModelCall(ledger, tighter), true);
  assert.equal(noteModelCall(ledger, tighter), false);
  assert.equal(ledger.callsExhausted, true);
});

void test('profile names the test database and never falls back, production does not run a stub', async () => {
  assert.equal(decideProfile(undefined, false).mode, 'presentation');
  assert.equal(decideProfile(undefined, false).databaseEnv, 'DATABASE_URL_TEST');
  assert.equal(decideProfile('development', true).databaseEnv, 'DATABASE_URL_TEST');
  assert.equal(decideProfile('production', true).databaseEnv, 'DATABASE_URL');
  assert.equal(decideProfile('production', true).allowsStubRun, false);
  assert.equal(decideProfile('development', true).allowsSeeds, true);
  const store = world();
  const note = entity('Note');
  const output = outputPathFromDefPath(note.defPath);
  const result = await runMaterialize(baseRequest([note], { profileMode: 'production', profileDeclared: true }), host(store, {
    'structure.domainEntity': async () => passOutcome(output, { runsStub: true }),
  }, undefined, catalog([note], 'pass')));
  assert.equal(result.units[0].code, 'PROFILE_REFUSED');
  assert.equal(result.units[0].promoted, false);
  assert.equal(store.map.has(output), false);
  assert.equal(result.profile.databaseEnv, 'DATABASE_URL');
});

void test('structure calls only its handler and implement does not fall back to a generic file', async () => {
  const store = world();
  const note = entity('Note');
  const output = outputPathFromDefPath(note.defPath);
  let structureCalls = 0;
  let implementCalls = 0;
  const runners: Record<string, MaterializeHandlerRunner> = {
    'structure.domainEntity': async () => {
      structureCalls += 1;
      return passOutcome(output);
    },
    'implement.domainEntity': async () => {
      implementCalls += 1;
      return passOutcome(output);
    },
  };
  const structure = await runMaterialize(baseRequest([note], { stage: 'structure' }), host(store, runners, undefined, catalog([note], 'pass')));
  assert.equal(structure.units[0].code, 'PROMOTED');
  assert.equal(structureCalls, 1);
  assert.equal(implementCalls, 0);
  assert.equal(store.map.get(output), 'export const note = 1;\n');

  const bare = world();
  const missing = await runMaterialize(baseRequest([note], { stage: 'structure' }), host(bare, {}));
  assert.equal(missing.units[0].code, 'HANDLER_UNBOUND');
  assert.match(missing.units[0].detail, /structure\.domainEntity/);
  assert.equal(bare.map.has(output), false);

  const implementStore = world();
  const implement = await runMaterialize(baseRequest([note], { stage: 'implement' }), host(implementStore, runners));
  assert.equal(implement.units[0].code, 'REPEATED_FAILURE');
  assert.equal(implementCalls, 2);
  assert.equal(implement.units[0].promoted, false);
  assert.equal(implementStore.map.has(output), false);
  assert.match(implement.units[0].detail, /catalog/);
});

void test('implement on the clinic fixture does not emit a test for a unit with no output', async () => {
  const fixture = join(HERE, '../register/fixtures/agendaClinica-8d8729d');
  const loaded = loadDefs(fixture, '_102047_/');
  const authority = loaded.units.find(unit => {
    const definition = unit.definition as { artifactType?: string };
    return definition.artifactType === 'authorityMap';
  });
  assert.ok(authority);
  const store = world(loaded.texts);
  const catalogRef = `_${PROJECT}_/l1/${MODULE}/materialization/agentMaterializeL1/scenarioCatalog.ts`;
  const result = await runMaterialize(baseRequest(loaded.units, {
    stage: 'implement',
    budget: { timeoutMs: 2000, repairsPerRun: 0, callsPerRun: 0 },
  }), {
    ...host(store, {}, () => Promise.reject(new Error('model must not be called'))),
    catalogRef,
  });
  assert.equal(result.catalog?.gaps.some(gap => gap.artifactId === 'authorityMap' && gap.reason.startsWith('NO_CONSUMER:')), true);
  assert.equal([...store.map.keys()].some(path => path.endsWith('/authorityMap.test.ts')), false);
  const written = store.map.get(catalogRef) ?? '';
  assert.equal(written.includes('authorityMap'), false);
});

void test('timeout, network, transient and invalid response end the unit without a generic file', async () => {
  const note = entity('Note');
  const other = entity('Task');
  const output = outputPathFromDefPath(note.defPath);

  const timed = world();
  const timeout = await runMaterialize(baseRequest([note], { budget: { timeoutMs: 30, repairsPerRun: 1 } }), host(timed, {
    'structure.domainEntity': (call) => new Promise((_resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('hung')), 1000);
      call.signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new MaterializeCallError('TIMEOUT', 'aborted'));
      });
    }),
  }));
  assert.equal(timeout.units[0].code, 'REPEATED_FAILURE');
  assert.equal(timed.map.has(output), false);

  const calls: string[] = [];
  const offline = world();
  const network = await runMaterialize(baseRequest([note, other]), host(offline, {
    'structure.domainEntity': async (call) => {
      calls.push(call.unit.artifactId);
      if (call.unit.artifactId === 'Note') throw new MaterializeCallError('NETWORK_UNAVAILABLE', 'offline');
      return passOutcome(outputPathFromDefPath(other.defPath));
    },
  }, undefined, catalog([other], 'pass')));
  assert.equal(network.units.find(unit => unit.defPath === note.defPath)?.code, 'NETWORK_UNAVAILABLE');
  assert.equal(calls.filter(id => id === 'Note').length, 1);
  assert.equal(calls.includes('Task'), true);
  assert.equal(offline.map.has(output), false);

  let transientCalls = 0;
  const healed = world();
  const transient = await runMaterialize(baseRequest([note]), host(healed, {
    'structure.domainEntity': async (call) => {
      transientCalls += 1;
      if (!call.repair) throw new MaterializeCallError('TRANSIENT', 'again');
      return passOutcome(output);
    },
  }, undefined, catalog([note], 'pass')));
  assert.equal(transient.units[0].code, 'PROMOTED');
  assert.equal(transientCalls, 2);

  const invalid = world();
  const rejected = await runMaterialize(baseRequest([note], { budget: { repairsPerRun: 1 } }), host(invalid, {
    'structure.domainEntity': async () => ({ ...emptyOutcome(), failure: { code: 'INVALID_RESPONSE', detail: 'not a file' } }),
  }));
  assert.equal(rejected.units[0].code, 'REPEATED_FAILURE');
  assert.equal(invalid.map.has(output), false);
});

void test('the same failure twice stops that unit and an independent unit still runs', async () => {
  const note = entity('Note');
  const task = entity('Task');
  const calls: string[] = [];
  const result = await runMaterialize(baseRequest([note, task], { budget: { repairsPerRun: 4 } }), host(world(), {
    'structure.domainEntity': async (call) => {
      calls.push(`${call.unit.artifactId}:${call.repair ? 'repair' : 'call'}`);
      if (call.unit.artifactId === 'Note') throw new MaterializeCallError('TRANSIENT', 'same');
      return passOutcome(outputPathFromDefPath(task.defPath));
    },
  }, undefined, catalog([task], 'pass')));
  const failed = result.units.find(unit => unit.defPath === note.defPath);
  assert.equal(failed?.code, 'REPEATED_FAILURE');
  assert.equal(calls.filter(item => item.startsWith('Note:')).length, 2);
  assert.equal(calls.some(item => item.startsWith('Task:')), true);
  assert.equal(result.ended, 'COMPLETED');
});

void test('a duplicate event does not count twice and resume keeps the ledger', async () => {
  const note = entity('Note');
  const task = entity('Task');
  const store = world();
  let calls = 0;
  const runners: Record<string, MaterializeHandlerRunner> = {
    'structure.domainEntity': async (call) => {
      calls += 1;
      if (call.unit.artifactId === 'Note') throw new MaterializeCallError('NETWORK_UNAVAILABLE', 'offline');
      return passOutcome(outputPathFromDefPath(task.defPath));
    },
  };
  const first = await runMaterialize(baseRequest([note], { eventId: 'event-1' }), host(store, runners));
  assert.equal(first.units[0].code, 'NETWORK_UNAVAILABLE');
  const again = await runMaterialize(baseRequest([note], { eventId: 'event-1' }), host(store, runners));
  assert.equal(again.ended, 'DUPLICATE_EVENT');
  assert.equal(calls, 1);
  assert.equal(again.wrote, false);

  const resumed = await runMaterialize(baseRequest([note, task], { resume: true, stage: null }), host(store, runners, undefined, catalog([task], 'pass')));
  assert.notEqual(resumed.ended, 'NOTHING_TO_RESUME');
  assert.equal(resumed.units.find(unit => unit.defPath === note.defPath)?.code, 'NETWORK_UNAVAILABLE');
  assert.equal(resumed.units.find(unit => unit.defPath === task.defPath)?.code, 'PROMOTED');
  assert.equal(calls, 2);
  assert.equal(resumed.ledger.calls, first.ledger.calls);

  const empty = await runMaterialize(baseRequest([note], { resume: true }), host(world(), runners));
  assert.equal(empty.ended, 'NOTHING_TO_RESUME');
  assert.equal(empty.wrote, false);
});

void test('interruption leaves the finished unit and resume continues the other', async () => {
  const note = entity('Note');
  const slot = value('Slot', note.defPath);
  const store = world();
  const noteSource = renderDefinition(note.definition, note.defPath);
  const slotSource = renderDefinition(slot.definition, slot.defPath);
  if (!('source' in noteSource) || !('source' in slotSource)) throw new Error('def seed failed');
  store.map.set(note.defPath, noteSource.source);
  store.map.set(slot.defPath, slotSource.source);
  const controller = new AbortController();
  const calls: string[] = [];
  const runners: Record<string, MaterializeHandlerRunner> = {
    'structure.domainEntity': async () => {
      calls.push('Note');
      controller.abort();
      return passOutcome(outputPathFromDefPath(note.defPath));
    },
    'structure.valueObject': async () => {
      calls.push('Slot');
      return passOutcome(outputPathFromDefPath(slot.defPath));
    },
  };
  const stopped = await runMaterialize(
    { ...baseRequest([note, slot], { stage: 'structure' }), signal: controller.signal },
    host(store, runners, undefined, catalog([note, slot], 'pass')),
  );
  assert.equal(stopped.ended, 'INTERRUPTED');
  assert.deepEqual(calls, ['Note']);
  const continued = await runMaterialize(baseRequest([note, slot], { resume: true, stage: null }), host(store, runners, undefined, catalog([note, slot], 'pass')));
  assert.equal(continued.units.find(unit => unit.defPath === note.defPath)?.code, 'REUSE');
  assert.equal(continued.units.find(unit => unit.defPath === slot.defPath)?.code, 'PROMOTED', continued.units.map(unit => `${unit.code} ${unit.detail}`).join('\n'));
  assert.deepEqual(calls, ['Note', 'Slot']);
});

void test('a write outside the output and a changed snapshot are not promoted', async () => {
  const note = entity('Note');
  const output = outputPathFromDefPath(note.defPath);
  const outside = world();
  const refused = await runMaterialize(baseRequest([note]), host(outside, {
    'structure.domainEntity': async () => passOutcome(output, { extra: { '/tmp/other.ts': 'no' } }),
  }, undefined, catalog([note], 'pass')));
  assert.equal(refused.units[0].code, 'WRITE_OUTSIDE_TARGET');
  assert.equal(outside.map.has(output), false);
  assert.equal(outside.map.has('/tmp/other.ts'), false);

  const drifted = world({ [note.defPath]: 'export const before = 1;\n', [output]: 'OLD' });
  const kept = await runMaterialize(baseRequest([note]), host(drifted, {
    'structure.domainEntity': async () => {
      drifted.map.set(note.defPath, 'export const after = 2;\n');
      return passOutcome(output);
    },
  }, undefined, catalog([note], 'pass')));
  assert.equal(kept.units[0].code, 'SNAPSHOT_CHANGED');
  assert.equal(drifted.map.get(output), 'OLD');
});

void test('a failed checkpoint is not promoted and does not start its dependent', async () => {
  const note = entity('Note');
  const slot = value('Slot', note.defPath);
  const output = outputPathFromDefPath(note.defPath);
  const calls: string[] = [];
  const store = world();
  const failed = await runMaterialize(baseRequest([note, slot], { budget: { repairsPerRun: 1 } }), host(store, {
    'structure.domainEntity': async () => {
      calls.push('Note');
      return { ...passOutcome(output), observations: [observation('Note.check', false)] };
    },
    'structure.valueObject': async () => {
      calls.push('Slot');
      return passOutcome(outputPathFromDefPath(slot.defPath));
    },
  }, undefined, catalog([note], 'pass')));
  assert.equal(failed.units.find(unit => unit.defPath === note.defPath)?.code, 'REPEATED_FAILURE');
  assert.equal(failed.units.find(unit => unit.defPath === slot.defPath)?.code, 'BLOCKED_BY');
  assert.deepEqual(calls, ['Note', 'Note']);
  assert.equal(store.map.has(output), false);
  assert.equal(failed.checkpoints.some(item => item.accepted), false);
});

void test('an expected red structural checkpoint can be stored and does not start implement', async () => {
  const note = entity('Note');
  const output = outputPathFromDefPath(note.defPath);
  let implementCalls = 0;
  const store = world();
  const result = await runMaterialize(baseRequest([note], { stage: 'structure' }), host(store, {
    'structure.domainEntity': async () => passOutcome(output, { red: true }),
    'implement.domainEntity': async () => {
      implementCalls += 1;
      return emptyOutcome();
    },
  }, undefined, catalog([note], 'red')));
  assert.equal(result.stage, 'structure');
  assert.equal(result.units[0].code, 'PROMOTED');
  assert.equal(result.checkpoints[0].accepted, true);
  assert.equal(result.checkpoints[0].ready, false);
  assert.equal(implementCalls, 0);
  assert.equal(store.map.get(output)?.includes('export const note'), true);
});

void test('two workers run independent units and a request for more stays at two', async () => {
  const note = entity('Note');
  const task = entity('Task');
  let active = 0;
  let peak = 0;
  let release: (() => void) | null = null;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const run = (limit: number) => {
    active = 0;
    peak = 0;
    return runMaterialize(baseRequest([note, task], { budget: { maxWorkers: limit } }), host(world(), {
      'structure.domainEntity': async (call) => {
        active += 1;
        peak = Math.max(peak, active);
        if (active === Math.min(limit, 2)) release?.();
        await gate;
        active -= 1;
        return passOutcome(outputPathFromDefPath(call.unit.defPath));
      },
    }, undefined, catalog([note, task], 'pass')));
  };
  const wide = await run(8);
  assert.equal(wide.budget.maxWorkers, 2);
  assert.equal(peak, 2);
  release = null;
  const narrowGate = new Promise<void>(resolve => { release = resolve; });
  active = 0;
  peak = 0;
  let entered = 0;
  const narrow = runMaterialize(baseRequest([note, task], { budget: { maxWorkers: 1 } }), host(world(), {
    'structure.domainEntity': async (call) => {
      entered += 1;
      active += 1;
      peak = Math.max(peak, active);
      if (entered === 1) {
        await narrowGate;
      } else {
        release?.();
      }
      active -= 1;
      return passOutcome(outputPathFromDefPath(call.unit.defPath));
    },
  }, undefined, catalog([note, task], 'pass')));
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(peak, 1);
  release?.();
  await narrow;
  assert.equal(peak, 1);
});

void test('verify does not generate and an unknown flow is a refusal', async () => {
  const note = entity('Note');
  const verified = await runMaterialize(baseRequest([note], { stage: 'verify' }), host(world(), {
    'structure.domainEntity': async () => {
      throw new Error('verify must not call a handler');
    },
  }));
  assert.equal(verified.units[0].code, 'NOT_READY');
  assert.equal(verified.llmCalls, 0);

  const missing = await runMaterialize(baseRequest([note], { flow: 'Missing' }), host(world(), {}));
  assert.equal(missing.ended, 'FLOW_NOT_FOUND');
  assert.equal(missing.wrote, false);
  assert.equal(missing.snapshot, null);

  const task = entity('Task');
  const linked = { ...note, definition: { ...note.definition, dependencies: [task.defPath] } };
  const selected = unitsForFlow([linked, task, entity('Other')], 'Note');
  assert.deepEqual(selected.map(unit => unit.definition.artifactId).sort(), ['Note', 'Task']);
});

void test('the model port is only for an implement handler that needs it', async () => {
  const structure = handlerFor('domainEntity', 'structure');
  assert.equal(shouldCallModel('simulate', structure), false);
  assert.equal(shouldCallModel('structure', structure), false);
  assert.equal(shouldCallModel('verify', structure), false);
  assert.equal(shouldCallModel('implement', structure), false);
  assert.equal(shouldCallModel('implement', structure ? { ...structure, stage: 'implement', needsLlm: true } : null), true);

  await assert.rejects(
    () => invokeModel(() => new Promise(() => undefined), { prompt: 'x', signal: new AbortController().signal, eventId: 'm' }, 20),
    (error: unknown) => error instanceof MaterializeCallError && error.code === 'TIMEOUT',
  );
  await assert.rejects(
    () => invokeModel(() => Promise.reject(new MaterializeCallError('NETWORK_UNAVAILABLE', 'offline')), {
      prompt: 'x', signal: new AbortController().signal, eventId: 'm',
    }, 1000),
    (error: unknown) => error instanceof MaterializeCallError && error.code === 'NETWORK_UNAVAILABLE',
  );
  await assert.rejects(
    () => invokeModel(() => Promise.resolve('   '), { prompt: 'x', signal: new AbortController().signal, eventId: 'm' }, 1000),
    (error: unknown) => error instanceof MaterializeCallError && error.code === 'INVALID_RESPONSE',
  );
});

void test('an old failure recipe works again and the same recipe keeps the budget', async () => {
  const note = entity('Note');
  const other = '_102047_/l1/agendaClinica/layer_3_domain/entities/other.defs.ts';
  const rendered = renderDefinition(note.definition as M1Definition, note.defPath);
  assert.ok('source' in rendered);
  const store = world({ [note.defPath]: rendered.source });
  const output = outputPathFromDefPath(note.defPath);
  let calls = 0;
  const runners: Record<string, MaterializeHandlerRunner> = {
    'implement.domainEntity': async () => {
      calls += 1;
      return passOutcome(output);
    },
  };
  const hash = await semanticHash(note.definition as M1Definition);
  const current = recipeForStage('implement');
  const receipt: MaterializationReceipt = {
    schemaVersion: M1_RECEIPT_SCHEMA,
    runId: '102047:agendaClinica',
    candidateId: '',
    defPath: note.defPath,
    artifactType: 'domainEntity',
    artifactId: 'Note',
    recipeVersion: current,
    semanticHash: hash,
    dependencyHashes: {},
    sourceHashes: { [note.defPath]: hash },
    outputHashes: {},
    stage: 'plan',
    verifications: [],
    failures: [{ code: 'LLM_UNAVAILABLE', detail: 'no model' }],
    attempts: 1,
    reason: 'LLM_UNAVAILABLE: no model',
  };
  const receiptPath = receiptPathFor(note.defPath);
  assert.ok(receiptPath);
  store.map.set(receiptPath, JSON.stringify(receipt));
  const budget = tightenBudget({ timeoutMs: 2000 }, null);
  const ledger = emptyLedger(PROJECT, MODULE, budget, 'implement');
  ledger.calls = 3;
  ledger.repairs = 2;
  ledger.units[note.defPath] = { repairs: 1, calls: 1, signature: 'LLM_UNAVAILABLE', ended: 'LLM_UNAVAILABLE', stage: 'implement' };
  ledger.units[other] = { repairs: 0, calls: 0, signature: '', ended: 'PROMOTED', stage: 'implement' };
  store.map.set(ledgerPath(MODULE), encodeLedger(ledger));

  const kept = await runMaterialize(baseRequest([note], { stage: 'implement', resume: true }), host(store, runners, undefined, catalog([note], 'pass')));
  assert.equal(kept.units[0].code, 'LLM_UNAVAILABLE');
  assert.match(kept.units[0].detail, /budget was not reset/);
  assert.equal(calls, 0);
  const keptLedger = parseLedger(store.map.get(ledgerPath(MODULE)) ?? '', PROJECT, MODULE);
  assert.ok(keptLedger);
  assert.equal(keptLedger.calls, 3);
  assert.equal(keptLedger.repairs, 2);
  assert.equal(keptLedger.units[other]?.ended, 'PROMOTED');

  receipt.recipeVersion = '2026-09-25-m1-recipe-v1';
  store.map.set(receiptPath, JSON.stringify(receipt));
  const again = await runMaterialize(baseRequest([note], { stage: 'implement', resume: true }), host(store, runners, undefined, catalog([note], 'pass')));
  assert.equal(calls, 1);
  assert.notEqual(again.units[0].code, 'LLM_UNAVAILABLE');
  const nextLedger = parseLedger(store.map.get(ledgerPath(MODULE)) ?? '', PROJECT, MODULE);
  assert.equal(nextLedger?.units[other]?.ended, 'PROMOTED');
  assert.ok((nextLedger?.calls ?? 0) >= 3);
  assert.ok((nextLedger?.repairs ?? 0) >= 2);
});

void test('a catalog that matches the M1 receipt is rewritten; a hand edit is a conflict', async () => {
  const note = entity('Note');
  const derived = deriveCatalog(MODULE, [note], {});
  assert.equal(derived.recipeVersion, M1_CATALOG_RECIPE);
  const owned = JSON.parse(catalogBytes(derived.catalog)) as M1ScenarioCatalog;
  owned.scenarios[0].cases[0].expectation = 'previous M1 output';
  const recorded = await contentHash(catalogBytes(owned));
  const ref = 'catalog.json';
  const store = world({ [ref]: renderMonitorCatalog(owned, ref) });
  const ledger = emptyLedger(PROJECT, MODULE, tightenBudget({ timeoutMs: 2000 }, null), 'structure');
  ledger.catalogInputHash = recorded;
  store.map.set(ledgerPath(MODULE), encodeLedger(ledger));
  const rewritten = await runMaterialize(baseRequest([note], { stage: 'simulate' }), host(store, {}, undefined, store.map.get(ref)));
  assert.equal(rewritten.catalog?.action, 'simulated');
  assert.equal(rewritten.catalog?.recipeVersion, M1_CATALOG_RECIPE);
  assert.equal(store.map.get(ref), renderMonitorCatalog(owned, ref));

  const writing = world({ [ref]: renderMonitorCatalog(owned, ref) });
  writing.map.set(ledgerPath(MODULE), encodeLedger(ledger));
  const wrote = await runMaterialize(baseRequest([note], { stage: 'structure' }), host(writing, {
    'structure.domainEntity': async () => passOutcome(outputPathFromDefPath(note.defPath)),
  }, undefined, writing.map.get(ref)));
  assert.equal(wrote.catalog?.action, 'written');
  const next = parseCatalog(writing.map.get(ref) ?? '');
  assert.ok(next.catalog);
  assert.equal(catalogBytes(next.catalog), catalogBytes(derived.catalog));

  const hand = JSON.parse(catalogBytes(derived.catalog)) as M1ScenarioCatalog;
  hand.scenarios[0].cases[0].expectation = 'hand edit';
  const handText = renderMonitorCatalog(hand, ref);
  const conflicted = world({ [ref]: handText });
  const stale = emptyLedger(PROJECT, MODULE, tightenBudget({ timeoutMs: 2000 }, null), 'structure');
  stale.catalogInputHash = await contentHash(catalogBytes(derived.catalog));
  conflicted.map.set(ledgerPath(MODULE), encodeLedger(stale));
  conflicted.map.set(ownedManifestRef(MODULE), renderOwnedManifest({
    schemaVersion: M1_OWNED_SCHEMA,
    moduleName: MODULE,
    units: [],
    catalogRef: ref,
    catalogHash: await contentHash(catalogBytes(derived.catalog)),
  }));
  const conflict = await runMaterialize(baseRequest([note], { stage: 'structure' }), host(conflicted, {}, undefined, handText));
  assert.equal(conflict.catalog?.action, 'conflict');
  assert.equal(conflicted.map.get(ref), handText);
});

void test('a misaligned ledger still rewrites an emitted catalog and records the new hash', async () => {
  const note = entity('Note');
  const derived = deriveCatalog(MODULE, [note], {});
  const previous = JSON.parse(catalogBytes(derived.catalog)) as M1ScenarioCatalog;
  previous.scenarios[0].cases[0].expectation = 'previous M1 output';
  const ref = 'catalog.json';
  const text = renderMonitorCatalog(previous, ref);
  const store = world({ [ref]: text });
  const ledger = emptyLedger(PROJECT, MODULE, tightenBudget({ timeoutMs: 2000 }, null), 'structure');
  ledger.catalogInputHash = await contentHash(catalogBytes(derived.catalog));
  store.map.set(ledgerPath(MODULE), encodeLedger(ledger));
  store.map.set(ownedManifestRef(MODULE), renderOwnedManifest({
    schemaVersion: M1_OWNED_SCHEMA,
    moduleName: MODULE,
    units: [{ defPath: note.defPath, outputs: [] }],
  }));
  const wrote = await runMaterialize(baseRequest([note], { stage: 'structure' }), host(store, {
    'structure.domainEntity': async () => passOutcome(outputPathFromDefPath(note.defPath)),
  }, undefined, text));
  assert.equal(wrote.catalog?.action, 'written');
  const next = parseCatalog(store.map.get(ref) ?? '');
  assert.ok(next.catalog);
  assert.equal(catalogBytes(next.catalog), catalogBytes(derived.catalog));
  const aligned = parseLedger(store.map.get(ledgerPath(MODULE)) ?? '', PROJECT, MODULE);
  assert.equal(aligned?.catalogInputHash, await contentHash(catalogBytes(derived.catalog)));
  const owned = JSON.parse(store.map.get(ownedManifestRef(MODULE)) ?? '{}') as { catalogHash?: string };
  assert.equal(owned.catalogHash, aligned?.catalogInputHash);
});

void test('a failed receipt with a new test is checked again and another unit keeps its budget', async () => {
  const note = entity('Note');
  const failedNote = { ...note, definition: { ...(note.definition as M1Definition), status: 'failed' as const } };
  const other = '_102047_/l1/agendaClinica/layer_3_domain/entities/other.defs.ts';
  const rendered = renderDefinition(failedNote.definition, failedNote.defPath);
  assert.ok('source' in rendered);
  const output = outputPathFromDefPath(note.defPath);
  const testPath = testFileFor(output);
  const testBody = 'export const probe = 1;\n';
  const store = world({ [note.defPath]: rendered.source, [testPath]: testBody });
  const hash = await semanticHash(note.definition as M1Definition);
  const receipt: MaterializationReceipt = {
    schemaVersion: M1_RECEIPT_SCHEMA,
    runId: '102047:agendaClinica',
    candidateId: '',
    defPath: note.defPath,
    artifactType: 'domainEntity',
    artifactId: 'Note',
    recipeVersion: recipeForStage('implement'),
    semanticHash: hash,
    dependencyHashes: {},
    sourceHashes: { [note.defPath]: hash, [testPath]: 'sha256:old-test' },
    outputHashes: {},
    stage: 'plan',
    verifications: [],
    failures: [{ code: 'CHECKPOINT_FAILED', detail: 'red' }],
    attempts: 1,
    reason: 'CHECKPOINT_FAILED: red',
  };
  const receiptPath = receiptPathFor(note.defPath);
  assert.ok(receiptPath);
  store.map.set(receiptPath, JSON.stringify(receipt));
  const ledger = emptyLedger(PROJECT, MODULE, tightenBudget({ timeoutMs: 2000 }, null), 'implement');
  ledger.calls = 3;
  ledger.repairs = 2;
  ledger.units[note.defPath] = { repairs: 1, calls: 1, signature: 'CHECKPOINT_FAILED', ended: 'CHECKPOINT_FAILED', stage: 'implement' };
  ledger.units[other] = { repairs: 4, calls: 2, signature: '', ended: 'PROMOTED', stage: 'implement' };
  store.map.set(ledgerPath(MODULE), encodeLedger(ledger));

  const moved = await runMaterialize(baseRequest([failedNote], { stage: 'implement', resume: true }), host(store, {
    'implement.domainEntity': async () => passOutcome(output),
  }));
  assert.doesNotMatch(moved.units[0].detail, /budget was not reset/);
  const movedLedger = parseLedger(store.map.get(ledgerPath(MODULE)) ?? '', PROJECT, MODULE);
  assert.equal(movedLedger?.repairs, 2);
  assert.equal(movedLedger?.units[other]?.repairs, 4);
  assert.equal(movedLedger?.units[other]?.ended, 'PROMOTED');
  assert.match(store.map.get(note.defPath) ?? '', /"status": "pending"/);

  receipt.sourceHashes[testPath] = await contentHash(testBody);
  store.map.set(receiptPath, JSON.stringify(receipt));
  store.map.set(note.defPath, rendered.source);
  store.map.set(ledgerPath(MODULE), encodeLedger(ledger));
  const same = await runMaterialize(baseRequest([note], { stage: 'implement', resume: true }), host(store, {
    'implement.domainEntity': async () => passOutcome(output),
  }));
  assert.equal(same.units[0].code, 'CHECKPOINT_FAILED');
  assert.match(same.units[0].detail, /budget was not reset/);
  const sameLedger = parseLedger(store.map.get(ledgerPath(MODULE)) ?? '', PROJECT, MODULE);
  assert.equal(sameLedger?.units[other]?.repairs, 4);
});

void test('help names the studio command and the l2 entry does not import node', () => {
  const help = helpText(102047);
  assert.match(help, /@@agentMaterializeL1 \/help/);
  assert.match(help, /nodejsMaterializeL1\.ts --help/);
  assert.match(help, /stage simulate/);
  const root = dirname(HERE);
  const files: string[] = [];
  walk(root, files);
  const forbidden = /from\s+['"](?:node:|fs|typescript)['"]|import\(\s*['"](?:node:|fs|typescript)/;
  for (const file of files) {
    if (file.endsWith('.test.ts')) continue;
    const source = readFileSync(file, 'utf8');
    assert.equal(forbidden.test(source), false, file);
  }
  const readme = readFileSync(join(root, 'readme.md'), 'utf8');
  assert.match(readme, /@@agentMaterializeL1 \/help/);
});

function loadDefs(root: string, prefix: string): { units: PlanUnitInput[]; texts: Record<string, string> } {
  const units: PlanUnitInput[] = [];
  const texts: Record<string, string> = {};
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.defs.ts')) {
        const text = readFileSync(path, 'utf8');
        const parsed = parseDefinitionSource(text);
        if (!('definition' in parsed)) continue;
        const rel = path.slice(root.length + 1).split('/').join('/');
        const defPath = `${prefix}${rel}`;
        texts[defPath] = text;
        units.push({ defPath, definition: parsed.definition });
      }
    }
  };
  walk(root);
  return { units, texts };
}

function entity(id: string): PlanUnitInput {
  const defPath = `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/${id.toLowerCase()}.defs.ts`;
  const definition: M1Definition = {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'domainEntity',
    artifactId: id,
    moduleName: MODULE,
    status: 'pending',
    dependencies: [],
    data: {
      entityId: id,
      storageTarget: 'moduleDatabase',
      fields: [{ name: 'id', type: 'uuid', derived: true }],
      lifecycle: { states: [{ state: 'ready', reachedBy: 'actor' }], transitions: [] },
      invariants: [],
      imports: [],
    },
  };
  return { defPath, definition };
}

function value(id: string, dependency: string): PlanUnitInput {
  const defPath = `_${PROJECT}_/l1/${MODULE}/layer_3_domain/values/${id.toLowerCase()}.defs.ts`;
  const definition: M1Definition = {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType: 'valueObject',
    artifactId: id,
    moduleName: MODULE,
    status: 'pending',
    dependencies: [dependency],
    data: { valueObjectId: id, fields: [], referencedBy: ['Note'] },
  };
  return { defPath, definition };
}

function baseRequest(units: readonly PlanUnitInput[], patch: Partial<MaterializeRunRequest> = {}): MaterializeRunRequest {
  return {
    project: PROJECT,
    moduleName: MODULE,
    stage: 'structure',
    flow: '',
    resume: false,
    units,
    profileMode: 'development',
    profileDeclared: true,
    budget: { timeoutMs: 2000 },
    ...patch,
  };
}

function host(
  store: ReturnType<typeof world>,
  runners: Record<string, MaterializeHandlerRunner>,
  llm?: MaterializeRunHost['llm'],
  catalogText?: string,
): MaterializeRunHost {
  if (catalogText) store.map.set('catalog.json', catalogText);
  return {
    io: { async read(ref: string) { return store.map.get(ref) ?? null; } },
    state: store.state,
    runners,
    llm,
    now: () => '2026-09-25T12:00:00.000Z',
    catalogRef: catalogText ? 'catalog.json' : '',
    commit: '1b94018',
    monitorError: null,
  };
}

function world(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  const writes: string[] = [];
  const state: MaterializeStateStore = {
    async readReceipt(defPath: string): Promise<MaterializationReceipt | null> {
      const path = receiptPathFor(defPath);
      const text = path ? map.get(path) : undefined;
      if (!text) return null;
      return JSON.parse(text) as MaterializationReceipt;
    },
    async writeReceipt(receipt: MaterializationReceipt): Promise<void> {
      const path = receiptPathFor(receipt.defPath);
      writes.push(path);
      map.set(path, JSON.stringify(receipt));
    },
    async readOwned(path: string): Promise<Uint8Array | null> {
      const text = map.get(path);
      return text === undefined ? null : new TextEncoder().encode(text);
    },
    async writeOwned(path: string, body: Uint8Array): Promise<void> {
      writes.push(path);
      map.set(path, new TextDecoder().decode(body));
    },
    async removeOwned(owned: readonly string[], requested: readonly string[]): Promise<MaterializeOwnedRemoval> {
      const removed: string[] = [];
      const kept: string[] = [];
      for (const path of requested) {
        if (!owned.includes(path) || path.endsWith('/') || !map.has(path)) {
          kept.push(path);
          continue;
        }
        map.delete(path);
        removed.push(path);
      }
      return { removed, kept };
    },
    async readRevision(): Promise<string | null> {
      return null;
    },
  };
  return { map, writes, state };
}

function catalog(units: readonly PlanUnitInput[], mode: 'pass' | 'red'): string {
  return JSON.stringify({
    schemaVersion: M1_CATALOG_SCHEMA,
    moduleName: MODULE,
    store: 'memory',
    scenarios: units.map(unit => {
      const definition = unit.definition as M1Definition;
      const productionFile = outputPathFromDefPath(unit.defPath);
      const caseId = `${definition.artifactId}.check`;
      const red = mode === 'red';
      return {
        scenarioId: definition.artifactId,
        source: 'm1_02',
        artifactType: definition.artifactType,
        artifactId: definition.artifactId,
        handlerId: `structure.${definition.artifactType}`,
        productionFile,
        testFile: testFileFor(productionFile),
        cases: [{
          caseId,
          gate: red ? 'business' : 'compile',
          mandatory: true,
          source: 'm1_02',
          expectation: 'The handler result matches the case.',
          preconditions: ['memory'],
          synthetic: [],
          actorId: '',
          routine: '',
          mutating: false,
          expect: red
            ? { ok: false, status: M1_STUB_STATUS, errorCode: M1_STUB_ERROR, ruleId: null, forbiddenFields: [], isolatedActorField: null }
            : { ok: true, status: 0, errorCode: null, ruleId: null, forbiddenFields: [], isolatedActorField: null },
          expectedFailure: red ? { caseId, stage: 'structure', errorCode: M1_STUB_ERROR, status: M1_STUB_STATUS } : null,
        }],
      };
    }),
  });
}

function passOutcome(output: string, patch: { runsStub?: boolean; extra?: Record<string, string>; red?: boolean } = {}): HandlerOutcome {
  const definitionId = output.split('/').pop()?.replace(/\.ts$/, '') || 'check';
  const id = definitionId.charAt(0).toUpperCase() + definitionId.slice(1);
  return {
    files: { [output]: `export const ${definitionId} = 1;\n`, ...patch.extra },
    observations: [patch.red ? observation(`${id}.check`, false, M1_STUB_ERROR, M1_STUB_STATUS) : observation(`${id}.check`, true)],
    failure: null,
    seeds: false,
    resets: false,
    runsStub: patch.runsStub === true,
  };
}

function observation(caseId: string, ok: boolean, errorCode: string | null = null, status = 0): M1Observation {
  return {
    caseId,
    durationMs: 1,
    broken: 'none',
    thrown: false,
    skipped: false,
    inconclusive: false,
    blocked: false,
    blockOwner: '',
    ok,
    status,
    errorCode,
    ruleId: null,
    fields: [],
    rowActorIds: [],
    reason: '',
  };
}

function emptyOutcome(): HandlerOutcome {
  return { files: {}, observations: [], failure: null, seeds: false, resets: false, runsStub: false };
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (entry.name.endsWith('.ts')) out.push(path);
  }
}
