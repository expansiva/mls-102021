/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/context.ts" enhancement="_blank"/>

// What the model sees to write the workflow service of one process (materializadorL1.md §11): the def (trigger,
// occurrence, functions, operations), the l4 prose of each function (the source), the usecases the operations reach,
// the occurrence entity and its port, the module engine, the runtime engine signatures and the record-id rule.
// And the gate of its answer.

import { CM_CALL_RULES, CM_CONFLICT, CM_ONCE, CM_ONCE_REFUSAL_RULE, CM_ORDER, CM_REFUSAL, CM_SERVE_TRANSACTION } from '/_102021_/l2/agentMaterializeL1/helpers/cmClientText.js';
import { stage2 } from '/_102021_/l2/agentMaterializeL1/helpers/m12Stage2.js';
import { CONNECTION_STATUS } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';
import { keptRefusalText } from '/_102021_/l2/agentMaterializeL1/helpers/keptRefusal.js';
import { connectionCatalogSource, isCatalogImport, siblingDeclarationImports } from '/_102021_/l2/agentMaterializeL1/helpers/catalogSource.js';
import { isRecord } from '/_102021_/l2/helpers/l1Defs/definition.js';
import type { ArrivalUpsert } from '/_102021_/l2/helpers/l1Defs/arrivalUpsert.js';
import { routeUpsertsOf } from '/_102021_/l2/agentMaterializeL1/steps/requests50/arrivalUpsert.js';
import { arrivalLineOf } from '/_102021_/l2/agentMaterializeL1/steps/requests50/serveSource.js';
import { PLATFORM_FILES } from '/_102021_/l2/agentMaterializeL1/emitters/context.js';
import { ontologyRef } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import { bindHumanPages, moduleSpecifier, transitionDestinations, workflowEngineFile, workflowEngineSource, workflowTablesFromL4, type HumanPageSource, type WorkflowStepEmit } from '/_102021_/l2/agentMaterializeL1/emitters/workflowEmit.js';
import { clip } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { compileDiagnostics, compileM12Files, isUnavailable } from '/_102021_/l2/agentMaterializeL1/helpers/m12Compile.js';
import { catalogOperations } from '/_102021_/l2/agentMaterializeL1/emitters/connectionCatalog.js';
import { resolveInputType } from '/_102021_/l2/agentMaterializeL1/emitters/typeResolve.js';
import { usecaseInputsOf, type M12InputField } from '/_102021_/l2/agentMaterializeL1/helpers/m12Required.js';
import { catalogFilePath } from '/_102020_/l2/helpers/connections/catalogPath.js';
import { stepCallProblems, stepCallsOf, withUsecases, type StepCall } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/stepCalls.js';
import { completeEngineImports, engineExportsOf } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/engineImports.js';
import { neverReturnsProblems } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/neverReturns.js';
import { enumFieldValues } from '/_102021_/l2/agentMaterializeL1/helpers/externalEnums.js';
import { processReceives } from '/_102021_/l2/agentMaterializeL1/helpers/workflowReach.js';
import { l4RecordOf } from '/_102021_/l2/agentMaterializeL1/steps/requests50/affectedWrites.js';
import { arrivalInputOf } from '/_102021_/l2/agentMaterializeL1/helpers/arrivalInput.js';
import { withoutComments } from '/_102021_/l2/agentMaterializeL1/helpers/codeTokens.js';
import { typeLeakProblems } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { answerTypeNames, catalogTypeBody, connectionGatewaySection, consumedConnectionIds, repositoryUniqueKeySection } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';
import { arrivalUpsertProblems, connectionRowsOf, emptyCastProblems, emptyRequiredProblems, recordCastProblems, externalEntityIds, gatewayBypassProblems, importSpecifiers, moduleGatewayNames, repositoryPortNames, repositoryProblems, typedResultDiscardedProblems, usesNodeBuiltin } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { readOptional, storExists, writeSource, writeUnitStatus } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { fileRef, rulesFile, workflowRecoverForm, workflowRecoverName, workflowWakeHandlerForm, workflowWakeHandlerName } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { dependencyUnits, type M12Context, type M12RuleNotApplicable } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { M12_CODE_SCHEMA, missingImports, type M12Repair, type M12SequenceSpec } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import { emitterTargetLayer, type M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { calledFunctions, findFunction, functionSignature, mergeImports, notImplementedFunctions, notImplementedStub, replaceFunction, workflowPhaseOrder, WORKFLOW_NOT_IMPLEMENTED, addHelpers } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/sequence.js';
import { MDM_FACADE_REF, MDM_MODULE_REF, MDM_ONTOLOGY_REF, allRuleIds, citedEntities, entityNames, exportSignatures, mdmContextSection, ruleTexts, usesMdm } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';

export const M12_WORKFLOW_TOOL = 'writeWorkflowService' as const;
export const M12_WORKFLOW_TOOL_DESCRIPTION = 'Return the whole workflow service TypeScript file of the process';
export const EVALUATE_SCHEDULE_REF = '_102034_/l1/server/layer_2_application/schedule/evaluateSchedule.ts';
/** Public surface of the runtime engine (`/_102034_/l1/workflow/index.js`). */
export const WORKFLOW_INDEX_REF = '_102034_/l1/workflow/index.ts';
/** Call shapes `index.ts` re-exports: open, advance, find, the table and the key. */
export const WORKFLOW_ENGINE_REF = '_102034_/l1/workflow/engine.ts';
export const WORKFLOW_CONTRACTS_REF = '_102034_/l1/workflow/contracts.ts';
/** `occurrenceRecordId` and `createOccurrenceContext` (the first `newId` is the record). */
export const WORKFLOW_RECORD_ID_REF = '_102034_/l1/workflow/occurrenceRecordId.ts';
/** Platform access-request read API. The screen resolves; this module only reads. */
export const REGISTRATION_REF = '_102034_/l1/mdm/registration.ts';

function section(title: string, body: string): string {
  return `## ${title}\n\n${body.trim()}\n`;
}

function fence(lang: string, text: string): string {
  return `\`\`\`${lang}\n${text.trim()}\n\`\`\``;
}

/** Worker view of the module engine: export signatures, with the whole `transitionTo` (its keys) in place of the collapsed line. */
export function workflowEngineShown(source: string): string {
  const shown = exportSignatures(source).split('\n').filter(line => !/^export const transitionTo\b/u.test(line));
  const literal = transitionToLiteral(source);
  return [...shown, literal].filter(part => part.length > 0).join('\n');
}

function transitionToLiteral(source: string): string {
  const start = source.search(/^export const transitionTo\b/mu);
  if (start < 0) return '';
  const marker = 'satisfies Readonly<Record<string, string>>;';
  const satisfies = source.indexOf(marker, start);
  if (satisfies >= 0) return source.slice(start, satisfies + marker.length);
  const end = source.indexOf('};', start);
  return end < 0 ? '' : source.slice(start, end + 2);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** `onboarding.moduleId` of a project's `l5/config.json`, or empty when the file has none. */
export function onboardingModuleId(configText: string | null): string {
  if (!configText) return '';
  const config = JSON.parse(configText) as { onboarding?: { moduleId?: unknown } };
  return typeof config.onboarding?.moduleId === 'string' ? config.onboarding.moduleId : '';
}

/**
 * Export surface of `registration.ts`, read from the source. A union type and a function head span lines;
 * `exportSignatures` stops at the first line, which drops `person.mdmId` and `(ctx, { requestId })`.
 */
export function registrationSignatures(source: string): string {
  const lines = source.split('\n');
  const out: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/^export\s+(?:type|interface|async\s+function|function)\s/u.test(line)) continue;
    const block = [line];
    const isType = /^export\s+(?:type|interface)\s/u.test(line);
    let depth = (line.match(/\{/gu)?.length ?? 0) - (line.match(/\}/gu)?.length ?? 0);
    while (index + 1 < lines.length && (depth > 0 || (isType ? !lineEnds(block) : !block[block.length - 1].includes('{')))) {
      index += 1;
      block.push(lines[index]);
      depth += (lines[index].match(/\{/gu)?.length ?? 0) - (lines[index].match(/\}/gu)?.length ?? 0);
    }
    const text = block.join('\n');
    out.push(isType ? text : text.replace(/\{\s*$/u, '{ … }'));
  }
  return out.join('\n');
}

function lineEnds(block: string[]): boolean {
  return /;\s*$/u.test(block[block.length - 1]);
}

/**
 * The registration read API, only for the onboarding module. The signature is read from `registration.ts`
 * (never a hand copy). Other modules get an empty string.
 */
export function registrationAccessSection(moduleName: string, configText: string | null, registrationSource: string | null): string {
  const moduleId = onboardingModuleId(configText);
  if (!moduleId || moduleId !== moduleName) return '';
  const rules = [
    'Import `readAccessRequestState` from `/_102034_/l1/mdm/registration.js`. `listPendingAccessRequests` needs a person in the session; a process routine does not use it.',
    'Reread the access request with `readAccessRequestState(ctx, { requestId })`. `requestId` is the key of the occurrence. Continue only with `person.mdmId` when the result is `resolved`.',
    'No flag from the frontend and no copy of the request in this module.',
    'The screen resolves the request (`POST /session/registration/resolve`). This code only reads.',
  ];
  if (!registrationSource) throw new Error(`${REGISTRATION_REF} not found: the onboarding module ${moduleName} needs the access request read API`);
  return section('Platform access request (source: _102034_/l1/mdm/registration.ts)', [...rules, fence('ts', registrationSignatures(registrationSource))].join('\n\n'));
}

/**
 * The owner of an occurrence that no person starts (d1_205). The L4 trigger `event` / `scheduled` is the engine origin
 * `event` / `schedule` (`WorkflowOrigin.kind`); the engine accepts `owner: null` only under `routineOwnerProblem`
 * (`/_102034_/l1/workflow/engine.ts`), which is what this text repeats.
 */
export function routineOwnerRule(triggerKind: string): string {
  const origin = triggerKind === 'scheduled' ? 'schedule' : 'event';
  return `This process starts from ${triggerKind === 'scheduled' ? 'a schedule' : 'an event'}, with no person in the session. Never require \`person.mdmId\` and never throw an owner-missing error: open the occurrence with \`owner: null\`, \`actorNow: null\`, \`executor: { kind: 'routine', name }\`, \`origin: { kind: '${origin}' }\` and a \`room\` whose \`mode\` is \`'exclusive'\` or \`'group'\` (never \`'person'\`). The engine refuses \`owner: null\` under any other combination (\`WORKFLOW_ROUTINE_OWNER_INVALID\`, rule \`routineOwnerProblem\`). Only when the session does carry a person is \`owner\` that person's \`mdmId\`.`;
}

/**
 * Rules every process function follows when it calls the module engine. The engine does the owner action;
 * the function supplies the command and applies the L4 system transition from the returned notice state only.
 */
export function engineUseRules(moduleName: string, processId: string, triggerKind = ''): string {
  return [
    'Open with `engine.open(ctx, { key, plan, title, firstStep, actorNow, owner, origin, executor, room, message? })`. Advance with `engine.advance(ctx, key, { commandId, expectedRevision, from, to, actorNow, executor, note?, wake?, message? })`. No step table on `advance`. `find` is `engine.find(ctx, key)`.',
    'The function whose L4 prose returns the person of a human step calls `resolveStepPerson(ctx, { actorRef, step, history })` from this module engine and returns that result. `actorRef` and `step` are that step in the engine table; `history` is the `history` of the `find` of the same call. Never return `null` or `\'\'`, never query the MDM on your own and never invent who holds the actor. The helper\'s error is thrown as it is.',
    '`commandId`: from a person, `requestMeta.requestId`; from a routine, `<recordId>:<to>` (the same value on a retry, a different value only for a new command); from a wake, `<taskId>:<step>:<wake.seq>`.',
    '`expectedRevision` is the `revision` of the `find` of the same call. `executor` is `{ kind: \'person\', mdmId }` or `{ kind: \'routine\', name: \'<module>.<processId>.<function>\' }` (here `' + moduleName + '.' + processId + '.<function>`). `title` is the business record by its display field. `origin` is the screen, the channel, or the schedule.',
    'The notice result decides the L4 system transition, only from the state returned (`moduleMessage`, or `noticeState` when the module engine exports it). `sent` → the success transition (in `tarefas`, `concluirAviso`) and `to: \'end\'`. A definitive port error (below) → the failure transition (`falharAviso`, `motivoFalha` with no personal data) and `to: \'end\'`. `pending` or absent → the record stays `pending` and the Task stays on the step. Never a second message and never another `commandId` to repeat the same command.',
    'A notice still `pending` from an earlier run is settled by the next run of the start function, **for that recipient only**: if its message is `sent`, apply the success transition; otherwise apply the failure transition with `motivoFalha` = `NOTICE_DELIVERY_NOT_CONFIRMED`; then that recipient\'s new notice starts. A `sent` that arrives after the failure is only logged. A pending notice of one recipient never blocks another.',
    'A `wait` step requests a wake only when the L4 gives it a time (a deadline, a reminder or a period in the step description or in a rule) and names the function that handles it; `everyMinutes`/`until` come from that text and `routine` is that function. Otherwise the step has no wake: the wait ends by the action of the next step\'s owner. Never invent an interval.',
    ...(triggerKind === 'event' || triggerKind === 'scheduled' ? [routineOwnerRule(triggerKind)] : []),
    '`onTick(ctx, now)` stays the public entry of the schedule. `ctx.clock` agrees with `now`.',
    'Port errors do not open another occurrence. Temporary (`WORKFLOW_CM_BUSY`, `WORKFLOW_CM_TASK_INCOMPLETE`, `WORKFLOW_CM_ROOM_UNAVAILABLE`, `WORKFLOW_IDENTITY_INCOMPLETE`, HTTP 503): the screen receives the error so the person can try again; the routine leaves the notice `pending` for the next execution and does not change the business record. Definitive for the command (`WORKFLOW_CM_REJECTED`, `WORKFLOW_IDENTITY_UNLINKED`, `WORKFLOW_IDENTITY_REMOVED`): the screen receives the error; the routine applies the failure transition with the code as `motivoFalha`.',
  ].join('\n');
}

/** Steps of one l4 process object (the JSON `l4Process` returns). */
export function workflowProcessSteps(processJson: string): WorkflowStepEmit[] {
  if (!processJson) return [];
  let row: unknown;
  try { row = JSON.parse(processJson); } catch { return []; }
  if (!row || typeof row !== 'object') return [];
  const wrapped = `export const workflows = ${JSON.stringify({ processes: [row] })} as const;`;
  return workflowTablesFromL4(wrapped)[0]?.steps ?? [];
}

/**
 * Names the process file exports when it has an `llm` step: one wake handler per `llm` step and per periodic
 * `wait`, plus the tick recovery of the process. Empty when the process has no `llm` step.
 */
export function workflowLlmExportNames(processId: string, steps: readonly WorkflowStepEmit[]): string[] {
  if (!steps.some(step => step.kind === 'llm')) return [];
  const names = steps
    .filter(step => step.kind === 'llm' || (step.kind === 'wait' && step.wakeMode === 'periodic'))
    .map(step => workflowWakeHandlerName(step.stepId));
  names.push(workflowRecoverName(processId));
  return names;
}

/** `export type Name = …;` through the semicolon that closes it. '' when the file does not declare the alias. */
export function typeAlias(source: string, name: string): string {
  const match = new RegExp(`export type ${name}\\s*=`, 'u').exec(source);
  if (!match) return '';
  let depth = 0;
  let quote = '';
  for (let index = match.index; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === '\\') { index += 1; continue; }
      if (char === quote) quote = '';
      continue;
    }
    if (char === '\'' || char === '"' || char === '`') { quote = char; continue; }
    if (char === '(' || char === '{' || char === '[') depth += 1;
    if (char === ')' || char === '}' || char === ']') depth -= 1;
    if (char === ';' && depth === 0) return source.slice(match.index, index + 1);
  }
  return '';
}

