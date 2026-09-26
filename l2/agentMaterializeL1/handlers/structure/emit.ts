/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/structure/emit.ts" enhancement="_blank"/>

/**
 * Renders one structure file from a v2 def. Imports are only platform files,
 * an existing l2 contract, or the output of a dependency. A missing source
 * is a named failure, not an import of a file that does not exist.
 */

import {
  isRecord,
  outputPathFromDefPath,
  type M1Definition,
} from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { M1_STUB_ERROR, M1_STUB_STATUS } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import {
  FORBIDDEN_ACTOR,
  GRANT_ABSENT,
  REPOSITORY_NOT_IMPLEMENTED,
  SCOPE_UNBOUND,
  SESSION_UNVERIFIED,
  VALIDATION_ERROR,
  type StructureGrant,
} from '/_102021_/l2/agentMaterializeL1/handlers/structure/gate.js';

/** Raised when the structure handler body changes. An older receipt is a new input. */
export const STRUCTURE_HANDLER_RECIPE = '2026-09-26-structure-handler-v2';

const PLATFORM_CONTRACTS = '/_102034_/l1/server/layer_2_controllers/contracts.js';

export interface EmitFailure {
  code: string;
  detail: string;
}

export interface EmitResult {
  source: string;
  runsStub: boolean;
  imports: string[];
}

export type StructureRead = (ref: string) => Promise<string | null>;

interface FieldRow {
  name: string;
  type: string;
}

interface Tree {
  ts: string;
  children: Map<string, Tree>;
}

export function emitDomain(definition: M1Definition, output: string): EmitResult {
  const name = token(definition.data.entityId, definition.artifactId);
  const fields = fieldRows(definition.data.fields);
  const states = lifecycleStates(definition.data.lifecycle);
  const body = renderType(nest(fields, states), '');
  return { runsStub: false, imports: [], source: `${header(output)}\nexport interface ${name} ${body}\n` };
}

export function emitValueObject(definition: M1Definition, output: string): EmitResult {
  const name = token(definition.data.valueObjectId, definition.artifactId);
  const [referencedBy] = emittedValueExports(definition);
  const fields = fieldRows(definition.data.fields);
  const referenced = stringList(definition.data.referencedBy);
  const body = renderType(nest(fields, []), '');
  return {
    runsStub: false,
    imports: [],
    source: [
      header(output),
      `export interface ${name} ${body}`,
      `export const ${referencedBy} = ${JSON.stringify(referenced)} as const;`,
      '',
    ].join('\n'),
  };
}

export function emitPort(definition: M1Definition, output: string): EmitResult | EmitFailure {
  const interfaceName = token(definition.data.interfaceName, definition.artifactId);
  const entity = token(definition.data.entityId, 'Entity');
  const entityDep = definition.dependencies.find(path => path.includes('/entities/'));
  if (!entityDep) return { code: 'ENTITY_UNBOUND', detail: `${interfaceName} has no entity dependency.` };
  const methods = Array.isArray(definition.data.methods) ? definition.data.methods.filter(isRecord) : [];
  if (methods.length === 0) return { code: 'PORT_EMPTY', detail: `${interfaceName} has no methods.` };
  const locals = new Set<string>();
  const signatures = methods.map(method => renderMethod(method, entity, locals, false));
  const bodies = methods.map(method => renderMethod(method, entity, locals, true));
  const aliases = [...locals].filter(name => name !== entity).map(name => `export type ${name} = Record<string, unknown>;`);
  const [pending] = emittedValueExports(definition);
  const entityImport = importSpecifier(entityDep, 'output');
  return {
    runsStub: true,
    imports: [PLATFORM_CONTRACTS, entityImport],
    source: [
      header(output),
      `import { AppError } from '${PLATFORM_CONTRACTS}';`,
      `import type { ${entity} } from '${importSpecifier(entityDep, 'output')}';`,
      '',
      ...aliases,
      aliases.length ? '' : '',
      `export interface ${interfaceName} {`,
      ...signatures,
      '}',
      '',
      `export const ${pending}: ${interfaceName} = {`,
      ...bodies,
      '};',
      '',
    ].filter((line, index, all) => line !== '' || all[index - 1] !== '').join('\n'),
  };
}

