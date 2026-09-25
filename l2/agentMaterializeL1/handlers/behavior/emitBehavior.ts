/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.ts" enhancement="_blank"/>

/**
 * Replaces a structure stub with behavior derived from the defs.
 * Create and list copy the operation, the port and the entity fields.
 * A transition copies lifecycle from/to, the selector and the payload paths.
 * A local storage row is the unique-key check. A payload path is required
 * when one local rule names that path. A leftover local rule is not emitted
 * when the route grant is an unresolved own-scope: that case stays blocked.
 * A pending rule row is not emitted. Events stay in a declared list and are
 * not published. A duplicate slot in this store is not a PostgreSQL atomic
 * constraint. A version the contract does not declare is not invented.
 */

import {
  isRecord,
  parseDefinitionSource,
  readDefinition,
  type M1Definition,
} from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import {
  auditImports,
  emitAccess,
  emitAuthority,
  emitDomain,
  emitPort,
  emitUsecase,
  importSpecifier,
  type EmitFailure,
  type EmitResult,
  type StructureRead,
} from '/_102021_/l2/agentMaterializeL1/handlers/structure/emit.js';

const MEMORY_RUNTIME = '/_102034_/l1/server/layer_1_external/data/moduleDataRuntime.js';
const PLATFORM_CONTRACTS = '/_102034_/l1/server/layer_2_controllers/contracts.js';
const DERIVED_OPERATIONS = new Set(['create', 'list', 'get', 'read']);
const BLOCKING_RULE_GAPS = new Set(['APPLICABILITY_UNDECLARED']);

const GAP_OWNER: Record<string, string> = {
  ACCESS_ANCHOR: 'x1_04/ns5_69',
  APPLICABILITY_UNDECLARED: 'toPlanner_aplicabilidade_leitura_x_transicao',
  PRECONDITION_UNDECLARED: 'x1_05',
};

export const STORAGE_MARK = '// enforce:storage';
export const PAYLOAD_MARK = '// enforce:payload';
const LIFECYCLE_MARK = '// enforce:lifecycle';

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

