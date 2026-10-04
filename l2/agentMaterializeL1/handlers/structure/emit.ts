/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/structure/emit.ts" enhancement="_blank"/>

/**
 * Renders one structure file from a v2 def. Imports are only platform files,
 * an existing l2 contract, or the output of a dependency. A missing source
 * is a named failure, not an import of a file that does not exist.
 */

import {
  isRecord,
  outputPathFromDefPath,
  readDefinition,
  type M1Definition,
} from '/_102021_/l2/helpers/l1Defs/definition.js';
import { M1_STUB_ERROR, M1_STUB_STATUS } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import { domainOptionalPaths, optionalSignatureNames } from '/_102021_/l2/agentMaterializeL1/handlers/structure/domainOptional.js';
import { pathDisclosure, type DisclosureGrant } from '/_102021_/l2/helpers/l1Defs/disclosure.js';
import {
  AUTHORITY_UNMAPPED,
  AUTHORITY_UNREAD,
  FORBIDDEN_ACTOR,
  GRANT_ABSENT,
  REPOSITORY_NOT_IMPLEMENTED,
  SCOPE_UNBOUND,
  SESSION_UNVERIFIED,
  VALIDATION_ERROR,
  DEF_V1_UNSUPPORTED,
  defV1Detail,
  type StructureGrant,
} from '/_102021_/l2/agentMaterializeL1/handlers/structure/gate.js';

/** Raised when the structure handler body changes. An older receipt is a new input. */
export const STRUCTURE_HANDLER_RECIPE = '2026-10-02-structure-handler-v13';

const PLATFORM_CONTRACTS = '/_102034_/l1/server/layer_2_controllers/contracts.js';
const REPOSITORY_REGISTRY = '/_102034_/l1/server/layer_2_application/repositoryRegistry.js';

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
  optional?: boolean;
}

/**
 * `optional` names the field paths a stored record may lack; without it every field is required.
 * `enums` maps a field path to the values its source declares; an `enum` field without values stays `string`.
 * The lifecycle states type the entity's single top-level `enum` field.
 */
export function emitDomain(
  definition: M1Definition,
  output: string,
  optional: ReadonlySet<string> = new Set(),
  enums: ReadonlyMap<string, readonly string[]> = new Map(),
): EmitResult {
  const name = token(definition.data.entityId, definition.artifactId);
  const fields = fieldRows(definition.data.fields);
  const states = lifecycleStates(definition.data.lifecycle);
  const topEnums = fields.filter(field => field.type === 'enum' && !field.name.includes('.'));
  const declared = new Map(enums);
  if (states.length > 0 && topEnums.length === 1 && !declared.has(topEnums[0].name)) declared.set(topEnums[0].name, states);
  const body = renderType(nest(fields, declared, optional), '');
  return { runsStub: false, imports: [], source: `${header(output)}\nexport interface ${name} ${body}\n` };
}

export function emitValueObject(definition: M1Definition, output: string): EmitResult {
  const name = token(definition.data.valueObjectId, definition.artifactId);
  const [referencedBy] = emittedValueExports(definition);
  const fields = fieldRows(definition.data.fields);
  const referenced = stringList(definition.data.referencedBy);
  const body = renderType(nest(fields, new Map()), '');
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
  const fn = readFunction(definition);
  const [fnName] = emittedValueExports(definition);
  if (!fn || !fnName) return { code: 'FUNCTION_MISSING', detail: `${definition.artifactId} has no function.` };
  // The signature is the domain and application fields on the def.
  return emitDomainUsecase(definition, output, read, fn, fnName);
}