/** Stor ref of the file the workflow index re-exports `name` from. '' when the index declares it itself. */
export function reexportRef(indexSource: string, name: string): string {
  for (const match of indexSource.matchAll(/export type \{([^}]+)\} from '([^']+)'/gu)) {
    const names = match[1].split(',').map(item => item.trim()).filter(Boolean);
    if (!names.includes(name)) continue;
    const specifier = match[2];
    if (!specifier.startsWith('/') || !specifier.endsWith('.js')) return '';
    return specifier.slice(1).replace(/\.js$/u, '.ts');
  }
  return '';
}

/**
 * What the model needs to write an `llm` step. Empty when the process has none.
 * The engine signatures are in the Platform sections of the prompt; the import the file writes is the index, and a missing
 * name is completed in code (`completeEngineImports`).
 * `wakeSignature` is the `WorkflowWakeHandler` alias read from the index (or from the file it re-exports).
 */
export function llmStepSection(processId: string, steps: readonly WorkflowStepEmit[], wakeSignature = ''): string {
  const names = workflowLlmExportNames(processId, steps);
  if (!names.length) return '';
  const handlers = names.filter(name => name !== workflowRecoverName(processId));
  const handlerSteps = steps.filter(step => step.kind === 'llm' || (step.kind === 'wait' && step.wakeMode === 'periodic'));
  const lines = [
    'This process has an `llm` step. Follow the `llm` bullet of the prompt. Ignore it for a process that has none.',
    `Export ${handlers.map(name => `\`${name}\``).join(', ')} (wake handlers) and \`${workflowRecoverName(processId)}\` (tick recovery). The module tick and the registration import these names.`,
    `Each wake handler is ${handlerSteps.map(step => `\`${workflowWakeHandlerForm(step.stepId)}\``).join(', ')}: the context first, then the event, and assignable to \`WorkflowWakeHandler\` (type below, from \`/_102034_/l1/workflow/index.js\`), which the registration passes it to.`,
    `The recovery is \`${workflowRecoverForm(processId)}\`. The clock is \`ctx.clock\`.`,
    'Import every engine name you use from `/_102034_/l1/workflow/index.js`: its exports are listed in the Platform sections below, and a name you use and forget is added to that import for you. Do not import `/_102036_/`. `requestLlmStep` is `workflowEngine.requestLlmStep(ctx, input: TaskWorkflowLlmStep)`.',
    '`ModuleWakeEvent` fields used here: `eventId`, `taskId`, `stepKey`, `pass`, `kind` (`wake` | `llm-step-finished`), `commandId`, `state`.',
  ];
  return wakeSignature ? `${lines.join('\n')}\n\n${fence('ts', wakeSignature)}` : lines.join('\n');
}

/**
 * Enum fields of an entity the process writes, as the type an exported field must use.
 * A string field is not listed: the compiler already accepts it.
 */
export function entityEnumTypes(entityId: string, ontologySource: string | null): string[] {
  return [...enumFieldValues(ontologySource).keys()].map(name => `${entityId}.${name}: \`${entityId}['${name}']\``);
}

/**
 * An entity the process only names (not its occurrence, not an operation target) needs its states and transitions
 * (the model guessed them without), not its fields: the generated entity file above already carries those.
 * Anything that does not parse as the ontology object stays whole.
 */
export function citedOntology(source: string): string {
  const start = source.indexOf('= {');
  const end = source.lastIndexOf('} as const');
  if (start < 0 || end < start) return source.slice(0, 20000);
  try {
    const root = JSON.parse(source.slice(start + 2, end + 1)) as Record<string, unknown>;
    const kept: Record<string, unknown> = {};
    for (const key of ['entityId', 'title', 'lifecycleStates', 'transitions']) if (key in root) kept[key] = root[key];
    return JSON.stringify(kept, null, 2).slice(0, 20000);
  } catch {
    return source.slice(0, 20000);
  }
}

/** The facts of a workflowProcess def the context and the gate read. */
export interface M12WorkflowFacts {
  processId: string;
  trigger: { kind: string; actorRef: string; event: string; schedule: string };
  occurrence: string;
  functions: string[];
  operations: Array<{ operation: string; steps: string[] }>;
}

export function workflowFacts(unit: M12Unit): M12WorkflowFacts {
  const data = unit.definition.data;
  const trigger = isRecord(data.trigger) ? data.trigger : {};
  return {
    processId: text(data.processId) || unit.unitId,
    trigger: { kind: text(trigger.kind), actorRef: text(trigger.actorRef), event: text(trigger.event), schedule: text(trigger.schedule) },
    occurrence: isRecord(data.occurrence) ? text(data.occurrence.entityId) : '',
    functions: Array.isArray(data.functions) ? data.functions.map(String).filter(Boolean) : [],
    operations: Array.isArray(data.operations)
      ? data.operations.filter(isRecord).map(row => ({ operation: text(row.operation), steps: Array.isArray(row.steps) ? row.steps.map(String) : [] }))
      : [],
  };
}

/** The process `processId` of an l4 workflows source, as JSON text; '' when it is not there. */
export function l4Process(source: string | null, processId: string): string {
  if (!source) return '';
  const match = /=\s*(\{[\s\S]*\})\s*as const/u.exec(source);
  if (!match) return '';
  try {
    const value = JSON.parse(match[1]) as Record<string, unknown>;
    const found: unknown[] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (!isRecord(node)) return;
      if (node.processId === processId) found.push(node);
      Object.values(node).forEach(walk);
    };
    walk(value);
    return found.length ? JSON.stringify(found[0], null, 2) : '';
  } catch {
    return '';
  }
}

/**
 * d1_232: the entities the arrival that starts this process creates and updates, each with its key. The arrival is the L4 line the trigger event
 * names, read by the one reader of the NS5 (d1_235: the plan puts its operations on a task of the process, not on a step of its own). The
 * process writes them through the port: find, then update or create.
 */
export async function processUpserts(ctx: M12Context, facts: M12WorkflowFacts): Promise<ArrivalUpsert[]> {
  if (facts.trigger.kind !== 'event' || !facts.trigger.event) return [];
  const line = arrivalLineOf(await ctx.read(`_${ctx.run.project}_/l4/${ctx.run.module}/integration.defs.ts`), facts.trigger.event);
  if (!line) return [];
  const upserts = await routeUpsertsOf(facts.trigger.event, line.row, line.kind, entityId => ctx.read(`_${ctx.run.project}_/l4/${ctx.run.module}/ontology/${entityId}.defs.ts`));
  return upserts.map(({ route: _route, ...upsert }) => upsert);
}

/** The usecase that runs one operation (`Entidade.<op>` or `Entidade.<transição>`), among the units of the module. */
export function operationUsecase(units: readonly M12Unit[], operation: string): M12Unit | undefined {
  const [entityId, op] = operation.split('.');
  return units.find(unit => unit.definition.artifactType === 'usecase'
    && String(unit.definition.data.entityId ?? '') === entityId
    && (String(unit.definition.data.operation ?? '') === op || String(unit.definition.data.transitionRef ?? '') === op));
}

