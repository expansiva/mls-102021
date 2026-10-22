/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/context.ts" enhancement="_blank"/>

// What the model sees to write the workflow service of one process (materializadorL1.md §11): the def (trigger,
// occurrence, functions, operations), the l4 prose of each function (the source), the usecases the operations reach,
// the occurrence entity and its port, the module engine, the runtime engine signatures and the record-id rule.
// And the gate of its answer.

import { isRecord } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { PLATFORM_FILES } from '/_102021_/l2/agentMaterializeL1/emitters/context.js';
import { ontologyRef } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import { moduleSpecifier, transitionDestinations, workflowEngineFile, workflowEngineSource, workflowTablesFromL4 } from '/_102021_/l2/agentMaterializeL1/emitters/workflowEmit.js';
import { clip } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { compileDiagnostics, compileM12Files, isUnavailable } from '/_102021_/l2/agentMaterializeL1/helpers/m12Compile.js';
import { importSpecifiers, repositoryProblems, usesNodeBuiltin } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { readOptional, writeSource } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { rulesFile } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { dependencyUnits, type M12Context, type M12RuleNotApplicable } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { missingImports, type M12Repair } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
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
 * Rules every process function follows when it calls the module engine. The engine does the owner action;
 * the function supplies the command and applies the L4 system transition from the returned notice state only.
 */