/** Application interfaces over the def's fields. The entity type is imported; nothing from l2 is. */
async function emitDomainUsecase(
  definition: M1Definition,
  output: string,
  read: StructureRead,
  fn: UsecaseFunction,
  fnName: string,
): Promise<EmitResult | EmitFailure> {
  if (fn.input.length === 0 || fn.output.length === 0) {
    return { code: 'FUNCTION_MISSING', detail: `${definition.artifactId} has no domain signature.` };
  }
  const declaredPorts = stringList(definition.data.ports);
  const ports = portBindings(definition);
  if (declaredPorts.length > 0 && ports.length === 0) {
    return { code: 'PORT_UNBOUND', detail: `${definition.artifactId} names a port that is not a dependency.` };
  }
  if (ports.length > 1 && new Set(ports.map(item => item.specifier)).size > 1) {
    return { code: 'PORT_UNBOUND', detail: `${definition.artifactId} ports are not in one module.` };
  }
  const entityName = token(definition.data.entityId, '');
  const outputFields = fn.output.map(field => field.name === 'items' && field.type === entityName
    ? { name: field.name, type: `${entityName}[]` }
    : field);
  const aliases = new Set<string>();
  if (entityName && [...fn.input, ...outputFields].some(field => field.type === entityName || field.type === `${entityName}[]`)) {
    aliases.add(entityName);
  }
  const entityDep = definition.dependencies.find(path => path.includes('/entities/'));
  if (aliases.size > 0 && !entityDep) return { code: 'ENTITY_UNBOUND', detail: `${definition.artifactId} has no entity dependency.` };
  const entityText = entityDep ? await read(entityDep) : null;
  if (entityDep && entityText === null) return { code: 'ENTITY_UNBOUND', detail: `${entityDep} could not be read.` };
  // Optional is what the domain types with `?`: same entity def, same l4 entity, same criterion.
  // Unreadable l4 entity: the domain unit is refused on its own (ONTOLOGY_UNREAD); nothing is optional here.
  const entity = entityText === null ? null : parseDefinitionExport(entityText);
  const domainOptional = entity && entityDep ? domainOptionalPaths(entity, await read(ontologyRef(entity, entityDep))) ?? new Set<string>() : new Set<string>();
  const rawFn = Array.isArray(definition.data.functions) && isRecord(definition.data.functions[0]) ? definition.data.functions[0] : {};
  const inputOptional = optionalSignatureNames(Array.isArray(rawFn.input) ? rawFn.input : [], entityName, domainOptional);
  const outputOptional = optionalSignatureNames(Array.isArray(rawFn.output) ? rawFn.output : [], entityName, domainOptional);
  const portImport = ports.length === 0
    ? ''
    : `import type { ${ports.map(item => item.interfaceName).join(', ')} } from '${ports[0].specifier}';`;
  const portArg = ports.length === 0
    ? ''
    : `, ports: { ${ports.map(item => `${item.binding}: ${item.interfaceName}`).join('; ')} }`;
  const voidPorts = ports.length === 0 ? '' : '  void ports;\n';
  const inputType = `${pascal(fnName)}Input`;
  const outputType = `${pascal(fnName)}Output`;
  const entitySpecifier = entityDep && aliases.size > 0 ? importSpecifier(entityDep, 'output') : '';
  return {
    runsStub: true,
    imports: [PLATFORM_CONTRACTS, entitySpecifier, ...ports.map(item => item.specifier)].filter(Boolean),
    source: [
      header(output),
      `import { AppError } from '${PLATFORM_CONTRACTS}';`,
      `import type { RequestContext } from '${PLATFORM_CONTRACTS}';`,
      ...(entitySpecifier ? [`import type { ${entityName} } from '${entitySpecifier}';`] : []),
      portImport,
      '',
      // The service asserts this to and from a record. The index is what makes that assertion legal.
      `export interface ${inputType} extends Record<string, unknown> ${renderType(nest(fn.input, new Map(), inputOptional, aliases), '')}`,
      `export interface ${outputType} extends Record<string, unknown> ${renderType(nest(outputFields, new Map(), outputOptional, aliases), '')}`,
      '',
      `export async function ${fnName}(input: ${inputType}, ctx: RequestContext${portArg}): Promise<${outputType}> {`,
      '  void input;',
      '  void ctx;',
      voidPorts.trimEnd(),
      `  throw new AppError('${M1_STUB_ERROR}', '${fnName} is not implemented.', ${M1_STUB_STATUS});`,
      '}',
      '',
    ].filter(line => line !== '').join('\n'),
  };
}

export async function emitController(
  definition: M1Definition,
  output: string,
  read: StructureRead,
): Promise<EmitResult | EmitFailure> {
  const scopeDep = definition.dependencies.find(path => path.endsWith('/accessScope.defs.ts'));
  if (!scopeDep) return { code: 'GRANT_UNREAD', detail: `${definition.artifactId} has no access scope dependency.` };
  const scopeText = await read(scopeDep);
  if (scopeText === null) return { code: 'GRANT_UNREAD', detail: `${scopeDep} could not be read.` };
  const handlers = Array.isArray(definition.data.handlers) ? definition.data.handlers.filter(isRecord) : [];
  if (handlers.length === 0) return { code: 'ROUTE_MISSING', detail: `${definition.artifactId} declares no route.` };
  // A handler without a service function is the removed v1 route (usecaseId); it is refused, never emitted.
  if (!handlers.every(handler => typeof handler.serviceFunction === 'string')) {
    return { code: DEF_V1_UNSUPPORTED, detail: defV1Detail(definition.artifactId) };
  }
  return emitAdapter(definition, output, read, handlers, scopeDep);
}

interface PortBinding {
  interfaceName: string;
  specifier: string;
  binding: string;
}

interface AdapterRoute {
  route: string;
  fn: string;
  grantIds: string[];
  serviceFunction: string;
  contractInterface: string;
  requiredFields: string[];
  allowedInputPaths: string[];
  nullableInputPaths: string[];
}

/**
 * The page controller calls one request-service function. Input and output types are
 * indexed on the contract interface. It does not resolve a repository or cast through `unknown`.
 */
async function emitAdapter(
  definition: M1Definition,
  output: string,
  read: StructureRead,
  handlers: Record<string, unknown>[],
  scopeDep: string,
): Promise<EmitResult | EmitFailure> {
  const pageId = typeof definition.data.pageId === 'string' ? definition.data.pageId : '';
  const serviceDep = definition.dependencies.find(path => pageId && path.endsWith(`/requests/${pageId}.defs.ts`));
  if (!serviceDep) return { code: 'USECASE_UNBOUND', detail: `${definition.artifactId} has no request service.` };
  if (await read(serviceDep) === null) return { code: 'USECASE_UNBOUND', detail: `${serviceDep} could not be read.` };
  const authorityDep = definition.dependencies.find(path => path.endsWith('/authorityMap.defs.ts'));
  const needsAuthority = handlers.some(handler => stringList(handler.grantIds).length > 0);
  if (needsAuthority && !authorityDep) {
    return { code: AUTHORITY_UNREAD, detail: `${definition.artifactId} has grants and no authority map dependency.` };
  }
  if (authorityDep && await read(authorityDep) === null) {
    return { code: AUTHORITY_UNREAD, detail: `${authorityDep} could not be read.` };
  }
  const routes: AdapterRoute[] = [];
  const contracts = new Map<string, { specifier: string; iface: string }>();
  for (const handler of handlers) {
    const resolved = await resolveAdapterRoute(definition, handler, read);
    if ('code' in resolved) return resolved;
    routes.push(resolved.route);
    contracts.set(resolved.specifier, { specifier: resolved.specifier, iface: resolved.route.contractInterface });
  }
  const authorityImport = authorityDep
    ? [`import { actorRefFor } from '${importSpecifier(authorityDep, 'output')}';`]
    : [];
  const contractImports = [...contracts.values()].map(item => `import type { ${item.iface} } from '${item.specifier}';`);
  const imports = [
    PLATFORM_CONTRACTS,
    importSpecifier(scopeDep, 'output'),
    ...(authorityDep ? [importSpecifier(authorityDep, 'output')] : []),
    importSpecifier(serviceDep, 'output'),
    ...[...contracts.keys()],
  ];
  return {
    runsStub: false,
    imports,
    source: [
      header(output),
      `import { AppError, type BffRequest, type BffResponse, type ControllerRoute, type IRequestEnvelope } from '${PLATFORM_CONTRACTS}';`,
      `import { resolveGrant } from '${importSpecifier(scopeDep, 'output')}';`,
      ...authorityImport,
      `import { requests } from '${importSpecifier(serviceDep, 'output')}';`,
      ...contractImports,
      '',
      `export const ${emittedValueExports(definition)[0]}: ControllerRoute[] = [`,
      ...routes.map(route => `  { key: '${route.route}', handler: ${route.fn} },`),
      '];',
      '',
      ...routes.map(renderAdapter),
      scopeSource(),
      authorizeSource(!!authorityDep),
      validateSource(),
      '',
    ].join('\n'),
  };
}

