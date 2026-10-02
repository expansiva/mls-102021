/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.ts" enhancement="_blank"/>

/**
 * Replaces a structure stub with behavior derived from the defs.
 * List copies the operation, the port and the entity fields. Create stores only the
 * server assignments and the input members the caller sent (absence is kept).
 * A transition copies lifecycle from/to, the selector and the payload paths.
 * A local storage row is the unique-key check. A payload path is required
 * when one local rule names that path. A leftover local rule is not emitted
 * when the route grant is an unresolved own-scope: that case stays blocked.
 * A pending rule row is not emitted. Events stay in a declared list and are
 * not published. A duplicate slot in this store is not a PostgreSQL atomic
 * constraint. A version the contract does not declare is not invented.
 * An MDM usecase walks `mdm.calls` in order. `expectedVersion` is emitted
 * only when a depended ontology field is `writePrecondition` and the
 * operation input carries that path. Create runs only when its `when` says
 * the prior find missed. No new facade is written.
 */

import {
  isRecord,
  parseDefinitionSource,
  readDefinition,
  type M1Definition,
} from '/_102021_/l2/helpers/l1Defs/definition.js';
import { PLATFORM_FILES } from '/_102021_/l2/agentMaterializeL1/context/context.js';
import {
  auditImports,
  contractMembers,
  contractNullablePaths,
  emitAccess,
  emitAuthority,
  emitDomain,
  ontologyEnums,
  ontologyRef,
  emitPort,
  emitRequestService,
  emitUsecase,
  exposedRouteGrants,
  importSpecifier,
  recordFieldFromGrant,
  type EmitFailure,
  type EmitResult,
  type StructureRead,
} from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';
import {
  domainOptionalPaths,
  enumField,
  identityField,
  lifecycleStart,
  ontologyRequired,
  optionalSignatureNames,
  serverAssigned,
  versionField,
} from '/_102021_/l2/agentMaterializeL1/handlers/structure/domainOptional.js';

export { lifecycleStart };

/** Raised when the implement handler body changes. An older receipt is a new input. */
export const IMPLEMENT_HANDLER_RECIPE = '2026-10-02-implement-handler-v15';

const MEMORY_RUNTIME = '/_102034_/l1/server/layer_1_external/data/moduleDataRuntime.js';
const MDM_MEMORY = '_102034_/l1/mdm/layer_1_external/data/memory/MdmDataRuntimeMemory.ts';
const PLATFORM_CONTRACTS = '/_102034_/l1/server/layer_2_controllers/contracts.js';
const DERIVED_OPERATIONS = new Set(['create', 'list', 'get', 'read', 'update']);
const BLOCKING_RULE_GAPS = new Set(['APPLICABILITY_UNDECLARED']);

const GAP_OWNER: Record<string, string> = {
  ACCESS_ANCHOR: 'x1_04/ns5_69',
  APPLICABILITY_UNDECLARED: 'toPlanner_aplicabilidade_leitura_x_transicao',
  PRECONDITION_UNDECLARED: 'x1_05',
};

export const STORAGE_MARK = '// enforce:storage';
export const PAYLOAD_MARK = '// enforce:payload';
export const VERSION_MARK = '// enforce:version';
export const CREATE_MARK = '// enforce:create';
const LIFECYCLE_MARK = '// enforce:lifecycle';
export const OWN_MARK = '// enforce:own';
const CREATE_END = '// enforce:create end';
const MDM_METHODS = new Set([
  'entity.findByDocument',
  'entity.findByContact',
  'entity.get',
  'entity.create',
  'entity.update',
  'entity.attachRole',
  'collection.listByType',
  'collection.relatedOfMany',
]);

export interface CaseBlock {
  gap: string;
  owner: string;
  ruleId: string;
  unread: boolean;
}

interface RuleRow {
  ruleId: string;
  origin: string;
  consumer: string;
  enforcement: string;
  gap: string;
}

interface FieldNode {
  name: string;
  path: string;
  type: string;
  derived: boolean;
  children: Map<string, FieldNode>;
}

export function isDerivedMdm(definition: M1Definition): boolean {
  return mdmCalls(definition).length > 0 && mdmPlan(definition);
}

export function behaviorNeedsLlm(definition: M1Definition): boolean {
  if (definition.artifactType !== 'usecase') return false;
  if (mdmCalls(definition).length > 0) return !mdmPlan(definition);
  const operation = text(definition.data.operation);
  if (operation === 'transition') {
    if (stringList(definition.data.ports).length !== 1) return true;
    const lifecycle = definition.data.lifecycle;
    return !isRecord(lifecycle) || !text(lifecycle.transitionId);
  }
  if (!DERIVED_OPERATIONS.has(operation)) return true;
  if (stringList(definition.data.ports).length !== 1) return true;
  if (operation === 'update' && (!selectorField(definition) || stringList(definition.data.portCalls).find(isIdent) !== 'update')) return true;
  return ruleRows(definition).some(row => row.enforcement === 'local' && !isStorageRow(row));
}

export function withoutStorageChecks(source: string): { source: string; removed: number } {
  const pattern = /([ \t]*)\/\/ enforce:storage\r?\n\1if \(taken\.length > 0\) throw new AppError\('CONFLICT'[\s\S]*?\);\r?\n/g;
  let removed = 0;
  const next = source.replace(pattern, (_match, indent: string) => {
    removed += 1;
    return `${indent}// enforce:storage disabled\n${indent}void taken;\n`;
  });
  return { source: next, removed };
}

export function withoutPayloadChecks(source: string): { source: string; removed: number } {
  const pattern = /([ \t]*)\/\/ enforce:payload\r?\n\1if \([\s\S]*?\) throw new AppError\('VALIDATION_ERROR'[\s\S]*?\);\r?\n/g;
  let removed = 0;
  const next = source.replace(pattern, (_match, indent: string) => {
    removed += 1;
    return `${indent}// enforce:payload disabled\n`;
  });
  return { source: next, removed };
}

