/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/obligations.ts" enhancement="_blank"/>

/**
 * Authenticated route cases (m1_27). The oracle is read from the L2 contract of the
 * route, the access grants and the authority map; never from the emitted handler. A
 * case with authorities needs a test identity the runtime provisions. Kinds the monitor can
 * already run (identity per case, runtime m1_35 item 2) leave here for the catalog. own/other,
 * disclosure and rollback stay, with the reason on the gap. The memory harness (testing/fixture.ts,
 * m1_28) still runs what stays against the emitted code.
 * A grant proves behaviour; it is not a rule id (d1_26 r2, m1_10), so `ruleId` stays null.
 */

import { isRecord, parseDefinitionSource, readDefinition, semanticHash, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { contentHash } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import { grantsOf, qualifyFile } from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import { defV1Detail, resolveGrant } from '/_102021_/l2/agentMaterializeL1/handlers/structure/gate.js';
import { M1_SEED_REF, type M1CaseCaller } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import { nodeDisclosure, pathDisclosure, readDisclosureNodes, type DisclosureGrant, type DisclosureNode } from '/_102021_/l2/helpers/l1Defs/disclosure.js';
import { isL1Operation, L1_OPERATION_TRAITS } from '/_102021_/l2/helpers/l1Defs/operations.js';
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
 * Kinds the monitor runs once a declared actor without an identity is blocked, never anonymous
 * (runtime m1_35 item 2). The others stay obligations: own/other need a row owned by that actor,
 * disclosure needs nested `observation.fields`, rollback only Postgres proves.
 */
export const M1_MONITOR_CASE_KINDS = ['contract', 'minimalInput', 'noIdentity', 'shape', 'success'] as const;

/** False only when identity-per-case is closed and the monitor can run this kind. */
export function obligationStays(kind: M1ObligationKind, identityClosed: boolean): boolean {
  if (!identityClosed) return true;
  return !(M1_MONITOR_CASE_KINDS as readonly string[]).includes(kind);
}

/** Why a kind is not a catalog case. Empty when the monitor can run it. */
export function obligationStayText(kind: M1ObligationKind): string {
  if (kind === 'own' || kind === 'other') return 'needs a stored row owned by that actor; the monitor does not seed by owner';
  if (kind === 'disclosure') return 'needs nested paths on observation.fields (runtime m1_35 item 4)';
  if (kind === 'rollback') return 'only Postgres proves nothing was written';
  return '';
}
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
  /** Required input paths that address a stored field. Value is always `<seedRef>`. */
  params: Record<string, string>;
  /** `<Entity>.<field>` for each key of `params`, from the usecase or the contract meta. */
  paramFieldRefs: Record<string, string>;
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
  grantIds: string[];
  /** The L2 contract file and its route interface. '' on a v1 handler, which is refused. */
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
  // A handler with no contract interface is the removed v1 route: a visible gap, never a derived case.
  if (!ref.contractInterface) return { gap: defV1Detail(ref.controller.artifactId) };
  return routeObligationsV2(ref, defs, texts);
}

interface RequestOutput {
  key: string;
  entity: string;
  fields: string[];
  /** The classified paths controllers60 wrote (d1_63). Absent in an older def. */
  disclosure?: DisclosureNode[];
}

interface RequestParam {
  name: string;
  target: string;
  field?: string;
}

