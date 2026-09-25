/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/structure/runners.ts" enhancement="_blank"/>

/**
 * Bodies for the structure.* handlers. The registry list stays owned by m1_01.
 * A usecase stub reports runsStub so a production profile refuses it.
 */

import {
  outputPathFromDefPath,
  readDefinition,
  type M1Definition,
} from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { M1_STRUCTURE_HANDLERS } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import type { HandlerCall, HandlerOutcome, MaterializeHandlerRunner } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import {
  parseCatalog,
  type M1ScenarioCase,
} from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import type { M1Observation } from '/_102021_/l2/agentMaterializeL1/testing/verify.js';
import {
  auditImports,
  emitAccess,
  emitAuthority,
  emitController,
  emitDomain,
  emitPort,
  emitUsecase,
  emitValueObject,
  grantsOf,
  requiredMembers,
  type EmitFailure,
  type EmitResult,
} from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import { decideRoute, stubDecision, type StructureGrant } from '/_102021_/l2/agentMaterializeL1/handlers/structure/gate.js';

export const structureRunners: Readonly<Record<string, MaterializeHandlerRunner>> = {
  'structure.domainEntity': call => runStructure(call),
  'structure.valueObject': call => runStructure(call),
  'structure.repositoryPort': call => runStructure(call),
  'structure.usecase': call => runStructure(call),
  'structure.httpController': call => runStructure(call),
  'structure.accessScope': call => runStructure(call),
  'structure.authorityMap': call => runStructure(call),
};

export function structureHandlerIds(): string[] {
  return Object.values(M1_STRUCTURE_HANDLERS).map(item => item.id).filter(id => id.startsWith('structure.')).sort();
}

export async function runStructure(call: HandlerCall): Promise<HandlerOutcome> {
  const parsed = readDefinition(call.definition);
  if ('issues' in parsed) return failed('DEFINITION', parsed.issues.join(' '));
  const output = outputPathFromDefPath(call.unit.defPath);
  if (!output) return failed('OUTPUT_PATH', `${call.unit.defPath} has no output file.`);
  const produced = await produce(call.handler.id, parsed, output, call.read);
  if ('code' in produced) return failed(produced.code, produced.detail);
  const bad = auditImports(produced.source, produced.imports);
  const observations = await observe(call, parsed, produced.source, bad);
  if ('code' in observations) return failed(observations.code, observations.detail);
  return {
    files: { [output]: produced.source.endsWith('\n') ? produced.source : `${produced.source}\n` },
    observations,
    failure: null,
    seeds: false,
    resets: false,
    runsStub: produced.runsStub,
  };
}

async function produce(id: string, definition: M1Definition, output: string, read: HandlerCall['read']): Promise<EmitResult | EmitFailure> {
  if (id === 'structure.domainEntity') return emitDomain(definition, output);
  if (id === 'structure.valueObject') return emitValueObject(definition, output);
  if (id === 'structure.repositoryPort') return emitPort(definition, output);
  if (id === 'structure.accessScope') return emitAccess(definition, output);
  if (id === 'structure.authorityMap') return emitAuthority(definition, output);
  if (id === 'structure.usecase') return emitUsecase(definition, output, read);
  if (id === 'structure.httpController') return emitController(definition, output, read);
  return { code: 'NO_NAMED_HANDLER', detail: `${id} is not a structure body.` };
}

async function observe(call: HandlerCall, definition: M1Definition, source: string, badImport: string): Promise<M1Observation[] | EmitFailure> {
  if (call.handler.id !== 'structure.usecase' && call.handler.id !== 'structure.httpController') return [];
  if (!call.catalogRef) return { code: 'CATALOG_UNREAD', detail: 'The scenario catalog was not loaded.' };
  const text = await call.read(call.catalogRef);
  if (text === null) return { code: 'CATALOG_UNREAD', detail: `${call.catalogRef} could not be read.` };
  const parsed = parseCatalog(text);
  if (!parsed.catalog) return { code: 'CATALOG_INVALID', detail: parsed.issues.join('; ') };
  const cases = parsed.catalog.scenarios
    .filter(item => item.handlerId === call.handler.id && item.artifactId === definition.artifactId)
    .flatMap(item => item.cases);
  if (badImport) return cases.map(item => row(item.caseId, { broken: 'import', reason: badImport }));
  if (call.handler.id === 'structure.usecase') return cases.map(item => usecaseRow(item));
  const grants = await loadGrants(definition, call.read);
  if ('code' in grants) return grants;
  const rows: M1Observation[] = [];
  for (const item of cases) {
    const route = await routeFor(definition, item.routine, call.read);
    if ('code' in route) return route;
    const decision = decideRoute({
      source: 'http',
      authorities: authoritiesFor(item, grants, route.grantIds, definition.moduleName),
      grantIds: route.grantIds,
      grants,
      params: paramsFor(item, route.requiredFields),
      requiredFields: route.requiredFields,
    });
    rows.push(row(item.caseId, {
      ok: decision.ok,
      status: decision.status,
      errorCode: decision.errorCode,
      reason: decision.reachedUsecase ? 'stub' : decision.errorCode ?? '',
    }));
  }
  return rows;
}

function usecaseRow(item: M1ScenarioCase): M1Observation {
  if (item.gate === 'compile') return row(item.caseId, { ok: true, status: 0, errorCode: null, reason: 'imports resolve' });
  const decision = stubDecision();
  return row(item.caseId, {
    ok: decision.ok,
    status: decision.status,
    errorCode: decision.errorCode,
    reason: 'stub',
  });
}