/** Grant and required fields of one v2 route. The adapter names a service function, not a usecase. */
export async function adapterRouteFacts(
  definition: M1Definition,
  handler: Record<string, unknown>,
  read: StructureRead,
): Promise<{ grantIds: string[]; requiredFields: string[] } | EmitFailure> {
  const resolved = await resolveAdapterRoute(definition, handler, read);
  if ('code' in resolved) return resolved;
  return { grantIds: resolved.route.grantIds, requiredFields: resolved.route.requiredFields };
}

async function resolveAdapterRoute(
  definition: M1Definition,
  handler: Record<string, unknown>,
  read: StructureRead,
): Promise<{ route: AdapterRoute; specifier: string } | EmitFailure> {
  const route = typeof handler.route === 'string' ? handler.route : '';
  const serviceFunction = typeof handler.serviceFunction === 'string' ? handler.serviceFunction : '';
  const contractPath = typeof handler.contractPath === 'string' ? handler.contractPath : '';
  const contractInterface = typeof handler.contractInterface === 'string' ? handler.contractInterface : '';
  const grantIds = stringList(handler.grantIds);
  if (!route || !serviceFunction) return { code: 'ROUTE_MISSING', detail: `${definition.artifactId} has a route without a service function.` };
  if (!contractPath || !IDENT.test(contractInterface) || /(?:Input|Output)$/.test(contractInterface)) {
    return { code: 'CONTRACT_SYMBOL', detail: `${route} has no contract interface.` };
  }
  const qualified = qualifyFile(contractPath, definition.dependencies);
  const text = await read(qualified);
  if (text === null) return { code: 'CONTRACT_UNREAD', detail: `${qualified} could not be read.` };
  if (!text.includes(`export interface ${contractInterface} `) && !text.includes(`export interface ${contractInterface}{`)) {
    return { code: 'CONTRACT_SYMBOL', detail: `${qualified} does not export ${contractInterface}.` };
  }
  const clause = routeClause(text, route);
  if (!clause) return { code: 'CONTRACT_SYMBOL', detail: `${qualified} has no route ${route}.` };
  const input = clauseValue(clause, 'input');
  if (!input) return { code: 'CONTRACT_SYMBOL', detail: `${route} has no input type.` };
  const members = membersOfType(text, input);
  if (!members) return { code: 'CONTRACT_SYMBOL', detail: `${route} input could not be read.` };
  return {
    specifier: importSpecifier(qualified, 'defs'),
    route: {
      route,
      fn: functionName(route),
      grantIds,
      serviceFunction,
      contractInterface,
      requiredFields: members.requiredFields,
      allowedInputPaths: members.allowedPaths,
      nullableInputPaths: members.nullablePaths,
    },
  };
}

function renderAdapter(route: AdapterRoute): string {
  const grants = route.grantIds.map(item => `'${item}'`).join(', ');
  const required = route.requiredFields.map(item => `'${item}'`).join(', ');
  const allowed = route.allowedInputPaths.map(item => `'${item}'`).join(', ');
  const nullable = route.nullableInputPaths.map(item => `'${item}'`).join(', ');
  const inputType = `${route.contractInterface}['${route.route}']['input']`;
  const outputType = `${route.contractInterface}['${route.route}']['output']`;
  return [
    `async function ${route.fn}(input: IRequestEnvelope): Promise<BffResponse<${outputType}>> {`,
    `  const denied = authorize(input.request, [${grants}]);`,
    '  if (denied) throw denied;',
    `  const invalid = validateInput(input.request.params, [${required}], [${allowed}], [${nullable}]);`,
    '  if (invalid) throw invalid;',
    `  const params = scopeParams(input.request.params, input.ctx, [${grants}]) as ${inputType};`,
    `  const data = await requests[${JSON.stringify(route.serviceFunction)}](params as Record<string, unknown>, input.ctx);`,
    `  return { ok: true, data: data as ${outputType}, error: null };`,
    '}',
    '',
  ].join('\n');
}