export function emitAccess(definition: M1Definition, output: string): EmitResult {
  const grants = grantsOf(definition.data);
  const [grantsName, resolveName] = emittedValueExports(definition);
  const literal = grants.map(grant => `  ${JSON.stringify(grant)}`).join(',\n');
  return {
    runsStub: false,
    imports: [],
    source: [
      header(output),
      'export interface StructureGrant {',
      '  grantId: string;',
      '  actorRef: string;',
      '  scopeMode: string;',
      '  session: string;',
      '  pending: string;',
      '  disclosure: string;',
      '  recordField: string;',
      '}',
      '',
      `export const ${grantsName}: readonly StructureGrant[] = [`,
      literal,
      '];',
      '',
      `export function ${resolveName}(grantId: string): StructureGrant | { code: string; detail: string } {`,
      `  const grant = ${grantsName}.find(item => item.grantId === grantId);`,
      `  if (!grant) return { code: '${GRANT_ABSENT}', detail: \`Grant \${grantId} is not declared.\` };`,
      '  if (grant.pending) return { code: grant.pending, detail: `Grant ${grantId} is pending ${grant.pending}.` };',
      `  if (grant.session !== 'verified') return { code: '${SESSION_UNVERIFIED}', detail: \`Grant \${grantId} session is not verified.\` };`,
      `  if (!grant.scopeMode) return { code: '${SCOPE_UNBOUND}', detail: \`Grant \${grantId} has no scope mode.\` };`,
      '  if (grant.scopeMode === \'own\' && !grant.recordField) return { code: \'ACCESS_ANCHOR\', detail: `Grant ${grantId} has no resolved scope path.` };',
      '  return grant;',
      '}',
      '',
    ].join('\n'),
  };
}

export function emitAuthority(definition: M1Definition, output: string): EmitResult {
  const entries = Array.isArray(definition.data.entries) ? definition.data.entries.filter(isRecord) : [];
  const [entriesName, actorRefName] = emittedValueExports(definition);
  const rows = entries
    .map(entry => ({ grantId: String(entry.grantId ?? ''), actorRef: String(entry.actorRef ?? '') }))
    .filter(entry => entry.grantId);
  return {
    runsStub: false,
    imports: [],
    source: [
      header(output),
      `export const ${entriesName} = ${JSON.stringify(rows, null, 2)} as const;`,
      '',
      `export function ${actorRefName}(grantId: string): string | null {`,
      `  const entry = ${entriesName}.find(item => item.grantId === grantId);`,
      '  return entry ? entry.actorRef : null;',
      '}',
      '',
    ].join('\n'),
  };
}