interface RequestRow {
  kind: 'qry' | 'cmd';
  uses: string[];
  outputs: RequestOutput[];
  /** The requestService params (d1_62): a filter names its target output and the entity field. */
  params: RequestParam[];
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
  // Same key the catalog loader reads it under (run/execute.ts prepareCatalog).
  const contractRef = qualifyFile(ref.contractPath, ref.controller.dependencies);
  const text = texts[contractRef] ?? '';
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
  // d1_62: the outputs are the ones D1 derived into the requestService; the contract output type is the check.
  const outputMembers = literalMembers(route.output);
  if (!outputMembers) return { gap: `CONTRACT_UNREAD: the output of ${ref.route} in ${ref.contractPath} was not read` };
  const rootMembers = outputMembers.allowedPaths.filter(path => !path.includes('.'));
  const missing = request.outputs.find(output => !rootMembers.includes(output.key));
  if (missing) return { gap: `CONTRACT_UNREAD: output ${missing.key} of ${ref.route} is not in the contract output` };
  const access = routeAccess(ref, defs);
  if ('gap' in access) return access;
  // The other members of the contract output (the flat paging values of a list) are part of the response as declared.
  const outputKeys = new Set(request.outputs.map(output => output.key));
  const declaredValues = rootMembers.filter(path => !outputKeys.has(path));
  const allowedPaths = sorted([...new Set([
    ...request.outputs.flatMap(output => [output.key, ...output.fields.map(field => `${output.key}.${field}`)]),
    ...declaredValues,
  ])]);
  const routeGrants = ref.grantIds.map(id => access.rows.find(row => row.grantId === id) ?? {});
  const disclosed = { allowed: [] as string[], forbidden: [] as string[] };
  for (const output of request.outputs) {
    const entityDefinition = (entity: string): unknown => [...defs.values()].find(item => item.artifactType === 'domainEntity' && item.data.entityId === entity);
    const one = disclosure(output, routeGrants, entityDefinition);
    disclosed.allowed.push(...one.allowed.map(path => `${output.key}.${path}`));
    disclosed.forbidden.push(...one.forbidden.map(path => `${output.key}.${path}`));
  }
  disclosed.allowed.push(...declaredValues);
  const tail = ref.route.split('.').pop() || ref.route;
  const command = request.kind === 'cmd';
  const optional = input.allowedPaths.filter(path => !input.required.includes(path));
  const positive: M1ObligationIdentity = access.ownField ? 'owner' : 'member';
  const sources = sorted([`${ref.defPath}#${ref.route}`, serviceEntry[0], contractRef, ...access.sources]);
  const stored = storedFieldRefs(request, defs);
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
    ...seedParams(stored, input.required, omitted),
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

/** Required input paths that address a stored row. The value is the marker, never an invented id. */
function seedParams(
  stored: ReadonlyMap<string, string>,
  required: readonly string[],
  omitted: readonly string[],
): { params: Record<string, string>; paramFieldRefs: Record<string, string> } {
  const params: Record<string, string> = {};
  const paramFieldRefs: Record<string, string> = {};
  for (const path of required) {
    if (omitted.includes(path) || omitted.some(item => path.startsWith(`${item}.`) || item.startsWith(`${path}.`))) continue;
    const ref = stored.get(path);
    if (!ref) continue;
    params[path] = M1_SEED_REF;
    paramFieldRefs[path] = ref;
  }
  return { params, paramFieldRefs };
}

/**
 * `<Entity>.<field>` for an input path the source links to a stored row: a requestService filter
 * (the field D1 derived, d1_62), or a usecase `uses` path whose operation addresses a record. Nothing is chosen by name.
 */
function storedFieldRefs(
  request: RequestRow,
  defs: ReadonlyMap<string, M1Definition>,
): Map<string, string> {
  const refs = new Map<string, string>();
  for (const param of request.params) {
    if (!param.field) continue;
    const entity = request.outputs.find(output => output.key === param.target)?.entity;
    if (entity) refs.set(param.name, `${entity}.${param.field}`);
  }
  for (const useId of request.uses) {
    const usecase = [...defs.values()].find(item => item.artifactType === 'usecase' && item.artifactId === useId);
    if (!usecase) continue;
    const operation = String(usecase.data.operation ?? '');
    const entityId = String(usecase.data.entityId ?? '');
    if (!entityId || !isL1Operation(operation) || !L1_OPERATION_TRAITS[operation].addressesRecord) continue;
    const uses = Array.isArray(usecase.data.uses) ? usecase.data.uses.filter(isRecord) : [];
    for (const row of uses) {
      if (row.source !== 'input' || (row.role !== 'selector' && row.role !== 'filter')) continue;
      if (typeof row.path !== 'string' || !row.path) continue;
      refs.set(row.path, `${entityId}.${row.path}`);
    }
  }
  return refs;
}

function requestRow(row: Record<string, unknown>): RequestRow | null {
  const kind = row.kind === 'qry' || row.kind === 'cmd' ? row.kind : null;
  const uses = Array.isArray(row.uses) ? row.uses.filter((item): item is string => typeof item === 'string' && item !== '') : [];
  if (!kind || uses.length === 0 || !Array.isArray(row.outputs)) return null;
  const outputs: RequestOutput[] = [];
  for (const item of row.outputs) {
    if (!isRecord(item) || typeof item.key !== 'string' || !item.key || typeof item.entity !== 'string' || !Array.isArray(item.fields)) return null;
    const nodes = readDisclosureNodes(item.disclosure);
    if (nodes === null) return null;
    outputs.push({ key: item.key, entity: item.entity, fields: item.fields.filter((field): field is string => typeof field === 'string'), ...(nodes ? { disclosure: nodes } : {}) });
  }
  const params: RequestParam[] = [];
  for (const item of Array.isArray(row.params) ? row.params : []) {
    if (!isRecord(item) || typeof item.name !== 'string' || typeof item.target !== 'string') continue;
    params.push({ name: item.name, target: item.target, ...(typeof item.field === 'string' && item.field ? { field: item.field } : {}) });
  }
  return { kind, uses, outputs, params };
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

/**
 * Written apart from the controller emitter on purpose. `fullRecord` discloses every
 * contract path; `fieldsOnly`/`summaryOnly` the `<entityId>.` allowed fields and what is
 * under them; any other mode, or a grant that is not declared, discloses nothing.
 */
export function disclosure(
  output: Pick<RequestOutput, 'entity' | 'fields' | 'disclosure'>,
  grants: readonly Record<string, unknown>[],
  entityDefinition: (entity: string) => unknown = () => undefined,
): { allowed: string[]; forbidden: string[] } {
  const covering = grants.map(asDisclosureGrant);
  const outputPaths = output.fields;
  // d1_63: the same rule as the request service (`nodeDisclosure`) on the nodes under each path. A path no node names
  // (an older def, or the wrapper of a list page) is read as a path of the output entity, as before.
  const allowed = outputPaths.filter(path => {
    const nodes = (output.disclosure || []).filter(node => node.field === path || node.field.startsWith(`${path}.`));
    return nodes.length
      ? nodes.every(node => nodeDisclosure(covering, node, entityDefinition) === 'disclosed')
      : pathDisclosure(covering, output.entity, path, entityDefinition(output.entity)) === 'disclosed';
  });
  const leaves = outputPaths.filter(path => !outputPaths.some(other => other.startsWith(`${path}.`)));
  return { allowed: sorted(allowed), forbidden: sorted(leaves.filter(path => !allowed.includes(path))) };
}

function asDisclosureGrant(grant: Record<string, unknown>): DisclosureGrant {
  const mode = grant.disclosure;
  return {
    disclosure: typeof mode === 'string' ? mode : '',
    allowedFields: Array.isArray(grant.allowedFields) ? grant.allowedFields.filter((item): item is string => typeof item === 'string') : [],
    entityRefs: Array.isArray(grant.entityRefs) ? grant.entityRefs.filter((item): item is string => typeof item === 'string') : [],
  };
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