function membersOfType(source: string, typeText: string): { requiredFields: string[]; allowedPaths: string[]; nullablePaths: string[] } | null {
  const text = typeText.trim();
  if (text.startsWith('{')) {
    const wrapped = `export interface Wrapped ${text.replaceAll('{', '{\n').replaceAll(';', ';\n').replaceAll('}', '\n}')}\n`;
    const members = contractMembers(wrapped, 'Wrapped');
    const nullable = contractNullablePaths(wrapped, 'Wrapped');
    if (!members || !nullable) return null;
    return { requiredFields: members.requiredFields, allowedPaths: members.allowedPaths, nullablePaths: nullable };
  }
  if (!IDENT.test(text)) return null;
  const members = contractMembers(source, text);
  const nullable = contractNullablePaths(source, text);
  if (!members || !nullable) return null;
  return { requiredFields: members.requiredFields, allowedPaths: members.allowedPaths, nullablePaths: nullable };
}

function routeClause(source: string, route: string): string | null {
  const at = source.indexOf(`'${route}':`);
  if (at < 0) return null;
  const open = source.indexOf('{', at);
  if (open < 0) return null;
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, index);
    }
  }
  return null;
}

function clauseValue(clause: string, name: 'input' | 'output'): string | null {
  const match = new RegExp(`(?:^|\\n)\\s*${name}: ([\\s\\S]*?);\\n`).exec(`\n${clause}\n`);
  return match ? match[1].trim() : null;
}

/** Project-qualified ref of an L1/L2 file a def names relatively; the `_<proj>_/` prefix comes from its dependencies. */
export function qualifyFile(path: string, dependencies: readonly string[]): string {
  if (/^_\d+_\/l\d+\//.test(path)) return path;
  const hit = dependencies.find(dep => dep === path || dep.endsWith(`/${path}`));
  if (hit) return hit;
  const project = dependencies.map(dep => /^_(\d+)_/.exec(dep)?.[1]).find(Boolean) ?? '';
  return project && /^l\d+\//.test(path) ? `_${project}_/${path}` : path;
}

/** An access-scope grant as the shared rule reads it. An undeclared grant (`{}`) has no mode and discloses nothing. */
function disclosureGrant(grant: Record<string, unknown>): DisclosureGrant {
  return { disclosure: String(grant.disclosure ?? ''), allowedFields: stringList(grant.allowedFields), entityRefs: stringList(grant.entityRefs) };
}

/**
 * Grants of each route a v2 page controller of the module exposes: the handler's `grantIds` read on
 * the module access scope. An undeclared grant id stays `{}` and discloses nothing.
 * A route no controller names is not exposed and has no entry.
 */
export function exposedRouteGrants(moduleDefinitions: readonly unknown[]): Map<string, Record<string, unknown>[]> | EmitFailure {
  const definitions = moduleDefinitions.map(value => readDefinition(value)).filter((item): item is M1Definition => !('issues' in item));
  const scope = definitions.find(item => item.artifactType === 'accessScope');
  const scopeGrants = scope && Array.isArray(scope.data.grants) ? scope.data.grants.filter(isRecord) : [];
  const routes = new Map<string, Record<string, unknown>[]>();
  for (const controller of definitions.filter(item => item.artifactType === 'httpController')) {
    const handlers = Array.isArray(controller.data.handlers) ? controller.data.handlers.filter(isRecord) : [];
    for (const handler of handlers) {
      if (typeof handler.serviceFunction !== 'string' || typeof handler.route !== 'string') continue;
      const grantIds = stringList(handler.grantIds);
      if (grantIds.length > 0 && !scope) return { code: 'GRANT_UNREAD', detail: `${handler.route} names grants and the module has no access scope.` };
      const grants = grantIds.map(grantId => scopeGrants.find(grant => grant.grantId === grantId) ?? {});
      routes.set(handler.route, [...(routes.get(handler.route) ?? []), ...grants]);
    }
  }
  return routes;
}

function scopeSource(): string {
  return [
    'function scopeParams(params: unknown, ctx: { sessionContext?: { actorId?: string } }, grantIds: readonly string[]): Record<string, unknown> {',
    '  const body = params && typeof params === \'object\' && !Array.isArray(params) ? { ...(params as Record<string, unknown>) } : {};',
    '  for (const grantId of grantIds) {',
    '    const resolved = resolveGrant(grantId);',
    '    if (!(\'grantId\' in resolved) || resolved.scopeMode !== \'own\' || !resolved.recordField) continue;',
    '    const actorId = ctx.sessionContext?.actorId ?? \'\';',
    `    if (!actorId) throw new AppError('${FORBIDDEN_ACTOR}', 'You have no identity for this scope.', 403);`,
    '    // enforce:scope',
    '    body[resolved.recordField] = actorId;',
    '  }',
    '  return body;',
    '}',
    '',
  ].join('\n');
}

function authorizeSource(mapped: boolean): string {
  // Without grants there is no map; the loop below never runs, so the actor line is never reached.
  const actorLine = mapped
    ? '    const actorRef = actorRefFor(grantId);'
    : '    const actorRef = null as string | null;';
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
    actorLine,
    `    if (!actorRef) return new AppError('${AUTHORITY_UNMAPPED}', \`Grant \${grantId} has no actor in the authority map.\`, 403);`,
    '    if (authorities.length > 0 && !authorities.some(item => item === actorRef || item.endsWith(\':\' + actorRef))) {',
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
    '// `null` is accepted only where the contract type declares it; elsewhere it is refused, never read as absent.',
    'function validateInput(params: unknown, fields: readonly string[], allowed: readonly string[], nullable: readonly string[] = []): AppError | null {',
    '  const body = params && typeof params === \'object\' && !Array.isArray(params) ? params as Record<string, unknown> : null;',
    `  if (!body) return new AppError('${VALIDATION_ERROR}', 'Request body must be an object.', 400);`,
    '  const invalidPath = (value: unknown, prefix: string): string => {',
    '    if (Array.isArray(value)) { for (const item of value) { const invalid = invalidPath(item, prefix); if (invalid) return invalid; } return \'\'; }',
    '    if (!value || typeof value !== \'object\') return \'\';',
    '    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {',
    "      const path = prefix ? prefix + '.' + key : key;",
    "      if (!allowed.includes(path)) return path + ' is not permitted.';",
    "      if (child === null && !nullable.includes(path)) return path + ' must not be null.';",
    '      const invalid = invalidPath(child, path); if (invalid) return invalid;',
    '    }',
    '    return \'\';',
    '  };',
    `  const invalid = invalidPath(body, ''); if (invalid) return new AppError('${VALIDATION_ERROR}', invalid, 400);`,
    '  for (const field of fields) {',
    '    // A required member of an absent optional parent is not required; a required parent has its own entry.',
    '    const parts = field.split(\'.\');',
    '    let value: unknown = body;',
    '    let parentAbsent = false;',
    '    for (const [index, part] of parts.entries()) {',
    '      if (index > 0 && (value === undefined || value === null)) { parentAbsent = true; break; }',
    '      value = value && typeof value === \'object\' ? (value as Record<string, unknown>)[part] : undefined;',
    '    }',
    '    if (parentAbsent) continue;',
    '    if (value === undefined || (value === null && !nullable.includes(field)) || value === \'\') {',
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
    '// A path in `fields` is copied whole; an ancestor of one is walked; anything else is dropped.',
    'function projectOutput(data: unknown, fields: readonly string[], prefix = \'\'): unknown {',
    '  if (Array.isArray(data)) return data.map(item => projectOutput(item, fields, prefix));',
    '  const source = data && typeof data === \'object\' ? data as Record<string, unknown> : {};',
    '  const projected: Record<string, unknown> = {};',
    '  for (const [key, child] of Object.entries(source)) {',
    "    const path = prefix ? prefix + '.' + key : key;",
    '    if (fields.includes(path)) projected[key] = child;',
    "    else if (child && typeof child === 'object' && fields.some(field => field.startsWith(path + '.'))) projected[key] = projectOutput(child, fields, path);",
    '  }',
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
  }));
}