export async function emitUsecase(definition: M1Definition, output: string, read: StructureRead): Promise<EmitResult | EmitFailure> {
  const fn = firstFunction(definition);
  const [fnName] = emittedValueExports(definition);
  if (!fn || !fnName) return { code: 'FUNCTION_MISSING', detail: `${definition.artifactId} has no function.` };
  const contracts = await resolveContracts(definition, fn, read);
  if ('code' in contracts) return contracts;
  const declaredPorts = stringList(definition.data.ports);
  const ports = portBindings(definition);
  if (declaredPorts.length > 0 && ports.length === 0) {
    return { code: 'PORT_UNBOUND', detail: `${definition.artifactId} names a port that is not a dependency.` };
  }
  const portImport = ports.length === 0
    ? ''
    : `import type { ${ports.map(item => item.interfaceName).join(', ')} } from '${ports[0].specifier}';`;
  if (ports.length > 1 && new Set(ports.map(item => item.specifier)).size > 1) {
    return { code: 'PORT_UNBOUND', detail: `${definition.artifactId} ports are not in one module.` };
  }
  const portArg = ports.length === 0
    ? ''
    : `, ports: { ${ports.map(item => `${item.binding}: ${item.interfaceName}`).join('; ')} }`;
  const voidPorts = ports.length === 0 ? '' : '  void ports;\n';
  const aliases = contracts.map((contract, index) => `import type { ${contract.inputType} as ${contract.inputType}_${index}, ${contract.outputType} as ${contract.outputType}_${index} } from '${contract.specifier}';`);
  const inputUnion = contracts.map((contract, index) => `${contract.inputType}_${index}`).join(' | ');
  const outputUnion = contracts.map((contract, index) => `${contract.outputType}_${index}`).join(' | ');
  return {
    runsStub: true,
    imports: [PLATFORM_CONTRACTS, ...contracts.map(item => item.specifier), ...ports.map(item => item.specifier)],
    source: [
      header(output),
      `import { AppError } from '${PLATFORM_CONTRACTS}';`,
      `import type { RequestContext } from '${PLATFORM_CONTRACTS}';`,
      ...aliases,
      portImport,
      '',
      `export async function ${fnName}(input: ${inputUnion}, ctx: RequestContext${portArg}): Promise<${outputUnion}> {`,
      '  void input;',
      '  void ctx;',
      voidPorts.trimEnd(),
      `  throw new AppError('${M1_STUB_ERROR}', '${fnName} is not implemented.', ${M1_STUB_STATUS});`,
      '}',
      '',
    ].filter(line => line !== '').join('\n'),
  };
}

export async function emitController(definition: M1Definition, output: string, read: StructureRead): Promise<EmitResult | EmitFailure> {
  const scopeDep = definition.dependencies.find(path => path.endsWith('/accessScope.defs.ts'));
  if (!scopeDep) return { code: 'GRANT_UNREAD', detail: `${definition.artifactId} has no access scope dependency.` };
  const scopeText = await read(scopeDep);
  if (scopeText === null) return { code: 'GRANT_UNREAD', detail: `${scopeDep} could not be read.` };
  const handlers = Array.isArray(definition.data.handlers) ? definition.data.handlers.filter(isRecord) : [];
  if (handlers.length === 0) return { code: 'ROUTE_MISSING', detail: `${definition.artifactId} declares no route.` };
  const routes: ResolvedRoute[] = [];
  for (const handler of handlers) {
    const resolved = await resolveRoute(definition, handler, read);
    if ('code' in resolved) return resolved;
    routes.push(resolved);
  }
  const usecaseImports = unique(routes.map(route => `import { ${route.usecaseId} } from '${route.usecaseSpecifier}';`));
  const typeImports = unique(routes.map(route => `import type { ${route.inputType} } from '${route.inputSpecifier}';`));
  const portImports = unique(routes.flatMap(route => route.ports.map(port => `import { ${port.pending} } from '${port.specifier}';`)));
  const functions = routes.map(renderHandler);
  const imports = [
    PLATFORM_CONTRACTS,
    importSpecifier(scopeDep, 'output'),
    ...routes.map(route => route.usecaseSpecifier),
    ...routes.map(route => route.inputSpecifier),
    ...routes.flatMap(route => route.ports.map(port => port.specifier)),
  ];
  return {
    runsStub: false,
    imports,
    source: [
      header(output),
      `import { AppError, type BffRequest, type BffResponse, type ControllerRoute, type IRequestEnvelope } from '${PLATFORM_CONTRACTS}';`,
      `import { resolveGrant } from '${importSpecifier(scopeDep, 'output')}';`,
      ...usecaseImports,
      ...typeImports,
      ...portImports,
      '',
      `export const ${emittedValueExports(definition)[0]}: ControllerRoute[] = [`,
      ...routes.map(route => `  { key: '${route.route}', handler: ${route.fn} },`),
      '];',
      '',
      ...functions,
      scopeSource(),
      authorizeSource(),
      validateSource(),
      projectSource(),
      '',
    ].join('\n'),
  };
}