export function withoutLifecycleChecks(source: string): { source: string; removed: number } {
  const pattern = /([ \t]*)\/\/ enforce:lifecycle\r?\n\1if \(!\[[\s\S]*?\) throw new AppError\('VALIDATION_ERROR'[\s\S]*?\);\r?\n/g;
  let removed = 0;
  const next = source.replace(pattern, (_match, indent: string) => {
    removed += 1;
    return `${indent}// enforce:lifecycle disabled\n`;
  });
  return { source: next, removed };
}

export function withoutVersionChecks(source: string): { source: string; removed: number } {
  const pattern = /([ \t]*)\/\/ enforce:version\r?\n\1const expectedVersion = Number\(readPath\(body, (?:"[^"]*"|'[^']*')\)\);\r?\n/g;
  let removed = 0;
  const next = source.replace(pattern, (_match, indent: string) => {
    removed += 1;
    return `${indent}// enforce:version disabled\n${indent}const expectedVersion = Number(loaded.version);\n`;
  });
  return { source: next, removed };
}

export function withoutScopeChecks(source: string): { source: string; removed: number } {
  const pattern = /([ \t]*)\/\/ enforce:scope\r?\n\1body\[resolved\.recordField\] = actorId;\r?\n/g;
  let removed = 0;
  const next = source.replace(pattern, (_match, indent: string) => {
    removed += 1;
    return `${indent}// enforce:scope disabled\n`;
  });
  return { source: next, removed };
}

export function withoutCreateChecks(source: string): { source: string; removed: number } {
  const pattern = /([ \t]*)\/\/ enforce:create\r?\n\1if \([^\n]*\) \{\r?\n([\s\S]*?)\r?\n\1\}\r?\n\1\/\/ enforce:create end\r?\n/g;
  let removed = 0;
  const next = source.replace(pattern, (_match, indent: string, body: string) => {
    removed += 1;
    return `${indent}// enforce:create disabled\n${body}\n`;
  });
  return { source: next, removed };
}

export async function caseBlock(
  definition: M1Definition,
  defPath: string,
  item: { routine: string; expect: { ruleId: string | null } },
  read: StructureRead,
  moduleDefinitions: readonly unknown[] = [],
): Promise<CaseBlock | null> {
  const ruleId = item.expect.ruleId ?? '';
  const rule = ruleRows(definition).find(row => ruleId && row.ruleId === ruleId && row.enforcement === 'pending' && BLOCKING_RULE_GAPS.has(row.gap));
  if (rule) return { gap: rule.gap, owner: GAP_OWNER[rule.gap] ?? rule.gap, ruleId: rule.ruleId, unread: false };
  if (ruleId && !ruleRows(definition).some(row => row.ruleId === ruleId)) {
    return { gap: 'PRECONDITION_UNDECLARED', owner: GAP_OWNER.PRECONDITION_UNDECLARED, ruleId, unread: false };
  }
  if (text(definition.data.operation) === 'update') {
    const precondition = isDerivedMdm(definition)
      ? await confirmedPrecondition(definition, read)
      : await localPrecondition(definition, read);
    const asksVersion = ruleId === 'writePrecondition' || ruleId === 'expectedVersion';
    if (!precondition && (isDerivedMdm(definition) || asksVersion)) {
      return { gap: 'PRECONDITION_UNDECLARED', owner: GAP_OWNER.PRECONDITION_UNDECLARED, ruleId: ruleId || 'writePrecondition', unread: false };
    }
    if (precondition && asksVersion) return null;
  }
  if (text(definition.data.operation) === 'transition' && ruleId) {
    const plan = await planTransition(definition, read, moduleDefinitions);
    if (!('code' in plan) && plan.anchorRules.includes(ruleId)) {
      return { gap: 'ACCESS_ANCHOR', owner: GAP_OWNER.ACCESS_ANCHOR, ruleId, unread: false };
    }
    if (!('code' in plan) && (ruleId === plan.flowRule || ruleId === plan.payloadRule)) return null;
  }
  if (!item.routine) return null;
  const grant = await caseRouteGrant(definition, defPath, item.routine, read, moduleDefinitions);
  if (grant.unread) return { gap: 'GRANT_UNREAD', owner: '', ruleId: '', unread: true };
  if (!grant.pending) return null;
  return { gap: grant.pending, owner: GAP_OWNER[grant.pending] ?? grant.pending, ruleId: '', unread: false };
}

/** A lifecycle or payload rule is proved by calling the usecase, not the route. */
export async function ruleRunsOnUsecase(
  definition: M1Definition,
  ruleId: string,
  read: StructureRead,
  moduleDefinitions: readonly unknown[] = [],
): Promise<boolean> {
  if (text(definition.data.operation) !== 'transition' || !ruleId) return false;
  const plan = await planTransition(definition, read, moduleDefinitions);
  if ('code' in plan) return false;
  return ruleId === plan.flowRule || ruleId === plan.payloadRule;
}

export async function emitBehavior(
  id: string,
  definition: M1Definition,
  output: string,
  read: StructureRead,
  moduleDefinitions: readonly unknown[] = [],
): Promise<EmitResult | EmitFailure> {
  if (id === 'implement.domainEntity') return behaviorDomain(definition, output, read);
  if (id === 'implement.authorityMap') return done(emitAuthority(definition, output));
  if (id === 'implement.accessScope') return behaviorAccess(definition, output);
  if (id === 'implement.repositoryPort') return memoryPort(definition, output, read);
  if (id === 'implement.usecase') return memoryUsecase(definition, output, read, moduleDefinitions);
  if (id === 'implement.requestService') return emitRequestService(definition, output, read, moduleDefinitions, 'implement');
  return { code: 'NO_NAMED_HANDLER', detail: `${id} is not a behavior body.` };
}

async function memoryUsecase(
  definition: M1Definition,
  output: string,
  read: StructureRead,
  moduleDefinitions: readonly unknown[],
): Promise<EmitResult | EmitFailure> {
  if (isDerivedMdm(definition)) return memoryMdm(definition, output, read);
  if (behaviorNeedsLlm(definition)) {
    return { code: 'NEEDS_LLM', detail: `${definition.artifactId} is not derivable from its def. No file was written.` };
  }
  const stub = await emitUsecase(definition, output, read);
  if ('code' in stub) return stub;
  const operation = text(definition.data.operation);
  const portName = stringList(definition.data.ports)[0] ?? '';
  const entity = await loadEntity(definition, read);
  if ('code' in entity) return entity;
  const entityName = text(entity.data.entityId) || 'Entity';
  const entityDep = definition.dependencies.find(path => path.includes('/entities/')) ?? '';
  const contractRefs = firstFunction(definition);
  if (!contractRefs) return { code: 'FUNCTION_MISSING', detail: `${definition.artifactId} has no function contract.` };
  // A v2 usecase has no contract. Allowed, required and nullable paths are the signature fields
  // (the usecase def) read against the entity: writable, required, nullable. A route name is not a source.
  const contract = contractRefs.contractRefs.length === 0
    ? signaturePaths(definition, entity, domainOptionalPaths(entity, await read(ontologyRef(entity, entityDep))) ?? new Set())
    : await resolveContract(definition, contractRefs, read, contractRefs.contractRefs.find(item => item.symbol.endsWith('Output'))?.route ?? '');
  if ('code' in contract) return contract;
  const pageFilterPaths = operation === 'list' && contractRefs.contractRefs.length > 0
    ? await resolvePageListInputs(definition, read)
    : [];
  const keys = operation === 'create' || operation === 'update' ? await readUniqueKeys(definition, read) : [];
  if ('code' in keys) return keys;
  const applicableKeys = operation === 'update' ? keys.filter(columns => columns.every(column => contract.allowedInputPaths.includes(column))) : keys;
  const ruleId = constraintRuleId(definition);
  if (applicableKeys.length > 0 && !ruleId) {
    return { code: 'UNIQUE_RULE_UNNAMED', detail: `${definition.artifactId} enforces a storage constraint with no rule id.` };
  }
  const usecaseInputPaths = firstFunction(definition)?.name
    ? inputNames(definition).flatMap(name => {
      const fn = Array.isArray(definition.data.functions) && isRecord(definition.data.functions[0]) ? definition.data.functions[0] : {};
      const fields = Array.isArray(fn.input) ? fn.input.filter(isRecord) : [];
      const field = fields.find(item => text(item.name) === name);
      const ref = text(field?.fieldRef);
      return ref ? expandInputType(name, text(field?.type)) : [name];
    })
    : [];
  // Writable paths are the signature fields. With a contract, that signature is the contract input.
  const inputs = new Set(contract.allowedInputPaths.length ? contract.allowedInputPaths : usecaseInputPaths);
  const updateInputs = operation === 'update' ? new Set([...inputs].filter(path => {
    const leaf = path.split('.').pop() ?? path;
    return leaf !== selectorField(definition) && !['id', 'version'].includes(leaf);
  })) : inputs;
  const transition = operation === 'transition' ? await planTransition(definition, read, moduleDefinitions) : null;
  if (transition && 'code' in transition) return transition;
  const precondition = operation === 'update' ? await localPrecondition(definition, read) : '';
  const lifecycle = lifecycleStart(entity);
  if (operation === 'create' && lifecycle.field && !lifecycle.initial) {
    return { code: 'LIFECYCLE_INITIAL', detail: `${definition.artifactId}: the lifecycle has no single state that no transition reaches.` };
  }
  const sources = operation === 'create' ? await createSources(definition, entity, inputs, lifecycle, read) : { missing: '', containers: new Set<string>() };
  if ('code' in sources) return sources;
  if (sources.missing) return { code: 'CREATE_SOURCE_MISSING', detail: `${definition.artifactId}: ${sources.missing} is required by the entity and has no input nor server assignment.` };
  const domain = contractRefs.contractRefs.length === 0;
  const outs = outputNames(definition);
  // v2: no contract output; the update and the transition return the stub's own output type.
  const returnType = domain ? stubReturnType(stub.source) : '';
  const body = operation === 'create'
    ? createBody(entity, entityName, camel(portName), keys, ruleId, inputs, { required: new Set(contract.requiredInputPaths), nullable: new Set(contract.nullableInputPaths) }, sources.containers, lifecycle, domain ? outs : [])
    : operation === 'update'
      ? updateBody(entity, entityName, camel(portName), applicableKeys, ruleId, updateInputs, selectorField(definition), precondition, returnType)
      : transition
        ? transitionBody(entityName, camel(portName), transition, returnType)
        : listBody(entity, entityName, camel(portName), new Set(pageFilterPaths.length ? pageFilterPaths : [...inputs]), domain && outs.includes('items') && outs.includes('hasMore'));
  const replaced = stub.source.replace(
    /void input;\n  void ctx;\n(?:  void ports;\n)?  throw new AppError\('USECASE_NOT_IMPLEMENTED'[\s\S]*?\);/,
    body,
  );
  if (replaced === stub.source) return { code: 'STUB_SHAPE', detail: `${definition.artifactId} stub body was not recognized.` };
  const entityImport = importSpecifier(entityDep, 'output');
  const entityLine = `import type { ${entityName} } from '${entityImport}';`;
  const source = replaced.includes(entityLine)
    ? replaced
    : replaced.replace(
      `import { AppError } from '${PLATFORM_CONTRACTS}';`,
      `import { AppError } from '${PLATFORM_CONTRACTS}';\n${entityLine}`,
    );
  const imports = stub.imports.includes(entityImport) ? [...stub.imports] : [...stub.imports, entityImport];
  const bad = auditImports(source, imports);
  if (bad) return { code: 'IMPORT_UNDECLARED', detail: bad };
  return { runsStub: false, imports, source: finish(source) };
}

async function memoryPort(definition: M1Definition, output: string, read: StructureRead): Promise<EmitResult | EmitFailure> {
  const stub = emitPort(definition, output);
  if ('code' in stub) return stub;
  const entity = text(definition.data.entityId) || 'Entity';
  const loaded = await loadEntity(definition, read);
  if ('code' in loaded) return loaded;
  const key = identityField(loaded);
  if (!key) return { code: 'ENTITY_KEY', detail: `${definition.artifactId} has no identity field.` };
  const withImport = stub.source.replace(
    `import { AppError } from '${PLATFORM_CONTRACTS}';`,
    `import { AppError } from '${PLATFORM_CONTRACTS}';\nimport { createMemoryTableRepository } from '${MEMORY_RUNTIME}';`,
  );
  const create = withImport.replace(
    /async create\(([^)]*)\): Promise<([^>]+)> \{ throw new AppError\('REPOSITORY_NOT_IMPLEMENTED', 'create is not implemented\.', 501\); \}/,
    'async create($1): Promise<$2> { await table().insert({ record }); return record; }',
  );
  const listed = create.replace(
    /async list\(([^)]*)\): Promise<([^>]+)> \{ throw new AppError\('REPOSITORY_NOT_IMPLEMENTED', 'list is not implemented\.', 501\); \}/,
    `async list($1): Promise<$2> { return table().findMany({ where: filter as Partial<${entity}> }); }`,
  );
  const saved = replaceRecordWrites(listed, definition, entity, key);
  if (!saved.includes('await table().insert') || !saved.includes('table().findMany')) {
    return { code: 'STUB_SHAPE', detail: `${definition.artifactId} port methods were not recognized.` };
  }
  const source = saved.replace('export const pending', `${storeSource(entity, key)}\nexport const pending`);
  const renamed = renamePortArgs(source);
  const imports = [...stub.imports, MEMORY_RUNTIME];
  const bad = auditImports(renamed, imports);
  if (bad) return { code: 'IMPORT_UNDECLARED', detail: bad };
  return { runsStub: false, imports, source: finish(renamed) };
}

function behaviorAccess(definition: M1Definition, output: string): EmitResult | EmitFailure {
  const emitted = emitAccess(definition, output);
  const pending = '  if (grant.pending) return { code: grant.pending, detail: `Grant ${grantId} is pending ${grant.pending}.` };\n';
  if (!emitted.source.includes(pending)) return { code: 'STUB_SHAPE', detail: `${definition.artifactId} grant check was not recognized.` };
  return done({ ...emitted, source: emitted.source.replace(pending, '') });
}

function replaceRecordWrites(source: string, definition: M1Definition, entity: string, key: string): string {
  const methods = Array.isArray(definition.data.methods) ? definition.data.methods.filter(isRecord) : [];
  let next = source;
  for (const method of methods) {
    const name = text(method.name);
    if (!name || name === 'create' || name === 'list' || !isIdent(name)) continue;
    const params = stringList(method.params);
    if (!params.includes(entity)) continue;
    const mark = `throw new AppError('REPOSITORY_NOT_IMPLEMENTED', '${name} is not implemented.', 501);`;
    const at = next.indexOf(`async ${name}(`);
    if (at < 0 || !next.includes(mark)) return source;
    const head = next.slice(at, next.indexOf(mark, at));
    const args = /\(([^)]*)\)/.exec(head)?.[1] ?? '';
    const names = args.split(',').map(item => item.trim().split(':')[0]?.trim() ?? '').filter(Boolean);
    const record = names[0] || 'record';
    const voids = names.slice(1).map(item => `void ${item};`).join(' ');
    const body = `{ ${voids} const where = { ${key}: ${record}.${key} } as Partial<${entity}>; await table().update({ where, patch: ${record} }); const saved = await table().findOne({ where }); if (!saved) throw new AppError('NOT_FOUND', 'Record not found.', 404); return saved; }`;
    next = next.replace(`{ ${mark} }`, body);
  }
  return next;
}