function operationTransitionIds(units: readonly M12Unit[]): Set<string> {
  const ids = new Set<string>();
  for (const unit of units) {
    if (unit.definition.artifactType !== 'workflowProcess' || !Array.isArray(unit.definition.data.operations)) continue;
    for (const row of unit.definition.data.operations.filter(isRecord)) {
      const operation = text(row.operation);
      const id = operation.includes('.') ? operation.slice(operation.lastIndexOf('.') + 1) : operation;
      if (id) ids.add(id);
    }
  }
  return ids;
}

/**
 * The module engine (the engine on the cm Task port, the plan of each process, the destination status of each operation),
 * written and compiled before any workflow worker runs. An engine.ts that is already there stays; delete it to regenerate.
 * The lines go to the phase trace.
 */
export async function prepareWorkflows(ctx: M12Context, selectedProcesses?: readonly M12Unit[]): Promise<string[]> {
  const { project, module: moduleName } = ctx.run;
  let { force } = ctx.run;
  const info = workflowEngineFile(project, moduleName);
  // d1_347 s6 (stage 2): the engine is used by EVERY process of the module and its types are the plan of all of them. A run that rewrites it without regenerating every process leaves the other processes on the old
  // API (they compile or break only when someone touches them). So a `force` rewrites an engine that exists only in a run that selects all the processes of the module (`scope` of the workflows layer with `force`);
  // a `target` of one process, or a run of another layer, keeps and proves it. A `target` of the engine file alone is refused with its name.
  const everyProcess = (): boolean => {
    const all = ctx.units.filter(unit => unit.layer === 'workflows');
    return all.length > 0 && (selectedProcesses ?? []).length > 0 && all.every(unit => (selectedProcesses ?? []).some(item => item.unitId === unit.unitId));
  };
  if (stage2.on && force && storExists(info) && !everyProcess()) {
    if (emitterTargetLayer(project, moduleName, ctx.run.target) === 'workflows') {
      const diagnostic = `ENGINE_NEEDS_PROCESSES: ${ctx.run.target} would rewrite the engine of module ${moduleName} alone, and every process of the module uses it. Regenerate the engine with the processes: scope "${moduleName}/layer_2_application/workflows" with force.`;
      await writeUnitStatus(project, moduleName, { layer: 'workflows', unitId: 'engine', defRef: '', status: 'failed', code: 'ENGINE_NEEDS_PROCESSES', attempt: 0, diagnostic, inputHash: '', outputs: {} });
      return [`workflowEngine: ${diagnostic}`];
    }
    force = false;
    const kept = await readOptional(info);
    return [`workflowEngine: kept: a run that does not regenerate every process of the module does not rewrite the engine (scope "${moduleName}/layer_2_application/workflows" with force does)${kept === null ? '' : `; ${(await proveEngine(ctx, info, kept)).line}`}`];
  }
  if (!force && storExists(info)) {
    // A kept engine is proved again: an old file with a type error must not pass as written (d1_196).
    const kept = await readOptional(info);
    if (kept === null) return ['workflowEngine: kept: exists'];
    return [`workflowEngine: kept: exists; ${(await proveEngine(ctx, info, kept)).line}`];
  }
  const workflows = await ctx.read(`_${project}_/l4/${moduleName}/workflows.defs.ts`);
  const ontologySources: string[] = [];
  for (const item of ctx.units) {
    if (item.definition.artifactType !== 'domainEntity') continue;
    const source = await ctx.read(ontologyRef(item.definition, item.outputRef));
    if (source) ontologySources.push(source);
  }
  const operations = operationTransitionIds(ctx.units);
  let tables = workflowTablesFromL4(workflows);
  const unresolved: string[] = [];
  // Shared page defs and the route in l5/config.json are written by the L2 finalize before this step.
  if (tables.some(table => table.steps.some(step => step.kind === 'llm'))) {
    const pages: HumanPageSource[] = [];
    for (const ref of sharedPageRefs(project, moduleName)) {
      const source = await ctx.read(ref);
      const pageId = ref.split('/').pop()?.replace(/\.defs\.ts$/u, '') ?? '';
      if (source && pageId) pages.push({ pageId, source });
    }
    const bound = bindHumanPages(tables, pages, await ctx.read(`_${project}_/l5/config.json`), moduleName);
    tables = bound.tables;
    unresolved.push(...bound.unresolved);
  }
  const source = workflowEngineSource(project, moduleName, tables, transitionDestinations(ontologySources, operations.size ? operations : undefined));
  const stored = await writeSource(info, source);
  const proved = await proveEngine(ctx, info, stored.text);
  return [`workflowEngine: ${proved.line}`, ...unresolved.map(item => `PAGE_UNRESOLVED: ${item}`)];
}

/**
 * d1_236: the module engine for a run that does not select a workflow unit. The request service of a route that starts a process imports the
 * engine, and a maintenance run (`/compare` leaves it out when a process changed, so that it is regenerated) can ask for the request service
 * alone (`target`): without the engine the service does not compile. The same function as the workflows layer, so there is one way to write it.
 * A module with no process has no engine.
 */
export async function ensureWorkflowEngine(ctx: M12Context): Promise<string[]> {
  if (!ctx.units.some(unit => unit.definition.artifactType === 'workflowProcess')) return [];
  return prepareWorkflows(ctx);
}

/**
 * Compiles the engine and records the outcome as a unit of the workflows layer (`engine`): a type error is `failed`
 * COMPILE_FAILED and keeps the report `partial`; a compile that did not happen is `done` COMPILE_UNAVAILABLE_L1 and
 * is listed in `notCompiled`. Before d1_196 the outcome went only to the phase trace, and the report said clean.
 */
async function proveEngine(ctx: M12Context, info: ReturnType<typeof workflowEngineFile>, text: string): Promise<{ line: string }> {
  const results = await compileM12Files([{ info, expected: text }], ctx.compiler);
  const unavailable = results.every(result => result.errors.length === 1 && isUnavailable(result.errors[0]));
  const errors = unavailable ? [] : compileDiagnostics(results);
  const status = errors.length ? 'failed' as const : 'done' as const;
  const code = errors.length ? 'COMPILE_FAILED' : unavailable ? 'COMPILE_UNAVAILABLE_L1' : '';
  const diagnostic = errors.length ? clip(errors.join(' | '), 600) : unavailable ? clip(results[0]?.errors[0] ?? '', 300) : '';
  await writeUnitStatus(ctx.run.project, ctx.run.module, { layer: 'workflows', unitId: 'engine', defRef: '', status, code, attempt: 0, diagnostic, inputHash: '', outputs: {} });
  return { line: errors.length ? `COMPILE_FAILED ${clip(errors.join(' | '), 400)}` : unavailable ? 'written, not compiled (COMPILE_UNAVAILABLE_L1)' : 'written' };
}


/** `l2/<module>/web/shared/<pageId>.defs.ts` present in the stor. */
function sharedPageRefs(project: number, moduleName: string): string[] {
  const files = (globalThis as { mls?: { stor?: { files?: Record<string, { project?: number; level?: number; folder?: string; shortName?: string; extension?: string; status?: string }> } } }).mls?.stor?.files;
  if (!files) return [];
  const folder = `${moduleName}/web/shared`;
  const refs: string[] = [];
  for (const info of Object.values(files)) {
    if (!info || info.status === 'deleted') continue;
    if (info.project !== project || info.level !== 2 || info.folder !== folder || info.extension !== '.defs.ts' || !info.shortName) continue;
    refs.push(`_${project}_/l2/${folder}/${info.shortName}.defs.ts`);
  }
  return refs.sort();
}

/** One step of the l4 process, with `functionRef` when the task names the function it runs. `WorkflowStepEmit` does not keep that field. */
export function workflowStepFunctionRefs(processJson: string): Array<{ stepId: string; functionRef?: string }> {
  const emitted = workflowProcessSteps(processJson);
  if (!processJson) return emitted.map(step => ({ stepId: step.stepId }));
  let row: unknown;
  try { row = JSON.parse(processJson); } catch { return emitted.map(step => ({ stepId: step.stepId })); }
  const tasks = isRecord(row) && Array.isArray(row.tasks) ? row.tasks : [];
  const byId = new Map<string, string>();
  for (const task of tasks) {
    if (!isRecord(task) || typeof task.taskId !== 'string' || typeof task.functionRef !== 'string' || !task.functionRef) continue;
    byId.set(task.taskId, task.functionRef);
  }
  return emitted.map(step => {
    const functionRef = byId.get(step.stepId);
    return functionRef ? { stepId: step.stepId, functionRef } : { stepId: step.stepId };
  });
}

