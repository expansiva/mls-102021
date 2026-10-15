/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/fidelity.ts" enhancement="_blank"/>

import { integrationMechanismIssues, isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { declaredDependencyPaths, readDefinitionExport } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { parseD1Source } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import {
  capabilityApplies,
  capabilityNames,
  declaredFieldsFor,
  domainSignature,
  mdmInputFields,
  namespaceOf,
  ontologyTransitions,
  platformFieldPaths,
  preconditionsFor,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/context.js';
import { mdmForOperation } from '/_102021_/l2/agentDefsL1/steps/usecases50/mdmBinding.js';
import type { D1MdmArgument, D1MdmClause, D1MdmOrigin, D1MdmPlannedCall, D1UsecaseEntity, D1UsecaseField, D1UsecaseMdm } from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';
import { L1_OPERATIONS, type L1Operation } from '/_102021_/l2/helpers/l1Defs/operations.js';

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
  mdm: D1UsecaseMdm | null;
  rules: Array<{ ruleId: string; path: string; symbol: string }>;
  effects: Array<{ eventId: string; path: string; symbol: string }>;
  routes: Array<{ route: string; contractPath: string; symbol: string; outputFields: string[] }>;
}

const READ: Record<L1Operation, boolean> = {
  list: true, get: true, create: false, update: false, transition: false, delete: false, custom: false,
};
const READ_OPERATIONS = new Set<string>(L1_OPERATIONS.filter(operation => READ[operation]));
const UPDATE: Record<L1Operation, boolean> = {
  list: false, get: false, create: false, update: true, transition: false, delete: false, custom: false,
};
const UPDATE_OPERATIONS = new Set<string>(L1_OPERATIONS.filter(operation => UPDATE[operation]));

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
  const read = readDefinitionExport(source);
  const definition = read && isRecord(read.definition) ? read.definition : null;
  const data = definition && isRecord(definition.data) ? definition.data : null;
  const dependsFiles = declaredDependencyPaths(source);
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
  if (operation === 'transition' && !hasDep(dependsFiles, ontologyPath)) {
    fail(problems, 'DEPENDENCY_MISSING', usecaseId, `Ontology ${ontologyPath} is not in dependencies.`);
  }

  const transitionRef = typeof data.transitionRef === 'string' ? data.transitionRef : '';
  const transition = ontology
    ? ontologyTransitions(ontology).find(entry => entry.transitionId === transitionRef) || null
    : null;
  if (operation === 'transition' && ontology && !transition) {
    fail(problems, 'TRANSITION_UNKNOWN', usecaseId, `Transition '${transitionRef || '(missing)'}' of ${usecaseId} is not in the ${entityId} lifecycle of ${ontologyPath}.`);
  }

  const ruleRefs: UsecaseBehavior['rules'] = [];
  for (const ruleId of stringList(data.rulesApplied)) {
    const located = locateRule(files, ruleId);
    if (!located) {
      fail(problems, 'RULE_TEXT_ABSENT', usecaseId, `Rule ${ruleId} has no text in the L4 sources.`);
      continue;
    }
    if (!hasDep(dependsFiles, located.path)) {
      fail(problems, 'DEPENDENCY_MISSING', usecaseId, `Rule source ${located.path} is not in dependencies.`);
    }
    if (!located.text) {
      fail(problems, 'RULE_TEXT_ABSENT', usecaseId, `Rule ${ruleId} has no text in ${located.path}.`);
      continue;
    }
    ruleRefs.push({ ruleId, path: located.path, symbol: ruleId });
  }

  const mdm = readMdm(data);
  if (ontology && isMdmOntology(ontology)) {
    const names = capabilityNames(ontology);
    const signed = domainSignature(entityForMdm(ontology, entityId), operation, transition?.payload || []);
    const read = mdmInputFields(
      signed.input,
      preconditionsFor(files, moduleName, entityId, []),
      declaredFieldsFor(files, moduleName, entityId, []),
    );
    const bound = mdmForOperation({
      entityId,
      namespace: namespaceOf(ontology),
      capabilities: names,
      selected: names.filter(name => capabilityApplies(name, operation)),
      platformFields: platformFieldPaths(ontology),
      inputFields: read.fields,
      outputFields: signed.output.map(field => ({ path: field.name })),
      contractUnread: read.unread.join('; '),
      operation,
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

  const effects = readEffects(data);
  const outboundIssues = outboundMechanismProblems(files);
  for (const effect of effects) {
    if (!hasDep(dependsFiles, effect.path)) {
      fail(problems, 'DEPENDENCY_MISSING', usecaseId, `Effect source ${effect.path} is not in dependencies.`);
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
    for (const issue of outboundIssues) {
      if (!issue.message.includes(effect.eventId)) continue;
      fail(problems, issue.code, usecaseId, issue.message);
    }
  }

  if (!problems.length) {
    return {
      behavior: {
        usecaseId,
        operation,
        mdm,
        rules: ruleRefs,
        effects,
        routes: [],
      },
      problems,
    };
  }
  return { behavior: null, problems };
}

/** The serialized usecase no longer carries a signature. MDM is rebound from the ontology the def depends on. */
function entityForMdm(ontology: unknown, entityId: string): D1UsecaseEntity {
  return {
    entityId,
    storageTarget: isMdmOntology(ontology) ? 'mdm' : 'moduleDatabase',
    defPath: '',
    namespace: namespaceOf(ontology),
    fields: ontologyEntityFields(ontology),
    transitions: [],
    rules: [],
    enumerations: [],
    capabilities: capabilityNames(ontology),
    platformFields: platformFieldPaths(ontology),
  };
}

function ontologyEntityFields(body: unknown): D1UsecaseField[] {
  if (!isRecord(body) || !isRecord(body.record) || !isRecord(body.record.fields)) return [];
  const out: D1UsecaseField[] = [];
  walkEntityFields(body.record.fields, '', out);
  return out;
}

function walkEntityFields(fields: Record<string, unknown>, prefix: string, out: D1UsecaseField[]): void {
  for (const [key, raw] of Object.entries(fields)) {
    if (!isRecord(raw)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (isRecord(raw.fields)) {
      walkEntityFields(raw.fields, path, out);
      continue;
    }
    out.push({
      name: path,
      type: typeof raw.type === 'string' && raw.type ? raw.type : 'string',
      derived: raw.derived === true,
      ...(raw.writePrecondition === true ? { writePrecondition: true } : {}),
    });
  }
}

function locateRule(files: readonly FidelityFile[], ruleId: string): { path: string; text: string } | null {
  for (const file of files) {
    const body = parseD1Source(file.text, 'defs');
    const text = ruleText(body, ruleId);
    if (text) return { path: file.path, text };
  }
  return null;
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
  if (source === 'input' && READ_OPERATIONS.has(operation)) return 'filter';
  return 'write';
}

function useKey(use: D1FieldUse): string {
  return `${use.source}\u0000${use.path}\u0000${use.role}`;
}

function fail(problems: FidelityProblem[], code: string, path: string, message: string): void {
  if (problems.some(item => item.code === code && item.message === message)) return;
  problems.push({ code, path, message });
}

function strip(path: string): string {
  return path.replace(/^\/?_\d+_\/+/, '');
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

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function isMdmOntology(body: unknown): boolean {
  if (!isRecord(body)) return false;
  if (isRecord(body.storage) && body.storage.target === 'mdm') return true;
  return body.kind === 'role' && typeof body.roleTag === 'string' && body.roleTag.length > 0;
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

/** Reads persisted integrationOutbound defs. The draft is not consulted. */
function outboundMechanismProblems(files: readonly FidelityFile[]): FidelityProblem[] {
  const problems: FidelityProblem[] = [];
  for (const file of files) {
    const rendered = readDefinitionExport(file.text);
    if (!rendered || !isRecord(rendered.definition) || rendered.definition.artifactType !== 'integrationOutbound') continue;
    if (!isRecord(rendered.definition.data)) continue;
    for (const issue of integrationMechanismIssues(rendered.definition.data)) {
      const match = /^(FICTIONAL_API|MECHANISM_REF|MECHANISM_INCOMPATIBLE): /.exec(issue);
      if (!match) continue;
      problems.push({ code: match[1], path: file.path, message: issue });
    }
  }
  return problems;
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
    const origin = asOrigin(raw.origin);
    if (!origin) return null;
    const arg: D1MdmArgument = { name: raw.name, role: raw.role, origin };
    if (typeof raw.capability === 'string') arg.capability = raw.capability;
    if (typeof raw.path === 'string') arg.path = raw.path;
    if (typeof raw.value === 'string') arg.value = raw.value;
    args.push(arg);
  }
  if (typeof value.id !== 'string' || !value.id) return null;
  const when = asWhen(value.when);
  if (!when) return null;
  return {
    id: value.id,
    method: value.method as D1MdmPlannedCall['method'],
    target,
    shape,
    capabilities: stringList(value.capabilities),
    alternative: value.alternative,
    when,
    arguments: args,
    result: stringList(value.result),
  };
}

function asOrigin(value: unknown): D1MdmOrigin | null {
  if (!isRecord(value)) return null;
  if (value.kind !== 'contract' && value.kind !== 'context' && value.kind !== 'literal' && value.kind !== 'prior') return null;
  const origin: D1MdmOrigin = { kind: value.kind };
  if (typeof value.path === 'string') origin.path = value.path;
  if (Array.isArray(value.calls) && value.calls.every(item => typeof item === 'string')) origin.calls = stringList(value.calls);
  if (typeof value.evidence === 'string') origin.evidence = value.evidence;
  return origin;
}

function asWhen(value: unknown): D1MdmClause[] | null {
  if (!Array.isArray(value)) return null;
  const clauses: D1MdmClause[] = [];
  for (const raw of value) {
    if (!isRecord(raw) || (raw.kind !== 'contract' && raw.kind !== 'prior')) return null;
    if (typeof raw.path !== 'string' || typeof raw.present !== 'boolean') return null;
    const clause: D1MdmClause = { kind: raw.kind, path: raw.path, present: raw.present };
    if (typeof raw.call === 'string') clause.call = raw.call;
    clauses.push(clause);
  }
  return clauses;
}

function sameCall(left: D1MdmPlannedCall, right: D1MdmPlannedCall): boolean {
  return JSON.stringify(normalizeCall(left)) === JSON.stringify(normalizeCall(right));
}

function normalizeCall(call: D1MdmPlannedCall): unknown {
  return {
    id: call.id,
    method: call.method,
    target: call.target,
    shape: call.shape,
    alternative: call.alternative,
    when: call.when.map(clause => ({
      kind: clause.kind,
      path: clause.path,
      call: clause.call || '',
      present: clause.present,
    })),
    arguments: call.arguments.map(arg => ({
      name: arg.name,
      role: arg.role,
      capability: arg.capability || '',
      path: arg.path || '',
      value: arg.value || '',
      origin: {
        kind: arg.origin.kind,
        path: arg.origin.path || '',
        calls: arg.origin.calls || [],
        evidence: arg.origin.evidence || '',
      },
    })).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))),
    capabilities: [...call.capabilities].sort(),
    result: [...call.result],
  };
}

function readEffects(data: Record<string, unknown>): UsecaseBehavior['effects'] {
  if (!Array.isArray(data.effects)) return [];
  return data.effects.flatMap(raw => {
    if (!isRecord(raw) || typeof raw.eventId !== 'string' || typeof raw.path !== 'string' || typeof raw.symbol !== 'string') return [];
    return [{ eventId: raw.eventId, path: raw.path, symbol: raw.symbol }];
  });
}