function renamePortArgs(source: string): string {
  return source
    .replace(/async create\(([^:)]+):/g, 'async create(record:')
    .replace(/async list\(([^:)]+):/g, 'async list(filter:');
}

function storeSource(entity: string, key: string): string {
  return [
    `let rows = createMemoryTableRepository<${entity}>([]);`,
    'function table() { return rows; }',
    `export function resetMemory(seed: ${entity}[] = []): void {`,
    '  rows = createMemoryTableRepository(seed.map(row => ({ ...row })));',
    '}',
    // Fixture cleanup (m1_28): one record by its exact key; false when it is already gone.
    `export async function removeMemory(${key}: string): Promise<boolean> {`,
    `  const where = { ${key} } as unknown as Partial<${entity}>;`,
    '  if (!await table().findOne({ where })) return false;',
    '  await table().delete({ where });',
    '  return true;',
    '}',
    '',
  ].join('\n');
}

async function memoryMdm(definition: M1Definition, output: string, read: StructureRead): Promise<EmitResult | EmitFailure> {
  const facade = await read(PLATFORM_FILES.mdmFacade);
  const memory = await read(MDM_MEMORY);
  const facadeReady = facade?.includes('export function createMdmFacade') === true;
  const memoryReady = memory?.includes('export function createMemoryDataRuntime') === true;
  if (!facadeReady || !memoryReady) {
    const missing = [facadeReady ? '' : 'facade', memoryReady ? '' : 'memory'].filter(Boolean).join(' ');
    return { code: 'MDM_RUNTIME_ABSENT', detail: `${definition.artifactId} has no memory MDM runtime (${missing}). No facade was written.` };
  }
  const stub = await emitUsecase(definition, output, read);
  if ('code' in stub) return stub;
  const operation = text(definition.data.operation);
  const entity = await loadEntity(definition, read);
  if ('code' in entity) return entity;
  const subtype = await ontologySubtype(definition, read);
  const precondition = operation === 'update' ? await confirmedPrecondition(definition, read) : '';
  const returnType = stubReturnType(stub.source);
  const body = operation === 'update' && !precondition
    ? '  void input;\n  throw new AppError(\'PRECONDITION_UNDECLARED\', \'Write precondition is not declared.\', 409);'
    : mdmBody(definition, entity, subtype, precondition, returnType);
  const replaced = stub.source.replace(
    /void input;\n  void ctx;\n(?:  void ports;\n)?  throw new AppError\('USECASE_NOT_IMPLEMENTED'[\s\S]*?\);/,
    body,
  );
  if (replaced === stub.source) return { code: 'STUB_SHAPE', detail: `${definition.artifactId} stub body was not recognized.` };
  const bad = auditImports(replaced, stub.imports);
  if (bad) return { code: 'IMPORT_UNDECLARED', detail: bad };
  return { runsStub: false, imports: stub.imports, source: finish(replaced) };
}

function mdmBody(definition: M1Definition, entity: M1Definition, subtype: string, precondition: string, returnType: string): string {
  const operation = text(definition.data.operation);
  const calls = mdmCalls(definition);
  const leaves = detailLeaves(entity).map(path => [path.split('.').pop() ?? '', path.slice('details.'.length)] as const);
  const lines = [
    '  const body = input as unknown as Record<string, unknown>;',
    '  const present = (value: unknown): boolean => value !== undefined && value !== null && value !== \'\';',
    '  const readPath = (source: unknown, path: string): unknown => {',
    '    let node: unknown = source;',
    '    for (const part of path.split(\'.\')) {',
    '      if (!node || typeof node !== \'object\') return undefined;',
    '      node = (node as Record<string, unknown>)[part];',
    '    }',
    '    return node;',
    '  };',
    '  const writePath = (source: Record<string, unknown>, path: string, value: unknown): void => {',
    '    const parts = path.split(\'.\');',
    '    let node = source;',
    '    for (let index = 0; index < parts.length - 1; index += 1) {',
    '      const part = parts[index];',
    '      const child = node[part];',
    '      if (!child || typeof child !== \'object\' || Array.isArray(child)) node[part] = {};',
    '      node = node[part] as Record<string, unknown>;',
    '    }',
    '    node[parts[parts.length - 1]] = value;',
    '  };',
    `  const nest = (flat: unknown): Record<string, unknown> => {`,
    '    const source = flat && typeof flat === \'object\' ? flat as Record<string, unknown> : {};',
    '    const details: Record<string, unknown> = {};',
    `    const leaves = ${JSON.stringify(leaves)} as ReadonlyArray<readonly [string, string]>;`,
    '    for (const [tail, path] of leaves) {',
    '      if (tail && source[tail] !== undefined) writePath(details, path, source[tail]);',
    '    }',
    '    return details;',
    '  };',
    '  const pack = (row: Record<string, unknown>) => ({ id: String(row.mdmId ?? \'\'), version: Number(row.version ?? 0), details: nest(row.details) });',
    '  const priors: Record<string, Record<string, unknown>> = {};',
    '  let current: Record<string, unknown> | null = null;',
    '  const remember = (id: string, value: Record<string, unknown> | null): void => {',
    '    priors[id] = value ?? {};',
    '    if (value && present(value.mdmId)) current = value;',
    '  };',
  ];
  if (operation === 'list') {
    lines.push('  const hydrate = async (row: Record<string, unknown>): Promise<Record<string, unknown>> => {');
    lines.push('    if (typeof row.version === \'number\') return row;');
    lines.push('    return await ctx.mdm.entity.get({ mdmId: String(row.mdmId) }) as unknown as Record<string, unknown>;');
    lines.push('  };');
  }
  for (const call of calls) {
    lines.push(...emitMdmCall(call, operation, subtype, precondition, returnType));
  }
  if (operation === 'list') {
    lines.push(`  return [] as unknown as ${returnType};`);
    return lines.join('\n');
  }
  const ids = calls.map(call => call.id);
  lines.push(`  const chosen = ${JSON.stringify(ids)}.map(key => priors[key]).find(item => present(item["mdmId"]));`);
  lines.push('  if (!chosen) throw new AppError(\'NOT_FOUND\', \'Record was not found.\', 404);');
  lines.push(`  return pack(chosen) as unknown as ${returnType};`);
  return lines.join('\n');
}

function emitMdmCall(call: MdmCall, operation: string, subtype: string, precondition: string, returnType: string): string[] {
  const guard = [whenExpr(call), requiredExpr(call, precondition)].filter(Boolean).join(' && ');
  const inner = callBody(call, subtype, precondition).split('\n').filter(line => line.length > 0);
  const indent = (line: string, spaces: number) => `${' '.repeat(spaces)}${line}`;
  const depth = guard ? 4 : 2;
  if (operation === 'list') {
    const body = [
      ...inner.map(line => indent(line, depth)),
      indent(`return ${listReturn(call, returnType)};`, depth),
    ];
    return guard ? [indent(`if (${guard}) {`, 2), ...body, indent('}', 2)] : body;
  }
  if (call.method === 'create') {
    return [
      indent(CREATE_MARK, 2),
      indent(`if (${guard || 'true'}) {`, 2),
      ...inner.map(line => indent(line, 4)),
      indent('}', 2),
      indent(CREATE_END, 2),
      indent(`if (!priors[${JSON.stringify(call.id)}]) remember(${JSON.stringify(call.id)}, null);`, 2),
    ];
  }
  const body = inner.map(line => indent(line, depth));
  if (!guard) return body;
  return [
    indent(`if (${guard}) {`, 2),
    ...body,
    indent('}', 2),
    indent(`if (!(${guard})) remember(${JSON.stringify(call.id)}, null);`, 2),
  ];
}

function listReturn(call: MdmCall, returnType: string): string {
  if (call.method === 'findByDocument' || call.method === 'findByContact') {
    return `(found ? [pack(found as unknown as Record<string, unknown>)] : []) as unknown as ${returnType}`;
  }
  if (call.method === 'listByType') return `rows as unknown as ${returnType}`;
  if (call.method === 'get') return `[pack(found as unknown as Record<string, unknown>)] as unknown as ${returnType}`;
  return `[] as unknown as ${returnType}`;
}