/** `word` as a whole identifier in `text` (letters, digits and `_` stay attached). */
function citesWord(text: string, word: string): boolean {
  if (!word) return false;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escaped}(?=[^\\p{L}\\p{N}_]|$)`, 'u').test(text);
}

function functionIdsOf(processJson: string): string[] {
  let row: unknown;
  try { row = JSON.parse(processJson); } catch { return []; }
  if (!isRecord(row) || !Array.isArray(row.functions)) return [];
  return row.functions.flatMap(item => isRecord(item) && typeof item.functionId === 'string' && item.functionId ? [item.functionId] : []);
}

/**
 * Functions tied to an `llm` step without guessing from the name: a step `functionRef`, or prose that cites the
 * step id as a whole word. Empty when nothing ties — the caller then keeps the section for every function.
 */
function llmLinkedFunctions(processJson: string, steps: readonly WorkflowStepEmit[]): Set<string> {
  const llmIds = new Set(steps.filter(step => step.kind === 'llm').map(step => step.stepId));
  const linked = new Set<string>();
  for (const ref of workflowStepFunctionRefs(processJson)) {
    if (ref.functionRef && llmIds.has(ref.stepId)) linked.add(ref.functionRef);
  }
  for (const name of functionIdsOf(processJson)) {
    const prose = functionProse(processJson, name);
    for (const stepId of llmIds) {
      if (citesWord(prose, stepId)) linked.add(name);
    }
  }
  return linked;
}

/** The llm section stays for this call. With no `llm` step it is already empty. A repair, or no focus, keeps it. */
function includeLlmSection(focus: string | undefined, repair: M12Repair | undefined, processId: string, processJson: string, steps: readonly WorkflowStepEmit[]): boolean {
  if (!steps.some(step => step.kind === 'llm')) return false;
  if (!focus || repair) return true;
  if (workflowLlmExportNames(processId, steps).includes(focus)) return true;
  const linked = llmLinkedFunctions(processJson, steps);
  return linked.size === 0 || linked.has(focus);
}

/**
 * Entities this function touches: the occurrence, entities named in its own prose, and entities of operations whose
 * steps the l4 ties to it by `functionRef`. Without `functionRef`, only the occurrence and the prose count.
 */
function touchedEntities(focus: string, processJson: string, facts: M12WorkflowFacts, titles: ReadonlyArray<{ entityId: string; title: string }>): Set<string> {
  const touched = new Set<string>();
  if (facts.occurrence) touched.add(facts.occurrence);
  for (const entityId of citedEntities(functionProse(processJson, focus), titles)) touched.add(entityId);
  const ownSteps = new Set(workflowStepFunctionRefs(processJson).filter(row => row.functionRef === focus).map(row => row.stepId));
  for (const operation of facts.operations) {
    if (!operation.steps.some(step => ownSteps.has(step))) continue;
    const entityId = operation.operation.split('.')[0];
    if (entityId) touched.add(entityId);
  }
  return touched;
}

/** The l4 process with only `focus` left whole in `functions`; every other function keeps `functionId`. */
function focusFunctions(process: string, focus: string): string {
  let row: unknown;
  try { row = JSON.parse(process); } catch { return process; }
  if (!isRecord(row) || !Array.isArray(row.functions)) return process;
  row.functions = row.functions.map(item => {
    if (!isRecord(item) || item.functionId === focus) return item;
    return { functionId: item.functionId };
  });
  return JSON.stringify(row, null, 2);
}

export async function loadWorkflowContext(ctx: M12Context, unit: M12Unit, repair?: M12Repair, focus?: string): Promise<{ header: string; facts: M12WorkflowFacts; human: string }> {
  const { project, module: moduleName } = ctx.run;
  const facts = workflowFacts(unit);
  const header = `/// <mls fileReference="${unit.outputRef}" enhancement="_blank"/>`;
  const l4Ref = unit.definition.dependencies.find(ref => ref.endsWith(`/l4/${moduleName}/workflows.defs.ts`)) ?? `_${project}_/l4/${moduleName}/workflows.defs.ts`;
  const readProcess = l4Process(await ctx.read(l4Ref), facts.processId);
  const process = focus ? focusFunctions(readProcess, focus) : readProcess;
  if (!process) throw new Error(`PROCESS_UNREAD: ${l4Ref} has no process ${facts.processId}.`);

  const parts: string[] = [];
  parts.push(section('Task', [
    `Write the workflow service of process \`${facts.processId}\` of module ${moduleName}, file \`${unit.outputRef}\`.`,
    `It exports one async function per function of the process: ${facts.functions.map(name => `\`${name}\``).join(', ')}, each \`(input, ctx: RequestContext)\`, with its input and output interfaces exported as \`<Function>Input\` / \`<Function>Output\` (PascalCase). What each one receives, checks, writes, tells and returns, and what happens when it runs twice, is the prose of that function in the l4 process below: the source.`,
    facts.trigger.kind === 'scheduled'
      ? `The process is scheduled ("${facts.trigger.schedule}"): also export \`onTick(ctx: RequestContext, now: Date): Promise<void>\`, which asks \`evaluateSchedule\` whether an occurrence is due and, when it is, runs the function that does the scheduled work. The module tick calls it every minute.`
      : `The process is started by ${facts.trigger.kind === 'event' ? `the event ${facts.trigger.event}` : `the actor ${facts.trigger.actorRef || 'of its journeys'}`}: the request service of the page calls these functions.`,
  ].join('\n')));
  parts.push(section(`Definition ${unit.defRef} (the intent: trigger, occurrence, functions, the entity operations the process reaches)`, fence('json', JSON.stringify(unit.declared.data, null, 2))));
  parts.push(section(`l4 process ${facts.processId} (${l4Ref}, the source)`, fence('json', process.slice(0, 30000))));

  // The operations: the usecase each one runs, or none (a system transition the function applies through the port).
  const lines: string[] = [];
  for (const row of facts.operations) {
    const usecase = operationUsecase(ctx.units, row.operation);
    const external = externalEntityIds(ctx.units).has(row.operation.split('.')[0] ?? '');
    lines.push(`- ${row.operation} (${row.steps.join(', ')}): ${usecase ? `usecase \`${usecase.unitId}\`` : external ? 'no usecase: the function applies it through the gateway of the connection (the entity is external: it has no port)' : 'no usecase: the function applies it through the entity port (POOL_ABSENT)'}`);
  }
  if (lines.length) parts.push(section('Operations of the process', lines.join('\n')));
  const upserts = await processUpserts(ctx, facts);
  if (upserts.length) {
    parts.push(section('Upserts of the process (the arrival that starts it creates and updates the entity)', [
      ...upserts.map(item => `- ${item.entityId}: found by ${item.keyKind === 'id' ? `its id (\`${item.key[0]}\`)` : `its unique key (${item.key.map(field => `\`${field}\``).join(', ')})`}`),
      '',
      'The arrival says it creates and updates the entity: the function looks the record up first through the entity port (`get` by the id, or `list` with a filter on the key fields), calls `update` when the record is there and `create` when it is not. A record that is not there is never written by `update`, and the not-found error of `update` is never the sign that it is missing.',
    ].join('\n')));
  }
  const mdmUsecase = facts.operations.map(row => operationUsecase(ctx.units, row.operation)).find(usecase => usecase && usesMdm(usecase));
  if (mdmUsecase) {
    parts.push(section('The platform MDM (source: how the engine stores and returns this entity today)', mdmContextSection(moduleName, await ctx.read(MDM_ONTOLOGY_REF), await ctx.read(MDM_FACADE_REF), [], await ctx.read(MDM_MODULE_REF))));
  }

  // The calls this process runs (its tasks cite them in `usedBy`): the same gateway section a usecase gets.
  const gateways = await connectionGatewaySection(ctx, facts.processId, unit.definition.artifactId);
  // d1_347 s4: in stage 2 the cm is not a gateway: the error rule of the gateway is for the other connections only.
  const gatewayCalls = !stage2.on || consumedConnectionIds(ctx, facts.processId, unit.definition.artifactId).some(connectionId => connectionId !== 'cm');
  if (gateways) parts.push(gatewayCalls ? `${gateways}\n${GATEWAY_CALL_ERROR}` : gateways);
  const received = await receivedInputSection(ctx, unit.definition.data, focus);
  if (received) parts.push(received);
  const transaction = await transactionSection(ctx, unit, facts, focus, Boolean(gateways));
  if (transaction) parts.push(transaction);
  const stepCalls = await stepCallsFor(ctx, facts.processId);
  if (stepCalls.length) {
    const stepOf = new Map(workflowProcessSteps(readProcess).map(step => [step.stepId, step]));
    const lines = await Promise.all(stepCalls.map(async call => {
      const step = stepOf.get(call.stepId);
      const input = await catalogInputOf(ctx, call);
      const output = await catalogOutputOf(ctx, call);
      const usecaseUnit = call.usecase ? ctx.units.find(item => item.definition.artifactType === 'usecase' && usecaseNames(item).includes(call.usecase ?? '')) : undefined;
      const where = `\`${call.stepId}\`${step ? ` (${step.kind}${step.title ? `, ${step.title}` : ''})` : ''}`;
      const run = call.usecase
        ? `call the usecase \`${call.usecase}(input, ctx)\`, which consumes ${call.connectionId}.${call.operationId}${usecaseUnit ? ` (import from \`/${usecaseUnit.outputRef.replace(/\.ts$/u, '.js')}\`)` : ''}; the gateway is not needed`
        : stage2.on && call.connectionId === 'cm'
          ? `\`cm(ctx).${call.operationId}(input, options?, context?)\` (cm.${call.operationId}); the answer is a \`ConnectionResult\` (the rules of the cm client above); fields of the connection context such as \`agentId\` go in \`context\`, and a repeat key goes in \`options.idempotencyKey\` only when an l4 rule names a business key`
          : `\`gateway.${call.operationId}(input, ctx, opts?, context?)\` (${call.connectionId}.${call.operationId}); fields of the connection context such as \`agentId\` go in \`context\`, and a repeat key goes in \`opts.idempotencyKey\``;
      return [
        `- step ${where} → ${run}`,
        input ? `  input ${input.type} =\n${fence('ts', input.text)}` : '',
        output ? `  output ${output.type} =\n${fence('ts', output.text)}` : '',
      ].filter(Boolean).join('\n');
    }));
    parts.push(section('Calls of the steps (the L4 `usedBy`: each step runs its call; the file must make every call below)', [
      'The step that runs a call is the code of its function. When a usecase of the module consumes the call, call that usecase: it runs the call, and the file needs no gateway for it. Only a call that no usecase consumes goes through the gateway: resolve it and call the method with the input below. Importing a usecase or the gateway type is not calling it.',
      CALL_OUTPUT_RESOLVE,
      ...lines,
    ].join('\n')));
  }

  const sent = new Set<string>();
  const enumLines: string[] = [];
  for (const dep of dependencyUnits(ctx, unit)) {
    const generated = await readOptional(dep.output);
    if (!generated) continue;
    sent.add(dep.defRef);
    parts.push(section(`Usecase ${dep.unitId}`, [`Import from \`/${dep.outputRef.replace(/\.ts$/u, '.js')}\`.`, fence('ts', exportSignatures(generated))].join('\n\n')));
  }
  // d1_283: the usecase a step calls (`listAgent`, `getAgent`: it consumes a call of the cm) is not a dependency of the process def, so its signature was missing: the
  // section above gave the input of the call and never the output the usecase returns, and the model read a field the usecase does not carry.
  for (const call of stepCalls) {
    const called = call.usecase ? ctx.units.find(item => item.definition.artifactType === 'usecase' && usecaseNames(item).includes(call.usecase ?? '')) : undefined;
    if (!called || sent.has(called.defRef)) continue;
    const generated = await readOptional(called.output);
    if (!generated) continue;
    sent.add(called.defRef);
    parts.push(section(`Usecase ${called.unitId}`, [`Import from \`/${called.outputRef.replace(/\.ts$/u, '.js')}\`.`, fence('ts', exportSignatures(generated))].join('\n\n')));
  }
  const callers = await callersSection(ctx, unit, facts, focus);
  if (callers) parts.push(callers);
  // The entity of the occurrence and of every operation, with its port: a system transition and the occurrence
  // record are read and written through them. And every entity the prose of the process names: the daily notice
  // reads the open tasks, and without the Tarefa entity the model guessed its states (todo, inProgress).
  // Citations are read on the whole process, so a focused call still sends the signature of an entity another
  // function names. The ontology of an entity this function does not touch is omitted, except on a repair.
  const titles = (await entityNames(ctx)).flatMap(names => [{ entityId: names.entityId, title: names.title }, { entityId: names.entityId, title: names.entityId }]);
  const core = new Set([facts.occurrence, ...facts.operations.map(row => row.operation.split('.')[0])].filter(Boolean));
  const entities = new Set([...core, ...citedEntities(readProcess, titles)]);
  // One hop: a reference field of an entity already in the set names another entity of the module. The port and the summary follow the same path as a cited entity.
  const referenced: string[] = [];
  for (const item of ctx.units) {
    if (item.definition.artifactType !== 'domainEntity') continue;
    const entityId = String(item.definition.data.entityId ?? '');
    if (!entities.has(entityId)) continue;
    referenced.push(...ontologyReferenceTargets(await ctx.read(ontologyRef(item.definition, item.outputRef))));
  }
  for (const entityId of referenced) entities.add(entityId);
  const narrow = Boolean(focus) && !repair;
  const touched = narrow && focus ? touchedEntities(focus, readProcess, facts, titles) : null;
  for (const item of ctx.units) {
    const kind = item.definition.artifactType;
    if ((kind !== 'domainEntity' && kind !== 'repositoryPort') || !entities.has(String(item.definition.data.entityId ?? ''))) continue;
    const generated = await readOptional(item.output);
    parts.push(section(`${kind} ${item.definition.artifactId}`, [
      `Import from \`/${item.outputRef.replace(/\.ts$/u, '.js')}\`.${kind === 'repositoryPort' ? ` Resolve it with \`resolveRepository<${String(item.definition.data.interfaceName ?? '')}>(ctx, '${String(item.definition.data.interfaceName ?? '')}')\`.` : ''}`,
      generated ? fence('ts', exportSignatures(generated)) : fence('json', JSON.stringify(item.definition.data)),
    ].join('\n\n')));
    if (kind === 'domainEntity') {
      const entityId = String(item.definition.data.entityId ?? '');
      const unique = repositoryUniqueKeySection(ctx.units, entityId);
      if (unique) parts.push(section(`Unique keys of the table of ${entityId}`, unique));
      if (touched && !touched.has(entityId)) {
        // d1_292: an entity the process writes through its port (an operation with no usecase) keeps what the l4 says about that write, whichever function writes it: the task that names the
        // entity is tied to no function, so the narrow context would leave out the capability (`upserting by agent`) and the unique key the function needs.
        const written = core.has(entityId) && facts.operations.some(row => row.operation.split('.')[0] === entityId && !operationUsecase(ctx.units, row.operation) && !externalEntityIds(ctx.units).has(entityId));
        const compact = written ? portWriteSection(entityId, await ctx.read(ontologyRef(item.definition, item.outputRef))) : '';
        if (compact) parts.push(compact);
        continue;
      }
      const ontology = await ctx.read(ontologyRef(item.definition, item.outputRef));
      if (ontology) {
        const cited = !core.has(entityId);
        if (!cited) enumLines.push(...entityEnumTypes(entityId, ontology).map(line => `- ${line}`));
        parts.push(section(`l4 ontology of ${item.definition.artifactId} (source: states, transitions, derived fields)`, fence('ts', cited ? citedOntology(ontology) : ontology.slice(0, 20000))));
      }
    }
  }
  if (enumLines.length) {
    parts.push(section('Entity enum fields this process writes', enumLines.join('\n')));
  }
  const rulesSource = await readOptional(rulesFile(project, moduleName));
  const rules = ruleTexts(rulesSource, allRuleIds(rulesSource));
  if (rules.length) parts.push(section('Rules of the module (l4 text)', rules.map(rule => `- ${rule.ruleId}: ${rule.text}`).join('\n')));

  const adapter = workflowEngineFile(project, moduleName);
  const adapterSource = await readOptional(adapter);
  if (adapterSource) parts.push(section('The module engine (one engine per process, the step tables, the destination status of each operation)', [`Import from \`${moduleSpecifier(adapter)}\`. Open and advance through it. \`transitionTo\` is the destination status of each operation. The function that returns the person of a human step calls \`resolveStepPerson\` from this file.`, fence('ts', workflowEngineShown(adapterSource))].join('\n\n')));
  // d1_304: an upsert of the occurrence entity is not a creation (the record exists from the second arrival on): only a plain `<entity>.create` is (a create that the process also upserts is not).
  const createsOccurrence = Boolean(facts.occurrence) && facts.operations.some(row => row.operation === `${facts.occurrence}.create`) && !upserts.some(item => item.entityId === facts.occurrence);
  const receivesArrival = processReceives(unit.definition.data).size > 0;
  const perArrival = receivesArrival && !createsOccurrence;
  parts.push(section('Occurrence record id', perArrival
    ? [
      `The occurrence is one per arrival: \`recordId = occurrenceRecordId(ctx, '${facts.processId}', seed)\`.`,
      arrivalSeedLines(),
      'A safe repeat is the one the L4 states: a state already at the destination changes nothing and is not an error.',
      'The form is the one of `executionRecording` (the seed is `executionRef`) and of `toolCatalogRefresh` (it updates records that already exist).',
      'Import `occurrenceRecordId` and `createOccurrenceContext` from `/_102034_/l1/workflow/index.js`. The version of an occurrence is the one the engine stored (the release, or `null`).',
    ].join('\n')
    : receivesArrival && facts.trigger.kind === 'event'
      ? [
        `On creation in an arrival, \`recordId = occurrenceRecordId(ctx, '${facts.processId}', seed)\` and the create usecase is called with \`createOccurrenceContext(ctx, recordId)\`.`,
        arrivalSeedLines(),
        'An arrival from a system outside the platform has no person.',
        'That context returns the occurrence record id on the first `newId` and delegates every later id to the parent generator. Check, on that usecase, that the record is the first `newId`.',
        FIRST_NEW_ID,
        'Import `occurrenceRecordId` and `createOccurrenceContext` from `/_102034_/l1/workflow/index.js`. The version of an occurrence is the one the engine stored (the release, or `null`).',
      ].join('\n')
      : [
      `On creation, \`recordId = occurrenceRecordId(ctx, '${facts.processId}')\` and the create usecase is called with \`createOccurrenceContext(ctx, recordId)\`.`,
      'That context returns the occurrence record id on the first `newId` and delegates every later id to the parent generator. Check, on that usecase, that the record is the first `newId`.',
      FIRST_NEW_ID,
      'Import `occurrenceRecordId` and `createOccurrenceContext` from `/_102034_/l1/workflow/index.js`. The version of an occurrence is the one the engine stored (the release, or `null`).',
    ].join('\n')));
  parts.push(section('How every process function uses the engine', engineUseRules(moduleName, facts.processId, facts.trigger.kind)));
  const processSteps = workflowProcessSteps(readProcess);
  const platform = [WORKFLOW_INDEX_REF, WORKFLOW_ENGINE_REF, WORKFLOW_CONTRACTS_REF, WORKFLOW_RECORD_ID_REF, PLATFORM_FILES.requestContext, PLATFORM_FILES.repositoryRegistry, ...(facts.trigger.kind === 'scheduled' ? [EVALUATE_SCHEDULE_REF] : [])];
  const platformSources = await Promise.all(platform.slice(0, 3).map(ref => ctx.read(ref)));
  const indexSource = platformSources[0] ?? '';
  let wakeSignature = typeAlias(indexSource, 'WorkflowWakeHandler');
  if (!wakeSignature) {
    const ref = reexportRef(indexSource, 'WorkflowWakeHandler');
    wakeSignature = ref ? typeAlias(await ctx.read(ref) ?? '', 'WorkflowWakeHandler') : '';
  }
  const llm = includeLlmSection(focus, repair, facts.processId, readProcess, processSteps)
    ? llmStepSection(facts.processId, processSteps, wakeSignature)
    : '';
  if (llm) parts.push(section('An llm step', llm));
  for (const ref of platform) {
    const source = await ctx.read(ref);
    if (source) parts.push(section(`Platform ${ref}`, [`Import from \`/${ref.replace(/\.ts$/u, '.js')}\`.`, fence('ts', exportSignatures(source))].join('\n\n')));
  }
  const l5Config = await ctx.read(`_${project}_/l5/config.json`);
  if (onboardingModuleId(l5Config) === moduleName) {
    parts.push(registrationAccessSection(moduleName, l5Config, await ctx.read(REGISTRATION_REF)));
  }
  if (repair) {
    parts.push(section('Repair', [
      'The previous answer was refused. Fix exactly these problems and return the whole file again:',
      ...repair.problems.map(problem => `- ${problem}`),
      repair.previous ? `\nPrevious answer:\n${fence('ts', repair.previous)}` : '',
    ].join('\n')));
  }
  return { header, facts, human: parts.join('\n') };
}

