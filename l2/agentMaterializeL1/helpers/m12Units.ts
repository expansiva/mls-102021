/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Units.ts" enhancement="_blank"/>

// Which defs a module has (from the stor index), which layer materializes each one, and which the request
// selects. A unit that is not selected is still read as a dependency.

import { parseDefinitionSource, readDefinition, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { LAYER_OF_TYPE, M12_LAYERS, type M12Layer, type M12Request } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { readOptional } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { defOfRef, fileRef, infoOfRef, outputOfDef, type M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { workflowEngineFile } from '/_102021_/l2/agentMaterializeL1/emitters/workflowEmit.js';
import { usecasePlan } from '/_102021_/l2/agentMaterializeL1/emitters/usecaseIntent.js';
import { childWriteMethods, routeChildWrites, withProcessMethods } from '/_102021_/l2/agentMaterializeL1/emitters/processPorts.js';

export interface M12StorEntry {
  project: number;
  level: number;
  folder: string;
  shortName: string;
  extension: string;
  status?: string;
}

export interface M12Unit {
  layer: M12Layer;
  unitId: string;
  def: M12FileInfo;
  defRef: string;
  output: M12FileInfo;
  outputRef: string;
  /** The def as the recipes read it: for a usecase, the declared intent plus what its operation and entity fix (§10). */
  definition: M1Definition;
  /** The def as it was declared: what the prompt shows. */
  declared: M1Definition;
  /** Why the plan of a usecase could not be derived ('' when it was, or the unit is not a usecase). */
  planIssue: string;
  /** The def text, part of the unit's input hash. */
  text: string;
}

export interface M12ModuleUnits {
  units: M12Unit[];
  /** Defs that could not be read or parsed, or whose type has no layer: named in the report, never dropped. */
  problems: Array<{ defRef: string; code: string; detail: string }>;
}

/** Folders of a module that hold run files, not defs. */
const NOT_DEFS = ['pipeline', 'materialization'];

export function storEntries(): M12StorEntry[] {
  return (Object.values(mls.stor.files) as unknown as M12StorEntry[]).filter(Boolean);
}

/** The l1 `.defs.ts` entries of one module. The project filter matters: the stor carries the whole closure. */
export function moduleDefEntries(project: number, moduleName: string, entries: readonly M12StorEntry[]): M12StorEntry[] {
  return entries.filter(file => file.project === project && file.level === 1 && file.extension === '.defs.ts'
    && file.status !== 'deleted' && !!file.shortName
    && (file.folder === moduleName || file.folder.startsWith(`${moduleName}/`))
    && !NOT_DEFS.includes(file.folder.split('/')[1] ?? ''));
}

/** Every l1 module of the project that has defs. */
export function discoverModules(project: number, entries: readonly M12StorEntry[]): string[] {
  const modules = new Set<string>();
  for (const file of entries) {
    if (file.project !== project || file.level !== 1 || file.extension !== '.defs.ts' || file.status === 'deleted') continue;
    const [moduleName, second] = file.folder.split('/');
    if (moduleName && second && !NOT_DEFS.includes(second)) modules.add(moduleName);
  }
  return [...modules].sort();
}

/** Reads and parses every def of the module. Pure over the stor; writes nothing. */
export async function loadModuleUnits(project: number, moduleName: string, entries: readonly M12StorEntry[]): Promise<M12ModuleUnits> {
  const units: M12Unit[] = [];
  const problems: M12ModuleUnits['problems'] = [];
  for (const entry of moduleDefEntries(project, moduleName, entries)) {
    const def: M12FileInfo = { project, level: 1, folder: entry.folder, shortName: entry.shortName, extension: '.defs.ts' };
    const defRef = fileRef(def);
    const text = await readOptional(def);
    if (text === null) { problems.push({ defRef, code: 'DEF_UNREADABLE', detail: `${defRef} could not be read.` }); continue; }
    const parsed = parseDefinitionSource(text);
    if (!('definition' in parsed)) { problems.push({ defRef, code: 'DEF_INVALID', detail: parsed.issues.join(' ') }); continue; }
    const read = readDefinition(parsed.definition);
    if ('issues' in read) { problems.push({ defRef, code: 'DEF_INVALID', detail: read.issues.join(' ') }); continue; }
    const layer = LAYER_OF_TYPE[read.artifactType];
    if (!layer) { problems.push({ defRef, code: 'TYPE_UNPLANNED', detail: `${read.artifactType} has no layer in this agent.` }); continue; }
    const output = outputOfDef(def);
    const plan = read.artifactType === 'usecase'
      ? await usecasePlan(read, async ref => { const info = infoOfRef(ref, project); return info ? readOptional(info) : null; })
      : { definition: read, detail: '' };
    units.push({ layer, unitId: def.shortName, def, defRef, output, outputRef: fileRef(output), definition: plan.definition, declared: read, planIssue: plan.detail, text });
    // d1_209: the adapter of a system is a second file of the same def: its own unit (layer `adapter`, id `<systemId>Adapter`), after the declaration.
    if (read.artifactType === 'externalConnection') {
      const adapter: M12FileInfo = { ...output, shortName: `${output.shortName}Adapter` };
      units.push({ layer: 'adapter', unitId: adapter.shortName, def, defRef, output: adapter, outputRef: fileRef(adapter), definition: read, declared: read, planIssue: '', text });
    }
  }
  units.sort((left, right) => left.defRef < right.defRef ? -1 : left.defRef > right.defRef ? 1 : 0);
  // A port also carries the methods a workflow process applies through it and no usecase brings (§11), and the ones
  // a route needs to write the children it carries with their parent (the checklist items of a task).
  const declared = units.map(unit => unit.declared);
  const readRef = async (ref: string): Promise<string | null> => { const info = infoOfRef(ref, project); return info ? readOptional(info) : null; };
  const children = childWriteMethods(await routeChildWrites(declared, readRef, project, moduleName));
  for (const unit of units) {
    if (unit.definition.artifactType === 'repositoryPort') unit.definition = withProcessMethods(unit.definition, declared, children);
  }
  return { units, problems };
}

/** Whole-segment prefix: `a/b` selects `a/b` and `a/b/c`, never `a/bc`. */
function underScope(folder: string, scope: string): boolean {
  return folder === scope || folder.startsWith(`${scope}/`);
}

/** The defs of a module the request selects (the others are dependencies only). */
export function selectUnits(project: number, moduleName: string, units: readonly M12Unit[], request: M12Request): M12Unit[] {
  if (request.target) {
    const target = defOfRef(request.target, project);
    if (!target) return [];
    const ref = fileRef(target);
    return units.filter(unit => unit.defRef === ref);
  }
  if (!request.scope) return [...units];
  const [scopeModule] = request.scope.split('/');
  if (scopeModule !== moduleName) return [];
  return units.filter(unit => underScope(unit.def.folder, request.scope) || underScope(moduleName, request.scope));
}

/**
 * d1_246: a unit an emitter writes has no def (the module engine of the workflows layer). `target` names it by its output file
 * (`_<project>_/l1/<module>/layer_1_external/adapters/workflow/engine.ts`) or by `<module>/engine`.
 */
export const EMITTER_TARGET_FORMS = 'the .defs.ts or .ts of a def, the output file of an emitted unit (`_<project>_/l1/<module>/layer_1_external/adapters/workflow/engine.ts`), or `<module>/engine`';

export function emitterTarget(project: number, target: string): { module: string; layer: M12Layer } | null {
  const byId = /^([A-Za-z][A-Za-z0-9_]*)\/engine$/u.exec(String(target || '').trim());
  if (byId) return { module: byId[1], layer: 'workflows' };
  const info = infoOfRef(target, project);
  if (!info || info.project !== project || info.level !== 1 || info.shortName !== 'engine' || info.extension !== '.ts') return null;
  const module = info.folder.split('/')[0];
  const engine = module ? workflowEngineFile(project, module) : null;
  return engine && fileRef(engine) === fileRef(info) ? { module, layer: 'workflows' } : null;
}

/** The layer whose emitted unit the target names in this module, when it names one. */
export function emitterTargetLayer(project: number, moduleName: string, target: string): M12Layer | null {
  const found = target ? emitterTarget(project, target) : null;
  return found && found.module === moduleName ? found.layer : null;
}

/** The modules a request touches: the scope's module, the target's module, or every module. */
export function requestModules(project: number, request: M12Request, entries: readonly M12StorEntry[]): { modules: string[]; refusal: string } {
  const all = discoverModules(project, entries);
  if (request.target) {
    const emitted = emitterTarget(project, request.target);
    if (emitted) return all.includes(emitted.module) ? { modules: [emitted.module], refusal: '' } : { modules: [], refusal: `Target ${request.target} is not in a module with defs.` };
    const target = defOfRef(request.target, project);
    if (!target || target.project !== project) return { modules: [], refusal: `Target ${request.target} is not an l1 def of project ${project}. Accepted: ${EMITTER_TARGET_FORMS}.` };
    const moduleName = target.folder.split('/')[0];
    if (!all.includes(moduleName)) return { modules: [], refusal: `Target ${request.target} is not in a module with defs.` };
    return { modules: [moduleName], refusal: '' };
  }
  if (request.scope) {
    const moduleName = request.scope.split('/')[0];
    if (!all.includes(moduleName)) return { modules: [], refusal: `Scope ${request.scope}: module ${moduleName} has no l1 defs in project ${project}.` };
    return { modules: [moduleName], refusal: '' };
  }
  if (all.length === 0) return { modules: [], refusal: `Project ${project} has no l1 module with defs.` };
  return { modules: all, refusal: '' };
}

/** The layers that have selected units, in order; tests ride on controllers. */
export function selectedLayers(units: readonly M12Unit[]): M12Layer[] {
  const layers = new Set(units.map(unit => unit.layer));
  if (layers.has('controllers')) layers.add('tests');
  return M12_LAYERS.filter(layer => layers.has(layer));
}

/** Registration covers the whole module: only a run that selected every unit of it registers. */
export function registersModule(request: M12Request, moduleName: string): boolean {
  return !request.target && (!request.scope || request.scope === moduleName);
}

/** Parsed definitions of every unit of the module: the `moduleDefinitions` the copied emitters read. */
export function moduleDefinitions(units: readonly M12Unit[]): unknown[] {
  return units.map(unit => unit.definition);
}

/**
 * Same-layer order: a unit after the units of its layer it depends on (an adapter after its table, a port
 * after its entity). A dependency outside the layer is not ordered here; it is checked by status.
 */
export function orderWithinLayer(units: readonly M12Unit[]): M12Unit[] {
  const byRef = new Map(units.map(unit => [unit.defRef, unit]));
  const done = new Set<string>();
  const out: M12Unit[] = [];
  const visit = (unit: M12Unit, stack: Set<string>): void => {
    if (done.has(unit.defRef) || stack.has(unit.defRef)) return;
    stack.add(unit.defRef);
    for (const dep of unit.definition.dependencies) {
      const inner = byRef.get(dep);
      if (inner) visit(inner, stack);
    }
    stack.delete(unit.defRef);
    done.add(unit.defRef);
    out.push(unit);
  };
  for (const unit of units) visit(unit, new Set());
  return out;
}