function callBody(call: MdmCall, subtype: string, precondition: string): string {
  const key = `${call.target}.${call.method}`;
  if (key === 'entity.findByDocument' || key === 'entity.findByContact') {
    const args = call.args.map(arg => `String(readPath(body, ${JSON.stringify(arg.path)}))`).join(', ');
    return [
      `const found = await ctx.mdm.entity.${call.method}(${args});`,
      `remember(${JSON.stringify(call.id)}, found ? { mdmId: found.mdmId, version: found.version, details: found.details } as Record<string, unknown> : null);`,
    ].join('\n');
  }
  if (key === 'entity.get') {
    const path = call.args.find(arg => arg.originKind === 'contract')?.path ?? 'id';
    return [
      `const found = await ctx.mdm.entity.get({ mdmId: String(readPath(body, ${JSON.stringify(path)})) });`,
      `remember(${JSON.stringify(call.id)}, { mdmId: found.mdmId, version: found.version, details: found.details } as Record<string, unknown>);`,
    ].join('\n');
  }
  if (key === 'entity.create') {
    const fields = call.args.filter(arg => arg.originKind === 'contract').map(arg => [
      `const ${arg.name}Value = readPath(body, ${JSON.stringify(arg.path)});`,
      `if (present(${arg.name}Value)) details[${JSON.stringify(arg.name)}] = ${arg.name}Value;`,
    ].join('\n'));
    return [
      'const details: Record<string, unknown> = {};',
      ...(subtype ? [`details.subtype = ${JSON.stringify(subtype)};`] : []),
      ...fields,
      'const created = await ctx.mdm.entity.create({ details: details as never });',
      `remember(${JSON.stringify(call.id)}, { mdmId: created.mdmId, version: created.version, details: created.details } as Record<string, unknown>);`,
    ].join('\n');
  }
  if (key === 'entity.update') {
    const idPath = call.args.find(arg => arg.name === 'mdmId')?.path ?? 'id';
    const patches = call.args.filter(arg => arg.originKind === 'contract' && arg.name !== 'mdmId' && arg.path !== precondition);
    return [
      `const loaded = await ctx.mdm.entity.get({ mdmId: String(readPath(body, ${JSON.stringify(idPath)})) }) as { mdmId: string; version: number; details: Record<string, unknown> };`,
      'current = loaded as unknown as Record<string, unknown>;',
      VERSION_MARK,
      `const expectedVersion = Number(readPath(body, ${JSON.stringify(precondition)}));`,
      'const patch: Record<string, unknown> = {};',
      ...patches.flatMap(arg => [
        `const ${arg.name}Value = readPath(body, ${JSON.stringify(arg.path)});`,
        `if (present(${arg.name}Value)) patch[${JSON.stringify(arg.name)}] = ${arg.name}Value;`,
      ]),
      'const saved = await ctx.mdm.entity.update({ mdmId: loaded.mdmId, expectedVersion, patch: patch as never });',
      `remember(${JSON.stringify(call.id)}, { mdmId: saved.mdmId, version: saved.version, details: saved.details } as Record<string, unknown>);`,
    ].join('\n');
  }
  if (key === 'entity.attachRole') {
    const idArg = call.args.find(arg => arg.originKind === 'prior');
    const role = call.args.find(arg => arg.originKind === 'literal')?.value ?? '';
    return [
      `const attached = await ctx.mdm.entity.attachRole(String(${priorExpr(idArg)}), ${JSON.stringify(role)});`,
      `remember(${JSON.stringify(call.id)}, { mdmId: attached.mdmId, version: attached.version, details: attached.details } as Record<string, unknown>);`,
    ].join('\n');
  }
  if (key === 'collection.listByType') {
    const fields = call.args.map(arg => {
      if (arg.originKind === 'literal') return `${JSON.stringify(arg.name)}: ${JSON.stringify(arg.value)}`;
      return `${JSON.stringify(arg.name)}: readPath(body, ${JSON.stringify(arg.path)})`;
    });
    return [
      `const page = await ctx.mdm.collection.listByType({ ${fields.join(', ')} } as never);`,
      'const rows: Array<{ id: string; version: number; details: Record<string, unknown> }> = [];',
      'for (const item of page.items) {',
      '  const row = item as unknown as Record<string, unknown>;',
      '  const full = typeof row.version === \'number\' ? row : await hydrate(row);',
      '  rows.push(pack(full));',
      '}',
    ].join('\n');
  }
  if (key === 'collection.relatedOfMany') {
    const path = call.args.find(arg => arg.originKind === 'contract')?.path ?? 'id';
    return [
      `const links = await ctx.mdm.collection.relatedOfMany({ mdmIds: [String(readPath(body, ${JSON.stringify(path)}))] });`,
      'void links;',
    ].join('\n');
  }
  return `remember(${JSON.stringify(call.id)}, null);`;
}

function priorExpr(arg: MdmArg | undefined): string {
  if (!arg) return 'undefined';
  const calls = arg.calls.length > 0 ? arg.calls : (arg.call ? [arg.call] : []);
  const items = calls.map(id => `priors[${JSON.stringify(id)}]`).join(', ');
  return `[${items}].map(item => item[${JSON.stringify(arg.path)}]).find(value => present(value))`;
}

function whenExpr(call: MdmCall): string {
  return call.when.map(clause => {
    if (clause.kind === 'contract') {
      const check = `present(readPath(body, ${JSON.stringify(clause.path)}))`;
      return clause.present ? check : `!(${check})`;
    }
    if (clause.kind === 'prior') {
      const check = `present(priors[${JSON.stringify(clause.call)}][${JSON.stringify(clause.path)}])`;
      return clause.present ? check : `!(${check})`;
    }
    return 'false';
  }).join(' && ');
}

function requiredExpr(call: MdmCall, precondition: string): string {
  if (call.when.length > 0) return '';
  const paths = call.args
    .filter(arg => arg.originKind === 'contract' && (call.method !== 'update' && call.method !== 'create' || arg.name === 'mdmId' || arg.path === precondition))
    .map(arg => arg.path)
    .filter(Boolean);
  if (call.method === 'update' || call.method === 'create') {
    return paths.map(path => `present(readPath(body, ${JSON.stringify(path)}))`).join(' && ');
  }
  if (paths.length === 0) return '';
  return paths.map(path => `present(readPath(body, ${JSON.stringify(path)}))`).join(' && ');
}

async function localPrecondition(definition: M1Definition, read: StructureRead): Promise<string> {
  const inputs = new Set(inputNames(definition));
  const marked = await markedPreconditions(definition, read);
  const hits = [...marked].filter(name => inputs.has(name) && isIdent(name));
  return hits.length === 1 ? hits[0] : '';
}

async function markedPreconditions(definition: M1Definition, read: StructureRead): Promise<Set<string>> {
  const marked = new Set<string>();
  for (const dep of definition.dependencies) {
    const source = await read(dep);
    if (!source) continue;
    for (const match of source.matchAll(/"([A-Za-z_][A-Za-z0-9_]*)"\s*:\s*\{[^{}]*"writePrecondition"\s*:\s*true/g)) {
      marked.add(match[1] ?? '');
    }
  }
  return marked;
}

async function confirmedPrecondition(definition: M1Definition, read: StructureRead): Promise<string> {
  const update = mdmCalls(definition).find(call => call.method === 'update');
  const arg = update?.args.find(item => item.name === 'expectedVersion' && item.evidence === 'writePrecondition' && item.originKind === 'contract');
  if (!arg?.path) return '';
  const leaf = arg.path.split('.').pop() ?? '';
  const inputs = new Set(inputNames(definition));
  if (!leaf || (!inputs.has(arg.path) && !inputs.has(leaf))) return '';
  const marked = await markedPreconditions(definition, read);
  return marked.has(leaf) ? arg.path : '';
}

async function ontologySubtype(definition: M1Definition, read: StructureRead): Promise<string> {
  for (const dep of definition.dependencies) {
    if (!dep.includes('/ontology/') || dep.endsWith('/mdm.defs.ts')) continue;
    const source = await read(dep);
    const match = source ? /"subtype"\s*:\s*"([^"]+)"/.exec(source) : null;
    if (match?.[1] && isIdent(match[1])) return match[1];
  }
  return '';
}

function detailLeaves(entity: M1Definition): string[] {
  const names = (Array.isArray(entity.data.fields) ? entity.data.fields.filter(isRecord) : []).map(field => text(field.name)).filter(Boolean);
  return names.filter(name => name.startsWith('details.') && !names.some(other => other.startsWith(`${name}.`)));
}

interface MdmArg {
  name: string;
  originKind: string;
  path: string;
  call: string;
  calls: string[];
  evidence: string;
  value: string;
}

interface MdmWhen {
  kind: string;
  path: string;
  call: string;
  present: boolean;
}

interface MdmCall {
  id: string;
  method: string;
  target: string;
  when: MdmWhen[];
  args: MdmArg[];
}

function mdmCalls(definition: M1Definition): MdmCall[] {
  const mdm = definition.data.mdm;
  if (!isRecord(mdm) || !Array.isArray(mdm.calls)) return [];
  const calls: MdmCall[] = [];
  for (const item of mdm.calls) {
    if (!isRecord(item)) continue;
    const id = text(item.id);
    const method = text(item.method);
    const target = text(item.target);
    if (!isIdent(id) || !isIdent(method) || !isIdent(target)) continue;
    const when = Array.isArray(item.when) ? item.when.filter(isRecord).map(clause => ({
      kind: text(clause.kind),
      path: text(clause.path),
      call: text(clause.call),
      present: clause.present !== false,
    })) : [];
    const args = Array.isArray(item.arguments) ? item.arguments.filter(isRecord).map(arg => {
      const origin = isRecord(arg.origin) ? arg.origin : {};
      return {
        name: text(arg.name),
        originKind: text(origin.kind),
        path: text(origin.path),
        call: text(origin.call),
        calls: stringList(origin.calls),
        evidence: text(origin.evidence),
        value: text(arg.value),
      };
    }) : [];
    calls.push({ id, method, target, when, args });
  }
  return calls;
}

function mdmPlan(definition: M1Definition): boolean {
  const calls = mdmCalls(definition);
  const operation = text(definition.data.operation);
  if (calls.length === 0 || stringList(definition.data.ports).length !== 0) return false;
  if (operation !== 'create' && operation !== 'update' && operation !== 'list') return false;
  return calls.every(call => MDM_METHODS.has(`${call.target}.${call.method}`)
    && call.when.every(clause => (clause.kind === 'contract' || clause.kind === 'prior') && (!clause.path || clause.path.split('.').every(isIdent)) && (!clause.call || isIdent(clause.call)))
    && call.args.every(arg => isIdent(arg.name) && argOriginOk(arg)));
}

function argOriginOk(arg: MdmArg): boolean {
  if (arg.originKind === 'literal') return arg.value.length > 0;
  if (arg.originKind === 'contract') return arg.path.length > 0 && arg.path.split('.').every(isIdent);
  if (arg.originKind === 'prior') {
    const calls = arg.calls.length > 0 ? arg.calls : (arg.call ? [arg.call] : []);
    return isIdent(arg.path) && calls.length > 0 && calls.every(isIdent);
  }
  return false;
}

/**
 * The stored record holds the server assignments (identity, version, initial state) and the
 * input leaves the contract permits and the caller sent. An absent optional member stays absent;
 * a present leaf (0, false, '', null) is copied as sent. `null` reaches here only where the contract
 * declares it (the controller refuses it elsewhere); a nullable object sent as null is stored as null.
 */
function createBody(
  entity: M1Definition,
  entityName: string,
  binding: string,
  keys: readonly (readonly string[])[],
  ruleId: string,
  inputs: ReadonlySet<string>,
  declared: { required: ReadonlySet<string>; nullable: ReadonlySet<string> },
  containers: ReadonlySet<string>,
  lifecycle: { field: string; initial: string },
  /** Output paths of a usecase with no contract. Empty keeps the contract return. */
  projectFields: readonly string[] = [],
): string {
  const tree = fieldTree(entity);
  const fields = createMembers(tree, { inputs, ...declared, containers, assigned: serverAssigned(entity, lifecycle) }, '    ');
  const checks = keys.map(columns => [
    '  {',
    `    const taken = await ports.${binding}.list({ ${columns.map(column => `${column}: body.${column}`).join(', ')} });`,
    `    ${STORAGE_MARK}`,
    `    if (taken.length > 0) throw new AppError('CONFLICT', 'Unique key already stored.', 409, { ruleId: ${JSON.stringify(ruleId)} });`,
    '  }',
  ].join('\n'));
  const domain = projectFields.length > 0;
  const tops = [...new Set(projectFields.map(path => path.split('.')[0] ?? '').filter(isIdent))];
  const returned = domain
    ? [
      `  const saved = await ports.${binding}.create(record);`,
      '  return {',
      ...tops.map(name => `    ${name}: saved.${name},`),
      '  };',
    ]
    : [`  return ports.${binding}.create(record);`];
  return [
    domain ? '  const body = input;' : `  const body = input as ${entityName};`,
    domain ? '  const record = {' : `  const record: ${entityName} = {`,
    ...fields,
    domain ? `  } as ${entityName};` : '  };',
    ...checks,
    ...returned,
  ].join('\n');
}