interface ResolvedContract {
  specifier: string;
  inputType: string;
  outputType: string;
  requiredFields: string[];
  outputFields: string[];
}

interface PortBinding {
  interfaceName: string;
  specifier: string;
  binding: string;
  pending: string;
}

interface ResolvedRoute {
  route: string;
  usecaseId: string;
  grantIds: string[];
  fn: string;
  usecaseSpecifier: string;
  inputType: string;
  inputSpecifier: string;
  requiredFields: string[];
  outputFields: string[];
  ports: PortBinding[];
}

async function resolveContracts(definition: M1Definition, fn: { contractRefs: { route: string; symbol: string }[] }, read: StructureRead): Promise<ResolvedContract[] | EmitFailure> {
  const refs = fn.contractRefs.filter(item => item.symbol.endsWith('Output'));
  if (refs.length === 0) return { code: 'CONTRACT_UNREAD', detail: `${definition.artifactId} has no output contract.` };
  const contracts: ResolvedContract[] = [];
  const seen = new Set<string>();
  for (const ref of refs) {
    if (seen.has(`${ref.route}:${ref.symbol}`)) continue;
    seen.add(`${ref.route}:${ref.symbol}`);
    const resolved = await resolveContract(definition, { contractRefs: [ref] }, read, ref.route);
    if ('code' in resolved) return resolved;
    contracts.push(resolved);
  }
  return contracts;
}

async function resolveContract(definition: M1Definition, fn: { contractRefs: { route: string; symbol: string }[] }, read: StructureRead, route = ''): Promise<ResolvedContract | EmitFailure> {
  const outputRef = fn.contractRefs.find(item => item.symbol.endsWith('Output') && (!route || item.route === route))
    ?? fn.contractRefs.find(item => item.symbol.endsWith('Output'));
  if (!outputRef) return { code: 'CONTRACT_UNREAD', detail: `${definition.artifactId} has no output contract.` };
  const projection = projections(definition).find(item => item.route === outputRef.route);
  const dependency = contractDependency(definition, projection?.contractPath ?? '', outputRef.route);
  if (!dependency) return { code: 'CONTRACT_UNREAD', detail: `${outputRef.route} is not a dependency.` };
  const text = await read(dependency);
  if (text === null) return { code: 'CONTRACT_UNREAD', detail: `${dependency} could not be read.` };
  const inputType = outputRef.symbol.replace(/Output$/, 'Input');
  if (!text.includes(`export interface ${inputType} `) && !text.includes(`export interface ${inputType}{`)) {
    return { code: 'CONTRACT_SYMBOL', detail: `${dependency} does not export ${inputType}.` };
  }
  if (!text.includes(outputRef.symbol)) return { code: 'CONTRACT_SYMBOL', detail: `${dependency} does not export ${outputRef.symbol}.` };
  const required = requiredMembers(text, inputType);
  if (!required) return { code: 'CONTRACT_SYMBOL', detail: `${inputType} could not be read.` };
  return {
    specifier: importSpecifier(dependency, 'defs'),
    inputType,
    outputType: outputRef.symbol,
    requiredFields: required,
    outputFields: projection?.outputFields ?? [],
  };
}