/** Transition id → the state it leads to, from the lifecycle of every entity of the module. */
export function transitionTargets(units: readonly M12Unit[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const unit of units.filter(item => item.definition.artifactType === 'domainEntity')) {
    const lifecycle = unit.definition.data.lifecycle;
    const transitions = isRecord(lifecycle) && Array.isArray(lifecycle.transitions) ? lifecycle.transitions.filter(isRecord) : [];
    for (const transition of transitions) {
      const id = text(transition.transitionId);
      const to = text(transition.to);
      if (id && to) out.set(id, to);
    }
  }
  return out;
}

/** The top-level arguments of every `.transition(…)` call: read by brackets and quotes, never by a fixed shape. */
export function transitionCalls(code: string): Array<{ record: string; transitionId: string }> {
  const out: Array<{ record: string; transitionId: string }> = [];
  for (const match of code.matchAll(/\.transition\s*\(/gu)) {
    const args: string[] = [];
    let depth = 0;
    let quote = '';
    let current = '';
    let at = (match.index ?? 0) + match[0].length;
    for (; at < code.length; at += 1) {
      const char = code[at];
      if (quote) {
        current += char;
        if (char === '\\') { current += code[at + 1] ?? ''; at += 1; } else if (char === quote) quote = '';
        continue;
      }
      if (char === '\'' || char === '"' || char === '`') { quote = char; current += char; continue; }
      if (char === '(' || char === '{' || char === '[') depth += 1;
      if (char === ')' || char === '}' || char === ']') {
        if (depth === 0) break;
        depth -= 1;
      }
      if (char === ',' && depth === 0) { args.push(current.trim()); current = ''; continue; }
      current += char;
    }
    if (current.trim()) args.push(current.trim());
    const id = /^['"`]([A-Za-z_$][\w$]*)['"`]$/u.exec(args[args.length - 1] ?? '')?.[1];
    if (id && args.length >= 2) out.push({ record: args[0], transitionId: id });
  }
  return out;
}

/**
 * A port `transition(record, '<id>')` whose record never takes the state the transition leads to. The adapter stores
 * the record as given (the id is a label): the daily notice called concluirAviso and stayed `pending` (tarefas, 16/10),
 * first with a variable, then with the object built inside the call. The state must be written on a field
 * (`status: '<to>'`): inside the object when the call builds it, anywhere in the file when it passes a variable. A bare
 * `return '<to>'` is not a write. The states come from the module lifecycles: nothing here names one.
 */
export function workflowTransitionProblems(code: string, targets: ReadonlyMap<string, string>): string[] {
  const problems: string[] = [];
  const reported = new Set<string>();
  for (const call of transitionCalls(code)) {
    const to = targets.get(call.transitionId);
    if (!to) continue;
    const written = new RegExp(`[A-Za-z_$][\\w$]*\\s*:\\s*['"\`]${to}['"\`]`, 'u');
    const scope = call.record.startsWith('{') ? call.record : code;
    if (written.test(scope)) continue;
    if (reported.has(call.transitionId)) continue;
    reported.add(call.transitionId);
    problems.push(`Transition ${call.transitionId} leads to '${to}', and the record passed to \`transition(record, '${call.transitionId}')\` never takes that state: set it on the record (\`status: '${to}'\`, with the payload fields). The port stores the record as given.`);
  }
  return problems;
}

/** Problems of a model-written workflow service. Empty = the gate passes. */
export function workflowGate(code: string, input: { siblingImports?: readonly string[]; header: string; facts: M12WorkflowFacts; project: number; moduleName: string; ports: readonly string[]; gateways?: readonly string[]; targets?: ReadonlyMap<string, string>; llmExports?: readonly string[] ; usecaseInputs?: ReadonlyMap<string, readonly M12InputField[]> }): string[] {
  const problems: string[] = [];
  if (input.targets) problems.push(...workflowTransitionProblems(code, input.targets));
  if ((code.split('\n')[0]?.trim() ?? '') !== input.header) problems.push(`The first line must be exactly: ${input.header}`);
  for (const name of input.llmExports ?? []) {
    if (!new RegExp(`export\\s+async\\s+function\\s+${name}\\s*\\(`, 'u').test(code)) problems.push(`The process file must export \`${name}\` (\`export async function ${name}\`).`);
  }
  for (const name of input.facts.functions) {
    if (!new RegExp(`export\\s+async\\s+function\\s+${name}\\s*\\(`, 'u').test(code)) problems.push(`The process function \`${name}\` must be exported as \`export async function ${name}(input, ctx: RequestContext)\`.`);
  }
  if (input.facts.trigger.kind === 'scheduled') {
    if (!/export\s+async\s+function\s+onTick\s*\(/u.test(code)) problems.push('A scheduled process exports `onTick(ctx: RequestContext, now: Date): Promise<void>`: the module tick calls it every minute.');
    if (!/\bevaluateSchedule\s*\(/u.test(code)) problems.push('`onTick` asks `evaluateSchedule(schedule, now, lastRun)` whether an occurrence is due: never a hard-coded hour.');
  }
  if (input.facts.occurrence && !code.includes(moduleSpecifier(workflowEngineFile(input.project, input.moduleName)))) {
    problems.push(`The process keeps an occurrence of ${input.facts.occurrence}: open and advance it through the module engine (${moduleSpecifier(workflowEngineFile(input.project, input.moduleName))}), never in a table of your own.`);
  }
  if (/\bas\s+unknown\s+as\b/u.test(code) || /\bas\s+any\b/u.test(code)) problems.push('No `as unknown as` and no `as any`.');
  problems.push(...typedResultDiscardedProblems(code));
  problems.push(...typeLeakProblems(code));
  problems.push(...emptyCastProblems(code));
  problems.push(...recordCastProblems(code));
  problems.push(...emptyRequiredProblems(code, input.usecaseInputs ?? new Map()));
  problems.push(...repositoryProblems(code, input.ports, input.gateways));
  problems.push(...gatewayBypassProblems(code));
  const ownL1 = `/_${input.project}_/l1/${input.moduleName}/`;
  for (const specifier of importSpecifiers(code)) {
    if (!specifier.startsWith('/') || !specifier.endsWith('.js')) { problems.push(`Import "${specifier}" must start with / and end with .js.`); continue; }
    if (!specifier.startsWith('/_102034_/l1/') && !isCatalogImport(specifier) && !specifier.startsWith(ownL1) && !(input.siblingImports ?? []).includes(specifier)) problems.push(`Import "${specifier}" is outside the platform (/_102034_/l1/) and this module (${ownL1}).`);
  }
  if (usesNodeBuiltin(code)) problems.push('No node: import.');
  if (/\bfetch\s*\(/u.test(code)) problems.push('No fetch().');
  if (/\blocalStorage\b|\bsessionStorage\b/u.test(code)) problems.push('No browser storage.');
  if (/catch\s*(\([^)]*\))?\s*\{\s*\}/u.test(code)) problems.push('No empty catch: an error names its cause.');
  return problems;
}

/** Entity ids named by a reference field (`to`) of the ontology, including a field nested under another. One hop: the caller does not walk the targets. */
export function ontologyReferenceTargets(source: string | null): string[] {
  const body = l4RecordOf(source);
  const record = body && isRecord(body.record) ? body.record : null;
  const fields = record && isRecord(record.fields) ? record.fields : null;
  if (!fields) return [];
  const out: string[] = [];
  const walk = (node: Record<string, unknown>): void => {
    for (const meta of Object.values(node)) {
      if (!isRecord(meta)) continue;
      if (Array.isArray(meta.to)) {
        for (const id of meta.to) if (typeof id === 'string' && id && !out.includes(id)) out.push(id);
      }
      if (isRecord(meta.fields)) walk(meta.fields);
    }
  };
  walk(fields);
  return out;
}

/** Printed definition of an empty catalog output: the function returns `{}`. */
function outputReturnsEmpty(definition: string): boolean {
  const flat = definition.replace(/\s+/gu, '');
  return flat === '{}' || flat === 'Record<string,never>';
}

/**
 * The catalog output of a serve arrival, resolved the same way as an input (`resolveInputType`, cited types three levels down).
 * Null when the catalog names none or the type does not resolve.
 */
async function arrivalOutputOf(ctx: M12Context, arrival: string): Promise<{ type: string; text: string } | null> {
  const dot = arrival.indexOf('.');
  if (dot <= 0) return null;
  const catalog = await connectionCatalogSource(ctx.read, ctx.run.project, ctx.run.module, arrival.slice(0, dot));
  const operation = catalog.source ? catalogOperations(catalog.source)?.find(item => item.operationId === arrival.slice(dot + 1) && item.direction !== 'call') : undefined;
  if (!catalog.source || !operation?.outputType) return null;
  const resolved = await resolveInputType({
    entry: catalog.source,
    typeName: operation.outputType,
    depth: 3,
    readImport: async specifier => (specifier.startsWith('/_') ? ctx.read(specifier.replace(/\.js$/u, '.ts')) : null),
  });
  return resolved.text ? { type: operation.outputType, text: resolved.text } : null;
}

/** How an arrival picks the seed of its occurrence. The third branch (a person creates the record) does not use it. */
function arrivalSeedLines(): string {
  return [
    '`seed` is, in order: the key of the message the L4 names; otherwise `ctx.requestMeta?.connection?.idempotencyKey`; otherwise `ctx.requestMeta?.requestId`.',
    'On an arrival served by a connection, `requestId` is always present: the platform sets it to the idempotency key, or to a new value when there is none.',
    'When none of the three is present, the function throws `AppError` with its own code. It never invents a seed and never fails without that error.',
  ].join('\n');
}

/** `createOccurrenceContext` serves the record id on the first `newId`; the generated create usecase writes `id` from that call. */
const FIRST_NEW_ID = '`createOccurrenceContext(ctx, recordId)` makes the first `newId` the id of the record. The generated usecase uses that first `newId` for the `id` (`ctx.idGenerator.newId()`).';

/** Output of a `call`, same resolver as the input, three levels down (d1_309). */
const CALL_OUTPUT_RESOLVE = 'The output type of a `call` is resolved the same way as the input (`resolveInputType`, cited types three levels down).';

/** What the generated gateway throws. The codes are the keys of `CONNECTION_STATUS`, the map the emitter writes into the gateway (`STATUS`). */
const GATEWAY_CALL_ERROR = 'When the call is not ok, the gateway throws `new AppError(result.code, result.message, STATUS[result.code], result.code === \'disabled\' && result.missing ? { missing: result.missing } : undefined)`. `code` is one of ' + Object.keys(CONNECTION_STATUS).map(code => `\`${code}\``).join(', ') + '. `disabled` carries `missing` when the gateway has it.';

/** A conflict is the repeat only on the write of the record the L4 repeat search reads; any other conflict is a concurrent write and goes up as an error (d1_311, after d1_309). */
export const CONFLICT_ENDS_THE_FUNCTION = [
  'A `CONFLICT` (a unique key) or a version conflict is the repeat only when it is thrown by the write of the record the repeat search of the L4 reads, that is, the record that identifies the arrival. There the function returns the repeat result or the refusal the L4 states, and it writes nothing more in that transaction.',
  'On any other write the conflict is a concurrent write, not a repeat: it goes up as the error, the route undoes the whole transaction, the arrival fails and the caller repeats it. Never catch a conflict outside the write of the repeat-search record.',
  'When the L4 describes no repeat search, no conflict is a repeat: every conflict goes up.',
  'After a conflict the transaction accepts no more writes. An error from the database aborts the transaction; the repository check does not, and the rule is the same.',
].join(' ');

/** An update that only copies values of the arrival writes only when one value differs from the record read (d1_311). */
export const COPY_ONLY_WHEN_DIFFERENT = 'An update that only copies values of the arrival into a record already read (a name, a label, a handle) writes only when at least one value differs from the record read. With no difference there is no write, and the function goes on with the record it read. A write that is not needed is one more conflict.';

/** The catalog input type of a call, resolved (d1_200). Null when the catalog or the operation is not readable. */
async function catalogInputOf(ctx: M12Context, call: { connectionId: string; operationId: string }): Promise<{ type: string; text: string } | null> {
  const source = (await connectionCatalogSource(ctx.read, ctx.run.project, ctx.run.module, call.connectionId)).source;
  const operation = source ? catalogOperations(source)?.find(item => item.operationId === call.operationId) : undefined;
  if (!source || !operation) return null;
  const resolved = await resolveInputType({ entry: source, typeName: operation.inputType, readImport: async specifier => (specifier.startsWith('/_') ? ctx.read(specifier.replace(/\.js$/u, '.ts')) : null) });
  return resolved.text ? { type: operation.inputType, text: resolved.text } : null;
}

/** The catalog output type of a `call`, resolved like the input (`resolveInputType`, three levels). Null when the catalog or the operation is not readable. */
async function catalogOutputOf(ctx: M12Context, call: { connectionId: string; operationId: string }): Promise<{ type: string; text: string } | null> {
  const source = (await connectionCatalogSource(ctx.read, ctx.run.project, ctx.run.module, call.connectionId)).source;
  const operation = source ? catalogOperations(source)?.find(item => item.operationId === call.operationId && item.direction === 'call') : undefined;
  if (!source || !operation?.outputType) return null;
  const resolved = await resolveInputType({
    entry: source,
    typeName: operation.outputType,
    depth: 3,
    readImport: async specifier => (specifier.startsWith('/_') ? ctx.read(specifier.replace(/\.js$/u, '.ts')) : null),
  });
  return resolved.text ? { type: operation.outputType, text: resolved.text } : null;
}

/**
 * d1_282: the message a function of the process receives (the L4 `receives`, read by the D1 into `data.receives`). The route that serves the arrival calls the
 * function with the message, so the function takes the catalog type of the arrival as its input: without it the model does not know the shape of what it is
 * handed (`PlatformReleaseCatalogChangedInput`: the actions of the release) and asks for the key, the origin and the texts of the contract. The type comes from the
 * catalog of the connection, with the catalog types its fields name, three levels down at most. Only the function in focus (every function of the file when none is). '' when
 * no function receives an arrival.
 */
export async function receivedInputSection(ctx: M12Context, processData: Record<string, unknown>, focus?: string): Promise<string> {
  const blocks: string[] = [];
  for (const [arrival, fn] of processReceives(processData)) {
    if (focus && focus !== fn) continue;
    const input = await arrivalInputOf(ctx.read, ctx.run.project, ctx.run.module, arrival);
    if (!input) continue;
    const said = text(arrivalLineOf(await ctx.read(`_${ctx.run.project}_/l4/${ctx.run.module}/integration.defs.ts`), arrival)?.row.description);
    const output = await arrivalOutputOf(ctx, arrival);
    const emptyOutput = output ? outputReturnsEmpty(output.text) : false;
    const outside = input.connectionId ? (await connectionCatalogSource(ctx.read, ctx.run.project, ctx.run.module, input.connectionId)).origin !== 'platform' : false;
    blocks.push([
      `- \`${fn}\` is called with the message of the arrival \`${arrival}\`: its input is \`${input.inputType}\`, and the route passes the whole message.`,
      outside ? '  The value of the public address is not a field of that message. Read the only value from the `ctx` the route passes, `Object.values(ctx.requestMeta?.connection?.context?.hookParams ?? {})[0]`, whatever the name of the key. When that value is absent or empty, refuse the call; never invent a value.' : '',
      said ? `  The L4 says what this arrival does (the source; follow it, including which items of the message count): ${clip(said, 2400)}` : '',
      `  \`import type { ${input.inputType} } from '${input.importPath}'\`; type the \`input\` parameter of \`${fn}\` as \`${input.inputType}\`.`,
      output ? `  The \`Output\` of \`${fn}\` is \`${output.type}\` (\`import type { ${output.type} } from '${input.importPath}'\`). Its definition: \`${output.text}\`${emptyOutput ? '. The function returns `{}`,' : ''} and the route returns what the function returns.` : '',
      input.shapes.length ? `  The catalog types: ${input.shapes.join('; ')}. Read the key, the origin and the items of the message from these fields, none else.` : '',
    ].filter(Boolean).join('\n'));
  }
  return blocks.length ? section('What the functions that receive an arrival are called with', blocks.join('\n')) : '';
}

/**
 * d1_292: what the l4 says about the write of an entity the process applies through its port: the capability texts of the entity (when the write is made, what a repeat does, the transaction)
 * and its unique keys. '' when the ontology has neither. Read with the reader of the d1_291 (`l4RecordOf`).
 */
export function portWriteSection(entityId: string, ontologySource: string | null): string {
  const l4 = l4RecordOf(ontologySource);
  if (!l4) return '';
  const capabilities = isRecord(l4.capabilities) ? Object.entries(l4.capabilities).filter((pair): pair is [string, string] => typeof pair[1] === 'string') : [];
  const uniqueKeys = Array.isArray(l4.uniqueKeys) ? l4.uniqueKeys.filter(Array.isArray).map(key => `(${key.join(', ')})`) : [];
  if (!capabilities.length && !uniqueKeys.length) return '';
  return section(`What the l4 says about ${entityId} (the process writes it through its port)`, [
    ...capabilities.map(([name, text]) => `- ${name}: ${text}`),
    uniqueKeys.length ? `Unique keys: ${uniqueKeys.join(', ')}.` : '',
  ].filter(Boolean).join('\n'));
}

/**
 * d1_288: the functions of this process that a route of the module calls inside its transaction. The route of an arrival (`receives`) is a command and runs in
 * `ctx.data.moduleData.runInTransaction` (the gate of the request service requires it); a generated route that calls a function and holds `runInTransaction` says
 * the same. The L4 asks the rebuild of a catalog to be all or nothing, and the model, not seeing that the route already does it, wrote code that refused for want of
 * a transaction. A function no route calls (the scheduled `onTick`) gets nothing. '' when no function in focus is called by a route.
 */
export async function transactionSection(ctx: M12Context, unit: M12Unit, facts: M12WorkflowFacts, focus?: string, outsideCall = false): Promise<string> {
  const receiving = new Set(processReceives(unit.definition.data).values());
  const routes: string[] = [];
  for (const other of ctx.units.filter(item => item.layer === 'requests')) {
    const code = await readOptional(other.output);
    if (code) routes.push(withoutComments(code));
  }
  const inRoute = (fn: string): boolean => routes.some(code => code.includes('runInTransaction') && new RegExp(`(?<![\\w$.])${fn}\\s*\\(`, 'u').test(code));
  // d1_347 s4: the functions a route SERVED TO THE CM calls (stage 2): the transaction is the one `serveCm` opens, the routes hold no `runInTransaction`, and the repeat is `once`.
  const viaServeCm = new Set(stage2.on ? [...processReceives(unit.definition.data)].filter(([arrival]) => arrival.startsWith('cm.')).map(([, fn]) => fn) : []);
  const all = facts.functions.filter(fn => (!focus || focus === fn) && (receiving.has(fn) || inRoute(fn) || viaServeCm.has(fn)));
  const names = all.filter(fn => !viaServeCm.has(fn));
  const cmNames = all.filter(fn => viaServeCm.has(fn));
  if (!all.length) return '';
  const tail = outsideCall ? ['A call to a system outside the module is not undone by the transaction. The function makes that call once and stores the result. What stops a repeat send is what the L4 says (for example, look the request up by its reference before calling). Without that in the L4, a failure between the call and the commit can repeat the call, and that does not ask for a protocol of its own.'] : [];
  return section('The transaction of the route', [
    ...(names.length ? [
      `The route that calls ${names.map(fn => `\`${fn}\``).join(', ')} already runs ${names.length > 1 ? 'them' : 'it'} inside \`ctx.data.moduleData.runInTransaction\` and passes ${names.length > 1 ? 'them' : 'it'} the context bound to that transaction, as \`ctx\`.`,
      'Every write through the ports and the usecases with that `ctx` is all or nothing. Write the function as one pass over that `ctx`; open no transaction of your own, and take the L4 requirement of all or nothing as met by this.',
      CONFLICT_ENDS_THE_FUNCTION,
      COPY_ONLY_WHEN_DIFFERENT,
      keptRefusalText(),
    ] : []),
    ...(cmNames.length ? [
      `${cmNames.map(fn => `\`${fn}\``).join(', ')} ${cmNames.length > 1 ? 'are' : 'is'} ${CM_SERVE_TRANSACTION}`,
      'Every write through the ports and the usecases with that `ctx` is all or nothing. Write the function as one pass over that `ctx`, and take the L4 requirement of all or nothing as met by this.',
      CM_CONFLICT,
      COPY_ONLY_WHEN_DIFFERENT,
      CM_REFUSAL,
      CM_ONCE_REFUSAL_RULE,
      CM_ONCE,
      CM_ORDER,
    ] : []),
    ...tail,
  ].join('\n'));
}

/**
 * d1_283: how the files of the module call the functions of this process today. A regeneration that gives a function another input breaks them (the
 * `virtualEmployeeCreation` lost `draftId`, and three callers failed to compile): the call sites already say what the input is. Read from the generated files
 * of the other units of the module (the routes, the usecases, the other processes), the first calls of each function, as written. '' when nothing calls it.
 */
export async function callersSection(ctx: M12Context, unit: M12Unit, facts: M12WorkflowFacts, focus?: string): Promise<string> {
  const lines: string[] = [];
  const others = ctx.units.filter(item => item.defRef !== unit.defRef && item.layer !== 'adapter');
  const sources: Array<{ unitId: string; code: string }> = [];
  for (const other of others) {
    const code = await readOptional(other.output);
    if (code) sources.push({ unitId: other.unitId, code: withoutComments(code) });
  }
  for (const fn of facts.functions) {
    if (focus && focus !== fn) continue;
    const found: string[] = [];
    for (const source of sources) {
      for (const match of source.code.matchAll(new RegExp(`(?<![\\w$.])${fn}\\s*\\(`, 'gu'))) {
        const at = match.index ?? 0;
        if (/\b(?:function|import)\s+[\w$\s,{}]*$/u.test(source.code.slice(Math.max(0, at - 40), at))) continue;
        let depth = 0;
        let end = at + match[0].length - 1;
        for (; end < source.code.length; end += 1) {
          if (source.code[end] === '(') depth += 1;
          else if (source.code[end] === ')') { depth -= 1; if (depth === 0) break; }
        }
        found.push(`  - ${source.unitId}: \`${source.code.slice(at, end + 1).replace(/\s+/gu, ' ').trim().slice(0, 300)}\``);
        if (found.length >= 3) break;
      }
      if (found.length >= 3) break;
    }
    if (found.length) lines.push(`- \`${fn}\` is called today as:`, ...found);
  }
  return lines.length ? section('How the module calls the functions of this process today (the input they pass: keep it)', ['Files of the module already call these functions. Give each function the input they pass, with the same names, or they stop compiling.', ...lines].join('\n')) : '';
}

/** d1_282: the usecases of the module with the entity and operation each runs and the names a file calls it by, for the gate of an upsert in a process. */
export function moduleUsecaseCalls(units: readonly M12Unit[]): Array<{ entityId: string; operation: string; names: string[] }> {
  return units.filter(unit => unit.definition.artifactType === 'usecase').map(unit => ({
    entityId: String(unit.definition.data.entityId ?? ''),
    operation: String(unit.definition.data.operation ?? ''),
    names: usecaseNames(unit).filter(name => /^[A-Za-z_$][\w$]*$/u.test(name)),
  })).filter(item => item.entityId && item.operation);
}

function usecaseNames(unit: M12Unit): string[] {
  const first = Array.isArray(unit.definition.data.functions) ? unit.definition.data.functions[0] : null;
  const fnName = isRecord(first) ? text(first.functionName) : '';
  return [unit.definition.artifactId, ...(fnName ? [fnName] : [])];
}

/** The calls the steps of a process run (the L4 `usedBy`), each with the usecase of the module that consumes it (d1_204). */
async function stepCallsFor(ctx: M12Context, processId: string): Promise<StepCall[]> {
  const { project, module: moduleName } = ctx.run;
  const calls = stepCallsOf(await ctx.read(`_${project}_/l4/${moduleName}/integration.defs.ts`), processId);
  if (calls.length === 0) return calls;
  const rows = ctx.units.filter(item => item.definition.artifactType === 'integrationOutbound').flatMap(item => connectionRowsOf(item.definition.data));
  const usecases = new Set(ctx.units.filter(item => item.definition.artifactType === 'usecase').flatMap(usecaseNames));
  return withUsecases(calls, rows, usecases);
}

export async function workflowAnswerProblems(ctx: M12Context, unit: M12Unit, code: string, _notApplicable: readonly M12RuleNotApplicable[]): Promise<string[]> {
  const facts = workflowFacts(unit);
  const header = `/// <mls fileReference="${unit.outputRef}" enhancement="_blank"/>`;
  const ports = [...repositoryPortNames(ctx.units, item => String((item.definition.data as { interfaceName?: unknown }).interfaceName ?? item.definition.artifactId)), ...moduleGatewayNames(ctx.units)];
  const gateways = moduleGatewayNames(ctx.units);
  const { project, module: moduleName } = ctx.run;
  const l4Ref = unit.definition.dependencies.find(ref => ref.endsWith(`/l4/${moduleName}/workflows.defs.ts`)) ?? `_${project}_/l4/${moduleName}/workflows.defs.ts`;
  const llmExports = workflowLlmExportNames(facts.processId, workflowProcessSteps(l4Process(await ctx.read(l4Ref), facts.processId)));
  return [
    ...workflowGate(code, { siblingImports: await siblingDeclarationImports(ctx.read, project, moduleName), header, facts, project, moduleName, ports, gateways, targets: transitionTargets(ctx.units), llmExports, usecaseInputs: await usecaseInputsOf(ctx) }),
    ...neverReturnsProblems(code),
    ...await missingImports(ctx, code),
    ...stepCallProblems(code, await stepCallsFor(ctx, facts.processId)),
    ...arrivalUpsertProblems(code, await processUpserts(ctx, facts), 'process', `the process ${facts.processId}`, moduleUsecaseCalls(ctx.units)),
  ];
}

/** d1_288: what the source does not give. Each item: what the code needs and why the source does not carry it. Empty in the normal case. */
const SOURCE_GAPS_SCHEMA: Record<string, unknown> = {
  type: 'array',
  description: 'What the source (the l4 process, the definition, the catalog) does not give and the code needs. Empty when the source gives everything. Never write code that refuses at run time in its place.',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['needs', 'why'],
    properties: { needs: { type: 'string' }, why: { type: 'string' } },
  },
};