interface CreateSources {
  /** Contract input paths. */
  inputs: ReadonlySet<string>;
  /** Contract input paths without `?`. */
  required: ReadonlySet<string>;
  /** Contract input paths whose type admits `null`; the controller refuses `null` anywhere else. */
  nullable: ReadonlySet<string>;
  /** Entity objects the l4 requires under required parents: present even when nothing inside is sent. */
  containers: ReadonlySet<string>;
  assigned: ReadonlyMap<string, string>;
}

/** Object members for the children of `node`. A member with no input, assignment or required container is not written. */
function createMembers(node: FieldNode, sources: CreateSources, indent: string): string[] {
  const lines: string[] = [];
  for (const [name, child] of node.children) {
    const value = sources.assigned.get(child.path);
    if (value) {
      lines.push(`${indent}${name}: ${value},`);
      continue;
    }
    const bound = sources.inputs.has(child.path);
    const boundBelow = [...sources.inputs].some(path => path.startsWith(`${child.path}.`));
    const container = sources.containers.has(child.path);
    if (!bound && !boundBelow && !container) continue;
    const access = `input.${child.path}`;
    const members = `{\n${createMembers(child, sources, `${indent}  `).join('\n')}\n${indent}}`;
    const inner = child.children.size > 0 && (boundBelow || !bound)
      ? bound && sources.nullable.has(child.path) ? `${access} === null ? null : ${members}` : members
      : access;
    lines.push((bound && sources.required.has(child.path)) || (!bound && container)
      ? `${indent}${name}: ${inner},`
      : `${indent}...(${access} !== undefined ? { ${name}: ${inner} } : {}),`);
  }
  return lines;
}

/**
 * What the depended l4 entity requires of a new record. `missing` is the first required leaf (under
 * required parents) the create neither reads nor assigns; `containers` are the required objects.
 */
async function createSources(
  definition: M1Definition,
  entity: M1Definition,
  inputs: ReadonlySet<string>,
  lifecycle: { field: string; initial: string },
  read: StructureRead,
): Promise<{ missing: string; containers: Set<string> } | EmitFailure> {
  const containers = new Set<string>();
  const ref = definition.dependencies.find(dep => dep.includes('/ontology/') && !dep.endsWith('/mdm.defs.ts'));
  if (!ref) return { missing: '', containers };
  const source = await read(ref);
  if (source === null) return { code: 'CONTEXT_UNREAD', detail: `${ref} could not be read.` };
  const requiredFields = ontologyRequired(source);
  if (!requiredFields) return { code: 'ONTOLOGY_UNREAD', detail: `${ref} has no readable record fields.` };
  const tree = fieldTree(entity);
  const assigned = serverAssigned(entity, lifecycle);
  const wholeCopy = (path: string) => inputs.has(path) && ![...inputs].some(other => other.startsWith(`${path}.`));
  let missing = '';
  for (const path of [...requiredFields].sort()) {
    const node = nodeAt(tree, path);
    const parts = path.split('.');
    const ancestors = parts.slice(0, -1).map((_part, index) => parts.slice(0, index + 1).join('.'));
    if (!node || ancestors.some(ancestor => !requiredFields.has(ancestor))) continue;
    if (node.children.size > 0) {
      containers.add(path);
      continue;
    }
    if (missing || assigned.has(path) || inputs.has(path) || ancestors.some(wholeCopy)) continue;
    missing = path;
  }
  return { missing, containers };
}



/**
 * A module-database entity types as optional every field its l4 entity does not require and the
 * server does not assign on create, so a stored record may lack it. Without an l4 entity nothing changes.
 */
async function behaviorDomain(definition: M1Definition, output: string, read: StructureRead): Promise<EmitResult | EmitFailure> {
  const ref = ontologyRef(definition, output);
  const source = await read(ref);
  const enums = ontologyEnums(source);
  if (text(definition.data.storageTarget) !== 'moduleDatabase') return done(emitDomain(definition, output, new Set(), enums));
  if (source === null) return done(emitDomain(definition, output));
  const optional = domainOptionalPaths(definition, source);
  if (!optional) return { code: 'ONTOLOGY_UNREAD', detail: `${ref} has no readable record fields.` };
  return done(emitDomain(definition, output, optional, enums));
}

function updateBody(
  entity: M1Definition,
  entityName: string,
  binding: string,
  keys: readonly (readonly string[])[],
  ruleId: string,
  inputs: ReadonlySet<string>,
  selector: string,
  precondition: string,
  /** v2 (no contract): the stub output type the saved row is returned as. Empty keeps the contract return. */
  returnType = '',
): string {
  const tree = fieldTree(entity);
  const platform = platformRoots(entity);
  const lifecycleField = lifecycleStart(entity).field;
  const writable = [...inputs].filter(path => {
    const node = nodeAt(tree, path);
    const root = path.split('.')[0] ?? '';
    const hasBoundChildren = [...inputs].some(candidate => candidate.startsWith(`${path}.`));
    const identity = path === selector || path === identityField(entity);
    const isPrecondition = precondition && (path === precondition || path.endsWith(`.${precondition}`) || precondition.endsWith(`.${path}`));
    // State changes only through a declared transition.
    const lifecycle = Boolean(lifecycleField) && path === lifecycleField;
    return Boolean(node && !node.derived && !platform.has(root) && !identity && !isPrecondition && !lifecycle
      && (!node.children.size || !hasBoundChildren));
  });
  const versionName = versionField(entity, identityField(entity));
  const compared = versionName && (precondition === versionName || precondition.endsWith(`.${versionName}`)) ? versionName : '';
  const readPath = compared
    ? [
      '  const readPath = (source: unknown, path: string): unknown => {',
      '    let node: unknown = source;',
      '    for (const part of path.split(\'.\')) {',
      '      if (!node || typeof node !== \'object\') return undefined;',
      '      node = (node as Record<string, unknown>)[part];',
      '    }',
      '    return node;',
      '  };',
      `  ${VERSION_MARK}`,
      `  const expectedVersion = Number(readPath(body, ${JSON.stringify(precondition)}));`,
      `  if (Number(current.${compared} ?? 0) !== expectedVersion) throw new AppError('CONCURRENCY_CONFLICT', 'Version is stale.', 409);`,
    ]
    : [];
  const nestedWrites = writable.some(path => path.includes('.'));
  const assigns = writable.map(path => path.includes('.')
    ? `  { const value = readPath(body, ${JSON.stringify(path)}); if (value !== undefined) writePath(next as unknown as Record<string, unknown>, ${JSON.stringify(path)}, value); }`
    : `  if (body.${path} !== undefined) next.${path} = body.${path};`);
  const patchPaths = nestedWrites ? [
    ...(!compared ? [
      '  const readPath = (source: unknown, path: string): unknown => {',
      '    let value: unknown = source;',
      '    for (const part of path.split(\'.\')) value = value && typeof value === \'object\' ? (value as Record<string, unknown>)[part] : undefined;',
      '    return value;',
      '  };',
    ] : []),
    '  const writePath = (source: Record<string, unknown>, path: string, value: unknown): void => {',
    '    const parts = path.split(\'.\');',
    '    let node = source;',
    '    for (let index = 0; index < parts.length - 1; index += 1) {',
    '      const part = parts[index];',
    '      const child = node[part];',
    '      node[part] = child && typeof child === \'object\' && !Array.isArray(child) ? { ...child } : {};',
    '      node = node[part] as Record<string, unknown>;',
    '    }',
    '    node[parts[parts.length - 1]] = value;',
    '  };',
  ] : [];
  const bump = compared ? [`  next.${compared} = Number(current.${compared} ?? 0) + 1;`] : [];
  const checks = keys.map(columns => [
    '  {',
    `    const taken = (await ports.${binding}.list({ ${columns.map(column => `${column}: body.${column}`).join(', ')} })).filter(row => row.${selector} !== current.${selector});`,
    `    ${STORAGE_MARK}`,
    `    if (taken.length > 0) throw new AppError('CONFLICT', 'Unique key already stored.', 409, { ruleId: ${JSON.stringify(ruleId)} });`,
    '  }',
  ].join('\n'));
  return [
    returnType ? '  const body = input;' : `  const body = input as ${entityName};`,
    `  const found = await ports.${binding}.list({ ${selector}: body.${selector} });`,
    '  const current = found[0];',
    '  if (!current) throw new AppError(\'NOT_FOUND\', \'Record not found.\', 404);',
    ...readPath,
    `  const next: ${entityName} = { ...current };`,
    ...patchPaths,
    ...assigns,
    ...bump,
    ...checks,
    returnType ? `  return (await ports.${binding}.update(next)) as ${returnType};` : `  return ports.${binding}.update(next);`,
  ].join('\n');
}

function expandInputType(root: string, type: string): string[] {
  const matches = [...type.matchAll(/([A-Za-z_$][\w$]*)\??\s*:/g)].map(match => `${root}.${match[1]}`);
  return matches.length ? matches : [root];
}

function platformRoots(entity: M1Definition): Set<string> {
  const fields = Array.isArray(entity.data.fields) ? entity.data.fields.filter(isRecord) : [];
  const names = fields
    .filter(field => text(field.owner) === 'platform')
    .map(field => text(field.name).split('.')[0] ?? '')
    .filter(isIdent);
  return new Set(names);
}

interface TransitionPlan {
  flowRule: string;
  payloadRule: string;
  anchorRules: string[];
  from: string[];
  to: string;
  statusField: string;
  payload: string[];
  selector: string;
  transitionId: string;
  versionField: string;
  method: string;
  effects: string[];
  /** Record field an own-scope route grant binds to the caller; `always` when every route is own-scoped. */
  own: { field: string; always: boolean };
}