async function loadGrants(definition: M1Definition, read: HandlerCall['read']): Promise<StructureGrant[] | EmitFailure> {
  const scope = definition.dependencies.find(path => path.endsWith('/accessScope.defs.ts'));
  if (!scope) return { code: 'GRANT_UNREAD', detail: `${definition.artifactId} has no access scope dependency.` };
  const text = await read(scope);
  if (text === null) return { code: 'GRANT_UNREAD', detail: `${scope} could not be read.` };
  const marker = 'export const definition = ';
  const at = text.indexOf(marker);
  const start = text.indexOf('{', at);
  const end = text.lastIndexOf(' as const;');
  if (at < 0 || start < 0 || end < start) return { code: 'GRANT_UNREAD', detail: `${scope} is not a definition.` };
  try {
    const value = JSON.parse(text.slice(start, end)) as { data?: Record<string, unknown> };
    if (!value.data) return { code: 'GRANT_UNREAD', detail: `${scope} has no data.` };
    return grantsOf(value.data);
  } catch {
    return { code: 'GRANT_UNREAD', detail: `${scope} is not JSON.` };
  }
}

async function routeFor(
  definition: M1Definition,
  routine: string,
  read: HandlerCall['read'],
): Promise<{ grantIds: string[]; requiredFields: string[] } | EmitFailure> {
  const handlers = Array.isArray(definition.data.handlers) ? definition.data.handlers : [];
  const handler = handlers.find(item => !!item && typeof item === 'object' && (item as { route?: string }).route === routine) as { grantIds?: unknown; usecaseId?: string } | undefined;
  if (!handler || typeof handler.usecaseId !== 'string') {
    return { code: 'ROUTE_MISSING', detail: `${definition.artifactId} has no route ${routine}.` };
  }
  const usecaseDep = definition.dependencies.find(path => path.endsWith(`/${handler.usecaseId}.defs.ts`));
  if (!usecaseDep) return { code: 'USECASE_UNBOUND', detail: `${routine} has no dependency on ${handler.usecaseId}.` };
  const text = await read(usecaseDep);
  if (text === null) return { code: 'USECASE_UNBOUND', detail: `${usecaseDep} could not be read.` };
  const parsed = readDefinition(JSON.parse(sliceJson(text) || 'null'));
  if ('issues' in parsed) return { code: 'USECASE_UNBOUND', detail: parsed.issues.join(' ') };
  const projection = Array.isArray(parsed.data.routeProjections)
    ? parsed.data.routeProjections.find(item => !!item && typeof item === 'object' && (item as { route?: string }).route === routine) as { contractPath?: string } | undefined
    : undefined;
  const contractPath = typeof projection?.contractPath === 'string' ? projection.contractPath : '';
  const contract = parsed.dependencies.find(path => contractPath && (path === contractPath || path.endsWith(`/${contractPath}`)));
  if (!contract) return { code: 'CONTRACT_UNREAD', detail: `${routine} contract was not read.` };
  const contractText = await read(contract);
  if (contractText === null) return { code: 'CONTRACT_UNREAD', detail: `${contract} could not be read.` };
  const inputType = inputName(routine, contractText);
  if (!inputType) return { code: 'CONTRACT_SYMBOL', detail: `${contract} has no input for ${routine}.` };
  const required = requiredMembers(contractText, inputType);
  if (!required) return { code: 'CONTRACT_SYMBOL', detail: `${inputType} could not be read.` };
  const grantIds = Array.isArray(handler.grantIds) ? handler.grantIds.filter((item): item is string => typeof item === 'string') : [];
  return { grantIds, requiredFields: required };
}

function inputName(routine: string, source: string): string {
  const tail = routine.split('.').pop() ?? '';
  const stem = tail.replace(/^(cmd|qry)/, '');
  const name = stem.charAt(0).toUpperCase() + stem.slice(1);
  const candidate = name.endsWith('Input') ? name : `${name}Input`;
  if (source.includes(`export interface ${candidate} `)) return candidate;
  return '';
}

function authoritiesFor(item: M1ScenarioCase, grants: readonly StructureGrant[], grantIds: readonly string[], moduleName: string): string[] {
  const empty = item.actorId === '' || item.preconditions.some(entry => entry.includes('verifiedAuthorities is empty'));
  if (empty) return [];
  return grantIds.flatMap(grantId => {
    const grant = grants.find(entry => entry.grantId === grantId);
    return grant?.actorRef ? [`${moduleName}:${grant.actorRef}`] : [];
  });
}

function paramsFor(item: M1ScenarioCase, fields: readonly string[]): Record<string, string> {
  const omitted = item.preconditions.flatMap(entry => {
    const match = /^([A-Za-z][A-Za-z0-9]*) omitted$/.exec(entry);
    return match ? [match[1]] : [];
  });
  const params: Record<string, string> = {};
  for (const field of fields) {
    if (!omitted.includes(field)) params[field] = 'value';
  }
  return params;
}

function sliceJson(source: string): string {
  const marker = 'export const definition = ';
  const at = source.indexOf(marker);
  const start = source.indexOf('{', at);
  const end = source.lastIndexOf(' as const;');
  if (at < 0 || start < 0 || end < start) return '';
  return source.slice(start, end);
}

function row(caseId: string, patch: Partial<M1Observation> & { reason?: string }): M1Observation {
  return {
    caseId,
    durationMs: 1,
    broken: patch.broken ?? 'none',
    thrown: false,
    skipped: false,
    inconclusive: false,
    blocked: false,
    blockOwner: '',
    ok: patch.ok ?? false,
    status: patch.status ?? 0,
    errorCode: patch.errorCode ?? null,
    ruleId: null,
    fields: [],
    rowActorIds: [],
    reason: patch.reason ?? '',
  };
}

function failed(code: string, detail: string): HandlerOutcome {
  return { files: {}, observations: [], failure: { code, detail }, seeds: false, resets: false, runsStub: false };
}
