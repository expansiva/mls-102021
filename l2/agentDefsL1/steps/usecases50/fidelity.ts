/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/fidelity.ts" enhancement="_blank"/>

import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { parseRendered } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { readContractAst, type D1ContractAst, type D1ContractField } from '/_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.js';
import {
  capabilityApplies,
  capabilityNames,
  namespaceOf,
  ontologyTransitions,
  platformFieldPaths,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/context.js';
import { bindMdm } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';
import type { D1MdmArgument, D1MdmPlannedCall, D1UsecaseMdm, D1WorkerStep } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';

export interface FidelityFile {
  path: string;
  text: string;
}

export interface FidelityProblem {
  code: string;
  path: string;
  message: string;
}

export interface D1FieldUse {
  path: string;
  role: 'filter' | 'selector' | 'concurrency' | 'write';
  source: 'input' | 'payload';
}

export interface UsecaseBehavior {
  usecaseId: string;
  operation: string;
  sequence: D1WorkerStep[];
  uses: D1FieldUse[];
  mdm: D1UsecaseMdm | null;
  lifecycle: { transitionId: string; payload: string[]; sourcePath: string; symbol: string } | null;
  rules: Array<{ ruleId: string; path: string; symbol: string }>;
  transaction: 'local' | 'none';
  effects: Array<{ eventId: string; path: string; symbol: string }>;
  routes: Array<{ route: string; contractPath: string; symbol: string; outputFields: string[] }>;
}

const READ_OPERATIONS = new Set(['list', 'get', 'read']);
const UPDATE_OPERATIONS = new Set(['update', 'patch']);

/**
 * Classifies a derived field the same way the gate does.
 * A payload is a write. Identity on a read is a filter; on an update or
 * transition it is a selector. A nested derived field on a read is a filter.
 * `version` on an update or transition is concurrency.
 */
export function fieldUses(input: {
  operation: string;
  fields: readonly { name: string; derived: boolean }[];
  inputPaths: readonly string[];
  payloadPaths: readonly string[];
}): D1FieldUse[] {
  const uses: D1FieldUse[] = [];
  const seen = new Set<string>();
  const add = (path: string, role: D1FieldUse['role'], source: D1FieldUse['source']) => {
    const key = `${source}\u0000${path}\u0000${role}`;
    if (seen.has(key)) return;
    seen.add(key);
    uses.push({ path, role, source });
  };
  for (const path of input.inputPaths) {
    const field = input.fields.find(item => item.name === path);
    if (!field?.derived) continue;
    const role = derivedRole(input.operation, field.name, 'input');
    if (role === 'write' || role === 'ambiguous') continue;
    add(path, role, 'input');
  }
  for (const path of input.payloadPaths) {
    const field = input.fields.find(item => item.name === path);
    if (field?.derived) continue;
    add(path, 'write', 'payload');
  }
  uses.sort((left, right) => useKey(left).localeCompare(useKey(right)));
  return uses;
}

/**
 * Reads one serialized usecase def and the dependency texts it names.
 * It does not take the draft. A rule id, a file count or a signature is not enough.
 */
export function readUsecaseFidelity(
  source: string,
  files: readonly FidelityFile[],
): { behavior: UsecaseBehavior | null; problems: FidelityProblem[] } {
  const problems: FidelityProblem[] = [];
  const parsed = parseRendered(source);
  const definition = parsed && isRecord(parsed.definition) ? parsed.definition : null;
  const data = definition && isRecord(definition.data) ? definition.data : null;
  const pipeline = parsed && Array.isArray(parsed.pipeline) ? parsed.pipeline.filter(isRecord) : [];
  const item = pipeline.find(entry => entry.type === 'usecase') || pipeline[0] || null;
  const dependsFiles = item && Array.isArray(item.dependsFiles)
    ? item.dependsFiles.filter((path): path is string => typeof path === 'string')
    : [];
  if (!data) {
    return { behavior: null, problems: [{ code: 'DEFINITION', path: '', message: 'Serialized usecase did not parse.' }] };
  }
  const usecaseId = typeof data.usecaseId === 'string' ? data.usecaseId : '';
  const operation = typeof data.operation === 'string' ? data.operation : '';
  const entityId = typeof data.entityId === 'string' ? data.entityId : '';
  const moduleName = definition && typeof definition.moduleName === 'string' ? definition.moduleName : '';
  const ontologyPath = `l4/${moduleName}/ontology/${entityId}.defs.ts`;
  const ontologyText = fileText(files, ontologyPath);
  if (ontologyText == null) {
    fail(problems, 'SOURCE_ABSENT', usecaseId, `Ontology ${ontologyPath} is not a dependency of ${usecaseId}.`);
  }
  const ontology = ontologyText == null ? null : parseD1Source(ontologyText, 'defs');
  if (ontologyText != null && !ontology) {
    fail(problems, 'SOURCE_CHANGED', usecaseId, `Ontology ${ontologyPath} did not parse.`);
  }
  if (!hasDep(dependsFiles, ontologyPath)) {
    fail(problems, 'DEPENDENCY_MISSING', usecaseId, `Ontology ${ontologyPath} is not in dependsFiles.`);
  }

  const fields = ontology ? recordFields(ontology) : [];
  const transition = ontology
    ? ontologyTransitions(ontology).find(entry => entry.transitionId === usecaseId) || null
    : null;
  const lifecycle = readLifecycle(data);
  if (operation === 'transition') {
    const expected = transition?.payload || [];
    const actual = lifecycle?.payload || [];
    for (const path of expected) {
      if (!actual.includes(path)) {
        fail(problems, 'PAYLOAD_MISSING', usecaseId, `Payload ${path} is on ${usecaseId} and is not in the serialized lifecycle.`);
      }
    }
    if (lifecycle && !sameList(actual, expected)) {
      fail(problems, 'PAYLOAD_MISSING', usecaseId, `Lifecycle payload of ${usecaseId} is not the ontology payload.`);
    }
    if (!lifecycle) fail(problems, 'PAYLOAD_MISSING', usecaseId, `Transition ${usecaseId} has no lifecycle reference.`);
  }

  const sequence = readSequence(data);
  if (Array.isArray(data.sequence) && sequence.length !== data.sequence.length) {
    fail(problems, 'DEFINITION', usecaseId, `A step of ${usecaseId} did not parse.`);
  }
  if (operation === 'transition' && !sequence.some(step => step.kind === 'transition')) {
    fail(problems, 'PAYLOAD_MISSING', usecaseId, `Transition ${usecaseId} has no transition step.`);
  }
  for (const step of sequence) {
    if (step.kind !== 'transition') continue;
    const expected = transition?.payload || lifecycle?.payload || [];
    for (const path of expected) {
      if (!step.payload.includes(path)) {
        fail(problems, 'PAYLOAD_MISSING', usecaseId, `Payload ${path} is not in the serialized transition step.`);
      }
    }
  }

  const inputPaths = functionInputPaths(data);
  const expectedUses = fieldUses({
    operation,
    fields,
    inputPaths,
    payloadPaths: transition?.payload || [],
  });
  const actualUses = readUses(data);
  for (const use of expectedUses) {
    if (!actualUses.some(item => item.path === use.path && item.role === use.role && item.source === use.source)) {
      fail(problems, 'USE_MISSING', usecaseId, `Use ${use.role} of ${use.path} is not in the serialized def.`);
    }
  }

  const requiredRules = new Set<string>([
    ...(transition?.ruleRefs || []),
    ...stringList(data.rulesApplied),
  ]);
  const ruleRefs = readRuleRefs(data);
  for (const ruleId of requiredRules) {
    const ref = ruleRefs.find(item => item.ruleId === ruleId);
    if (!ref) {
      fail(problems, 'RULE_REF_MISSING', usecaseId, `Rule ${ruleId} is only a name. It has no source path and symbol.`);
      continue;
    }
    if (!hasDep(dependsFiles, ref.path)) {
      fail(problems, 'DEPENDENCY_MISSING', usecaseId, `Rule source ${ref.path} is not in dependsFiles.`);
    }
    const text = fileText(files, ref.path);
    if (text == null) {
      fail(problems, 'SOURCE_ABSENT', usecaseId, `Rule source ${ref.path} is absent.`);
      continue;
    }
    const body = parseD1Source(text, 'defs');
    const content = ruleText(body, ref.symbol);
    if (!content) {
      fail(problems, 'RULE_TEXT_ABSENT', usecaseId, `Rule ${ref.symbol} has no text in ${ref.path}.`);
    }
  }

  const mdm = readMdm(data);
  if (ontology && isMdmOntology(ontology)) {
    const names = capabilityNames(ontology);
    const bound = bindMdm({
      entityId,
      namespace: namespaceOf(ontology),
      capabilities: names,
      selected: names.filter(name => capabilityApplies(name, operation)),
      platformFields: platformFieldPaths(ontology),
    });
    for (const gap of bound.gaps) fail(problems, gap.code, usecaseId, gap.evidence);
    if (!mdm) {
      fail(problems, 'MDM_CALL_MISSING', usecaseId, `Usecase ${usecaseId} has no MDM binding.`);
    } else {
      for (const call of bound.calls) {
        if (!mdm.calls.some(item => sameCall(item, call))) {
          fail(problems, 'MDM_CALL_MISSING', usecaseId, `MDM call ${call.method} for ${call.capabilities.join(', ')} is not in the serialized def.`);
        }
      }
    }
  } else if (mdm) {
    fail(problems, 'MDM_NAMESPACE', usecaseId, `Usecase ${usecaseId} names MDM for ${entityId}, which is not an MDM role.`);
  }

  const routes = readRoutes(data);
  const contractRefs = readContractRefs(data);
  for (const ref of contractRefs) {
    if (!routes.some(route => route.route === ref.route)) {
      fail(problems, 'PROJECTION_MISSING', usecaseId, `Route ${ref.route} has no projection.`);
    }
  }
  for (const route of routes) {
    if (!hasDep(dependsFiles, route.contractPath)) {
      fail(problems, 'DEPENDENCY_MISSING', usecaseId, `Contract ${route.contractPath} is not in dependsFiles.`);
    }
    if (route.projection !== 'declared') continue;
    const ref = contractRefs.find(item => item.route === route.route);
    if (!ref?.symbol) {
      fail(problems, 'DEPENDENCY_MISSING', usecaseId, `Route ${route.route} has no typed symbol.`);
      continue;
    }
    const text = fileText(files, route.contractPath);
    if (text == null) {
      fail(problems, 'SOURCE_ABSENT', usecaseId, `Contract ${route.contractPath} is absent.`);
      continue;
    }
    const ast = readContractAst(text, route.contractPath);
    const declared = contractedFields(ast, ref.symbol);
    const names = declared?.map(field => field.name) || [];
    if (!declared || !sameList(names, route.outputFields)) {
      fail(problems, 'PROJECTION_MISMATCH', usecaseId, `Route ${route.route} projection does not match ${ref.symbol} in ${route.contractPath}.`);
    }
  }

  const effects = readEffects(data);
  for (const effect of effects) {
    if (!hasDep(dependsFiles, effect.path)) {
      fail(problems, 'DEPENDENCY_MISSING', usecaseId, `Effect source ${effect.path} is not in dependsFiles.`);
    }
    const text = fileText(files, effect.path);
    if (text == null) {
      fail(problems, 'SOURCE_ABSENT', usecaseId, `Effect source ${effect.path} is absent.`);
      continue;
    }
    const body = parseD1Source(text, 'defs');
    if (!eventPresent(body, effect.symbol)) {
      fail(problems, 'EVENT_LOST', usecaseId, `Effect ${effect.symbol} is not in ${effect.path}.`);
    }
  }

  const transaction = readTransaction(data);
  if (!transaction) {
    fail(problems, 'TRANSACTION_BOUNDARY', usecaseId, `Usecase ${usecaseId} has no transaction boundary.`);
  } else if (transaction === 'local' && !sequence.some(step => step.kind === 'transaction' && step.boundary === 'local')) {
    fail(problems, 'TRANSACTION_BOUNDARY', usecaseId, `Usecase ${usecaseId} says the boundary is local and the sequence has no local transaction step.`);
  } else if (transaction === 'none' && sequence.some(step => step.kind === 'transaction')) {
    fail(problems, 'TRANSACTION_BOUNDARY', usecaseId, `Usecase ${usecaseId} says there is no boundary and the sequence has a transaction step.`);
  }
  if (!problems.length && transaction && lifecycleMatches(operation, lifecycle)) {
    return {
      behavior: {
        usecaseId,
        operation,
        sequence,
        uses: actualUses,
        mdm,
        lifecycle,
        rules: ruleRefs,
        transaction,
        effects,
        routes: routes.filter(route => route.projection === 'declared').map(route => ({
          route: route.route,
          contractPath: route.contractPath,
          symbol: contractRefs.find(item => item.route === route.route)?.symbol || '',
          outputFields: route.outputFields,
        })),
      },
      problems,
    };
  }
  return { behavior: null, problems };
}

function lifecycleMatches(operation: string, lifecycle: UsecaseBehavior['lifecycle']): boolean {
  return operation === 'transition' ? lifecycle !== null : true;
}

function derivedRole(
  operation: string,
  fieldName: string,
  source: 'input' | 'payload',
): D1FieldUse['role'] | 'ambiguous' {
  if (source === 'payload') return 'write';
  if (fieldName === 'id') {
    if (READ_OPERATIONS.has(operation)) return 'filter';
    if (UPDATE_OPERATIONS.has(operation) || operation === 'transition') return 'selector';
    if (operation === 'create') return 'write';
    return 'ambiguous';
  }
  if (fieldName === 'version') {
    if (UPDATE_OPERATIONS.has(operation) || operation === 'transition') return 'concurrency';
    return 'write';
  }
  if (READ_OPERATIONS.has(operation) && nestedReadFilter(fieldName)) return 'filter';
  return 'write';
}

/** A dotted path on a read. The leaf `id` is a homonym, not the identity field. */
function nestedReadFilter(name: string): boolean {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return false;
  const leaf = name.slice(dot + 1);
  return leaf !== 'id' && leaf !== 'version';
}

function useKey(use: D1FieldUse): string {
  return `${use.source}\u0000${use.path}\u0000${use.role}`;
}

function fail(problems: FidelityProblem[], code: string, path: string, message: string): void {
  if (problems.some(item => item.code === code && item.message === message)) return;
  problems.push({ code, path, message });
}

function strip(path: string): string {
  return path.replace(/^_\d+_\/+/, '');
}

function hasDep(dependsFiles: readonly string[], path: string): boolean {
  const logical = strip(path);
  return dependsFiles.some(item => strip(item) === logical);
}

function fileText(files: readonly FidelityFile[], path: string): string | null {
  const project = embeddedProject(path);
  if (project) {
    const tail = unqualified(path);
    const found = files.find(item => embeddedProject(item.path) === project && unqualified(item.path) === tail);
    return found ? found.text : null;
  }
  const logical = strip(path);
  const found = files.find(item => strip(item.path) === logical);
  return found ? found.text : null;
}

function embeddedProject(path: string): string {
  const match = /^\/?_(\d+)_\/+/.exec(path);
  return match ? match[1] : '';
}

function unqualified(path: string): string {
  return path.replace(/^\/?_\d+_\/+/, '');
}

function sameList(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function recordFields(body: unknown): Array<{ name: string; derived: boolean }> {
  if (!isRecord(body) || !isRecord(body.record) || !isRecord(body.record.fields)) return [];
  const out: Array<{ name: string; derived: boolean }> = [];
  walkFields(body.record.fields, '', out);
  return out;
}

function walkFields(fields: Record<string, unknown>, prefix: string, out: Array<{ name: string; derived: boolean }>): void {
  for (const [key, raw] of Object.entries(fields)) {
    if (!isRecord(raw)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (isRecord(raw.fields)) {
      walkFields(raw.fields, path, out);
      continue;
    }
    out.push({ name: path, derived: raw.derived === true });
  }
}

function isMdmOntology(body: unknown): boolean {
  if (!isRecord(body)) return false;
  if (isRecord(body.storage) && body.storage.target === 'mdm') return true;
  return body.kind === 'role' && typeof body.roleTag === 'string' && body.roleTag.length > 0;
}

function contractedFields(ast: D1ContractAst, symbol: string): D1ContractField[] | null {
  const found = ast.symbols.filter(item => item.name === symbol);
  if (found.length !== 1) return null;
  const item = found[0];
  if (item.shape === 'array' && item.fields.length === 0 && item.element) {
    const inner = ast.symbols.filter(entry => entry.name === item.element);
    if (inner.length !== 1) return null;
    return inner[0].fields;
  }
  if (item.shape === 'array' && item.fields.length === 0) return null;
  return item.fields;
}

function ruleText(body: unknown, symbol: string): string {
  if (!isRecord(body) || !isRecord(body.rules)) return '';
  const text = body.rules[symbol];
  return typeof text === 'string' ? text.trim() : '';
}

function eventPresent(body: unknown, symbol: string): boolean {
  if (!isRecord(body) || !Array.isArray(body.outbound)) return false;
  return body.outbound.some(item => isRecord(item) && (item.event === symbol || item.id === symbol));
}

function functionInputPaths(data: Record<string, unknown>): string[] {
  const functions = Array.isArray(data.functions) ? data.functions : [];
  const first = functions.find(isRecord);
  if (!first || !Array.isArray(first.input)) return [];
  return first.input.flatMap(field => isRecord(field) && typeof field.name === 'string' ? [field.name] : []);
}

function readLifecycle(data: Record<string, unknown>): UsecaseBehavior['lifecycle'] {
  if (!isRecord(data.lifecycle)) return null;
  const transitionId = typeof data.lifecycle.transitionId === 'string' ? data.lifecycle.transitionId : '';
  const sourcePath = typeof data.lifecycle.sourcePath === 'string' ? data.lifecycle.sourcePath : '';
  const symbol = typeof data.lifecycle.symbol === 'string' ? data.lifecycle.symbol : '';
  if (!transitionId || !sourcePath || !symbol) return null;
  return { transitionId, payload: stringList(data.lifecycle.payload), sourcePath, symbol };
}

function readSequence(data: Record<string, unknown>): D1WorkerStep[] {
  if (!Array.isArray(data.sequence)) return [];
  const steps: D1WorkerStep[] = [];
  for (const raw of data.sequence) {
    const step = asStep(raw);
    if (step) steps.push(step);
  }
  return steps;
}

function asStep(value: unknown): D1WorkerStep | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null;
  if (value.kind === 'port' && typeof value.call === 'string' && typeof value.port === 'string') {
    return { kind: 'port', call: value.call, port: value.port };
  }
  if (value.kind === 'rule' && typeof value.ruleId === 'string') return { kind: 'rule', ruleId: value.ruleId };
  if (value.kind === 'mdm' && typeof value.namespace === 'string' && typeof value.call === 'string' && typeof value.entity === 'string' && typeof value.capability === 'string') {
    return { kind: 'mdm', namespace: value.namespace, call: value.call, entity: value.entity, capability: value.capability };
  }
  if (value.kind === 'transition' && typeof value.transitionId === 'string') {
    return { kind: 'transition', transitionId: value.transitionId, payload: stringList(value.payload) };
  }
  if (value.kind === 'effect' && typeof value.eventId === 'string') return { kind: 'effect', eventId: value.eventId };
  if (value.kind === 'transaction' && (value.boundary === 'local' || value.boundary === 'external')) {
    return { kind: 'transaction', boundary: value.boundary };
  }
  if (value.kind === 'context' && value.source === 'ctx') return { kind: 'context', source: 'ctx' };
  return null;
}

function readUses(data: Record<string, unknown>): D1FieldUse[] {
  if (!Array.isArray(data.uses)) return [];
  const uses: D1FieldUse[] = [];
  for (const raw of data.uses) {
    if (!isRecord(raw) || typeof raw.path !== 'string') continue;
    if (raw.role !== 'filter' && raw.role !== 'selector' && raw.role !== 'concurrency' && raw.role !== 'write') continue;
    if (raw.source !== 'input' && raw.source !== 'payload') continue;
    uses.push({ path: raw.path, role: raw.role, source: raw.source });
  }
  uses.sort((left, right) => useKey(left).localeCompare(useKey(right)));
  return uses;
}

function readRuleRefs(data: Record<string, unknown>): UsecaseBehavior['rules'] {
  if (!Array.isArray(data.rules)) return [];
  return data.rules.flatMap(raw => {
    if (!isRecord(raw) || typeof raw.ruleId !== 'string' || typeof raw.path !== 'string' || typeof raw.symbol !== 'string') return [];
    return [{ ruleId: raw.ruleId, path: raw.path, symbol: raw.symbol }];
  });
}

function readMdm(data: Record<string, unknown>): D1UsecaseMdm | null {
  if (!isRecord(data.mdm) || !Array.isArray(data.mdm.calls)) return null;
  const calls: D1MdmPlannedCall[] = [];
  for (const raw of data.mdm.calls) {
    const call = asCall(raw);
    if (call) calls.push(call);
  }
  return {
    namespace: typeof data.mdm.namespace === 'string' ? data.mdm.namespace : '',
    role: typeof data.mdm.role === 'string' ? data.mdm.role : '',
    atomic: data.mdm.atomic === true,
    calls,
    gaps: [],
  };
}

function asCall(value: unknown): D1MdmPlannedCall | null {
  if (!isRecord(value) || typeof value.method !== 'string') return null;
  const target = value.target === 'entity' || value.target === 'collection' || value.target === 'identity' ? value.target : null;
  const shape = value.shape === 'point' || value.shape === 'collection' || value.shape === 'write' ? value.shape : null;
  if (!target || !shape || !Array.isArray(value.capabilities) || typeof value.alternative !== 'boolean') return null;
  const args: D1MdmArgument[] = [];
  if (!Array.isArray(value.arguments)) return null;
  for (const raw of value.arguments) {
    if (!isRecord(raw) || typeof raw.name !== 'string') return null;
    if (raw.role !== 'selector' && raw.role !== 'parameter' && raw.role !== 'patch') return null;
    const arg: D1MdmArgument = { name: raw.name, role: raw.role };
    if (typeof raw.capability === 'string') arg.capability = raw.capability;
    if (typeof raw.path === 'string') arg.path = raw.path;
    if (typeof raw.value === 'string') arg.value = raw.value;
    args.push(arg);
  }
  return {
    method: value.method as D1MdmPlannedCall['method'],
    target,
    shape,
    capabilities: stringList(value.capabilities),
    alternative: value.alternative,
    arguments: args,
    result: stringList(value.result),
  };
}

function sameCall(left: D1MdmPlannedCall, right: D1MdmPlannedCall): boolean {
  return JSON.stringify(normalizeCall(left)) === JSON.stringify(normalizeCall(right));
}

function normalizeCall(call: D1MdmPlannedCall): unknown {
  return {
    method: call.method,
    target: call.target,
    shape: call.shape,
    alternative: call.alternative,
    arguments: call.arguments.map(arg => ({
      name: arg.name,
      role: arg.role,
      capability: arg.capability || '',
      path: arg.path || '',
      value: arg.value || '',
    })).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
    capabilities: [...call.capabilities].sort(),
    result: [...call.result],
  };
}

function readContractRefs(data: Record<string, unknown>): Array<{ route: string; symbol: string }> {
  const functions = Array.isArray(data.functions) ? data.functions : [];
  const refs: Array<{ route: string; symbol: string }> = [];
  for (const fn of functions) {
    if (!isRecord(fn) || !Array.isArray(fn.contractRefs)) continue;
    for (const raw of fn.contractRefs) {
      if (isRecord(raw) && typeof raw.route === 'string' && typeof raw.symbol === 'string') {
        refs.push({ route: raw.route, symbol: raw.symbol });
      }
    }
  }
  return refs;
}

function readRoutes(data: Record<string, unknown>): Array<{
  route: string;
  contractPath: string;
  projection: string;
  outputFields: string[];
}> {
  if (!Array.isArray(data.routeProjections)) return [];
  return data.routeProjections.flatMap(raw => {
    if (!isRecord(raw) || typeof raw.route !== 'string' || typeof raw.contractPath !== 'string') return [];
    return [{
      route: raw.route,
      contractPath: raw.contractPath,
      projection: typeof raw.projection === 'string' ? raw.projection : '',
      outputFields: stringList(raw.outputFields),
    }];
  });
}

function readEffects(data: Record<string, unknown>): UsecaseBehavior['effects'] {
  if (!Array.isArray(data.effects)) return [];
  return data.effects.flatMap(raw => {
    if (!isRecord(raw) || typeof raw.eventId !== 'string' || typeof raw.path !== 'string' || typeof raw.symbol !== 'string') return [];
    return [{ eventId: raw.eventId, path: raw.path, symbol: raw.symbol }];
  });
}

function readTransaction(data: Record<string, unknown>): 'local' | 'none' | null {
  if (!isRecord(data.transaction)) return null;
  if (data.transaction.boundary === 'local' || data.transaction.boundary === 'none') return data.transaction.boundary;
  return null;
}