function transitionBody(entityName: string, binding: string, plan: TransitionPlan, returnType = ''): string {
  const payload = plan.payload.length > 0
    ? [
      '  const filled = (value: unknown): boolean => value !== undefined && value !== null && value !== \'\';',
      '  const readPath = (source: unknown, path: string): unknown => {',
      '    let node: unknown = source;',
      '    for (const part of path.split(\'.\')) {',
      '      if (!node || typeof node !== \'object\') return undefined;',
      '      node = (node as Record<string, unknown>)[part];',
      '    }',
      '    return node;',
      '  };',
      '  const writePath = (source: Record<string, unknown>, path: string, value: unknown): void => {',
      '    const parts = path.split(\'.\');',
      '    let node = source;',
      '    for (let index = 0; index < parts.length - 1; index += 1) {',
      '      const part = parts[index];',
      '      const child = node[part];',
      '      if (!child || typeof child !== \'object\' || Array.isArray(child)) node[part] = {};',
      '      node = node[part] as Record<string, unknown>;',
      '    }',
      '    node[parts[parts.length - 1]] = value;',
      '  };',
    ]
    : [];
  const payloadCheck = plan.payload.length > 0
    ? [
      `  ${PAYLOAD_MARK}`,
      `  if (${plan.payload.map(path => `!filled(readPath(body, ${JSON.stringify(path)}))`).join(' || ')}) throw new AppError('VALIDATION_ERROR', 'Required value is missing.', 400, { ruleId: ${JSON.stringify(plan.payloadRule)} });`,
    ]
    : [];
  const writes = plan.payload.length > 0
    ? plan.payload.map(path => `  writePath(next, ${JSON.stringify(path)}, readPath(body, ${JSON.stringify(path)}));`)
    : [];
  const version = plan.versionField
    ? [`  next[${JSON.stringify(plan.versionField)}] = Number(row[${JSON.stringify(plan.versionField)}] ?? 0) + 1;`]
    : [];
  const effects = plan.effects.length > 0
    ? [`  const undelivered = ${JSON.stringify(plan.effects)} as const;`, '  void undelivered;']
    : [];
  return [
    '  void ctx;',
    ...payload,
    '  const body = input as unknown as Record<string, unknown>;',
    `  const where: Record<string, unknown> = { ${plan.selector}: body[${JSON.stringify(plan.selector)}] };`,
    `  const found = await ports.${binding}.list(where);`,
    '  const current = found[0];',
    '  if (!current) throw new AppError(\'NOT_FOUND\', \'Record not found.\', 404);',
    '  const row = current as unknown as Record<string, unknown>;',
    ...ownCheck(plan.own),
    `  ${LIFECYCLE_MARK}`,
    `  if (!${JSON.stringify(plan.from)}.includes(String(row[${JSON.stringify(plan.statusField)}]))) throw new AppError('VALIDATION_ERROR', 'Transition is not allowed.', 400, { ruleId: ${JSON.stringify(plan.flowRule)} });`,
    ...payloadCheck,
    '  const next: Record<string, unknown> = { ...row };',
    `  next[${JSON.stringify(plan.statusField)}] = ${JSON.stringify(plan.to)};`,
    ...version,
    ...writes,
    ...effects,
    returnType
      ? `  return (await ports.${binding}.${plan.method}(next as unknown as ${entityName}, ${JSON.stringify(plan.transitionId)})) as ${returnType};`
      : `  return ports.${binding}.${plan.method}(next as unknown as ${entityName}, ${JSON.stringify(plan.transitionId)});`,
  ].join('\n');
}

/** The row must belong to the caller the controller bound into the own-scope field. */
function ownCheck(own: { field: string; always: boolean }): string[] {
  if (!own.field) return [];
  const key = JSON.stringify(own.field);
  const foreign = `String(row[${key}] ?? '') === '' || row[${key}] !== body[${key}]`;
  return [
    `  ${OWN_MARK}`,
    `  if (${own.always ? foreign : `${key} in body && (${foreign})`}) throw new AppError('NOT_FOUND', 'Record not found.', 404);`,
  ];
}

/** Own-scope field of the routes that reach this usecase, read from each route grant. */
async function ownScope(
  definition: M1Definition,
  read: StructureRead,
  moduleDefinitions: readonly unknown[],
): Promise<{ field: string; always: boolean } | EmitFailure> {
  const routes = await usecaseRouteGrants(definition, read, moduleDefinitions);
  if ('code' in routes) return routes;
  const fields = new Set<string>();
  let own = 0;
  for (const { route, grant } of routes) {
    if (grant.unread) return { code: 'GRANT_UNREAD', detail: `${route} grant was not read.` };
    if (grant.scopeMode !== 'own') continue;
    own += 1;
    if (grant.recordField) fields.add(grant.recordField);
  }
  if (fields.size > 1) return { code: 'ACCESS_ANCHOR', detail: `${definition.artifactId} routes bind different own-scope fields.` };
  const [field = ''] = [...fields];
  return { field, always: own > 0 && own === routes.length };
}

async function planTransition(
  definition: M1Definition,
  read: StructureRead,
  moduleDefinitions: readonly unknown[],
): Promise<TransitionPlan | EmitFailure> {
  const lifecycle = definition.data.lifecycle;
  const transitionId = isRecord(lifecycle) ? text(lifecycle.transitionId) : '';
  if (!transitionId || !isIdent(transitionId)) {
    return { code: 'TRANSITION_UNDECLARED', detail: `${definition.artifactId} has no transition id.` };
  }
  const entity = await loadEntity(definition, read);
  if ('code' in entity) return entity;
  const spec = transitionSpec(entity, transitionId);
  if (!spec) return { code: 'TRANSITION_UNDECLARED', detail: `${transitionId} is not on the entity lifecycle.` };
  const statusField = enumField(entity);
  const selector = selectorField(definition);
  const method = stringList(definition.data.portCalls).find(isIdent) ?? '';
  if (!statusField || !selector || !method) {
    return { code: 'TRANSITION_UNDECLARED', detail: `${definition.artifactId} is missing a status field, a selector or a port call.` };
  }
  if (!spec.from.every(isIdent) || !isIdent(spec.to) || !spec.ruleRefs.every(isIdent)) {
    return { code: 'TRANSITION_UNDECLARED', detail: `${transitionId} has a lifecycle token that is not an identifier.` };
  }
  const payload = (isRecord(lifecycle) ? stringList(lifecycle.payload) : []).filter(path => path.split('.').every(isIdent));
  const local = ruleRows(definition).filter(row => row.enforcement === 'local' && row.gap === '' && row.ruleId);
  const cited = local.filter(row => spec.ruleRefs.includes(row.ruleId) && invariantsOf(entity).includes(row.ruleId));
  const flowRule = cited.length === 1 ? cited[0].ruleId : '';
  const payloadRule = payloadRuleId(local, flowRule, payload);
  const claimed = new Set([flowRule, payloadRule].filter(Boolean));
  const leftover = local.map(row => row.ruleId).filter(ruleId => !claimed.has(ruleId));
  const anchor = leftover.length > 0 ? await ownScopePending(definition, read, moduleDefinitions) : false;
  if (typeof anchor !== 'boolean') return anchor;
  const own = await ownScope(definition, read, moduleDefinitions);
  if ('code' in own) return own;
  return {
    flowRule,
    payloadRule,
    anchorRules: anchor ? leftover : [],
    from: spec.from,
    to: spec.to,
    statusField,
    payload,
    selector,
    transitionId,
    versionField: versionField(entity, identityField(entity)),
    method,
    effects: effectIds(definition),
    own,
  };
}

function payloadRuleId(local: readonly RuleRow[], flowRule: string, payload: readonly string[]): string {
  if (payload.length === 0) return '';
  const tails = payload.map(path => path.split('.').pop() ?? '').filter(tail => tail.length >= 4);
  const matched = local
    .map(row => row.ruleId)
    .filter(ruleId => ruleId !== flowRule && tails.some(tail => ruleId.toLowerCase().includes(tail.toLowerCase())));
  return matched.length === 1 ? matched[0] : '';
}

async function ownScopePending(
  definition: M1Definition,
  read: StructureRead,
  moduleDefinitions: readonly unknown[],
): Promise<boolean | EmitFailure> {
  const routes = await usecaseRouteGrants(definition, read, moduleDefinitions);
  if ('code' in routes) return routes;
  if (routes.length === 0) return { code: 'GRANT_UNREAD', detail: `${definition.artifactId} has no route.` };
  let saw = false;
  for (const { route, grant: pending } of routes) {
    if (pending.unread) return { code: 'GRANT_UNREAD', detail: `${route} grant was not read.` };
    if (pending.scopeMode === 'own' && pending.pending === 'ACCESS_ANCHOR') saw = true;
  }
  return saw;
}

function transitionSpec(entity: M1Definition, transitionId: string): { from: string[]; to: string; ruleRefs: string[] } | null {
  const lifecycle = entity.data.lifecycle;
  if (!isRecord(lifecycle) || !Array.isArray(lifecycle.transitions)) return null;
  const found = lifecycle.transitions.find(item => isRecord(item) && text(item.transitionId) === transitionId);
  if (!isRecord(found)) return null;
  const from = stringList(found.from);
  const to = text(found.to);
  if (from.length === 0 || !to) return null;
  return { from, to, ruleRefs: stringList(found.ruleRefs) };
}

function effectIds(definition: M1Definition): string[] {
  if (!Array.isArray(definition.data.effects)) return [];
  return definition.data.effects.filter(isRecord).map(item => text(item.eventId)).filter(isIdent);
}

export function contractRoutes(definition: M1Definition): string[] {
  const functions = definition.data.functions;
  if (!Array.isArray(functions) || !isRecord(functions[0]) || !Array.isArray(functions[0].contractRefs)) return [];
  return functions[0].contractRefs.filter(isRecord).map(item => text(item.route)).filter(Boolean);
}

function selectorField(definition: M1Definition): string {
  if (!Array.isArray(definition.data.uses)) return '';
  const found = definition.data.uses.find(item => isRecord(item) && text(item.role) === 'selector' && text(item.source) === 'input');
  const path = isRecord(found) ? text(found.path) : '';
  return isIdent(path) ? path : '';
}









function invariantsOf(entity: M1Definition): string[] {
  return stringList(entity.data.invariants);
}