const WORKFLOW_FILE_SCHEMA: Record<string, unknown> = {
  ...M12_CODE_SCHEMA,
  required: ['code', 'notApplicable', 'sourceGaps'],
  properties: { ...(M12_CODE_SCHEMA.properties as Record<string, unknown>), sourceGaps: SOURCE_GAPS_SCHEMA },
};

const WORKFLOW_FUNCTION_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['code', 'notApplicable', 'sourceGaps'],
  properties: {
    sourceGaps: SOURCE_GAPS_SCHEMA,
    code: { type: 'string', description: 'One function, from its comment through the closing brace of `export async function`.' },
    imports: { type: 'array', items: { type: 'string' }, description: 'New import lines this function needs. Omit a line the file already has.' },
    helpers: { type: 'string', description: 'New helper declarations inserted before the first exported function. Empty when none.' },
    notApplicable: {
      type: 'array',
      description: 'Rules listed for this unit that do not apply to it (empty when every rule applies), each with why.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['ruleId', 'reason'],
        properties: { ruleId: { type: 'string' }, reason: { type: 'string' } },
      },
    },
  },
};

const ON_TICK_FORM = 'export async function onTick(ctx: RequestContext, now: Date): Promise<void>';

async function readProcess(ctx: M12Context, unit: M12Unit): Promise<string> {
  const { project, module: moduleName } = ctx.run;
  const l4Ref = unit.definition.dependencies.find(ref => ref.endsWith(`/l4/${moduleName}/workflows.defs.ts`)) ?? `_${project}_/l4/${moduleName}/workflows.defs.ts`;
  return l4Process(await ctx.read(l4Ref), workflowFacts(unit).processId);
}

