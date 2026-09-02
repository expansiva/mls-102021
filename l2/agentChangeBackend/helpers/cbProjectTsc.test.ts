/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbProjectTsc.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCompileModuleTrace, groupTscErrorsByFile, mergeCompileTargets, mlsBaseFromDiskPath,
  parseTscDiagnostics, traceProjectTscResult,
} from './cbProjectTsc.js';

const TSC_SNIPPET = [
  "mls-102047/l1/petShopAgendamento/layer_1_external/adapters/persistence/inStorePaymentRepositoryAdapter.ts(34,14): error TS2741: Property 'delete' is missing in type '{ getById: ...; }' but required in type 'IInStorePaymentRepository'.",
  "mls-102047/l1/petShopAgendamento/layer_1_external/adapters/persistence/seeds.ts(818,5): error TS2322: Type 'string' is not assignable to type 'WeeklySchedule'.",
  "mls-102047/l1/petShopAgendamento/layer_2_application/usecases/decideServiceAppointmentConfirmation.ts(122,11): error TS2339: Property 'serviceAppointmentId' does not exist on type 'never'.",
  "mls-102046/l1/buildFlowFsm/layer_3_domain/entities/project.ts(4,1): error TS2322: other project must not leak.",
  "    122     created.serviceAppointmentId = row.id;",
].join('\n');

void test('parseTscDiagnostics keeps TS code+message and ignores related noise', () => {
  const parsed = parseTscDiagnostics(TSC_SNIPPET);
  assert.equal(parsed.length, 4);
  assert.equal(parsed[0].project, 102047);
  assert.equal(parsed[0].folder, 'petShopAgendamento/layer_1_external/adapters/persistence');
  assert.equal(parsed[0].shortName, 'inStorePaymentRepositoryAdapter');
  assert.equal(parsed[0].code, 'TS2741');
  assert.match(parsed[0].message, /Property 'delete'/);
  assert.equal(parsed[1].shortName, 'seeds');
  assert.equal(parsed[2].code, 'TS2339');
});

void test('parseTscDiagnostics accepts an absolute path and strips ANSI', () => {
  const line = "\u001b[96m/Volumes/x/mls-base/mls-102047/l1/petShopAgendamento/layer_2_application/usecases/createServiceExecution.ts\u001b[0m(71,9): error TS2367: This comparison appears to be unintentional.";
  const parsed = parseTscDiagnostics(line);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].shortName, 'createServiceExecution');
  assert.equal(parsed[0].code, 'TS2367');
});

void test('groupTscErrorsByFile keeps in-scope empties and adds module extras with errors', () => {
  const files = [
    { folder: 'petShopAgendamento/layer_1_external/adapters/persistence', shortName: 'inStorePaymentRepositoryAdapter' },
    { folder: 'petShopAgendamento/layer_2_application/usecases', shortName: 'decideServiceAppointmentConfirmation' },
  ];
  const grouped = groupTscErrorsByFile(parseTscDiagnostics(TSC_SNIPPET), files, 102047);
  assert.equal(grouped.get('petShopAgendamento/layer_1_external/adapters/persistence::inStorePaymentRepositoryAdapter')?.length, 1);
  assert.equal(grouped.get('petShopAgendamento/layer_2_application/usecases::decideServiceAppointmentConfirmation')?.length, 1);
  assert.equal(grouped.get('petShopAgendamento/layer_1_external/adapters/persistence::seeds')?.length, 1);
  assert.equal([...grouped.keys()].some(key => key.includes('buildFlowFsm')), false);
});

void test('mergeCompileTargets is a no-op when the compile map has only in-scope keys', () => {
  const inScope = [{ folder: 'mod/usecases', shortName: 'createx', real: 'createX' }];
  const compiled = new Map([['mod/usecases::createX', ['TS2322: x']]]);
  assert.equal(mergeCompileTargets(inScope, compiled), inScope);
});

void test('mergeCompileTargets appends extra files the project tsc flagged (seeds.ts)', () => {
  const inScope = [{ folder: 'mod/usecases', shortName: 'createx', real: 'createX' }];
  const compiled = new Map([
    ['mod/usecases::createX', ['TS2322: x']],
    ['mod/adapters/persistence::seeds', ['TS2322: WeeklySchedule']],
  ]);
  const merged = mergeCompileTargets(inScope, compiled);
  assert.equal(merged.length, 2);
  assert.equal(merged[1].real, 'seeds');
  assert.equal(merged[1].folder, 'mod/adapters/persistence');
});

void test('mlsBaseFromDiskPath walks up to the mls-NNNN parent', () => {
  assert.equal(mlsBaseFromDiskPath('/Volumes/x/collab/mls-base/mls-102047/l1/mod/a.ts'), '/Volumes/x/collab/mls-base');
  assert.equal(mlsBaseFromDiskPath('/Volumes/x/collab/mls-base/mls-102047/'), '/Volumes/x/collab/mls-base');
  assert.equal(mlsBaseFromDiskPath('/tmp/not-an-mls-tree/a.ts'), null);
});

void test('project tsc trace names the path and counts diagnostics before and after the file filter', () => {
  const files = [
    { folder: 'controleChamados/layer_2_application/usecases', shortName: 'updateTicketComment' },
    { folder: 'controleChamados/layer_2_application/usecases', shortName: 'recordComment' },
  ];
  const output = [
    "mls-102047/l1/controleChamados/layer_2_application/usecases/recordComment.ts(8,10): error TS2305: Module has no exported member 'canAddCommentToTicket'.",
    "mls-102047/l1/controleChamados/layer_2_application/usecases/updateTicketComment.ts(8,10): error TS2305: Module has no exported member 'canAddCommentToTicket'.",
    "mls-102047/l1/controleChamados/layer_2_application/usecases/updateTicketComment.ts(80,37): error TS2339: Property 'ticketCommentId' does not exist on type 'never'.",
    "mls-102047/l1/petShopAgendamento/layer_1_external/adapters/persistence/seeds.ts(818,5): error TS2322: Type 'string' is not assignable to type 'WeeklySchedule'.",
  ].join('\n');
  const { grouped, trace } = traceProjectTscResult(output, files, 102047, 'spawn-null');
  assert.equal(trace.path, 'project-tsc');
  assert.equal(trace.rawDiagnostics, 4);
  assert.equal(trace.afterFilter, 3);
  assert.equal(trace.files, 2);
  assert.equal(grouped?.get('controleChamados/layer_2_application/usecases::updateTicketComment')?.length, 2);
  assert.match(formatCompileModuleTrace(trace), /\[cb-compile\] path=project-tsc files=2 raw=4 afterFilter=3/);
});

void test('project tsc trace is unavailable with spawn-null when the compiler produced no output', () => {
  const files = [{ folder: 'mod/usecases', shortName: 'createX' }];
  const { grouped, trace } = traceProjectTscResult(null, files, 102047, 'spawn-null');
  assert.equal(grouped, null);
  assert.equal(trace.path, 'unavailable');
  assert.equal(trace.reason, 'spawn-null');
  assert.equal(trace.rawDiagnostics, 0);
  assert.equal(trace.afterFilter, 0);
  assert.match(formatCompileModuleTrace(trace), /path=unavailable reason=spawn-null/);
});