function listBody(entity: M1Definition, entityName: string, binding: string, inputs: ReadonlySet<string>, page = false): string {
  const names = [...inputs].filter(name => nodeAt(fieldTree(entity), name));
  const filters = names.map(name => name.includes('.')
    ? `  if (filled(readPath(body, ${JSON.stringify(name)}))) writePath(where, ${JSON.stringify(name)}, readPath(body, ${JSON.stringify(name)}));`
    : `  if (filled(body.${name})) where.${name} = body.${name};`);
  const tail = page
    ? [
      `  const found = await ports.${binding}.list(where);`,
      '  const size = Number(input.pageSize);',
      '  const start = Number(input.page) * size;',
      '  const items = Number.isFinite(size) && size > 0 ? found.slice(start, start + size) : found;',
      '  return { items, hasMore: Number.isFinite(size) && size > 0 ? start + size < found.length : false };',
    ]
    : [
      `  const found = await ports.${binding}.list(where);`,
      '  return found;',
    ];
  return [
    '  const filled = (value: unknown): boolean => value !== undefined && value !== null && value !== \'\';',
    ...(names.some(name => name.includes('.')) ? [
      '  const readPath = (source: unknown, path: string): unknown => { let value: unknown = source; for (const part of path.split(\'.\')) value = value && typeof value === \'object\' ? (value as Record<string, unknown>)[part] : undefined; return value; };',
      '  const writePath = (source: Record<string, unknown>, path: string, value: unknown): void => { const parts = path.split(\'.\'); let node = source; for (const part of parts.slice(0, -1)) node = (node[part] ??= {}) as Record<string, unknown>; node[parts[parts.length - 1]] = value; };',
    ] : []),
    page ? '  const body = input;' : `  const body = input as ${entityName};`,
    '  const where: Record<string, unknown> = {};',
    ...filters,
    ...tail,
  ].join('\n');
}

/**
 * Input paths of a usecase that has no contract. Names are the usecase signature, the same
 * fields the structure interface lists. `required` and `nullable` are the entity field's
 * (then the signature field's): a field neither side marks optional is required, and the
 * structure signature therefore has no `?`. Nothing here is read from a route name.
 */
/**
 * Paths of a v2 usecase signature. A field is optional exactly when the domain types it with `?`
 * (`domainOptionalPaths`: the l4 entity `required` and the server assignments). With an unreadable l4
 * entity the domain unit itself is refused (`ONTOLOGY_UNREAD`), so the set here is empty.
 */
function signaturePaths(
  definition: M1Definition,
  entity: M1Definition,
  domainOptional: ReadonlySet<string>,
): { allowedInputPaths: string[]; requiredInputPaths: string[]; nullableInputPaths: string[] } {
  const functions = definition.data.functions;
  const fn = Array.isArray(functions) && isRecord(functions[0]) ? functions[0] : {};
  const inputs = Array.isArray(fn.input) ? fn.input.filter(isRecord) : [];
  const optionalNames = optionalSignatureNames(inputs, text(entity.data.entityId), domainOptional);
  const entityFields = new Map<string, Record<string, unknown>>();
  if (Array.isArray(entity.data.fields)) {
    for (const field of entity.data.fields.filter(isRecord)) {
      const name = text(field.name);
      if (name) entityFields.set(name, field);
    }
  }
  const allowedInputPaths: string[] = [];
  const requiredInputPaths: string[] = [];
  const nullableInputPaths: string[] = [];
  for (const field of inputs) {
    const name = text(field.name);
    if (!name || !name.split('.').every(isIdent)) continue;
    const entityField = entityFields.get(name);
    allowedInputPaths.push(name);
    if (!optionalNames.has(name)) requiredInputPaths.push(name);
    const declared = text(entityField?.type) || text(field.type);
    if (entityField?.nullable === true || field.nullable === true || /\bnull\b/.test(declared)) nullableInputPaths.push(name);
  }
  return { allowedInputPaths, requiredInputPaths, nullableInputPaths };
}

function outputNames(definition: M1Definition): string[] {
  const functions = definition.data.functions;
  if (!Array.isArray(functions) || !isRecord(functions[0]) || !Array.isArray(functions[0].output)) return [];
  return functions[0].output.filter(isRecord).map(field => text(field.name)).filter(name => name.split('.').every(isIdent));
}

async function resolvePageListInputs(definition: M1Definition, read: StructureRead): Promise<string[]> {
  const route = firstFunction(definition)?.contractRefs.find(item => item.symbol.endsWith('Output'))?.route;
  const pageDef = definition.dependencies.filter(ref => ref.endsWith('/web.defs.ts')).map(async ref => ({ loaded: await loadDefinition(ref, read) }));
  const pages = await Promise.all(pageDef);
  for (const { loaded } of pages) {
    if ('code' in loaded || !Array.isArray(loaded.data.operationBindings)) continue;
    const binding = loaded.data.operationBindings.filter(isRecord).find(item => text(item.route) === route && text(item.operation) === 'list');
    if (!binding || !Array.isArray(binding.inputFields)) continue;
    return binding.inputFields.filter(isRecord).map(item => text(item.path)).filter(Boolean);
  }
  // Older snapshots have no operation bindings; fall back to structurally
  // disclosed indexed fields while keeping filters optional.
  const entity = await loadEntity(definition, read);
  if ('code' in entity) return [];
  const tree = fieldTree(entity);
  const ontologyRef = definition.dependencies.find(ref => ref.includes('/ontology/'));
  const ontology = ontologyRef ? await loadDefinition(ontologyRef, read) : null;
  const indexed = new Set<string>();
  if (ontology && !('code' in ontology)) {
    for (const [field, metadata] of Object.entries(isRecord(ontology.data.indexes) ? ontology.data.indexes : {})) {
      if (metadata === true || isRecord(metadata) && metadata.indexed === true) indexed.add(field);
    }
    if (Array.isArray(ontology.data.fields)) for (const row of ontology.data.fields.filter(isRecord)) {
      if (row.indexed === true) indexed.add(text(row.name));
    }
  }
  return [...indexed].filter(path => nodeAt(tree, path));
}

function inputNames(definition: M1Definition): string[] {
  const functions = definition.data.functions;
  if (!Array.isArray(functions) || !isRecord(functions[0]) || !Array.isArray(functions[0].input)) return [];
  return functions[0].input.filter(isRecord).map(field => text(field.name)).filter(Boolean);
}

async function resolveContract(
  definition: M1Definition,
  fn: { contractRefs: { route: string; symbol: string }[] },
  read: StructureRead,
  route = '',
): Promise<{ allowedInputPaths: string[]; requiredInputPaths: string[]; nullableInputPaths: string[] } | EmitFailure> {
  const outputRef = fn.contractRefs.find(item => item.symbol.endsWith('Output') && (!route || item.route === route))
    ?? fn.contractRefs.find(item => item.symbol.endsWith('Output'));
  if (!outputRef) return { code: 'CONTRACT_UNREAD', detail: `${definition.artifactId} has no output contract.` };
  const projections = Array.isArray(definition.data.routeProjections) ? definition.data.routeProjections.filter(isRecord) : [];
  const projection = projections.find(item => text(item.route) === outputRef.route);
  const contractPath = text(projection?.contractPath);
  let dependency = contractPath
    ? definition.dependencies.find(path => path === contractPath || path.endsWith(`/${contractPath}`)) ?? ''
    : '';
  if (!dependency) {
    const page = outputRef.route.split('.')[1] ?? '';
    dependency = definition.dependencies.find(path => page && path.endsWith(`/${page}.defs.ts`)) ?? '';
  }
  if (!dependency) return { code: 'CONTRACT_UNREAD', detail: `${outputRef.route} is not a dependency.` };
  const source = await read(dependency);
  if (source === null) return { code: 'CONTRACT_UNREAD', detail: `${dependency} could not be read.` };
  const inputType = outputRef.symbol.replace(/Output$/, 'Input');
  if (!source.includes(`export interface ${inputType} `) && !source.includes(`export interface ${inputType}{`)
    || !source.includes(outputRef.symbol)) return { code: 'CONTRACT_SYMBOL', detail: `${dependency} does not export ${inputType}.` };
  const members = readContractMembers(source, inputType);
  if (!members) return { code: 'CONTRACT_SYMBOL', detail: `${inputType} could not be read.` };
  const declared = contractMembers(source, inputType);
  return { allowedInputPaths: members.allowedPaths, requiredInputPaths: declared?.requiredFields ?? [], nullableInputPaths: contractNullablePaths(source, inputType) ?? [] };
}

function readContractMembers(source: string, name: string): { allowedPaths: string[] } | null {
  const start = source.indexOf(`export interface ${name}`);
  if (start < 0) return null;
  const open = source.indexOf('{', start);
  if (open < 0) return null;
  let depth = 1;
  let end = open + 1;
  for (; end < source.length && depth > 0; end++) {
    if (source[end] === '{') depth++;
    else if (source[end] === '}') depth--;
  }
  if (depth !== 0) return null;
  const body = source.slice(open + 1, end - 1);
  const allowedPaths: string[] = [];
  const addMembers = (text: string, prefix = '') => {
    for (const line of text.split(/[;\n,]/)) {
      const match = line.trim().match(/^([A-Za-z_$][\w$]*)(\?)?\s*:\s*(.+)$/);
      if (!match) continue;
      const path = prefix ? `${prefix}.${match[1]}` : match[1];
      allowedPaths.push(path);
      const nested = match[3].match(/^\{([\s\S]*)\}$/);
      if (nested) addMembers(nested[1], path);
    }
  };
  addMembers(body);
  return { allowedPaths: [...new Set([...allowedPaths, ...(contractMembers(source, name)?.allowedPaths ?? [])])] };
}

function firstFunction(definition: M1Definition): { name: string; contractRefs: { route: string; symbol: string }[] } | null {
  const functions = definition.data.functions;
  if (!Array.isArray(functions) || !isRecord(functions[0])) return null;
  const fn = functions[0];
  const name = text(fn.functionName);
  if (!name) return null;
  const contractRefs = Array.isArray(fn.contractRefs) ? fn.contractRefs.filter(isRecord).map(item => ({
    route: text(item.route),
    symbol: text(item.symbol),
  })).filter(item => item.route && item.symbol) : [];
  return { name, contractRefs };
}

async function loadEntity(definition: M1Definition, read: StructureRead): Promise<M1Definition | EmitFailure> {
  const dep = definition.dependencies.find(path => path.includes('/entities/'));
  if (!dep) return { code: 'ENTITY_UNBOUND', detail: `${definition.artifactId} has no entity dependency.` };
  const loaded = await loadDefinition(dep, read);
  if ('code' in loaded) return loaded;
  return loaded;
}

