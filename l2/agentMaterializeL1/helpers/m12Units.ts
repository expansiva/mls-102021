/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Units.ts" enhancement="_blank"/>

// Which defs a module has (from the stor index), which layer materializes each one, and which the request
// selects. A unit that is not selected is still read as a dependency.

import { parseDefinitionSource, readDefinition, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { LAYER_OF_TYPE, M12_LAYERS, type M12Layer, type M12Request } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { readOptional } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { defOfRef, fileRef, outputOfDef, type M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';

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
  definition: M1Definition;
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
    units.push({ layer, unitId: def.shortName, def, defRef, output, outputRef: fileRef(output), definition: read, text });
  }
  units.sort((left, right) => left.defRef < right.defRef ? -1 : left.defRef > right.defRef ? 1 : 0);
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

/** The modules a request touches: the scope's module, the target's module, or every module. */
export function requestModules(project: number, request: M12Request, entries: readonly M12StorEntry[]): { modules: string[]; refusal: string } {
  const all = discoverModules(project, entries);
  if (request.target) {
    const target = defOfRef(request.target, project);
    if (!target || target.project !== project) return { modules: [], refusal: `Target ${request.target} is not an l1 def of project ${project}.` };
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