export function engineUseRules(moduleName: string, processId: string): string {
  return [
    'Open with `engine.open(ctx, { key, plan, title, firstStep, actorNow, owner, origin, executor, room, message? })`. Advance with `engine.advance(ctx, key, { commandId, expectedRevision, from, to, actorNow, executor, note?, wake?, message? })`. No step table on `advance`. `find` is `engine.find(ctx, key)`.',
    '`commandId`: from a person, `requestMeta.requestId`; from a routine, `<recordId>:<to>` (the same value on a retry, a different value only for a new command); from a wake, `<taskId>:<step>:<wake.seq>`.',
    '`expectedRevision` is the `revision` of the `find` of the same call. `executor` is `{ kind: \'person\', mdmId }` or `{ kind: \'routine\', name: \'<module>.<processId>.<function>\' }` (here `' + moduleName + '.' + processId + '.<function>`). `title` is the business record by its display field. `origin` is the screen, the channel, or the schedule.',
    'The notice result decides the L4 system transition, only from the state returned (`moduleMessage`, or `noticeState` when the module engine exports it). `sent` → the success transition (in `tarefas`, `concluirAviso`) and `to: \'end\'`. A definitive port error (below) → the failure transition (`falharAviso`, `motivoFalha` with no personal data) and `to: \'end\'`. `pending` or absent → the record stays `pending` and the Task stays on the step. Never a second message and never another `commandId` to repeat the same command.',
    'A notice still `pending` from an earlier run is settled by the next run of the start function, **for that recipient only**: if its message is `sent`, apply the success transition; otherwise apply the failure transition with `motivoFalha` = `NOTICE_DELIVERY_NOT_CONFIRMED`; then that recipient\'s new notice starts. A `sent` that arrives after the failure is only logged. A pending notice of one recipient never blocks another.',
    'A `wait` step requests a wake only when the L4 gives it a time (a deadline, a reminder or a period in the step description or in a rule) and names the function that handles it; `everyMinutes`/`until` come from that text and `routine` is that function. Otherwise the step has no wake: the wait ends by the action of the next step\'s owner. Never invent an interval.',
    '`onTick(ctx, now)` stays the public entry of the schedule. `ctx.clock` agrees with `now`.',
    'Port errors do not open another occurrence. Temporary (`WORKFLOW_CM_BUSY`, `WORKFLOW_CM_TASK_INCOMPLETE`, `WORKFLOW_CM_ROOM_UNAVAILABLE`, `WORKFLOW_IDENTITY_INCOMPLETE`, HTTP 503): the screen receives the error so the person can try again; the routine leaves the notice `pending` for the next execution and does not change the business record. Definitive for the command (`WORKFLOW_CM_REJECTED`, `WORKFLOW_IDENTITY_UNLINKED`, `WORKFLOW_IDENTITY_REMOVED`): the screen receives the error; the routine applies the failure transition with the code as `motivoFalha`.',
  ].join('\n');
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
 * written and compiled before any workflow worker runs. A copy someone edited by hand is kept. The lines go to the phase trace.
 */
export async function prepareWorkflows(ctx: M12Context): Promise<string[]> {
  const { project, module: moduleName } = ctx.run;
  const info = workflowEngineFile(project, moduleName);
  const workflows = await ctx.read(`_${project}_/l4/${moduleName}/workflows.defs.ts`);
  const ontologySources: string[] = [];
  for (const item of ctx.units) {
    if (item.definition.artifactType !== 'domainEntity') continue;
    const source = await ctx.read(ontologyRef(item.definition, item.outputRef));
    if (source) ontologySources.push(source);
  }
  const operations = operationTransitionIds(ctx.units);
  const source = workflowEngineSource(project, moduleName, workflowTablesFromL4(workflows), transitionDestinations(ontologySources, operations.size ? operations : undefined));
  const current = await readOptional(info);
  if (current !== null && current !== source && !current.includes('Generated by agentMaterializeL1')) {
    return [`workflowEngine: kept, ${moduleSpecifier(info)} was edited locally`];
  }
  if (current === source) return ['workflowEngine: up to date'];
  const stored = await writeSource(info, source);
  const results = await compileM12Files([{ info, expected: stored.text }], ctx.compiler);
  const unavailable = results.every(result => result.errors.length === 1 && isUnavailable(result.errors[0]));
  const errors = unavailable ? [] : compileDiagnostics(results);
  return [errors.length ? `workflowEngine: COMPILE_FAILED ${clip(errors.join(' | '), 400)}` : 'workflowEngine: written'];
}

export async function loadWorkflowContext(ctx: M12Context, unit: M12Unit, repair?: M12Repair): Promise<{ header: string; facts: M12WorkflowFacts; human: string }> {
  const { project, module: moduleName } = ctx.run;
  const facts = workflowFacts(unit);
  const header = `/// <mls fileReference="${unit.outputRef}" enhancement="_blank"/>`;
  const l4Ref = unit.definition.dependencies.find(ref => ref.endsWith(`/l4/${moduleName}/workflows.defs.ts`)) ?? `_${project}_/l4/${moduleName}/workflows.defs.ts`;
  const process = l4Process(await ctx.read(l4Ref), facts.processId);
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
    lines.push(`- ${row.operation} (${row.steps.join(', ')}): ${usecase ? `usecase \`${usecase.unitId}\`` : 'no usecase: the function applies it through the entity port (POOL_ABSENT)'}`);
  }
  if (lines.length) parts.push(section('Operations of the process', lines.join('\n')));
  const mdmUsecase = facts.operations.map(row => operationUsecase(ctx.units, row.operation)).find(usecase => usecase && usesMdm(usecase));
  if (mdmUsecase) {
    parts.push(section('The platform MDM (source: how the engine stores and returns this entity today)', mdmContextSection(moduleName, await ctx.read(MDM_ONTOLOGY_REF), await ctx.read(MDM_FACADE_REF), [], await ctx.read(MDM_MODULE_REF))));
  }

  const sent = new Set<string>();
  for (const dep of dependencyUnits(ctx, unit)) {
    const generated = await readOptional(dep.output);
    if (!generated) continue;
    sent.add(dep.defRef);
    parts.push(section(`Usecase ${dep.unitId}`, [`Import from \`/${dep.outputRef.replace(/\.ts$/u, '.js')}\`.`, fence('ts', exportSignatures(generated))].join('\n\n')));
  }
  // The entity of the occurrence and of every operation, with its port: a system transition and the occurrence
  // record are read and written through them. And every entity the prose of the process names: the daily notice
  // reads the open tasks, and without the Tarefa entity the model guessed its states (todo, inProgress).
  const titles = (await entityNames(ctx)).flatMap(names => [{ entityId: names.entityId, title: names.title }, { entityId: names.entityId, title: names.entityId }]);
  const entities = new Set([facts.occurrence, ...facts.operations.map(row => row.operation.split('.')[0]), ...citedEntities(process, titles)].filter(Boolean));
  for (const item of ctx.units) {
    const kind = item.definition.artifactType;
    if ((kind !== 'domainEntity' && kind !== 'repositoryPort') || !entities.has(String(item.definition.data.entityId ?? ''))) continue;
    const generated = await readOptional(item.output);
    parts.push(section(`${kind} ${item.definition.artifactId}`, [
      `Import from \`/${item.outputRef.replace(/\.ts$/u, '.js')}\`.${kind === 'repositoryPort' ? ` Resolve it with \`resolveRepository<${String(item.definition.data.interfaceName ?? '')}>(ctx, '${String(item.definition.data.interfaceName ?? '')}')\`.` : ''}`,
      generated ? fence('ts', exportSignatures(generated)) : fence('json', JSON.stringify(item.definition.data)),
    ].join('\n\n')));
    if (kind === 'domainEntity') {
      const ontology = await ctx.read(ontologyRef(item.definition, item.outputRef));
      if (ontology) parts.push(section(`l4 ontology of ${item.definition.artifactId} (source: states, transitions, derived fields)`, fence('ts', ontology.slice(0, 20000))));
    }
  }
  const rulesSource = await readOptional(rulesFile(project, moduleName));
  const rules = ruleTexts(rulesSource, allRuleIds(rulesSource));
  if (rules.length) parts.push(section('Rules of the module (l4 text)', rules.map(rule => `- ${rule.ruleId}: ${rule.text}`).join('\n')));

  const adapter = workflowEngineFile(project, moduleName);
  const adapterSource = await readOptional(adapter);
  if (adapterSource) parts.push(section('The module engine (one engine per process, the step tables, the destination status of each operation)', [`Import from \`${moduleSpecifier(adapter)}\`. Open and advance through it. \`transitionTo\` is the destination status of each operation.`, fence('ts', exportSignatures(adapterSource))].join('\n\n')));
  parts.push(section('Occurrence record id', [
    `On creation, \`recordId = occurrenceRecordId(ctx, '${facts.processId}')\` and the create usecase is called with \`createOccurrenceContext(ctx, recordId)\`.`,
    'That context returns the occurrence record id on the first `newId` and delegates every later id to the parent generator. Check, on that usecase, that the record is the first `newId`.',
    'Import `occurrenceRecordId` and `createOccurrenceContext` from `/_102034_/l1/workflow/index.js`. The version of an occurrence is the one the engine stored (the release, or `null`).',
  ].join('\n')));
  parts.push(section('How every process function uses the engine', engineUseRules(moduleName, facts.processId)));
  const platform = [WORKFLOW_INDEX_REF, WORKFLOW_ENGINE_REF, WORKFLOW_CONTRACTS_REF, WORKFLOW_RECORD_ID_REF, PLATFORM_FILES.requestContext, PLATFORM_FILES.repositoryRegistry, ...(facts.trigger.kind === 'scheduled' ? [EVALUATE_SCHEDULE_REF] : [])];
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
export function workflowGate(code: string, input: { header: string; facts: M12WorkflowFacts; project: number; moduleName: string; ports: readonly string[]; targets?: ReadonlyMap<string, string> }): string[] {
  const problems: string[] = [];
  if (input.targets) problems.push(...workflowTransitionProblems(code, input.targets));
  if ((code.split('\n')[0]?.trim() ?? '') !== input.header) problems.push(`The first line must be exactly: ${input.header}`);
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
  problems.push(...repositoryProblems(code, input.ports));
  const ownL1 = `/_${input.project}_/l1/${input.moduleName}/`;
  for (const specifier of importSpecifiers(code)) {
    if (!specifier.startsWith('/') || !specifier.endsWith('.js')) { problems.push(`Import "${specifier}" must start with / and end with .js.`); continue; }
    if (!specifier.startsWith('/_102034_/l1/') && !specifier.startsWith(ownL1)) problems.push(`Import "${specifier}" is outside the platform (/_102034_/l1/) and this module (${ownL1}).`);
  }
  if (usesNodeBuiltin(code)) problems.push('No node: import.');
  if (/\bfetch\s*\(/u.test(code)) problems.push('No fetch().');
  if (/\blocalStorage\b|\bsessionStorage\b/u.test(code)) problems.push('No browser storage.');
  if (/catch\s*(\([^)]*\))?\s*\{\s*\}/u.test(code)) problems.push('No empty catch: an error names its cause.');
  return problems;
}

export async function workflowAnswerProblems(ctx: M12Context, unit: M12Unit, code: string, _notApplicable: readonly M12RuleNotApplicable[]): Promise<string[]> {
  const facts = workflowFacts(unit);
  const header = `/// <mls fileReference="${unit.outputRef}" enhancement="_blank"/>`;
  const ports = ctx.units.filter(item => item.definition.artifactType === 'repositoryPort').map(item => String(item.definition.data.interfaceName ?? item.definition.artifactId));
  return [
    ...workflowGate(code, { header, facts, project: ctx.run.project, moduleName: ctx.run.module, ports, targets: transitionTargets(ctx.units) }),
    ...await missingImports(ctx, code),
  ];
}