async function resolveRoute(definition: M1Definition, handler: Record<string, unknown>, read: StructureRead): Promise<ResolvedRoute | EmitFailure> {
  const route = typeof handler.route === 'string' ? handler.route : '';
  const usecaseId = typeof handler.usecaseId === 'string' ? handler.usecaseId : '';
  const grantIds = stringList(handler.grantIds);
  if (!route || !usecaseId) return { code: 'ROUTE_MISSING', detail: `${definition.artifactId} has a route without an id.` };
  const usecaseDep = definition.dependencies.find(path => path.endsWith(`/${usecaseId}.defs.ts`));
  if (!usecaseDep) return { code: 'USECASE_UNBOUND', detail: `${route} has no dependency on ${usecaseId}.` };
  const usecaseText = await read(usecaseDep);
  if (usecaseText === null) return { code: 'USECASE_UNBOUND', detail: `${usecaseDep} could not be read.` };
  const parsed = parseDefinitionExport(usecaseText);
  if (!parsed) return { code: 'USECASE_UNBOUND', detail: `${usecaseDep} is not a definition.` };
  const fn = firstFunction(parsed);
  if (!fn) return { code: 'FUNCTION_MISSING', detail: `${usecaseId} has no function.` };
  const contract = await resolveContract(parsed, fn, read, route);
  if ('code' in contract) return contract;
  const projection = projections(parsed).find(item => item.route === route);
  if (!projection || projection.outputFields.length === 0) {
    return { code: 'PROJECTION_UNDECLARED', detail: `${route} has no output projection.` };
  }
  const ports = portBindings(parsed);
  const args = [`input.request.params as ${contract.inputType}`, 'input.ctx'];
  if (ports.length > 0) {
    args.push(`{ ${ports.map(item => `${item.binding}: ${item.pending}`).join(', ')} }`);
  }
  return {
    route,
    usecaseId,
    grantIds,
    fn: functionName(route),
    usecaseSpecifier: importSpecifier(usecaseDep, 'output'),
    inputType: contract.inputType,
    inputSpecifier: contract.specifier,
    requiredFields: contract.requiredFields,
    outputFields: projection.outputFields,
    ports,
  };
}

function renderHandler(route: ResolvedRoute): string {
  const grants = route.grantIds.map(item => `'${item}'`).join(', ');
  const required = route.requiredFields.map(item => `'${item}'`).join(', ');
  const projected = route.outputFields.map(item => `'${item}'`).join(', ');
  return [
    `async function ${route.fn}(input: IRequestEnvelope): Promise<BffResponse> {`,
    `  const denied = authorize(input.request, [${grants}]);`,
    '  if (denied) throw denied;',
    `  const invalid = validateInput(input.request.params, [${required}]);`,
    '  if (invalid) throw invalid;',
    `  const data = await ${route.usecaseId}(${argsOf(route)});`,
    `  return { ok: true, data: projectOutput(data, [${projected}]), error: null };`,
    '}',
    '',
  ].join('\n');
}

function argsOf(route: ResolvedRoute): string {
  const args = [`scopeParams(input.request.params, input.ctx, [${route.grantIds.map(item => `'${item}'`).join(', ')}]) as unknown as ${route.inputType}`, 'input.ctx'];
  if (route.ports.length > 0) args.push(`{ ${route.ports.map(item => `${item.binding}: ${item.pending}`).join(', ')} }`);
  return args.join(', ');
}

function scopeSource(): string {
  return [
    'function scopeParams(params: unknown, ctx: { sessionContext?: { actorId?: string } }, grantIds: readonly string[]): Record<string, unknown> {',
    '  const body = params && typeof params === \'object\' && !Array.isArray(params) ? { ...(params as Record<string, unknown>) } : {};',
    '  for (const grantId of grantIds) {',
    '    const resolved = resolveGrant(grantId);',
    '    if (!(\'grantId\' in resolved) || resolved.scopeMode !== \'own\' || !resolved.recordField) continue;',
    '    const actorId = ctx.sessionContext?.actorId ?? \'\';',
    '    // enforce:scope',
    '    body[resolved.recordField] = actorId;',
    '  }',
    '  return body;',
    '}',
    '',
  ].join('\n');
}

function authorizeSource(): string {
  return [
    'function authorize(request: BffRequest, grantIds: readonly string[]): AppError | null {',
    '  const source = request.meta?.source ?? \'http\';',
    '  const authorities = request.meta?.verifiedAuthorities ?? [];',
    `  if (source === 'http' && authorities.length === 0) {`,
    `    return new AppError('${FORBIDDEN_ACTOR}', 'You have no authority to call this routine.', 403);`,
    '  }',
    '  for (const grantId of grantIds) {',
    '    const resolved = resolveGrant(grantId);',
    '    if (!(\'grantId\' in resolved)) return new AppError(resolved.code, resolved.detail, 403);',
    '    if (resolved.pending) return new AppError(resolved.pending, `Grant ${grantId} is pending ${resolved.pending}.`, 403);',
    '    if (authorities.length > 0 && resolved.actorRef && !authorities.some(item => item === resolved.actorRef || item.endsWith(\':\' + resolved.actorRef))) {',
    `      return new AppError('${FORBIDDEN_ACTOR}', 'You have no authority to call this routine.', 403);`,
    '    }',
    '  }',
    '  return null;',
    '}',
    '',
  ].join('\n');
}

