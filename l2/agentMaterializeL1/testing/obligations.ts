/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/obligations.ts" enhancement="_blank"/>

/**
 * Authenticated route cases (m1_27). The oracle is read from the L2 contract of the
 * route, the access grants and the authority map; never from the emitted handler. A
 * case with authorities needs a test identity the runtime provisions, so it is declared
 * here with that blocker. It is not a catalog case and the run never reports it executed;
 * the memory harness (testing/fixture.ts, m1_28) runs it against the emitted code.
 * A grant proves behaviour; it is not a rule id (d1_26 r2, m1_10), so `ruleId` stays null.
 */

import { isRecord, parseDefinitionSource, readDefinition, semanticHash, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { contentHash } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import { contractMembers, grantsOf } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import { resolveGrant } from '/_102021_/l2/agentMaterializeL1/handlers/structure/gate.js';
import type { M1CaseCaller } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import { parseD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import type { D2ContractV2Definition } from '/_102020_/l2/helpers/contractV2/types.js';

/** Runtime proof: credential -> actor -> personEntity and the test identities are the runtime's. */
export const M1_OBLIGATION_BLOCKER = 'RUNTIME_IDENTITY_PENDING' as const;
export const M1_OBLIGATION_OWNER = 'runtime 102034' as const;
/** "Nothing written" after a failed command: the memory runtime does not undo (102034 runInTransaction); only Postgres proves it. */
export const M1_OBLIGATION_BLOCKER_POSTGRES = 'POSTGRES_ONLY' as const;
export const M1_OBLIGATION_OWNER_POSTGRES = 'runtime 102034 (DATABASE_URL_TEST)' as const;

export type M1ObligationKind = 'contract' | 'minimalInput' | 'noIdentity' | 'own' | 'other' | 'disclosure' | 'shape' | 'success' | 'rollback';
/**
 * Actor the fixture binds: `member` holds the role, `owner` owns the addressed rows,
 * `other` holds the same role and owns none of them, `none` has the authority and no identity.
 */
export type M1ObligationIdentity = 'member' | 'owner' | 'other' | 'none';

export interface M1ObligationExpect {
  ok: boolean;
  status: number;
  errorCode: string | null;
  ruleId: null;
  /** Contract leaves no route grant discloses. */
  forbiddenPaths: string[];
  /** Contract paths every route grant discloses. A returned leaf outside them is a leak. Empty: not checked. */
  allowedPaths: string[];
  /** Every returned row carries the bound actor id in this field. */
  isolatedActorField: string | null;
}

export interface M1Obligation {
  caseId: string;
  kind: M1ObligationKind;
  routine: string;
  grantIds: string[];
  actorRef: string;
  identity: M1ObligationIdentity;
  caller: M1CaseCaller;
  /** Contract input members. The body holds the required ones, minus `omitted`. */
  input: { required: string[]; optional: string[]; omitted: string[] };
  mutating: boolean;
  expect: M1ObligationExpect;
  /** Refs the oracle was read from. A change in any of them invalidates the case. */
  sources: string[];
  blocker: typeof M1_OBLIGATION_BLOCKER | typeof M1_OBLIGATION_BLOCKER_POSTGRES;
  owner: typeof M1_OBLIGATION_OWNER | typeof M1_OBLIGATION_OWNER_POSTGRES;
}

export interface M1ObligationObservation {
  ok: boolean;
  status: number;
  errorCode: string | null;
  data: unknown;
  /** Identity the runner bound for this case; '' for `none`. */
  actorId: string;
}

export interface RouteRef {
  controller: M1Definition;
  defPath: string;
  route: string;
  kind: string;
  usecaseId: string;
  grantIds: string[];
  /** v2 handler: the L2 contract file and its route interface. '' on a v1 handler. */
  contractPath: string;
  contractInterface: string;
}

/** `gaps`: visible lines that go with the obligations (a command with one usecase has no rollback case). */
export type RouteObligations = { obligations: M1Obligation[]; gaps: string[] } | { gap: string };

export function routeObligations(
  ref: RouteRef,
  defs: ReadonlyMap<string, M1Definition>,
  texts: Readonly<Record<string, string>>,
): RouteObligations {
  if (ref.contractInterface) return routeObligationsV2(ref, defs, texts);
  const found = [...defs.entries()].find(([, item]) => item.artifactType === 'usecase' && item.artifactId === ref.usecaseId);
  if (!found) return { gap: 'contract required field was not read' };
  const [usecasePath, usecase] = found;
  const contract = contractOf(usecase, ref.route, texts);
  if (!contract) return { gap: 'contract required field was not read' };
  const scopeEntry = [...defs.entries()].find(([, item]) => item.artifactType === 'accessScope' && item.moduleName === ref.controller.moduleName);
  const rows = scopeEntry && Array.isArray(scopeEntry[1].data.grants) ? scopeEntry[1].data.grants.filter(isRecord) : [];
  const grants = scopeEntry ? grantsOf(scopeEntry[1].data) : [];
  const resolved = ref.grantIds.every(id => !('code' in resolveGrant(grants, id)));
  if (!resolved || ref.grantIds.length === 0) return { gap: 'grant is not resolved, so a contract case would fail for another cause' };
  const authorityEntry = [...defs.entries()].find(([, item]) => item.artifactType === 'authorityMap' && item.moduleName === ref.controller.moduleName);
  if (!authorityEntry) return { gap: 'AUTHORITY_UNREAD: no authority map, so every authenticated case is refused' };
  const entries = Array.isArray(authorityEntry[1].data.entries) ? authorityEntry[1].data.entries.filter(isRecord) : [];
  const actorRefs = ref.grantIds.map(id => String(entries.find(entry => entry.grantId === id)?.actorRef ?? ''));
  if (actorRefs.some(actor => !actor)) return { gap: 'AUTHORITY_UNMAPPED: a route grant has no actor in the authority map' };
  const ownFields = [...new Set(ref.grantIds.flatMap(id => {
    const grant = grants.find(item => item.grantId === id);
    return grant && grant.scopeMode === 'own' && grant.recordField ? [grant.recordField] : [];
  }))];
  if (ownFields.length > 1) return { gap: 'own grants of the route name different record fields' };
  const ownField = ownFields[0] ?? '';
  const entityId = typeof usecase.data.entityId === 'string' ? usecase.data.entityId : '';
  const routeGrants = ref.grantIds.map(id => rows.find(row => row.grantId === id) ?? {});
  const disclosed = contract.outputPaths ? disclosure(contract.outputPaths, routeGrants, entityId) : null;
  const moduleName = ref.controller.moduleName;
  const caller: M1CaseCaller = { source: 'http', authorities: sorted([...new Set(actorRefs.map(actor => `${moduleName}:${actor}`))]) };
  const tail = ref.route.split('.').pop() || ref.route;
  const optional = contract.allowedPaths.filter(path => !contract.required.includes(path));
  const operation = typeof usecase.data.operation === 'string' ? usecase.data.operation : '';
  const command = ref.kind === 'command';
  const positive: M1ObligationIdentity = ownField ? 'owner' : 'member';
  const sources = sorted([`${ref.defPath}#${ref.route}`, usecasePath, contract.ref, ...(scopeEntry ? [scopeEntry[0]] : []), authorityEntry[0]]);
  const make = (
    kind: M1ObligationKind,
    caseId: string,
    identity: M1ObligationIdentity,
    expect: Partial<M1ObligationExpect> & Pick<M1ObligationExpect, 'ok' | 'status' | 'errorCode'>,
    omitted: string[] = [],
    mutating = false,
  ): M1Obligation => ({
    caseId: `${ref.controller.artifactId}.${caseId}`,
    kind,
    routine: ref.route,
    grantIds: [...ref.grantIds],
    actorRef: actorRefs[0] ?? '',
    identity,
    caller: { source: caller.source, authorities: [...caller.authorities] },
    input: { required: [...contract.required], optional: [...optional], omitted },
    mutating,
    expect: { ruleId: null, forbiddenPaths: [], allowedPaths: [], isolatedActorField: null, ...expect },
    sources: [...sources],
    blocker: M1_OBLIGATION_BLOCKER,
    owner: M1_OBLIGATION_OWNER,
  });
  const obligations: M1Obligation[] = [];
  const field = contract.required[0];
  if (field) {
    obligations.push(make('contract', `contract.${tail}.${field}`, positive, { ok: false, status: 400, errorCode: 'VALIDATION_ERROR' }, [field]));
  }
  // An optional member made mandatory by the handler refuses this body.
  if (optional.length > 0) obligations.push(make('minimalInput', `minimal.${tail}`, positive, { ok: true, status: 200, errorCode: null }, [], command));
  if (ownField) {
    obligations.push(make('noIdentity', `noIdentity.${tail}`, 'none', { ok: false, status: 403, errorCode: 'FORBIDDEN_ACTOR' }));
    if (operation === 'list') {
      obligations.push(make('own', `own.${tail}`, 'owner', { ok: true, status: 200, errorCode: null, isolatedActorField: ownField }));
    }
    // Another actor addressing a row of the owner: the own scope makes it a missing row.
    if (hasSelector(usecase)) obligations.push(make('other', `other.${tail}`, 'other', { ok: false, status: 404, errorCode: 'NOT_FOUND' }, [], command));
  }
  if (disclosed) {
    obligations.push(make('disclosure', `disclosure.${tail}`, positive, {
      ok: true, status: 200, errorCode: null, forbiddenPaths: disclosed.forbidden, allowedPaths: disclosed.allowed,
    }, [], command));
  }
  return { obligations, gaps: [] };
}

interface RequestOutput {
  key: string;
  entity: string;
  fields: string[];
}

interface RequestRow {
  kind: 'qry' | 'cmd';
  uses: string[];
  outputs: RequestOutput[];
}

/**
 * v2 (m1_40): the page request is the case. The request comes from the requestService of the
 * controller's page, matched by route; the input and the output keys from the L2 contract v2,
 * read by the promoted parser. Nothing is derived from the route name.
 */
function routeObligationsV2(
  ref: RouteRef,
  defs: ReadonlyMap<string, M1Definition>,
  texts: Readonly<Record<string, string>>,
): RouteObligations {
  const moduleName = ref.controller.moduleName;
  const serviceEntry = [...defs.entries()].find(([, item]) => item.artifactType === 'requestService'
    && item.moduleName === moduleName && item.data.pageId === ref.controller.data.pageId);
  const requests = serviceEntry && Array.isArray(serviceEntry[1].data.requests) ? serviceEntry[1].data.requests.filter(isRecord) : [];
  const found = requests.find(row => row.route === ref.route);
  if (!serviceEntry || !found) return { gap: `REQUEST_UNREAD: no requestService request of page ${String(ref.controller.data.pageId ?? '')} has route ${ref.route}` };
  const request = requestRow(found);
  if (!request) return { gap: `REQUEST_UNREAD: the request of ${ref.route} has no kind, uses or outputs` };
  const prefix = /^_\d+_\//.exec(ref.defPath)?.[0] ?? '';
  const contractRef = [ref.contractPath, `${prefix}${ref.contractPath}`].find(key => texts[key] !== undefined) ?? '';
  const text = contractRef ? texts[contractRef] ?? '' : '';
  if (!text) return { gap: `CONTRACT_UNREAD: ${ref.contractPath} was not loaded for ${ref.route}` };
  if (!text.includes(`export interface ${ref.contractInterface} {`)) return { gap: `CONTRACT_UNREAD: ${ref.contractPath} has no interface ${ref.contractInterface}` };
  let contract: D2ContractV2Definition;
  try {
    contract = parseD2ContractV2(text);
  } catch (error) {
    return { gap: `CONTRACT_UNREAD: ${ref.contractPath}: ${error instanceof Error ? error.message : String(error)}` };
  }
  const route = contract.routes.find(item => item.route === ref.route);
  if (!route) return { gap: `CONTRACT_ROUTE_MISSING: ${ref.route} is not a route of ${ref.contractPath}` };
  if (route.kind !== request.kind) return { gap: `REQUEST_UNREAD: ${ref.route} is ${request.kind} in the requestService and ${route.kind} in the contract` };
  const input = literalMembers(route.input);
  if (!input) return { gap: `CONTRACT_UNREAD: the input of ${ref.route} in ${ref.contractPath} was not read` };
  const missing = request.outputs.find(output => !route.meta.output[output.key]);
  if (missing) return { gap: `CONTRACT_UNREAD: output ${missing.key} of ${ref.route} is not in the contract meta` };
  const access = routeAccess(ref, defs);
  if ('gap' in access) return access;
  const pagination = (key: string): string[] => Object.values(route.meta.lists)
    .filter(list => list.key === key)
    .flatMap(list => [list.page, list.pageSize, list.hasMore]);
  const allowedPaths = sorted([...new Set(request.outputs.flatMap(output => [
    output.key, ...output.fields.map(field => `${output.key}.${field}`), ...pagination(output.key),
  ]))]);
  const routeGrants = ref.grantIds.map(id => access.rows.find(row => row.grantId === id) ?? {});
  const disclosed = { allowed: [] as string[], forbidden: [] as string[] };
  for (const output of request.outputs) {
    const one = disclosure(output.fields, routeGrants, output.entity);
    disclosed.allowed.push(...one.allowed.map(path => `${output.key}.${path}`), ...pagination(output.key));
    disclosed.forbidden.push(...one.forbidden.map(path => `${output.key}.${path}`));
  }
  const tail = ref.route.split('.').pop() || ref.route;
  const command = request.kind === 'cmd';
  const optional = input.allowedPaths.filter(path => !input.required.includes(path));
  const positive: M1ObligationIdentity = access.ownField ? 'owner' : 'member';
  const sources = sorted([`${ref.defPath}#${ref.route}`, serviceEntry[0], contractRef, ...access.sources]);
  const make = (
    kind: M1ObligationKind,
    caseId: string,
    identity: M1ObligationIdentity,
    expect: Partial<M1ObligationExpect> & Pick<M1ObligationExpect, 'ok' | 'status' | 'errorCode'>,
    omitted: string[] = [],
    mutating = false,
    postgres = false,
  ): M1Obligation => ({
    caseId: `${ref.controller.artifactId}.${caseId}`,
    kind,
    routine: ref.route,
    grantIds: [...ref.grantIds],
    actorRef: access.actorRefs[0] ?? '',
    identity,
    caller: { source: access.caller.source, authorities: [...access.caller.authorities] },
    input: { required: [...input.required], optional: [...optional], omitted },
    mutating,
    expect: { ruleId: null, forbiddenPaths: [], allowedPaths: [], isolatedActorField: null, ...expect },
    sources: [...sources],
    blocker: postgres ? M1_OBLIGATION_BLOCKER_POSTGRES : M1_OBLIGATION_BLOCKER,
    owner: postgres ? M1_OBLIGATION_OWNER_POSTGRES : M1_OBLIGATION_OWNER,
  });
  const obligations: M1Obligation[] = [];
  const gaps: string[] = [];
  const field = input.required[0];
  if (field) obligations.push(make('contract', `contract.${tail}.${field}`, positive, { ok: false, status: 400, errorCode: 'VALIDATION_ERROR' }, [field]));
  if (optional.length > 0) obligations.push(make('minimalInput', `minimal.${tail}`, positive, { ok: true, status: 200, errorCode: null }, [], command));
  if (access.ownField) {
    obligations.push(make('noIdentity', `noIdentity.${tail}`, 'none', { ok: false, status: 403, errorCode: 'FORBIDDEN_ACTOR' }));
    if (!command) obligations.push(make('own', `own.${tail}`, 'owner', { ok: true, status: 200, errorCode: null, isolatedActorField: access.ownField }));
    // `other` needs a row selector; the v2 request does not name one, so it is not declared.
  }
  if (request.outputs.length > 0) {
    obligations.push(make('disclosure', `disclosure.${tail}`, positive, {
      ok: true, status: 200, errorCode: null, forbiddenPaths: sorted(disclosed.forbidden), allowedPaths: sorted([...new Set(disclosed.allowed)]),
    }, [], command));
  }
  if (command) {
    obligations.push(make('success', `success.${tail}`, positive, { ok: true, status: 200, errorCode: null, allowedPaths }, [], true));
    const second = request.uses[1];
    if (second) {
      // The second usecase fails: the command answers the platform error and nothing is written.
      obligations.push(make('rollback', `rollback.${tail}.${second}`, positive, { ok: false, status: 500, errorCode: 'INTERNAL_ERROR' }, [], true, true));
    } else {
      gaps.push(`ROLLBACK_SINGLE_USE: ${ref.route} uses one usecase`);
    }
  } else {
    obligations.push(make('shape', `shape.${tail}`, positive, { ok: true, status: 200, errorCode: null, allowedPaths }));
  }
  return { obligations, gaps };
}

interface RouteAccess {
  rows: Record<string, unknown>[];
  actorRefs: string[];
  ownField: string;
  caller: M1CaseCaller;
  sources: string[];
}

/** Grants, actors and the own field of a route, from the accessScope and the authority map. */
function routeAccess(ref: RouteRef, defs: ReadonlyMap<string, M1Definition>): RouteAccess | { gap: string } {
  const moduleName = ref.controller.moduleName;
  const scopeEntry = [...defs.entries()].find(([, item]) => item.artifactType === 'accessScope' && item.moduleName === moduleName);
  const rows = scopeEntry && Array.isArray(scopeEntry[1].data.grants) ? scopeEntry[1].data.grants.filter(isRecord) : [];
  const grants = scopeEntry ? grantsOf(scopeEntry[1].data) : [];
  const resolved = ref.grantIds.every(id => !('code' in resolveGrant(grants, id)));
  if (!resolved || ref.grantIds.length === 0) return { gap: 'grant is not resolved, so a contract case would fail for another cause' };
  const authorityEntry = [...defs.entries()].find(([, item]) => item.artifactType === 'authorityMap' && item.moduleName === moduleName);
  if (!authorityEntry) return { gap: 'AUTHORITY_UNREAD: no authority map, so every authenticated case is refused' };
  const entries = Array.isArray(authorityEntry[1].data.entries) ? authorityEntry[1].data.entries.filter(isRecord) : [];
  const actorRefs = ref.grantIds.map(id => String(entries.find(entry => entry.grantId === id)?.actorRef ?? ''));
  if (actorRefs.some(actor => !actor)) return { gap: 'AUTHORITY_UNMAPPED: a route grant has no actor in the authority map' };
  const ownFields = [...new Set(ref.grantIds.flatMap(id => {
    const grant = grants.find(item => item.grantId === id);
    return grant && grant.scopeMode === 'own' && grant.recordField ? [grant.recordField] : [];
  }))];
  if (ownFields.length > 1) return { gap: 'own grants of the route name different record fields' };
  return {
    rows,
    actorRefs,
    ownField: ownFields[0] ?? '',
    caller: { source: 'http', authorities: sorted([...new Set(actorRefs.map(actor => `${moduleName}:${actor}`))]) },
    sources: [...(scopeEntry ? [scopeEntry[0]] : []), authorityEntry[0]],
  };
}

function requestRow(row: Record<string, unknown>): RequestRow | null {
  const kind = row.kind === 'qry' || row.kind === 'cmd' ? row.kind : null;
  const uses = Array.isArray(row.uses) ? row.uses.filter((item): item is string => typeof item === 'string' && item !== '') : [];
  if (!kind || uses.length === 0 || !Array.isArray(row.outputs)) return null;
  const outputs: RequestOutput[] = [];
  for (const item of row.outputs) {
    if (!isRecord(item) || typeof item.key !== 'string' || !item.key || typeof item.entity !== 'string' || !Array.isArray(item.fields)) return null;
    outputs.push({ key: item.key, entity: item.entity, fields: item.fields.filter((field): field is string => typeof field === 'string') });
  }
  return { kind, uses, outputs };
}

/**
 * Members of an inline type literal (`{ a: T; b?: { c: U } }`). Paths are dotted; a path is
 * required when it has no `?` of its own (as `contractMembers`). Null when the text is not one.
 */
export function literalMembers(source: string): { required: string[]; allowedPaths: string[] } | null {
  const text = source.trim();
  const close = matching(text, 0);
  if (!text.startsWith('{') || close !== text.length - 1) return null;
  const required: string[] = [];
  const allowedPaths: string[] = [];
  const walk = (body: string, parent: string): boolean => {
    for (const member of splitTop(body)) {
      const match = /^['"]?([A-Za-z_$][A-Za-z0-9_$]*)['"]?\s*(\?)?\s*:([\s\S]*)$/.exec(member.replace(/^readonly\s+/, ''));
      if (!match) return false;
      const path = parent ? `${parent}.${match[1]}` : match[1];
      allowedPaths.push(path);
      if (match[2] !== '?') required.push(path);
      const type = match[3].trim();
      if (type.startsWith('{')) {
        const end = matching(type, 0);
        if (end < 0 || !walk(type.slice(1, end), path)) return false;
      }
    }
    return true;
  };
  if (!walk(text.slice(1, close), '')) return null;
  return { required, allowedPaths };
}

/** Index of the brace that closes the one at `open`; -1 when unbalanced. */
function matching(text: string, open: number): number {
  if (text[open] !== '{') return -1;
  let depth = 0;
  let quote = '';
  for (let index = open; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === quote) quote = '';
      continue;
    }
    if (char === '\'' || char === '"') quote = char;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

/** Members of a literal body, split at `;` or `,` outside braces, brackets, parens and quotes. */
function splitTop(body: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = '';
  let start = 0;
  for (let index = 0; index <= body.length; index += 1) {
    const char = body[index] ?? ';';
    if (quote) {
      if (char === quote) quote = '';
      continue;
    }
    if (char === '\'' || char === '"') quote = char;
    else if (char === '{' || char === '[' || char === '(' || char === '<') depth += 1;
    else if (char === '}' || char === ']' || char === ')' || (char === '>' && body[index - 1] !== '=')) depth -= 1;
    else if ((char === ';' || char === ',') && depth === 0) {
      const member = body.slice(start, index).trim();
      if (member) out.push(member);
      start = index + 1;
    }
  }
  return out;
}

interface RouteContract {
  ref: string;
  required: string[];
  allowedPaths: string[];
  outputPaths: string[] | null;
}

function contractOf(usecase: M1Definition, route: string, texts: Readonly<Record<string, string>>): RouteContract | null {
  const projections = Array.isArray(usecase.data.routeProjections) ? usecase.data.routeProjections.filter(isRecord) : [];
  const contractPath = String(projections.find(item => item.route === route)?.contractPath ?? '');
  if (!contractPath) return null;
  const ref = usecase.dependencies.find(path => path === contractPath || path.endsWith(`/${contractPath}`)) || contractPath;
  const text = texts[ref] || texts[contractPath] || '';
  if (!text) return null;
  const inputName = inputNameOf(route, text);
  const input = inputName ? contractMembers(text, inputName) : null;
  if (!input) return null;
  const symbol = outputSymbol(usecase, route);
  const alias = symbol ? new RegExp(`export type ${symbol}\\s*=\\s*([A-Za-z_][A-Za-z0-9_]*)\\[\\];`).exec(text) : null;
  const output = symbol ? contractMembers(text, alias ? alias[1] : symbol) : null;
  return { ref, required: input.requiredFields, allowedPaths: input.allowedPaths, outputPaths: output ? output.allowedPaths : null };
}

function inputNameOf(route: string, source: string): string {
  const tail = route.split('.').pop() ?? '';
  const stem = tail.replace(/^(cmd|qry)/, '');
  const name = stem.charAt(0).toUpperCase() + stem.slice(1);
  const candidate = name.endsWith('Input') ? name : `${name}Input`;
  return source.includes(`export interface ${candidate} `) ? candidate : '';
}

function outputSymbol(usecase: M1Definition, route: string): string {
  const functions = Array.isArray(usecase.data.functions) ? usecase.data.functions.filter(isRecord) : [];
  for (const fn of functions) {
    const refs = Array.isArray(fn.contractRefs) ? fn.contractRefs.filter(isRecord) : [];
    const found = refs.find(item => item.route === route);
    if (found && typeof found.symbol === 'string') return found.symbol;
  }
  return '';
}

function hasSelector(usecase: M1Definition): boolean {
  const uses = Array.isArray(usecase.data.uses) ? usecase.data.uses.filter(isRecord) : [];
  return uses.some(item => item.role === 'selector' && item.source === 'input');
}

/**
 * Written apart from the controller emitter on purpose. `fullRecord` discloses every
 * contract path; `fieldsOnly`/`summaryOnly` the `<entityId>.` allowed fields and what is
 * under them; any other mode, or a grant that is not declared, discloses nothing.
 */
export function disclosure(outputPaths: readonly string[], grants: readonly Record<string, unknown>[], entityId: string): { allowed: string[]; forbidden: string[] } {
  const discloses = (grant: Record<string, unknown>, path: string): boolean => {
    const mode = String(grant.disclosure ?? '');
    if (mode === 'fullRecord') return true;
    if (mode !== 'fieldsOnly' && mode !== 'summaryOnly' || !entityId) return false;
    const fields = Array.isArray(grant.allowedFields) ? grant.allowedFields.filter((item): item is string => typeof item === 'string') : [];
    return fields.some(field => field.startsWith(`${entityId}.`) && (path === field.slice(entityId.length + 1) || path.startsWith(`${field.slice(entityId.length + 1)}.`)));
  };
  const allowed = outputPaths.filter(path => grants.length > 0 && grants.every(grant => discloses(grant, path)));
  const leaves = outputPaths.filter(path => !outputPaths.some(other => other.startsWith(`${path}.`)));
  return { allowed: sorted(allowed), forbidden: sorted(leaves.filter(path => !allowed.includes(path))) };
}

/** '' when the observation meets the obligation; otherwise the first difference. */
export function obligationMiss(obligation: M1Obligation, observation: M1ObligationObservation): string {
  const expect = obligation.expect;
  if (observation.ok !== expect.ok || observation.status !== expect.status || observation.errorCode !== expect.errorCode) {
    return `different outcome: expected ${expect.ok ? 'ok' : expect.errorCode} ${expect.status}, got ${observation.ok ? 'ok' : observation.errorCode} ${observation.status}`;
  }
  if (!observation.ok) return '';
  for (const leaf of leafPaths(observation.data)) {
    const forbidden = expect.forbiddenPaths.find(path => leaf === path || leaf.startsWith(`${path}.`) || path.startsWith(`${leaf}.`));
    if (forbidden) return `forbidden path returned: ${forbidden}`;
    if (expect.allowedPaths.length > 0 && !expect.allowedPaths.some(path => leaf === path || leaf.startsWith(`${path}.`))) {
      return `undisclosed path returned: ${leaf}`;
    }
  }
  const field = expect.isolatedActorField;
  if (!field) return '';
  const rows = Array.isArray(observation.data) ? observation.data : [observation.data];
  if (!observation.actorId) return 'actor filter has no bound actor';
  if (rows.length === 0) return 'actor filter had no rows';
  const stray = rows.find(row => !isRecord(row) || row[field] !== observation.actorId);
  return stray ? 'actor filter missed' : '';
}

function leafPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    if (value.some(item => isRecord(item) || Array.isArray(item))) return [...new Set(value.flatMap(item => leafPaths(item, prefix)))];
    return prefix ? [prefix] : [];
  }
  if (!isRecord(value)) return prefix ? [prefix] : [];
  const keys = Object.keys(value);
  return keys.flatMap(key => leafPaths(value[key], prefix ? `${prefix}.${key}` : key));
}

/**
 * Hash of every source ref; an unreadable ref is `absent` and invalidates its cases. A def is
 * hashed by its semantic hash, so the run rewriting its status does not move the oracle; any
 * other source (an L2 contract) by its content.
 */
export async function obligationSourceHashes(obligations: readonly M1Obligation[], texts: Readonly<Record<string, string>>): Promise<Record<string, string>> {
  const refs = sorted([...new Set(obligations.flatMap(item => item.sources.map(source => source.split('#')[0] ?? source)))]);
  const hashes: Record<string, string> = {};
  for (const ref of refs) {
    const text = texts[ref];
    if (text === undefined) {
      hashes[ref] = 'absent';
      continue;
    }
    const parsed = ref.includes('/l1/') ? parseDefinitionSource(text) : null;
    const definition = parsed && 'definition' in parsed ? readDefinition(parsed.definition) : null;
    hashes[ref] = definition && !('issues' in definition) ? await semanticHash(definition) : await contentHash(text);
  }
  return hashes;
}

/** Cases whose oracle read a source that changed or went missing. The others keep their proof. */
export function staleObligations(obligations: readonly M1Obligation[], before: Readonly<Record<string, string>>, after: Readonly<Record<string, string>>): string[] {
  return obligations
    .filter(item => item.sources.some(source => {
      const ref = source.split('#')[0] ?? source;
      return !before[ref] || before[ref] === 'absent' || before[ref] !== after[ref];
    }))
    .map(item => item.caseId);
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
}