export function behaviorNeedsLlm(definition: M1Definition): boolean {
  if (definition.artifactType !== 'usecase') return false;
  const operation = text(definition.data.operation);
  if (operation === 'transition') {
    if (stringList(definition.data.ports).length !== 1) return true;
    const lifecycle = definition.data.lifecycle;
    return !isRecord(lifecycle) || !text(lifecycle.transitionId);
  }
  if (!DERIVED_OPERATIONS.has(operation)) return true;
  if (stringList(definition.data.ports).length !== 1) return true;
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

export async function caseBlock(
  definition: M1Definition,
  defPath: string,
  item: { routine: string; expect: { ruleId: string | null } },
  read: StructureRead,
): Promise<CaseBlock | null> {
  const ruleId = item.expect.ruleId ?? '';
  const rule = ruleRows(definition).find(row => ruleId && row.ruleId === ruleId && row.enforcement === 'pending' && BLOCKING_RULE_GAPS.has(row.gap));
  if (rule) return { gap: rule.gap, owner: GAP_OWNER[rule.gap] ?? rule.gap, ruleId: rule.ruleId, unread: false };
  if (ruleId && !ruleRows(definition).some(row => row.ruleId === ruleId)) {
    return { gap: 'PRECONDITION_UNDECLARED', owner: GAP_OWNER.PRECONDITION_UNDECLARED, ruleId, unread: false };
  }
  if (text(definition.data.operation) === 'transition' && ruleId) {
    const plan = await planTransition(definition, read);
    if (!('code' in plan) && plan.anchorRules.includes(ruleId)) {
      return { gap: 'ACCESS_ANCHOR', owner: GAP_OWNER.ACCESS_ANCHOR, ruleId, unread: false };
    }
    if (!('code' in plan) && (ruleId === plan.flowRule || ruleId === plan.payloadRule)) return null;
  }
  if (!item.routine) return null;
  const grant = await grantPending(definition, defPath, item.routine, read);
  if (grant.unread) return { gap: 'GRANT_UNREAD', owner: '', ruleId: '', unread: true };
  if (!grant.pending) return null;
  return { gap: grant.pending, owner: GAP_OWNER[grant.pending] ?? grant.pending, ruleId: '', unread: false };
}

/** A lifecycle or payload rule is proved by calling the usecase, not the route. */
export async function ruleRunsOnUsecase(
  definition: M1Definition,
  ruleId: string,
  read: StructureRead,
): Promise<boolean> {
  if (text(definition.data.operation) !== 'transition' || !ruleId) return false;
  const plan = await planTransition(definition, read);
  if ('code' in plan) return false;
  return ruleId === plan.flowRule || ruleId === plan.payloadRule;
}

export async function emitBehavior(
  id: string,
  definition: M1Definition,
  output: string,
  read: StructureRead,
): Promise<EmitResult | EmitFailure> {
  if (id === 'implement.domainEntity') return done(emitDomain(definition, output));
  if (id === 'implement.authorityMap') return done(emitAuthority(definition, output));
  if (id === 'implement.accessScope') return behaviorAccess(definition, output);
  if (id === 'implement.repositoryPort') return memoryPort(definition, output, read);
  if (id === 'implement.usecase') return memoryUsecase(definition, output, read);
  return { code: 'NO_NAMED_HANDLER', detail: `${id} is not a behavior body.` };
}

async function memoryUsecase(definition: M1Definition, output: string, read: StructureRead): Promise<EmitResult | EmitFailure> {
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
  const keys = operation === 'create' ? await readUniqueKeys(definition, read) : [];
  if ('code' in keys) return keys;
  const ruleId = constraintRuleId(definition);
  if (keys.length > 0 && !ruleId) {
    return { code: 'UNIQUE_RULE_UNNAMED', detail: `${definition.artifactId} enforces a storage constraint with no rule id.` };
  }
  const inputs = new Set(inputNames(definition));
  const transition = operation === 'transition' ? await planTransition(definition, read) : null;
  if (transition && 'code' in transition) return transition;
  const body = operation === 'create'
    ? createBody(entity, entityName, camel(portName), keys, ruleId, inputs)
    : transition
      ? transitionBody(entityName, camel(portName), transition)
      : listBody(entity, entityName, camel(portName), inputs);
  const replaced = stub.source.replace(
    /void input;\n  void ctx;\n(?:  void ports;\n)?  throw new AppError\('USECASE_NOT_IMPLEMENTED'[\s\S]*?\);/,
    body,
  );
  if (replaced === stub.source) return { code: 'STUB_SHAPE', detail: `${definition.artifactId} stub body was not recognized.` };
  const entityImport = importSpecifier(entityDep, 'output');
  const source = replaced.replace(
    `import { AppError } from '${PLATFORM_CONTRACTS}';`,
    `import { AppError } from '${PLATFORM_CONTRACTS}';\nimport type { ${entityName} } from '${entityImport}';`,
  );
  const imports = [...stub.imports, entityImport];
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
  const source = saved.replace('export const pending', `${storeSource(entity)}\nexport const pending`);
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

function storeSource(entity: string): string {
  return [
    `let rows = createMemoryTableRepository<${entity}>([]);`,
    'function table() { return rows; }',
    `export function resetMemory(seed: ${entity}[] = []): void {`,
    '  rows = createMemoryTableRepository(seed.map(row => ({ ...row })));',
    '}',
    '',
  ].join('\n');
}

function createBody(
  entity: M1Definition,
  entityName: string,
  binding: string,
  keys: readonly (readonly string[])[],
  ruleId: string,
  inputs: ReadonlySet<string>,
): string {
  const tree = fieldTree(entity);
  const fields = [...tree.children].map(([name, node]) => `    ${name}: ${literalFor(node, inputs, statesOf(entity))},`);
  const checks = keys.map(columns => [
    '  {',
    `    const taken = await ports.${binding}.list({ ${columns.map(column => `${column}: body.${column}`).join(', ')} });`,
    `    ${STORAGE_MARK}`,
    `    if (taken.length > 0) throw new AppError('CONFLICT', 'Unique key already stored.', 409, { ruleId: ${JSON.stringify(ruleId)} });`,
    '  }',
  ].join('\n'));
  return [
    `  const body = input as ${entityName};`,
    `  const record: ${entityName} = {`,
    ...fields,
    '  };',
    ...checks,
    `  return ports.${binding}.create(record);`,
  ].join('\n');
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
}

function transitionBody(entityName: string, binding: string, plan: TransitionPlan): string {
  const payload = plan.payload.length > 0 && plan.payloadRule
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
  const payloadCheck = plan.payload.length > 0 && plan.payloadRule
    ? [
      `  ${PAYLOAD_MARK}`,
      `  if (${plan.payload.map(path => `!filled(readPath(body, ${JSON.stringify(path)}))`).join(' || ')}) throw new AppError('VALIDATION_ERROR', 'Required value is missing.', 400, { ruleId: ${JSON.stringify(plan.payloadRule)} });`,
    ]
    : [];
  const writes = plan.payload.length > 0 && plan.payloadRule
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
    `  ${LIFECYCLE_MARK}`,
    `  if (!${JSON.stringify(plan.from)}.includes(String(row[${JSON.stringify(plan.statusField)}]))) throw new AppError('VALIDATION_ERROR', 'Transition is not allowed.', 400, { ruleId: ${JSON.stringify(plan.flowRule)} });`,
    ...payloadCheck,
    '  const next: Record<string, unknown> = { ...row };',
    `  next[${JSON.stringify(plan.statusField)}] = ${JSON.stringify(plan.to)};`,
    ...version,
    ...writes,
    ...effects,
    `  return ports.${binding}.${plan.method}(next as unknown as ${entityName}, ${JSON.stringify(plan.transitionId)});`,
  ].join('\n');
}

async function planTransition(definition: M1Definition, read: StructureRead): Promise<TransitionPlan | EmitFailure> {
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
  const flow = local.filter(row => spec.ruleRefs.includes(row.ruleId) && invariantsOf(entity).includes(row.ruleId));
  if (flow.length !== 1) return { code: 'TRANSITION_UNDECLARED', detail: `${transitionId} does not name one lifecycle rule.` };
  const payloadRule = payloadRuleId(local, flow[0].ruleId, payload);
  if (payload.length > 0 && !payloadRule) {
    return { code: 'RULE_UNCLASSIFIED', detail: `${definition.artifactId} has a payload and no single local rule for it.` };
  }
  const claimed = new Set([flow[0].ruleId, payloadRule].filter(Boolean));
  const leftover = local.map(row => row.ruleId).filter(ruleId => !claimed.has(ruleId));
  const anchor = leftover.length > 0 ? await ownScopePending(definition, read) : false;
  if (typeof anchor !== 'boolean') return anchor;
  if (leftover.length > 0 && !anchor) {
    return { code: 'RULE_UNCLASSIFIED', detail: `${definition.artifactId} has a local rule that is not a lifecycle or payload check.` };
  }
  return {
    flowRule: flow[0].ruleId,
    payloadRule,
    anchorRules: anchor ? leftover : [],
    from: spec.from,
    to: spec.to,
    statusField,
    payload: payloadRule ? payload : [],
    selector,
    transitionId,
    versionField: versionField(entity, identityField(entity)),
    method,
    effects: effectIds(definition),
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

async function ownScopePending(definition: M1Definition, read: StructureRead): Promise<boolean | EmitFailure> {
  const routes = contractRoutes(definition);
  if (routes.length === 0) return { code: 'GRANT_UNREAD', detail: `${definition.artifactId} has no route.` };
  let saw = false;
  for (const route of routes) {
    const pending = await grantPending(definition, definition.dependencies[0] ?? '', route, read);
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

function contractRoutes(definition: M1Definition): string[] {
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

function identityField(entity: M1Definition): string {
  const fields = topFields(entity);
  const uuid = fields.find(field => field.derived && field.type === 'uuid');
  if (uuid && isIdent(uuid.name)) return uuid.name;
  const derived = fields.find(field => field.derived);
  return derived && isIdent(derived.name) ? derived.name : '';
}

function enumField(entity: M1Definition): string {
  const fields = topFields(entity).filter(field => field.type === 'enum');
  return fields.length === 1 && isIdent(fields[0].name) ? fields[0].name : '';
}

function versionField(entity: M1Definition, identity: string): string {
  const fields = topFields(entity).filter(field => field.derived && field.name !== identity && (field.type === 'integer' || field.type === 'number'));
  return fields.length === 1 && isIdent(fields[0].name) ? fields[0].name : '';
}

function topFields(entity: M1Definition): Array<{ name: string; type: string; derived: boolean }> {
  const fields = Array.isArray(entity.data.fields) ? entity.data.fields.filter(isRecord) : [];
  return fields
    .map(field => ({ name: text(field.name), type: text(field.type), derived: field.derived === true }))
    .filter(field => field.name && !field.name.includes('.'));
}

function invariantsOf(entity: M1Definition): string[] {
  return stringList(entity.data.invariants);
}

function listBody(entity: M1Definition, entityName: string, binding: string, inputs: ReadonlySet<string>): string {
  const names = [...inputs].filter(name => fieldTree(entity).children.has(name));
  const filters = names.map(name => `  if (filled(body.${name})) where.${name} = body.${name};`);
  return [
    '  const filled = (value: unknown): boolean => value !== undefined && value !== null && value !== \'\';',
    `  const body = input as ${entityName};`,
    '  const where: Record<string, unknown> = {};',
    ...filters,
    `  const found = await ports.${binding}.list(where);`,
    '  return found;',
  ].join('\n');
}

function inputNames(definition: M1Definition): string[] {
  const functions = definition.data.functions;
  if (!Array.isArray(functions) || !isRecord(functions[0]) || !Array.isArray(functions[0].input)) return [];
  return functions[0].input.filter(isRecord).map(field => text(field.name)).filter(Boolean);
}

function literalFor(node: FieldNode, inputs: ReadonlySet<string>, states: readonly string[]): string {
  if (node.children.size > 0) {
    const parts = [...node.children].map(([name, child]) => `${name}: ${literalFor(child, inputs, states)}`);
    return `{ ${parts.join(', ')} }`;
  }
  if (node.derived && node.name === 'id') return 'ctx.idGenerator.newId()';
  if (node.derived && (node.name === 'version' || node.type === 'integer' || node.type === 'number')) return '1';
  if (inputs.has(node.path)) return `body.${node.path}`;
  if ((node.type === 'enum' || node.name === 'status') && states.length > 0) return `'${states[0]}'`;
  if (node.type === 'integer' || node.type === 'number') return '0';
  if (node.type === 'boolean') return 'false';
  return "''";
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
): Promise<{ pending: string; scopeMode: string; unread: boolean }> {
  const page = routine.split('.')[1] ?? '';
  const project = /^_(\d+)_/.exec(defPath)?.[1] ?? '';
  const moduleName = definition.moduleName;
  if (!page || !project || !moduleName) return { pending: '', scopeMode: '', unread: true };
  const controllerRef = `_${project}_/l1/${moduleName}/layer_1_external/adapters/http/controllers/${page}.defs.ts`;
  const controller = await loadDefinition(controllerRef, read);
  if ('code' in controller) return { pending: '', scopeMode: '', unread: true };
  const handlers = Array.isArray(controller.data.handlers) ? controller.data.handlers.filter(isRecord) : [];
  const handler = handlers.find(entry => entry.route === routine);
  const grantIds = handler ? stringList(handler.grantIds) : [];
  if (!handler || grantIds.length === 0) return { pending: '', scopeMode: '', unread: true };
  const scopeDep = controller.dependencies.find(path => path.endsWith('/accessScope.defs.ts'));
  if (!scopeDep) return { pending: '', scopeMode: '', unread: true };
  const scope = await loadDefinition(scopeDep, read);
  if ('code' in scope) return { pending: '', scopeMode: '', unread: true };
  const grants = Array.isArray(scope.data.grants) ? scope.data.grants.filter(isRecord) : [];
  const matched = grants.filter(grant => grantIds.includes(text(grant.grantId)));
  if (matched.length !== grantIds.length) return { pending: '', scopeMode: '', unread: true };
  const pending = matched.map(grant => text(grant.pending)).find(Boolean) ?? '';
  const scopeMode = matched.find(grant => text(grant.pending) === pending)?.scopeMode;
  return { pending, scopeMode: text(scopeMode), unread: false };
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

function statesOf(definition: M1Definition): string[] {
  const lifecycle = definition.data.lifecycle;
  if (!isRecord(lifecycle) || !Array.isArray(lifecycle.states)) return [];
  return lifecycle.states.flatMap(item => isRecord(item) ? [text(item.state)] : []).filter(Boolean);
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