function validateSource(): string {
  return [
    'function validateInput(params: unknown, fields: readonly string[]): AppError | null {',
    '  const body = params && typeof params === \'object\' && !Array.isArray(params) ? params as Record<string, unknown> : null;',
    '  for (const field of fields) {',
    '    if (!body || body[field] === undefined || body[field] === null || body[field] === \'\') {',
    `      return new AppError('${VALIDATION_ERROR}', \`\${field} is required.\`, 400);`,
    '    }',
    '  }',
    '  return null;',
    '}',
    '',
  ].join('\n');
}

function projectSource(): string {
  return [
    'function projectOutput(data: unknown, fields: readonly string[]): unknown {',
    '  if (Array.isArray(data)) return data.map(item => projectOutput(item, fields));',
    '  const source = data && typeof data === \'object\' ? data as Record<string, unknown> : {};',
    '  const projected: Record<string, unknown> = {};',
    '  for (const field of fields) if (field in source) projected[field] = source[field];',
    '  return projected;',
    '}',
  ].join('\n');
}

function portBindings(definition: M1Definition): PortBinding[] {
  const names = stringList(definition.data.ports);
  if (names.length === 0) return [];
  const specifier = definition.dependencies.find(path => path.includes('/ports/'));
  if (!specifier) return [];
  return names.map(interfaceName => ({
    interfaceName,
    specifier: importSpecifier(specifier, 'output'),
    binding: camel(interfaceName),
    pending: `pending${interfaceName}`,
  }));
}

function renderMethod(method: Record<string, unknown>, entity: string, locals: Set<string>, body: boolean): string {
  const name = token(method.name, 'call');
  const params = Array.isArray(method.params) ? method.params.map(item => String(item)) : [];
  const args = params.map((item, index) => `${argName(item, index)}: ${mapToken(item, entity, locals)}`).join(', ');
  const returns = mapToken(String(method.returns ?? 'void'), entity, locals);
  if (!body) return `  ${name}(${args}): Promise<${returns}>;`;
  return `  async ${name}(${args}): Promise<${returns}> { throw new AppError('${REPOSITORY_NOT_IMPLEMENTED}', '${name} is not implemented.', ${M1_STUB_STATUS}); },`;
}

function mapToken(tokenValue: string, entity: string, locals: Set<string>): string {
  const array = tokenValue.endsWith('[]');
  const base = array ? tokenValue.slice(0, -2) : tokenValue;
  let ts = 'unknown';
  if (base === entity) ts = entity;
  else if (base === 'string' || base === 'number' || base === 'boolean' || base === 'void') ts = base;
  else if (/^[a-z]/.test(base)) ts = 'string';
  else if (/^[A-Z][A-Za-z0-9_]*$/.test(base)) {
    locals.add(base);
    ts = base;
  }
  return array ? `${ts}[]` : ts;
}

/** Value bindings the structure emitters write. Types are not included. */
export function emittedValueExports(definition: M1Definition): readonly string[] {
  switch (definition.artifactType) {
    case 'valueObject':
      return ['referencedBy'];
    case 'repositoryPort':
      return [`pending${token(definition.data.interfaceName, definition.artifactId)}`];
    case 'accessScope':
      return ['grants', 'resolveGrant'];
    case 'authorityMap':
      return ['entries', 'actorRefFor'];
    case 'usecase': {
      const fn = firstFunction(definition);
      return fn ? [fn.name] : [];
    }
    case 'httpController':
      return ['routes'];
    default:
      return [];
  }
}

