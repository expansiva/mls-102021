/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/processPorts.ts" enhancement="_blank"/>

// The port methods a workflow process needs and no usecase brings (materializadorL1.md §11). The D1 derives a port
// from the usecases of its entity; an operation a process reaches with no usecase (AvisoVencimento.create of the daily
// notice) and a system transition (`by: []`, AvisoVencimento.concluirAviso) are applied by the process function
// through the port, so the port and its adapter carry them too. Read from the defs only: nothing per module.

import { isRecord, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { clauseValue, membersOfType, routeClause } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';

export interface M12PortMethod {
  name: string;
  params: string[];
  returns: string;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function method(entityId: string, op: string): M12PortMethod {
  if (op === 'create' || op === 'update') return { name: op, params: [entityId], returns: entityId };
  if (op === 'get') return { name: 'get', params: ['id'], returns: entityId };
  if (op === 'list') return { name: 'list', params: [`${entityId}Filter`], returns: `${entityId}[]` };
  return { name: 'transition', params: [entityId, 'transitionId'], returns: entityId };
}

/** Entity → the methods its port needs for the processes of the module, beyond what its usecases bring. */
export function processPortMethods(definitions: readonly M1Definition[]): Map<string, M12PortMethod[]> {
  const out = new Map<string, M12PortMethod[]>();
  const add = (entityId: string, item: M12PortMethod): void => {
    const list = out.get(entityId) ?? [];
    if (!list.some(existing => existing.name === item.name)) list.push(item);
    out.set(entityId, list);
  };
  const usecases = definitions.filter(item => item.artifactType === 'usecase');
  const covered = (entityId: string, op: string): boolean => usecases.some(item => text(item.data.entityId) === entityId
    && (text(item.data.operation) === op || text(item.data.transitionRef) === op));
  for (const process of definitions.filter(item => item.artifactType === 'workflowProcess')) {
    const operations = Array.isArray(process.data.operations) ? process.data.operations.filter(isRecord) : [];
    for (const row of operations) {
      const [entityId, op] = text(row.operation).split('.');
      if (entityId && op && !covered(entityId, op)) add(entityId, method(entityId, op));
    }
    // A system transition of the occurrence entity has no usecase and no journey: the function applies it.
    const occurrence = isRecord(process.data.occurrence) ? text(process.data.occurrence.entityId) : '';
    const entity = definitions.find(item => item.artifactType === 'domainEntity' && text(item.data.entityId) === occurrence);
    const lifecycle = entity && isRecord(entity.data.lifecycle) ? entity.data.lifecycle : null;
    const transitions = lifecycle && Array.isArray(lifecycle.transitions) ? lifecycle.transitions.filter(isRecord) : [];
    for (const transition of transitions) {
      const by = Array.isArray(transition.by) ? transition.by : [];
      const id = text(transition.transitionId);
      if (by.length === 0 && id && !covered(occurrence, id)) add(occurrence, method(occurrence, id));
    }
  }
  return out;
}

/**
 * A repositoryPort def with the methods the processes of the module need, and the ones `extra` brings (the children a
 * route writes with its parent); the def itself when it needs none.
 */
export function withProcessMethods(port: M1Definition, definitions: readonly M1Definition[], extra: ReadonlyMap<string, readonly M12PortMethod[]> = new Map()): M1Definition {
  const entityId = text(port.data.entityId);
  const needed = [...(processPortMethods(definitions).get(entityId) ?? []), ...(extra.get(entityId) ?? [])];
  const methods = Array.isArray(port.data.methods) ? port.data.methods.filter(isRecord) : [];
  const missing = needed.filter((item, index) => needed.findIndex(other => other.name === item.name) === index
    && !methods.some(existing => text(existing.name) === item.name));
  if (!missing.length) return port;
  return { ...port, data: { ...port.data, methods: [...methods, ...missing.map(item => ({ ...item }))] } };
}

/** A child entity a route writes with its parent: the route input carries its records, and no usecase writes them. */
export interface M12ChildWrite {
  route: string;
  /** The entity and operation the route declares (`writes: 'Tarefa.create'`). */
  parent: string;
  operation: string;
  /** The input member that carries the child records (`checklist`) and the child entity (`ItemChecklist`). */
  inputKey: string;
  child: string;
  /** The child field that points to the parent (`tarefaId`). */
  foreignKey: string;
}

/** Last segments of the leaf paths of a member list (`checklist.details.details.descricao` → `descricao`). */
function leafNames(paths: readonly string[]): Set<string> {
  return new Set(paths.filter(path => !paths.some(other => other.startsWith(`${path}.`))).map(path => path.split('.').pop() ?? ''));
}

/**
 * The children a route writes with its parent. The contract says only `writes: '<Parent>.<op>'`; its input may carry a
 * member that is not a field of the parent and whose fields are those of an entity the parent reaches by a 1:N
 * relationship of its l4 ontology (minhas_tarefas: `checklist` → ItemChecklist via ItemChecklist.tarefaId). The child is
 * matched by its fields, not by a name: the relationship is `itensChecklist`, the input member `checklist`.
 */
export async function routeChildWrites(
  definitions: readonly M1Definition[],
  read: (ref: string) => Promise<string | null>,
  project: number,
  moduleName: string,
): Promise<M12ChildWrite[]> {
  const entities = new Map(definitions.filter(item => item.artifactType === 'domainEntity')
    .map(item => [text(item.data.entityId), Array.isArray(item.data.fields) ? item.data.fields.filter(isRecord).map(field => text(field.name)) : []]));
  const out: M12ChildWrite[] = [];
  for (const service of definitions.filter(item => item.artifactType === 'requestService')) {
    const pageId = text(service.data.pageId);
    const contract = pageId ? await read(`_${project}_/l2/${moduleName}/web/contracts/${pageId}.defs.ts`) : null;
    if (!contract) continue;
    const routes = Array.isArray(service.data.requests) ? service.data.requests.filter(isRecord).map(row => text(row.route)).filter(Boolean) : [];
    for (const route of routes) {
      const clause = routeClause(contract, route);
      const writes = clause ? /\bwrites\s*:\s*['"]([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)['"]/u.exec(clause) : null;
      const input = clause ? clauseValue(clause, 'input') : null;
      if (!writes || !input) continue;
      const [, parent, operation] = writes;
      const parentFields = entities.get(parent) ?? [];
      const members = membersOfType(contract, input)?.allowedPaths ?? [];
      const ontology = await read(`_${project}_/l4/${moduleName}/ontology/${parent}.defs.ts`);
      const match = ontology ? /=\s*(\{[\s\S]*\})\s*as const/u.exec(ontology) : null;
      let relationships: Record<string, unknown> = {};
      try {
        const value: unknown = match ? JSON.parse(match[1]) : null;
        if (isRecord(value) && isRecord(value.relationships)) relationships = value.relationships;
      } catch (error) {
        console.warn(`l4 ontology of ${parent} is not JSON: ${String(error)}`);
      }
      const children = Object.values(relationships).filter(isRecord)
        .filter(rel => text(rel.cardinality) === '1:N' && text(rel.via).startsWith(`${text(rel.to)}.`) && entities.has(text(rel.to)));
      for (const key of [...new Set(members.map(path => path.split('.')[0]))]) {
        if (parentFields.some(field => field === key || field.startsWith(`${key}.`))) continue;
        const names = [...leafNames(members.filter(path => path.startsWith(`${key}.`)))].filter(name => name !== 'id' && name !== 'version');
        if (!names.length) continue;
        for (const rel of children) {
          const child = text(rel.to);
          const childLeaves = leafNames(entities.get(child) ?? []);
          if (names.every(name => childLeaves.has(name))) {
            out.push({ route, parent, operation, inputKey: key, child, foreignKey: text(rel.via).slice(child.length + 1) });
            break;
          }
        }
      }
    }
  }
  return out;
}

/** The port methods the children written with their parent need: create; on any other write, update and delete too. */
export function childWriteMethods(writes: readonly M12ChildWrite[]): Map<string, M12PortMethod[]> {
  const out = new Map<string, M12PortMethod[]>();
  for (const write of writes) {
    const list = out.get(write.child) ?? [];
    const wanted: M12PortMethod[] = [{ name: 'create', params: [write.child], returns: write.child }];
    if (write.operation !== 'create') {
      wanted.push({ name: 'update', params: [write.child], returns: write.child }, { name: 'delete', params: ['id'], returns: 'void' });
    }
    for (const item of wanted) if (!list.some(existing => existing.name === item.name)) list.push(item);
    out.set(write.child, list);
  }
  return out;
}