async function readUniqueKeys(definition: M1Definition, read: StructureRead): Promise<string[][] | EmitFailure> {
  const row = ruleRows(definition).find(isStorageRow);
  if (!row) return [];
  const originPath = row.origin.split('#')[0] ?? '';
  const dep = definition.dependencies.find(path => path === originPath || path.endsWith(`/${originPath}`));
  if (!dep) return { code: 'UNIQUE_KEYS_UNREAD', detail: `${originPath || row.origin} is not a dependency.` };
  const text = await read(dep);
  if (text === null) return { code: 'UNIQUE_KEYS_UNREAD', detail: `${dep} could not be read.` };
  const keys = uniqueKeysFrom(text);
  if (!keys || keys.length === 0 || keys.some(columns => columns.length === 0 || columns.some(column => !isIdent(column)))) {
    return { code: 'UNIQUE_KEYS_UNREAD', detail: `${dep} has no usable unique keys.` };
  }
  return keys;
}

function uniqueKeysFrom(source: string): string[][] | null {
  const parsed = parseDefinitionSource(source);
  if ('definition' in parsed) {
    const definition = readDefinition(parsed.definition);
    if (!('issues' in definition)) {
      const keys = normalizeKeys(definition.data.uniqueKeys);
      if (keys.length > 0) return keys;
    }
  }
  const at = source.indexOf('"uniqueKeys"');
  if (at < 0) return null;
  const start = source.indexOf('[', at);
  if (start < 0) return null;
  const end = matchBracket(source, start);
  if (end < 0) return null;
  try {
    return normalizeKeys(JSON.parse(source.slice(start, end + 1)));
  } catch {
    return null;
  }
}

function normalizeKeys(value: unknown): string[][] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(Array.isArray)
    .map(columns => columns.filter((item): item is string => typeof item === 'string' && item.length > 0));
}

function constraintRuleId(definition: M1Definition): string {
  const pending = ruleRows(definition).filter(row => row.enforcement === 'pending' && row.gap === 'RULE_UNBOUND' && row.ruleId);
  return pending.length === 1 ? pending[0].ruleId : '';
}

async function grantPending(
  definition: M1Definition,
  defPath: string,
  routine: string,
  read: StructureRead,
): Promise<GrantFacts> {
  const page = routine.split('.')[1] ?? '';
  const project = /^_(\d+)_/.exec(defPath)?.[1] ?? '';
  const moduleName = definition.moduleName;
  if (!page || !project || !moduleName) return { pending: '', scopeMode: '', unread: true, recordField: '' };
  const controllerRef = `_${project}_/l1/${moduleName}/layer_1_external/adapters/http/controllers/${page}.defs.ts`;
  const controller = await loadDefinition(controllerRef, read);
  if ('code' in controller) return { pending: '', scopeMode: '', unread: true, recordField: '' };
  const handlers = Array.isArray(controller.data.handlers) ? controller.data.handlers.filter(isRecord) : [];
  const handler = handlers.find(entry => entry.route === routine);
  const grantIds = handler ? stringList(handler.grantIds) : [];
  if (!handler || grantIds.length === 0) return { pending: '', scopeMode: '', unread: true, recordField: '' };
  const scopeDep = controller.dependencies.find(path => path.endsWith('/accessScope.defs.ts'));
  if (!scopeDep) return { pending: '', scopeMode: '', unread: true, recordField: '' };
  const scope = await loadDefinition(scopeDep, read);
  if ('code' in scope) return { pending: '', scopeMode: '', unread: true, recordField: '' };
  const grants = Array.isArray(scope.data.grants) ? scope.data.grants.filter(isRecord) : [];
  const matched = grants.filter(grant => grantIds.includes(text(grant.grantId)));
  if (matched.length !== grantIds.length) return { pending: '', scopeMode: '', unread: true, recordField: '' };
  return grantFacts(matched);
}

/** Pending gap, scope mode and own-scope record field of the grants matched for one route (v1 and v2). */
function grantFacts(matched: readonly Record<string, unknown>[]): GrantFacts {
  let pending = matched.map(grant => text(grant.pending)).find(Boolean) ?? '';
  const scopeMode = text(matched.find(grant => text(grant.pending) === pending)?.scopeMode);
  const field = matched.length === 1 ? recordFieldFromGrant(matched[0]) : '';
  if (!pending && scopeMode === 'own' && !field) pending = 'ACCESS_ANCHOR';
  return { pending, scopeMode, unread: false, recordField: scopeMode === 'own' && !pending ? field : '' };
}

type GrantFacts = { pending: string; scopeMode: string; unread: boolean; recordField: string };

/**
 * Routes that reach a usecase, with the grant facts of each. v1 (the usecase cites contracts): its
 * `contractRefs` routes, read on the page controller. v2: the `requests[]` of the module's request
 * services that name the usecase in `uses`, kept when a v2 controller exposes the route; the grants
 * are that handler's `grantIds` on the access scope (`exposedRouteGrants`). A route no controller
 * names is not exposed and is left out. A route with no grant, or a grant id the scope does not
 * declare, is unread: it fails closed.
 */
async function usecaseRouteGrants(
  definition: M1Definition,
  read: StructureRead,
  moduleDefinitions: readonly unknown[],
): Promise<Array<{ route: string; grant: GrantFacts }> | EmitFailure> {
  const v1 = contractRoutes(definition);
  if (v1.length > 0) {
    const routes: Array<{ route: string; grant: GrantFacts }> = [];
    for (const route of v1) routes.push({ route, grant: await grantPending(definition, definition.dependencies[0] ?? '', route, read) });
    return routes;
  }
  const v2 = usecaseRoutes(definition, moduleDefinitions);
  if ('code' in v2) return v2;
  const exposed = exposedRouteGrants(moduleDefinitions);
  if ('code' in exposed) return exposed;
  const unread: GrantFacts = { pending: '', scopeMode: '', unread: true, recordField: '' };
  const routes: Array<{ route: string; grant: GrantFacts }> = [];
  for (const route of v2) {
    const grants = exposed.get(route);
    if (!grants) continue;
    const declared = grants.length > 0 && grants.every(grant => text(grant.grantId) !== '');
    routes.push({ route, grant: declared ? grantFacts(grants) : unread });
  }
  return routes;
}

/**
 * Routes of a usecase. v1 (the usecase cites contracts): its `contractRefs` routes. v2: the
 * `requests[].route` of the module's request services that name the usecase in `uses`. A v2 usecase
 * read without the module defs has no source for its routes: `MODULE_DEFS_UNREAD`, never an empty list.
 */
export function usecaseRoutes(definition: M1Definition, moduleDefinitions: readonly unknown[]): string[] | EmitFailure {
  const v1 = contractRoutes(definition);
  if (v1.length > 0) return v1;
  if (moduleDefinitions.length === 0) {
    return { code: 'MODULE_DEFS_UNREAD', detail: `${definition.artifactId} has no contract routes and the module defs were not loaded.` };
  }
  const routes = new Set<string>();
  for (const value of moduleDefinitions) {
    const service = readDefinition(value);
    if ('issues' in service || service.artifactType !== 'requestService') continue;
    const requests = Array.isArray(service.data.requests) ? service.data.requests.filter(isRecord) : [];
    for (const request of requests) {
      const route = text(request.route);
      if (route && stringList(request.uses).includes(definition.artifactId)) routes.add(route);
    }
  }
  return [...routes];
}

/** Grant facts of one case route: v1 by the page controller (as before); v2 by the usecase's exposed routes. */
async function caseRouteGrant(
  definition: M1Definition,
  defPath: string,
  routine: string,
  read: StructureRead,
  moduleDefinitions: readonly unknown[],
): Promise<GrantFacts> {
  if (contractRoutes(definition).length > 0) return grantPending(definition, defPath, routine, read);
  const routes = await usecaseRouteGrants(definition, read, moduleDefinitions);
  const found = 'code' in routes ? undefined : routes.find(item => item.route === routine);
  return found ? found.grant : { pending: '', scopeMode: '', unread: true, recordField: '' };
}

async function loadDefinition(ref: string, read: StructureRead): Promise<M1Definition | EmitFailure> {
  const text = await read(ref);
  if (text === null) return { code: 'DEFINITION', detail: `${ref} could not be read.` };
  const parsed = parseDefinitionSource(text);
  if (!('definition' in parsed)) return { code: 'DEFINITION', detail: parsed.issues.join(' ') };
  const definition = readDefinition(parsed.definition);
  if ('issues' in definition) return { code: 'DEFINITION', detail: `${ref} ${definition.issues.join(' ')}` };
  return definition;
}

function ruleRows(definition: M1Definition): RuleRow[] {
  if (!Array.isArray(definition.data.rulePlan)) return [];
  return definition.data.rulePlan.filter(isRecord).map(row => ({
    ruleId: text(row.ruleId),
    origin: text(row.origin),
    consumer: text(row.consumer),
    enforcement: text(row.enforcement),
    gap: text(row.gap),
  }));
}

function isStorageRow(row: RuleRow): boolean {
  return row.ruleId === ''
    && row.enforcement === 'local'
    && row.gap === ''
    && row.consumer.startsWith('operation:')
    && (row.origin.endsWith('#uniqueKeys') || row.origin.endsWith('#capabilities.uniqueKey'));
}

function fieldTree(definition: M1Definition): FieldNode {
  const root: FieldNode = { name: '', path: '', type: 'object', derived: false, children: new Map() };
  const fields = Array.isArray(definition.data.fields) ? definition.data.fields.filter(isRecord) : [];
  for (const field of fields) {
    const path = text(field.name);
    const parts = path.split('.').filter(Boolean);
    if (parts.length === 0) continue;
    let node = root;
    parts.forEach((part, index) => {
      let child = node.children.get(part);
      if (!child) {
        child = { name: part, path: parts.slice(0, index + 1).join('.'), type: 'string', derived: false, children: new Map() };
        node.children.set(part, child);
      }
      if (index === parts.length - 1) {
        child.type = text(field.type) || 'string';
        child.derived = field.derived === true;
      }
      node = child;
    });
  }
  return root;
}

function nodeAt(root: FieldNode, path: string): FieldNode | undefined {
  let node: FieldNode | undefined = root;
  for (const part of path.split('.').filter(Boolean)) node = node?.children.get(part);
  return node;
}



/** The output type the structure stub declares for the usecase (`Promise<T>`). */
function stubReturnType(source: string): string {
  return /: Promise<([^>]+)>/.exec(source)?.[1] ?? 'unknown';
}

function done(result: EmitResult): EmitResult {
  return { ...result, runsStub: false, source: finish(result.source) };
}

function finish(source: string): string {
  return source.endsWith('\n') ? source : `${source}\n`;
}

function matchBracket(source: string, start: number): number {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function camel(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function isIdent(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
}