export function functionProse(processJson: string, name: string): string {
  let row: unknown;
  try { row = JSON.parse(processJson); } catch { return ''; }
  if (!isRecord(row) || !Array.isArray(row.functions)) return '';
  const found = row.functions.find(item => isRecord(item) && item.functionId === name);
  return isRecord(found) && typeof found.description === 'string' ? found.description : '';
}

function fixedForms(processId: string, steps: readonly WorkflowStepEmit[], scheduled: boolean): Array<{ name: string; form: string }> {
  const forms: Array<{ name: string; form: string }> = [];
  for (const name of workflowLlmExportNames(processId, steps)) {
    const form = name === workflowRecoverName(processId)
      ? workflowRecoverForm(processId)
      : steps.map(step => workflowWakeHandlerForm(step.stepId)).find(item => item.includes(`function ${name}(`)) ?? '';
    if (form) forms.push({ name, form });
  }
  if (scheduled) forms.push({ name: 'onTick', form: ON_TICK_FORM });
  return forms;
}

function phaseNames(facts: M12WorkflowFacts, processJson: string): string[] {
  const steps = workflowProcessSteps(processJson);
  const fixed = fixedForms(facts.processId, steps, facts.trigger.kind === 'scheduled').map(item => item.name);
  return workflowPhaseOrder(facts, workflowStepFunctionRefs(processJson), fixed);
}

