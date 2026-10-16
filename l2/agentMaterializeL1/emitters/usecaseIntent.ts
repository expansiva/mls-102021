/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/usecaseIntent.ts" enhancement="_blank"/>

// The usecase def carries only its intent since 15/10 (materializadorL1.md §10): usecaseId, entityId, operation,
// transitionRef?, rulesApplied, effects, mdm?. What the recipes read from the old def — the function and its
// signature, the port and its call, the selector, the transition payload, the rules to enforce, the unique keys —
// follows from the operation, the entity def, the table def and the l4, as the D1 derived it before. This is the one
// place that derives it; the declared def stays as it came (prompt and input hash).

import { isRecord, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';

type Read = (ref: string) => Promise<string | null>;

interface SignatureRow {
  name: string;
  type: string;
  fieldRef?: string;
}

/** The `export const definition = { … } as const;` of a def source, unvalidated; null when it is not one. */
export function parseDefinitionExport(source: string): M1Definition | null {
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

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
}

function lowerFirst(value: string): string {
  return value ? value[0].toLowerCase() + value.slice(1) : value;
}

/** The project prefix (`_102047_`) of a qualified ref. */
function projectOf(ref: string): string {
  return ref.split('/')[0] ?? '';
}

async function readDef(ref: string, read: Read): Promise<M1Definition | null> {
  const source = await read(ref);
  return source === null ? null : parseDefinitionExport(source);
}

/** The transition `transitionId` of an l4 ontology: its payload paths; null when the ontology has no such transition. */
export function transitionPayload(ontologySource: string | null, transitionId: string): string[] | null {
  if (!ontologySource) return null;
  const match = /=\s*(\{[\s\S]*\})\s*as const/u.exec(ontologySource);
  if (!match) return null;
  let value: unknown;
  try {
    value = JSON.parse(match[1]);
  } catch {
    return null;
  }
  const found: unknown[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!isRecord(node)) return;
    if (node.transitionId === transitionId) found.push(node);
    Object.values(node).forEach(walk);
  };
  walk(value);
  const transition = found.find(isRecord);
  return transition ? stringList(transition.payload) : null;
}

/**
 * The def as the recipes read it: the declared intent plus what the operation, the entity and the l4 fix. A def that
 * still names its function (the format before 15/10) is returned as it is. `detail` names what could not be derived;
 * the def then comes back without a function and the unit is refused with that cause.
 */
export async function usecasePlan(definition: M1Definition, read: Read): Promise<{ definition: M1Definition; detail: string }> {
  const data = definition.data;
  if (Array.isArray(data.functions)) return { definition, detail: '' };
  const usecaseId = text(data.usecaseId) || definition.artifactId;
  const entityId = text(data.entityId);
  const operation = text(data.operation);
  const entityDep = definition.dependencies.find(path => path.includes('/entities/'));
  if (!entityDep) return { definition, detail: `${usecaseId} has no entity dependency.` };
  const entity = await readDef(entityDep, read);
  if (!entity) return { definition, detail: `${entityDep} could not be read.` };
  const fields = Array.isArray(entity.data.fields) ? entity.data.fields.filter(isRecord) : [];
  const row = (field: Record<string, unknown>): SignatureRow => ({ name: text(field.name), type: text(field.type) || 'string', fieldRef: `${entityId}.${text(field.name)}` });
  const all = fields.map(row);
  const writable = fields.filter(field => field.derived !== true).map(row);
  const named = (names: readonly string[]): SignatureRow[] => all.filter(item => names.includes(item.name));

  let input: SignatureRow[] = [];
  let output: SignatureRow[] = all;
  let uses: Array<Record<string, string>> = [];
  let lifecycle: Record<string, unknown> | undefined;
  if (operation === 'get') {
    input = named(['id']);
    uses = [{ path: 'id', role: 'filter', source: 'input' }];
  } else if (operation === 'list') {
    input = [...all.filter(item => item.name !== 'version'), { name: 'page', type: 'number' }, { name: 'pageSize', type: 'number' }];
    output = [{ name: 'items', type: entityId }, { name: 'hasMore', type: 'boolean' }];
    uses = [{ path: 'id', role: 'filter', source: 'input' }];
  } else if (operation === 'create') {
    input = writable;
  } else if (operation === 'update') {
    // The fields it writes, then the selector and the concurrency (the D1 order).
    input = [...writable.filter(item => item.name !== 'id' && item.name !== 'version'), ...named(['id']), ...named(['version'])];
    uses = [{ path: 'id', role: 'selector', source: 'input' }, { path: 'version', role: 'concurrency', source: 'input' }];
  } else if (operation === 'transition') {
    const transitionId = text(data.transitionRef);
    if (!transitionId) return { definition, detail: `${usecaseId} is a transition with no transitionRef.` };
    const ontology = definition.dependencies.find(path => path.includes('/l4/') && path.includes('/ontology/') && !path.endsWith('/mdm.defs.ts'))
      ?? `${projectOf(entityDep)}/l4/${definition.moduleName}/ontology/${entityId}.defs.ts`;
    const payload = transitionPayload(await read(ontology), transitionId);
    if (payload === null) return { definition, detail: `${ontology} has no transition ${transitionId}.` };
    input = [...named(['id', 'version']), ...named(payload)];
    uses = [
      { path: 'id', role: 'selector', source: 'input' },
      { path: 'version', role: 'concurrency', source: 'input' },
      ...payload.map(path => ({ path, role: 'write', source: 'input' })),
    ];
    lifecycle = { transitionId, payload, sourcePath: ontology.replace(/^_\d+_\//u, ''), symbol: transitionId };
  } else {
    return { definition, detail: `${usecaseId}: operation "${operation}" has no derived signature.` };
  }

  // A table entity has the port of its entity; an MDM entity has none (it is read through ctx.mdm).
  const portDep = definition.dependencies.find(path => path.includes('/ports/'));
  const port = entity.data.storageTarget === 'moduleDatabase' && portDep ? await readDef(portDep, read) : null;
  const portName = port ? text(port.data.interfaceName) || `${entityId}Repository` : '';
  const ports = portName ? [portName] : [];

  const rulesFile = `l4/${definition.moduleName}/rules.defs.ts`;
  const rulePlan: Array<Record<string, string>> = stringList(data.rulesApplied).map(ruleId => ({
    ruleId, origin: `${rulesFile}#${ruleId}`, consumer: `usecase:${usecaseId}`, enforcement: 'local', gap: '',
  }));
  // The unique keys of a create are the table's (`uniqueKeys`); the storage row points at the table def.
  if (operation === 'create' && ports.length) {
    const tableRef = `${projectOf(entityDep)}/l1/${definition.moduleName}/layer_1_external/adapters/persistence/${lowerFirst(entityId)}.defs.ts`;
    const table = await readDef(tableRef, read);
    const keys = table && Array.isArray(table.data.uniqueKeys) ? table.data.uniqueKeys.filter(Array.isArray) : [];
    if (keys.length) rulePlan.push({ ruleId: '', origin: `${tableRef}#uniqueKeys`, consumer: 'operation:create', enforcement: 'local', gap: '' });
  }

  return {
    definition: {
      ...definition,
      data: {
        ...data,
        functions: [{ functionName: usecaseId, input, output }],
        ports,
        portCalls: ports.length ? [operation] : [],
        uses,
        rulePlan,
        transactional: false,
        transaction: { boundary: 'none' },
        ...(lifecycle ? { lifecycle } : {}),
      },
    },
    detail: '',
  };
}