export function importSpecifier(defPath: string, kind: 'output' | 'defs'): string {
  const output = kind === 'output' ? outputPathFromDefPath(defPath) : defPath;
  const file = output || defPath;
  return `/${file.replace(/\.ts$/, '.js')}`;
}

export function auditImports(source: string, allowed: readonly string[]): string {
  const found = [...source.matchAll(/from '([^']+)'/g)].map(match => match[1]);
  return found.find(specifier => !allowed.includes(specifier)) ?? '';
}

export function grantsOf(data: Record<string, unknown>): StructureGrant[] {
  if (!Array.isArray(data.grants)) return [];
  return data.grants.filter(isRecord).map(grant => ({
    grantId: String(grant.grantId ?? ''),
    actorRef: String(grant.actorRef ?? ''),
    scopeMode: String(grant.scopeMode ?? ''),
    session: String(grant.session ?? ''),
    pending: String(grant.pending ?? ''),
    disclosure: String(grant.disclosure ?? ''),
    recordField: recordFieldFromGrant(grant),
  })).filter(grant => grant.grantId);
}

/** The single path hop of the one non-anchor entity names the record field. A missing or contradictory path does not. */
export function recordFieldFromGrant(grant: Record<string, unknown>): string {
  if (String(grant.scopeMode ?? '') !== 'own') return '';
  const hops = recordHops(grant);
  if (hops.length !== 1) return '';
  const hop = hops[0];
  const from = String(hop.from ?? '');
  const to = String(hop.to ?? '');
  const field = String(hop.field ?? '');
  const anchor = String(grant.anchorEntity ?? '');
  if (!from || !to || !field || (anchor && to !== anchor)) return '';
  const prefix = `${from}.`;
  if (!field.startsWith(prefix)) return '';
  const leaf = field.slice(prefix.length);
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(leaf)) return '';
  return leaf;
}

function recordHops(grant: Record<string, unknown>): Array<Record<string, unknown>> {
  const path = Array.isArray(grant.path) ? grant.path.filter(isRecord) : [];
  const entries = path.filter(item => Array.isArray(item.steps));
  if (!entries.length) return path;
  const anchor = String(grant.anchorEntity ?? '');
  const chains = entries.filter(item => {
    if (String(item.pending ?? '')) return false;
    if (anchor && String(item.entityId ?? '') === anchor) return false;
    return (item.steps as unknown[]).length > 0;
  });
  if (chains.length !== 1) return chains.length === 0 ? [] : [{}, {}];
  return (chains[0].steps as unknown[]).filter(isRecord);
}

export function requiredMembers(source: string, name: string): string[] | null {
  const tokenText = `export interface ${name} `;
  const at = source.indexOf(tokenText);
  if (at < 0) return null;
  const open = source.indexOf('{', at);
  if (open < 0) return null;
  let depth = 0;
  let end = -1;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }
  if (end < 0) return null;
  const body = source.slice(open + 1, end);
  const fields: string[] = [];
  depth = 1;
  const lines = body.split('\n');
  for (const line of lines) {
    const opens = (line.match(/\{/g) ?? []).length;
    const closes = (line.match(/\}/g) ?? []).length;
    if (depth === 1) {
      const match = /^\s*"?([A-Za-z_][A-Za-z0-9_]*)"?(\??)\s*:/.exec(line);
      if (match && match[2] !== '?') fields.push(match[1]);
    }
    depth += opens - closes;
  }
  return fields;
}

function parseDefinitionExport(source: string): M1Definition | null {
  const marker = 'export const definition = ';
  const at = source.indexOf(marker);
  if (at < 0) return null;
  const start = source.indexOf('{', at);
  const end = source.lastIndexOf(' as const;');
  if (start < 0 || end < start) return null;
  try {
    const value = JSON.parse(source.slice(start, end)) as M1Definition;
    if (!value || !Array.isArray(value.dependencies) || !isRecord(value.data)) return null;
    return value;
  } catch {
    return null;
  }
}