function exportHeader(source: string, name: string): string | null {
  try {
    const signature = functionSignature(source, name);
    const at = signature.lastIndexOf('export async function');
    if (at < 0) return null;
    return signature.slice(at).replace(/\s+/gu, ' ').trim();
  } catch {
    return null;
  }
}

export function functionTextProblems(code: string, project: number, moduleName: string, targets: ReadonlyMap<string, string>, siblingImports: readonly string[] = [], usecaseInputs: ReadonlyMap<string, readonly M12InputField[]> = new Map()): string[] {
  const problems: string[] = [];
  problems.push(...workflowTransitionProblems(code, targets));
  if (/\bas\s+unknown\s+as\b/u.test(code) || /\bas\s+any\b/u.test(code)) problems.push('No `as unknown as` and no `as any`.');
  problems.push(...emptyCastProblems(code));
  problems.push(...recordCastProblems(code));
  problems.push(...typedResultDiscardedProblems(code));
  problems.push(...emptyRequiredProblems(code, usecaseInputs));
  const ownL1 = `/_${project}_/l1/${moduleName}/`;
  for (const specifier of importSpecifiers(code)) {
    if (!specifier.startsWith('/') || !specifier.endsWith('.js')) { problems.push(`Import "${specifier}" must start with / and end with .js.`); continue; }
    if (!specifier.startsWith('/_102034_/l1/') && !isCatalogImport(specifier) && !specifier.startsWith(ownL1) && !siblingImports.includes(specifier)) problems.push(`Import "${specifier}" is outside the platform (/_102034_/l1/) and this module (${ownL1}).`);
  }
  if (usesNodeBuiltin(code)) problems.push('No node: import.');
  if (/\bfetch\s*\(/u.test(code)) problems.push('No fetch().');
  problems.push(...gatewayBypassProblems(code));
  if (/\blocalStorage\b|\bsessionStorage\b/u.test(code)) problems.push('No browser storage.');
  if (/catch\s*(\([^)]*\))?\s*\{\s*\}/u.test(code)) problems.push('No empty catch: an error names its cause.');
  problems.push(...neverReturnsProblems(code));
  return problems;
}

/** The file so far: every function as a signature, and the full text of `full`. */
function shownAssembled(source: string, names: readonly string[], full: ReadonlySet<string>): string {
  const present = names.filter(name => findFunction(source, name));
  const first = present.length ? findFunction(source, present[0]) : null;
  const prefix = first ? source.slice(0, first.start).trimEnd() : source.trimEnd();
  const blocks = present.map(name => {
    const span = findFunction(source, name);
    if (!span) return '';
    return full.has(name) ? source.slice(span.start, span.end) : functionSignature(source, name);
  }).filter(Boolean);
  return blocks.length ? `${prefix}\n\n${blocks.join('\n\n')}\n` : `${prefix}\n`;
}

export const workflowSequence: M12SequenceSpec = {
  async phases(ctx, unit) {
    const facts = workflowFacts(unit);
    return ['skeleton', ...phaseNames(facts, await readProcess(ctx, unit)).map(name => `fn:${name}`)];
  },
  async promptAddendum(ctx, phase) {
    const shortName = phase === 'skeleton' ? 'promptSkeleton' : phase.startsWith('fn:') ? 'promptFunction' : '';
    if (!shortName) return '';
    const info = { project: 102021, level: 2, folder: 'agentMaterializeL1/steps/workflows45', shortName, extension: '.md' };
    return (await ctx.read(fileRef(info))) ?? '';
  },
  parameters(phase) {
    return phase === 'skeleton' || phase === 'final' ? WORKFLOW_FILE_SCHEMA : WORKFLOW_FUNCTION_SCHEMA;
  },
  async context(ctx, unit, phase, assembled, repair) {
    if (phase === 'final') return (await loadWorkflowContext(ctx, unit, repair)).human;
    if (phase === 'skeleton') {
      const loaded = await loadWorkflowContext(ctx, unit, repair);
      const processJson = await readProcess(ctx, unit);
      const forms = fixedForms(loaded.facts.processId, workflowProcessSteps(processJson), loaded.facts.trigger.kind === 'scheduled');
      const lines = [
        'This call writes the skeleton only. Declare every function below with that exact header and a body that is only the not-implemented stub. Do not write a real body yet.',
        ...phaseNames(loaded.facts, processJson).map(name => {
          const form = forms.find(item => item.name === name);
          return form ? `- \`${name}\`: \`${form.form}\`` : `- \`${name}(input, ctx: RequestContext)\`, stub \`${notImplementedStub(name)}\``;
        }),
      ];
      return `${loaded.human}\n${section('Functions of this skeleton', lines.join('\n'))}`;
    }
    const name = phase.startsWith('fn:') ? phase.slice(3) : '';
    const loaded = await loadWorkflowContext(ctx, unit, repair, name);
    const processJson = await readProcess(ctx, unit);
    const names = phaseNames(loaded.facts, processJson);
    const written = new Set(names.filter(item => findFunction(assembled, item) && !notImplementedFunctions(assembled).includes(item)));
    const called = new Set(calledFunctions(functionProse(processJson, name), names, written));
    return [
      loaded.human,
      section('The file so far', [
        `Write only \`${name}\`. The functions below are signatures, except the ones \`${name}\` calls, which are the whole function. Keep the signature of \`${name}\` exactly as it is here.`,
        fence('ts', shownAssembled(assembled, names, called)),
      ].join('\n\n')),
    ].join('\n');
  },
  async apply(ctx, unit, phase, assembled, payload) {
    const code = typeof payload.code === 'string' ? payload.code : '';
    const engine = engineExportsOf(await ctx.read(WORKFLOW_INDEX_REF) ?? '');
    if (phase === 'final') {
      if (!code.trim()) return { source: assembled, problems: ['The answer has no code.'] };
      return { source: completeEngineImports(code.endsWith('\n') ? code : `${code}\n`, engine), problems: [] };
    }
    const facts = workflowFacts(unit);
    const header = `/// <mls fileReference="${unit.outputRef}" enhancement="_blank"/>`;
    const { project, module: moduleName } = ctx.run;
    const processJson = await readProcess(ctx, unit);
    const steps = workflowProcessSteps(processJson);
    if (phase === 'skeleton') {
      const problems = workflowGate(completeEngineImports(code, engine), {
        siblingImports: await siblingDeclarationImports(ctx.read, project, moduleName),
        header, facts, project, moduleName,
        ports: moduleGatewayNames(ctx.units),
        gateways: moduleGatewayNames(ctx.units),
        llmExports: workflowLlmExportNames(facts.processId, steps),
        usecaseInputs: await usecaseInputsOf(ctx),
      });
      for (const item of fixedForms(facts.processId, steps, facts.trigger.kind === 'scheduled')) {
        const got = exportHeader(code, item.name);
        const expected = `${item.form} { … }`.replace(/\s+/gu, ' ');
        if (got !== expected) problems.push(`\`${item.name}\` must be exactly \`${item.form}\`.`);
      }
      problems.push(...await missingImports(ctx, code));
      return { source: completeEngineImports(code.endsWith('\n') ? code : `${code}\n`, engine), problems };
    }
    const name = phase.startsWith('fn:') ? phase.slice(3) : '';
    const problems: string[] = [];
    if (!name || !code.trim()) problems.push('The answer has no function.');
    const expected = exportHeader(assembled, name);
    const got = code.trim() ? exportHeader(code, name) : null;
    if (expected && got !== expected) problems.push(`\`${name}\` must keep the skeleton signature \`${expected}\`.`);
    if (!expected) problems.push(`\`${name}\` is not in the skeleton.`);
    if (code.includes(`'${WORKFLOW_NOT_IMPLEMENTED}'`) || code.includes(`"${WORKFLOW_NOT_IMPLEMENTED}"`)) problems.push(`\`${name}\` still throws ${WORKFLOW_NOT_IMPLEMENTED}.`);
    const importLines = Array.isArray(payload.imports) ? payload.imports.filter((item): item is string => typeof item === 'string') : [];
    const helpers = typeof payload.helpers === 'string' ? payload.helpers : '';
    const snippet = [header, ...importLines, code].join('\n');
    if (name === 'onTick') {
      if (!/export\s+async\s+function\s+onTick\s*\(/u.test(code)) problems.push('A scheduled process exports `onTick(ctx: RequestContext, now: Date): Promise<void>`.');
      if (!/\bevaluateSchedule\s*\(/u.test(code)) problems.push('`onTick` asks `evaluateSchedule(schedule, now, lastRun)` whether an occurrence is due: never a hard-coded hour.');
    }
    problems.push(...functionTextProblems(snippet, project, moduleName, transitionTargets(ctx.units), await siblingDeclarationImports(ctx.read, project, moduleName), await usecaseInputsOf(ctx)));
    if (problems.length) return { source: assembled, problems };
    try {
      const merged = completeEngineImports(replaceFunction(addHelpers(mergeImports(assembled, importLines), helpers), name, code.endsWith('\n') ? code : `${code}\n`), engine);
      const imports = await missingImports(ctx, merged);
      if (imports.length) return { source: assembled, problems: imports };
      return { source: merged, problems: [] };
    } catch (error) {
      return { source: assembled, problems: [error instanceof Error ? error.message : String(error)] };
    }
  },
  async finalProblems(ctx, unit, source) {
    const empty = notImplementedFunctions(source).map(name => `Function \`${name}\` is still ${WORKFLOW_NOT_IMPLEMENTED}.`);
    return [...await workflowAnswerProblems(ctx, unit, source, []), ...empty];
  },
};