/** Port names named by a repositoryRegistration adapter row in this module's defs. */
function registeredPortNames(definitions: readonly unknown[]): Set<string> {
  const names = new Set<string>();
  for (const value of definitions) {
    const parsed = readDefinition(value);
    if ('issues' in parsed || parsed.artifactType !== 'repositoryRegistration') continue;
    const adapters = Array.isArray(parsed.data.adapters) ? parsed.data.adapters.filter(isRecord) : [];
    for (const adapter of adapters) {
      const portId = typeof adapter.portId === 'string' ? adapter.portId : '';
      if (portId) names.add(portId);
    }
  }
  return names;
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

const FIELD_PATH = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

interface ServicePort {
  interfaceName: string;
  binding: string;
}

interface ServiceUse {
  usecaseId: string;
  functionName: string;
  specifier: string;
  entityId: string;
  operation: string;
  ports: ServicePort[];
}

interface ServiceOutput {
  key: string;
  entity: string;
  fields: string[];
  page: string;
  pageSize: string;
  hasMore: string;
}

interface ServiceParam {
  name: string;
  target: string;
  pages: string;
}

interface ServiceCall {
  route: string;
  transaction: 'single' | 'none';
  uses: ServiceUse[];
  outputs: ServiceOutput[];
  params: ServiceParam[];
}

/**
 * One function per request, keyed by the route. A command resolves repositories on the
 * transaction runtime: the adapter binds `ctx.data.moduleData` when the factory runs.
 * `outputs[].page`, `pageSize` and `hasMore` are the contract pagination keys when the def has them.
 */
export async function emitRequestService(
  definition: M1Definition,
  output: string,
  read: StructureRead,
  moduleDefinitions: readonly unknown[],
  stage: 'structure' | 'implement',
): Promise<EmitResult | EmitFailure> {
  const loaded = await loadService(definition, read, registeredPortNames(moduleDefinitions));
  if ('code' in loaded) return loaded;
  // The grant still bounds what leaves: the shared rule (helpers/l1Defs/disclosure.ts, same as the D1 plan).
  // A route no controller names is not exposed and has no grants to check.
  const exposed = exposedRouteGrants(moduleDefinitions);
  if ('code' in exposed) return exposed;
  for (const call of loaded) {
    const grants = (exposed.get(call.route) ?? []).map(disclosureGrant);
    if (grants.length === 0) continue;
    for (const output of call.outputs) {
      const entityDefinition = moduleDefinitions.find(item => isRecord(item) && item.artifactType === 'domainEntity' && isRecord(item.data) && item.data.entityId === output.entity);
      const field = output.fields.find(path => pathDisclosure(grants, output.entity, path, entityDefinition) !== 'disclosed');
      if (field) return { code: 'DISCLOSURE_EXCEEDS_GRANT', detail: `DISCLOSURE_EXCEEDS_GRANT: ${call.route} ${field}` };
    }
  }
  const behavior = stage === 'implement';
  const uses = loaded.flatMap(call => call.uses);
  const specifiers = unique(uses.map(use => use.specifier));
  const imports = [PLATFORM_CONTRACTS, ...(behavior ? [REPOSITORY_REGISTRY] : []), ...specifiers];
  const source = [
    header(output),
    `import { AppError, type RequestContext } from '${PLATFORM_CONTRACTS}';`,
    ...(behavior ? [`import { resolveRepository } from '${REPOSITORY_REGISTRY}';`] : []),
    ...usecaseImportLines(uses),
    '',
    'export const requests = {',
    ...loaded.map(call => renderRequest(call, behavior)),
    '};',
    '',
    ...(behavior ? [projectSource(), ''] : []),
  ].join('\n');
  return { runsStub: !behavior, imports, source };
}

async function loadService(
  definition: M1Definition,
  read: StructureRead,
  registered: ReadonlySet<string>,
): Promise<ServiceCall[] | EmitFailure> {
  const rows = Array.isArray(definition.data.requests) ? definition.data.requests.filter(isRecord) : [];
  if (rows.length === 0) return { code: 'ROUTE_MISSING', detail: `${definition.artifactId} declares no request.` };
  const calls: ServiceCall[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const route = typeof row.route === 'string' ? row.route : '';
    const kind = row.kind === 'cmd' || row.kind === 'qry' ? row.kind : '';
    const transaction = row.transaction === 'single' || row.transaction === 'none' ? row.transaction : '';
    if (!route || !kind || !transaction) return { code: 'ROUTE_MISSING', detail: `${definition.artifactId} has a request without a route.` };
    if (seen.has(route)) return { code: 'REQUEST_HANDLER', detail: `Route ${route} is declared more than once.` };
    seen.add(route);
    const expected = kind === 'cmd' ? 'single' : 'none';
    if (transaction !== expected) {
      return { code: 'TRANSACTION_REQUIRED', detail: `${route} transaction is ${transaction}. A ${kind === 'cmd' ? 'command' : 'query'} is ${expected}.` };
    }
    const uses = await loadUses(definition, route, stringList(row.uses), read, registered);
    if ('code' in uses) return uses;
    const outputs = loadOutputs(route, row.outputs);
    if ('code' in outputs) return outputs;
    const params = loadParams(route, row.params);
    if ('code' in params) return params;
    for (const output of outputs) {
      if (!uses.some(use => use.entityId === output.entity)) {
        return { code: 'USECASE_UNBOUND', detail: `${route} projects ${output.entity}, which is not a used usecase.` };
      }
      if (output.page && !params.some(param => param.target === output.key && param.pages && param.name === 'page')) {
        return { code: 'PAGINATION_UNBOUND', detail: `${route} output ${output.key} names ${output.page} and has no page param.` };
      }
      if (output.pageSize && !params.some(param => param.target === output.key && param.pages && param.name === 'pageSize')) {
        return { code: 'PAGINATION_UNBOUND', detail: `${route} output ${output.key} names ${output.pageSize} and has no pageSize param.` };
      }
    }
    calls.push({ route, transaction, uses, outputs, params });
  }
  return calls;
}

async function loadUses(
  definition: M1Definition,
  route: string,
  ids: readonly string[],
  read: StructureRead,
  registered: ReadonlySet<string>,
): Promise<ServiceUse[] | EmitFailure> {
  if (ids.length === 0) return { code: 'USECASE_UNBOUND', detail: `${route} uses no usecase.` };
  const uses: ServiceUse[] = [];
  const names = new Set<string>();
  const entities = new Set<string>();
  for (const usecaseId of ids) {
    if (!IDENT.test(usecaseId)) return { code: 'USECASE_UNBOUND', detail: `${route} uses ${usecaseId}, which is not an identifier.` };
    const dep = definition.dependencies.find(path => path.endsWith(`/${usecaseId}.defs.ts`));
    if (!dep) return { code: 'USECASE_UNBOUND', detail: `${route} has no dependency on ${usecaseId}.` };
    const text = await read(dep);
    if (text === null) return { code: 'USECASE_UNBOUND', detail: `${dep} could not be read.` };
    const parsed = parseDefinitionExport(text);
    if (!parsed) return { code: 'USECASE_UNBOUND', detail: `${dep} is not a definition.` };
    const fn = readFunction(parsed);
    const entityId = typeof parsed.data.entityId === 'string' ? parsed.data.entityId : '';
    const operation = typeof parsed.data.operation === 'string' ? parsed.data.operation : '';
    if (!fn || !IDENT.test(fn.name) || !IDENT.test(entityId) || !operation) {
      return { code: 'FUNCTION_MISSING', detail: `${usecaseId} has no function.` };
    }
    if (names.has(fn.name)) return { code: 'FUNCTION_MISSING', detail: `${fn.name} is exported by more than one usecase.` };
    if (entities.has(entityId)) return { code: 'USECASE_ENTITY', detail: `${route} uses more than one usecase of ${entityId}.` };
    names.add(fn.name);
    entities.add(entityId);
    const ports: ServicePort[] = [];
    for (const interfaceName of stringList(parsed.data.ports)) {
      if (!IDENT.test(interfaceName)) return { code: 'PORT_UNBOUND', detail: `${usecaseId} names a port that is not an identifier.` };
      if (!registered.has(interfaceName)) return { code: 'PORT_UNBOUND', detail: `${interfaceName} is not a registered repository.` };
      ports.push({ interfaceName, binding: camel(interfaceName) });
    }
    uses.push({ usecaseId, functionName: fn.name, specifier: importSpecifier(dep, 'output'), entityId, operation, ports });
  }
  return uses;
}

function loadOutputs(route: string, value: unknown): ServiceOutput[] | EmitFailure {
  const rows = Array.isArray(value) ? value.filter(isRecord) : [];
  if (rows.length === 0) return { code: 'PROJECTION_UNDECLARED', detail: `${route} has no output projection.` };
  const outputs: ServiceOutput[] = [];
  for (const row of rows) {
    const key = typeof row.key === 'string' ? row.key : '';
    const entity = typeof row.entity === 'string' ? row.entity : '';
    const fields = stringList(row.fields);
    if (!IDENT.test(key) || !IDENT.test(entity) || fields.length === 0 || fields.some(field => !FIELD_PATH.test(field))) {
      return { code: 'PROJECTION_FIELD_UNKNOWN', detail: `${route} has an output projection that is not a field path.` };
    }
    const page = typeof row.page === 'string' ? row.page : '';
    const pageSize = typeof row.pageSize === 'string' ? row.pageSize : '';
    const hasMore = typeof row.hasMore === 'string' ? row.hasMore : '';
    if ([page, pageSize, hasMore].some(name => name && !IDENT.test(name))) {
      return { code: 'PROJECTION_FIELD_UNKNOWN', detail: `${route} has a pagination key that is not an identifier.` };
    }
    outputs.push({ key, entity, fields, page, pageSize, hasMore });
  }
  return outputs;
}

function loadParams(route: string, value: unknown): ServiceParam[] | EmitFailure {
  const rows = Array.isArray(value) ? value.filter(isRecord) : [];
  const params: ServiceParam[] = [];
  for (const row of rows) {
    const name = typeof row.name === 'string' ? row.name : '';
    const target = typeof row.target === 'string' ? row.target : '';
    const pages = typeof row.pages === 'string' ? row.pages : '';
    if (!IDENT.test(name) || !IDENT.test(target)) {
      return { code: 'ROUTE_MISSING', detail: `${route} has a param that is not an identifier.` };
    }
    params.push({ name, target, pages });
  }
  return params;
}

function usecaseImportLines(uses: readonly ServiceUse[]): string[] {
  const bySpec = new Map<string, string[]>();
  for (const use of uses) {
    const names = bySpec.get(use.specifier) ?? [];
    if (!names.includes(use.functionName)) names.push(use.functionName);
    bySpec.set(use.specifier, names);
  }
  return [...bySpec].map(([specifier, names]) => `import { ${names.join(', ')} } from '${specifier}';`);
}

function renderRequest(call: ServiceCall, behavior: boolean): string {
  const signature = `  ${JSON.stringify(call.route)}: async function (input: Record<string, unknown>, ctx: RequestContext): Promise<Record<string, unknown>> {`;
  if (!behavior) {
    return [
      signature,
      '    void input;',
      '    void ctx;',
      ...call.uses.map(use => `    void ${use.functionName};`),
      `    throw new AppError('${M1_STUB_ERROR}', ${JSON.stringify(`${call.route} is not implemented.`)}, ${M1_STUB_STATUS});`,
      '  },',
    ].join('\n');
  }
  const body = renderRequestBody(call, call.transaction === 'single' ? '    ' : '  ');
  if (call.transaction === 'single') {
    return [signature, '  return ctx.data.moduleData.runInTransaction(async (tx) => {', body, '  });', '  },'].join('\n');
  }
  return [signature, body, '  },'].join('\n');
}

function renderRequestBody(call: ServiceCall, indent: string): string {
  const inTx = call.transaction === 'single';
  const bound = inTx
    ? `${indent}const bound: RequestContext = { ...ctx, data: { ...ctx.data, moduleData: tx } };`
    : `${indent}const bound: RequestContext = ctx;`;
  const steps = call.uses.map((use, index) => {
    const ports = use.ports.length === 0
      ? ''
      : `, { ${use.ports.map(port => `${port.binding}: resolveRepository(bound, ${JSON.stringify(port.interfaceName)})`).join(', ')} } as Parameters<typeof ${use.functionName}>[2]`;
    return `${indent}const step${index} = await ${use.functionName}(input as Parameters<typeof ${use.functionName}>[0], bound${ports});`;
  });
  const lines = [bound, ...steps, `${indent}const out: Record<string, unknown> = {};`];
  call.outputs.forEach(output => {
    const index = call.uses.findIndex(use => use.entityId === output.entity);
    const step = `step${index}`;
    const fields = output.fields.map(field => JSON.stringify(field)).join(', ');
    const source = call.uses[index].operation === 'list'
      ? `(${step} && typeof ${step} === 'object' ? (${step} as Record<string, unknown>).items : undefined)`
      : step;
    lines.push(`${indent}out[${JSON.stringify(output.key)}] = projectOutput(${source}, [${fields}]);`);
    if (output.page) lines.push(`${indent}out[${JSON.stringify(output.page)}] = input.page;`);
    if (output.pageSize) lines.push(`${indent}out[${JSON.stringify(output.pageSize)}] = input.pageSize;`);
    if (output.hasMore) {
      lines.push(`${indent}out[${JSON.stringify(output.hasMore)}] = ${step} && typeof ${step} === 'object' ? (${step} as Record<string, unknown>).hasMore : undefined;`);
    }
  });
  lines.push(`${indent}return out;`);
  return lines.join('\n');
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
      const fn = readFunction(definition);
      return fn ? [fn.name] : [];
    }
    case 'httpController':
      return ['routes'];
    case 'requestService':
      return ['requests'];
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

export function contractMembers(source: string, name: string): { requiredFields: string[]; allowedFields: string[]; allowedPaths: string[] } | null {
  const members = readMembers(source, name);
  if (!members) return null;
  const { requiredFields, allowedFields, allowedPaths } = members;
  return { requiredFields, allowedFields, allowedPaths };
}

/** Member paths of `name` whose declared type admits `null`. */
export function contractNullablePaths(source: string, name: string): string[] | null {
  return readMembers(source, name)?.nullablePaths ?? null;
}

function readMembers(source: string, name: string): { requiredFields: string[]; allowedFields: string[]; allowedPaths: string[]; nullablePaths: string[] } | null {
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
  const requiredFields: string[] = [];
  const allowedFields: string[] = [];
  const allowedPaths: string[] = [];
  const nullablePaths: string[] = [];
  const parents: string[] = [];
  depth = 1;
  const lines = body.split('\n');
  for (const line of lines) {
    const opens = (line.match(/\{/g) ?? []).length;
    const closes = (line.match(/\}/g) ?? []).length;
    const match = /^\s*"?([A-Za-z_][A-Za-z0-9_]*)"?(\??)\s*:/.exec(line);
    if (match && depth >= 1) {
      if (depth === 1) allowedFields.push(match[1]);
      allowedPaths.push([...parents, match[1]].join('.'));
      const path = [...parents, match[1]].join('.');
      if (match[2] !== '?') requiredFields.push(path);
      // `x: T | null` on one line, or `x: null | {` opening an object.
      const declared = line.slice(line.indexOf(':') + 1);
      if (/\bnull\b/.test(opens > closes ? declared.slice(0, declared.indexOf('{')) : declared)) nullablePaths.push(path);
      if (opens > closes) parents.push(match[1]);
    } else if (closes > opens) {
      // `} | null;` closes an object whose type admits null.
      if (/\}\s*\|\s*null\b/.test(line) && parents.length > 0) nullablePaths.push(parents.join('.'));
      for (let count = 0; count < closes - opens; count += 1) parents.pop();
    }
    depth += opens - closes;
  }
  return { requiredFields, allowedFields: [...new Set(allowedFields)], allowedPaths: [...new Set(allowedPaths)], nullablePaths: [...new Set(nullablePaths)] };
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

interface UsecaseFunction {
  name: string;
  input: FieldRow[];
  output: FieldRow[];
}

function readFunction(definition: M1Definition): UsecaseFunction | null {
  const functions = definition.data.functions;
  if (!Array.isArray(functions) || !isRecord(functions[0])) return null;
  const fn = functions[0];
  const name = typeof fn.functionName === 'string' ? fn.functionName : '';
  if (!name) return null;
  return { name, input: fieldRows(fn.input), output: fieldRows(fn.output) };
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

/** The l4 entity a domain def types against: its ontology dependency, else the module's ontology file. */
export function ontologyRef(definition: M1Definition, output: string): string {
  const project = output.split('/')[0] ?? '';
  return definition.dependencies.find(dep => dep.includes('/ontology/') && !dep.endsWith('/mdm.defs.ts'))
    ?? `${project}/l4/${definition.moduleName}/ontology/${token(definition.data.entityId, definition.artifactId)}.defs.ts`;
}

/** Enum values the l4 entity declares per field path, walking nested `fields`; empty when unreadable. */
export function ontologyEnums(source: string | null): Map<string, string[]> {
  const enums = new Map<string, string[]>();
  const match = source ? /=\s*(\{[\s\S]*\})\s*as const/.exec(source) : null;
  if (!match) return enums;
  let value: unknown;
  try {
    value = JSON.parse(match[1]);
  } catch (error) {
    console.warn(`ontology record is not JSON: ${String(error)}`);
    return enums;
  }
  const record = isRecord(value) && isRecord(value.record) ? value.record : null;
  if (!record || !isRecord(record.fields)) return enums;
  const walk = (fields: Record<string, unknown>, prefix: string): void => {
    for (const [name, meta] of Object.entries(fields)) {
      if (!isRecord(meta)) continue;
      const path = prefix ? `${prefix}.${name}` : name;
      const values = Array.isArray(meta.values)
        ? meta.values.flatMap(item => typeof item === 'string' ? [item] : isRecord(item) && typeof item.value === 'string' ? [item.value] : [])
        : [];
      if (meta.type === 'enum' && values.length > 0) enums.set(path, values);
      if (isRecord(meta.fields)) walk(meta.fields, path);
    }
  };
  walk(record.fields, '');
  return enums;
}

function nest(
  fields: readonly FieldRow[],
  enums: ReadonlyMap<string, readonly string[]>,
  optional: ReadonlySet<string> = new Set(),
  aliases: ReadonlySet<string> = new Set(),
): Tree {
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
      if (index === parts.length - 1) child.ts = fieldTs(field.type, enums.get(field.name) ?? [], aliases);
      if (optional.has(parts.slice(0, index + 1).join('.'))) child.optional = true;
      node = child;
    });
  }
  return root;
}

function fieldTs(type: string, values: readonly string[], aliases: ReadonlySet<string> = new Set()): string {
  if (aliases.has(type)) return type;
  const array = /^(.+)\[\]$/.exec(type);
  if (array && aliases.has(array[1])) return type;
  if (type.includes('|') || type.includes('"')) return type.split('"').join("'");
  if (type === 'enum' && values.length > 0) return values.map(value => `'${value}'`).join(' | ');
  if (type === 'integer' || type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'object') return 'Record<string, unknown>';
  return 'string';
}

function renderType(node: Tree, indent: string): string {
  if (node.children.size === 0) return node.ts;
  const lines = [...node.children].map(([key, child]) => `${indent}  ${key}${child.optional ? '?' : ''}: ${renderType(child, `${indent}  `)};`);
  return `{\n${lines.join('\n')}\n${indent}}`;
}

function header(output: string): string {
  return `/// <mls fileReference="${output}" enhancement="_blank"/>`;
}

function pascal(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