function firstFunction(definition: M1Definition): { name: string; contractRefs: { route: string; symbol: string }[] } | null {
  const functions = definition.data.functions;
  if (!Array.isArray(functions) || !isRecord(functions[0])) return null;
  const fn = functions[0];
  const name = typeof fn.functionName === 'string' ? fn.functionName : '';
  if (!name) return null;
  const contractRefs = Array.isArray(fn.contractRefs) ? fn.contractRefs.filter(isRecord).map(item => ({
    route: typeof item.route === 'string' ? item.route : '',
    symbol: typeof item.symbol === 'string' ? item.symbol : '',
  })).filter(item => item.route && item.symbol) : [];
  return { name, contractRefs };
}

function projections(definition: M1Definition): { route: string; contractPath: string; outputFields: string[] }[] {
  if (!Array.isArray(definition.data.routeProjections)) return [];
  return definition.data.routeProjections.filter(isRecord).map(item => ({
    route: typeof item.route === 'string' ? item.route : '',
    contractPath: typeof item.contractPath === 'string' ? item.contractPath : '',
    outputFields: stringList(item.outputFields),
  })).filter(item => item.route);
}

function contractDependency(definition: M1Definition, contractPath: string, route: string): string {
  if (contractPath) {
    const match = definition.dependencies.find(path => path === contractPath || path.endsWith(`/${contractPath}`));
    if (match) return match;
  }
  const page = route.split('.')[1] ?? '';
  return definition.dependencies.find(path => page && path.endsWith(`/${page}.defs.ts`)) ?? '';
}

function fieldRows(value: unknown): FieldRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map(field => ({
    name: typeof field.name === 'string' ? field.name : '',
    type: typeof field.type === 'string' ? field.type : 'string',
  })).filter(field => field.name);
}

function lifecycleStates(value: unknown): string[] {
  if (!isRecord(value) || !Array.isArray(value.states)) return [];
  return value.states.flatMap(item => isRecord(item) && typeof item.state === 'string' && item.state ? [item.state] : []);
}

function nest(fields: readonly FieldRow[], states: readonly string[]): Tree {
  const root: Tree = { ts: 'Record<string, never>', children: new Map() };
  for (const field of fields) {
    const parts = field.name.split('.').filter(Boolean);
    let node = root;
    parts.forEach((part, index) => {
      let child = node.children.get(part);
      if (!child) {
        child = { ts: 'Record<string, unknown>', children: new Map() };
        node.children.set(part, child);
      }
      if (index === parts.length - 1) child.ts = fieldTs(field.type, part, states);
      node = child;
    });
  }
  return root;
}

function fieldTs(type: string, name: string, states: readonly string[]): string {
  if (type.includes('|') || type.includes('"')) return type.split('"').join("'");
  if (name === 'status' && states.length > 0 && (type === 'enum' || type === 'string')) {
    return states.map(state => `'${state}'`).join(' | ');
  }
  if (type === 'integer' || type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'object') return 'Record<string, unknown>';
  return 'string';
}

function renderType(node: Tree, indent: string): string {
  if (node.children.size === 0) return node.ts;
  const lines = [...node.children].map(([key, child]) => `${indent}  ${key}: ${renderType(child, `${indent}  `)};`);
  return `{\n${lines.join('\n')}\n${indent}}`;
}

function header(output: string): string {
  return `/// <mls fileReference="${output}" enhancement="_blank"/>`;
}

function functionName(route: string): string {
  const tail = route.split('.').pop() ?? 'route';
  const bare = tail.replace(/[^A-Za-z0-9]/g, '');
  return `handle${bare.charAt(0).toUpperCase()}${bare.slice(1)}`;
}

function argName(tokenValue: string, index: number): string {
  const base = tokenValue.replace(/\[\]$/, '');
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(base) || base === 'string' || base === 'number' || base === 'boolean') return `arg${index}`;
  return camel(base);
}

function camel(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function token(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(value) ? value : fallback;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
