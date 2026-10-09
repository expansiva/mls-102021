/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Materialize.ts" enhancement="_blank"/>

// One deterministic unit: emit from the def with the copied recipes, gate, write, compile in the Studio, check
// the rules, record the status. The LLM usecase worker reuses the write/compile/record half.

import { isRecord, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { auditImports, emitController, emitValueObject, type EmitFailure, type EmitResult } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import { behaviorNeedsLlm, emitBehavior } from '/_102021_/l2/agentMaterializeL1/emitters/emitBehavior.js';
import { emitPersistence, type PersistenceEmit } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';
import { clip, errorText, LAYER_OF_TYPE, M12_LAYERS, type M12Layer, type M12RunArgs } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { compileDiagnostics, compileM12Files, isUnavailable, type M12Compiler } from '/_102021_/l2/agentMaterializeL1/helpers/m12Compile.js';
import {
  COMPILE_UNAVAILABLE_L1,
  createReader,
  fileReady,
  hashParts,
  readOptional,
  readUnitStatus,
  removeStorFile,
  reuseDecision,
  writeSource,
  writeText,
  writeUnitStatus,
  type M12UnitStatus,
} from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { fileRef, rulesFile, type M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { moduleDefinitions, type M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';

/** Raised when a recipe or a check of this agent changes: an older status is a new input. */
export const M12_RECIPE_VERSION = '2026-10-06-m12-recipe-v20';

/** Declared platform gaps: nothing is written and the app still boots (closed list, as agentMaterializeL1 m1_47). */
const PLATFORM_GAPS = new Set(['MECHANISM_UNBOUND', 'NO_CONSUMER']);

/** The copied handler id of each artifact type: the final recipe (implement where it exists, else structure). */
const RECIPE_OF_TYPE: Readonly<Record<string, string>> = {
  domainEntity: 'implement.domainEntity',
  valueObject: 'structure.valueObject',
  repositoryPort: 'implement.repositoryPort',
  accessScope: 'implement.accessScope',
  authorityMap: 'implement.authorityMap',
  table: 'persistence.table',
  repositoryAdapter: 'persistence.repositoryAdapter',
  repositoryRegistration: 'persistence.repositoryRegistration',
  persistenceSeeds: 'persistence.persistenceSeeds',
  integrationOutbound: 'persistence.integrationOutbound',
  usecase: 'implement.usecase',
  requestService: 'implement.requestService',
  httpController: 'structure.httpController',
};

export interface M12Context {
  run: M12RunArgs;
  units: readonly M12Unit[];
  appEnv: string;
  read: (ref: string) => Promise<string | null>;
  /** The Studio compiler unless a test injects one. */
  compiler?: M12Compiler;
}

export function createContext(run: M12RunArgs, units: readonly M12Unit[], appEnv: string, compiler?: M12Compiler): M12Context {
  return { run, units, appEnv, read: createReader(run.project), ...(compiler ? { compiler } : {}) };
}

/**
 * Rule (05/10/2026): a type the recipe derives only sometimes always goes to the model. Usecases (rules the
 * recipe cannot bind) and request services (outputs it cannot project) are written by the model, with the
 * recipe's attempt as a draft; every other type is a recipe.
 */
export const MODEL_TYPES: ReadonlySet<string> = new Set(['usecase', 'requestService']);

export function unitNeedsLlm(unit: M12Unit): boolean {
  return MODEL_TYPES.has(unit.definition.artifactType);
}

/** The copied routing of agentMaterializeL1, kept for the prompt: why the recipe alone may not derive a usecase. */
export function recipeWouldAskModel(unit: M12Unit): boolean {
  return unit.definition.artifactType === 'usecase' && behaviorNeedsLlm(unit.definition);
}

/** What the recipe produces for a model unit: its source as a draft, or the reason it refuses. Writes nothing. */
export async function recipeDraft(ctx: M12Context, unit: M12Unit): Promise<{ source: string } | { refusal: string }> {
  if (recipeWouldAskModel(unit)) return { refusal: 'NEEDS_LLM: the copied routing (behaviorNeedsLlm) does not derive this usecase.' };
  try {
    const emitted = await emitUnit(ctx, unit);
    if ('code' in emitted) return { refusal: `${emitted.code}: ${emitted.detail}` };
    const dropped = unit.definition.artifactType === 'usecase' ? rulesNotEmitted(unit.definition, emitted.source) : [];
    return dropped.length ? { refusal: `RULE_NOT_EMITTED: the recipe source below does not enforce ${dropped.join(', ')}.\n\n${emitted.source}` } : { source: emitted.source };
  } catch (error) {
    return { refusal: `EXCEPTION: ${errorText(error)}` };
  }
}

interface Emitted {
  source: string;
  imports: string[];
  seeds: boolean;
  runsStub: boolean;
}

export async function emitUnit(ctx: M12Context, unit: M12Unit): Promise<Emitted | EmitFailure> {
  const recipe = RECIPE_OF_TYPE[unit.definition.artifactType];
  const definitions = moduleDefinitions(ctx.units);
  const output = unit.outputRef;
  if (!recipe) return { code: 'NO_NAMED_HANDLER', detail: `${unit.definition.artifactType} has no recipe.` };
  let produced: EmitResult | PersistenceEmit | EmitFailure;
  if (recipe.startsWith('persistence.')) produced = await emitPersistence(recipe, unit.definition, output, ctx.read);
  else if (recipe === 'structure.valueObject') produced = emitValueObject(unit.definition, output);
  else if (recipe === 'structure.httpController') produced = await emitController(unit.definition, output, ctx.read);
  else produced = await emitBehavior(recipe, unit.definition, output, ctx.read, definitions);
  if ('code' in produced) return produced;
  return {
    source: produced.source.endsWith('\n') ? produced.source : `${produced.source}\n`,
    imports: produced.imports,
    seeds: 'seeds' in produced ? produced.seeds : false,
    runsStub: produced.runsStub,
  };
}

/** The l1 defs of the same module a unit depends on (l2 contracts and l4 sources are inputs, not units). */
export function dependencyUnits(ctx: M12Context, unit: M12Unit): M12Unit[] {
  return unit.definition.dependencies
    .map(ref => ctx.units.find(item => item.defRef === ref))
    .filter((item): item is M12Unit => !!item);
}

/**
 * Dependencies whose file is not there to import, with their state. Empty = ready. Only a dependency of the
 * same or an earlier layer is imported when the unit is emitted; a later one (the usecase an outbound event
 * names) is a reference, not an import, and does not block.
 */
export async function blockingDependencies(ctx: M12Context, unit: M12Unit): Promise<string[]> {
  const out: string[] = [];
  const own = M12_LAYERS.indexOf(unit.layer);
  for (const dep of dependencyUnits(ctx, unit)) {
    if (M12_LAYERS.indexOf(dep.layer) > own) continue;
    const status = await readUnitStatus(ctx.run.project, ctx.run.module, dep.layer, dep.unitId);
    if (!fileReady(status)) out.push(`${dep.defRef} (${status?.status ?? 'not materialized'}${status?.code ? ` ${status.code}` : ''})`);
  }
  return out;
}

/** The contract a request service or controller reads; part of its input. */
function contractRefs(definition: M1Definition): string[] {
  const handlers = Array.isArray(definition.data.handlers) ? definition.data.handlers.filter(isRecord) : [];
  return [...new Set(handlers.map(handler => String(handler.contractPath ?? '')).filter(Boolean))];
}

/**
 * Everything the unit's output is derived from: the recipe version, its def, every dependency's text and the
 * output hash its dependency units recorded, the contract a controller reads, the rules text of a usecase.
 */
export async function unitInputHash(ctx: M12Context, unit: M12Unit, extra: readonly string[] = []): Promise<string> {
  const parts: string[] = [M12_RECIPE_VERSION, unit.text, ctx.appEnv];
  for (const ref of unit.definition.dependencies) parts.push(ref, (await ctx.read(ref)) ?? '<absent>');
  for (const dep of dependencyUnits(ctx, unit)) {
    const status = await readUnitStatus(ctx.run.project, ctx.run.module, dep.layer, dep.unitId);
    parts.push(dep.defRef, JSON.stringify(status?.outputs ?? {}));
  }
  for (const ref of contractRefs(unit.definition)) parts.push(ref, (await ctx.read(ref)) ?? '<absent>');
  if (unit.definition.artifactType === 'requestService') {
    // The page contract is the source of truth of a request service: its routes, JSDoc and types.
    const ref = `_${ctx.run.project}_/l2/${ctx.run.module}/web/contracts/${String(unit.definition.data.pageId ?? unit.unitId)}.defs.ts`;
    parts.push(ref, (await ctx.read(ref)) ?? '<absent>');
  }
  if (unit.definition.artifactType === 'usecase') parts.push((await readOptional(rulesFile(ctx.run.project, ctx.run.module))) ?? '');
  parts.push(...extra);
  return hashParts(parts);
}

/** rulePlan rows the generated code must name: local rules (storage rows excluded) and RULE_UNBOUND ones. */
export function rulesToEnforce(definition: M1Definition): string[] {
  const rows = Array.isArray(definition.data.rulePlan) ? definition.data.rulePlan.filter(isRecord) : [];
  const ids = rows
    .filter(row => {
      const ruleId = String(row.ruleId ?? '');
      if (!ruleId) return false;
      const origin = String(row.origin ?? '');
      if (row.enforcement === 'local') return !origin.endsWith('#uniqueKeys');
      return row.enforcement === 'pending' && row.gap === 'RULE_UNBOUND';
    })
    .map(row => String(row.ruleId));
  return [...new Set(ids)].sort();
}

/** Rules of the def that the generated source does not name: the copied recipe dropped them. */
export function rulesNotEmitted(definition: M1Definition, source: string): string[] {
  // Either quote style: the prompt asks for `{ ruleId: '<id>' }` and the copied recipe writes `"<id>"`. Checking
  // only double quotes blocked every model-written usecase with a rule after the gate had passed it (05/10/2026).
  return rulesToEnforce(definition).filter(ruleId => !source.includes(`"${ruleId}"`) && !source.includes(`'${ruleId}'`) && !source.includes(`\`${ruleId}\``));
}

export interface M12UnitOutcome {
  status: M12UnitStatus['status'];
  code: string;
  line: string;
}

/** A rule the model declared not applicable to this unit, with why (a rule the D1 attached to the wrong unit). */
export interface M12RuleNotApplicable {
  ruleId: string;
  reason: string;
}

function base(unit: M12Unit, attempt = 1): Pick<M12UnitStatus, 'layer' | 'unitId' | 'defRef' | 'attempt'> {
  return { layer: unit.layer, unitId: unit.unitId, defRef: unit.defRef, attempt };
}

/**
 * Write `source` as the unit's output, compile it, check the rules, record the status. On a compile failure
 * the previous bytes come back (or the new file is removed) so a broken file never stays behind.
 */
export async function writeAndProve(
  ctx: M12Context,
  unit: M12Unit,
  source: string,
  inputHash: string,
  attempt = 1,
  notApplicable: readonly M12RuleNotApplicable[] = [],
): Promise<M12UnitOutcome & { errors: string[] }> {
  const { project, module: moduleName } = ctx.run;
  const previous = await readOptional(unit.output);
  const stored = await writeSource(unit.output, source);
  const results = await compileM12Files([{ info: unit.output, expected: stored.text }], ctx.compiler);
  const unavailable = results.every(result => result.errors.length === 1 && isUnavailable(result.errors[0]));
  const unavailableCause = unavailable ? results[0]?.errors[0] ?? '' : '';
  const errors = unavailable ? [] : compileDiagnostics(results);
  if (errors.length) {
    if (previous !== null) await writeText(unit.output, previous);
    else await removeStorFile(unit.output);
    const diagnostic = clip(errors.join(' | '), 4000);
    await writeUnitStatus(project, moduleName, { ...base(unit, attempt), status: 'failed', code: 'COMPILE_FAILED', diagnostic, inputHash, outputs: {} });
    return { status: 'failed', code: 'COMPILE_FAILED', line: `${unit.unitId}: failed, COMPILE_FAILED ${clip(diagnostic, 300)}`, errors };
  }
  const outputs = { [fileRef(unit.output)]: stored.hash };
  const waived = new Set(notApplicable.map(item => item.ruleId));
  const dropped = unit.definition.artifactType === 'usecase' ? rulesNotEmitted(unit.definition, stored.text).filter(ruleId => !waived.has(ruleId)) : [];
  const waiver = notApplicable.length ? ` Not applicable here (declared by the model): ${notApplicable.map(item => `${item.ruleId} — ${item.reason}`).join('; ')}.` : '';
  if (dropped.length) {
    // Never silent: the file compiles and stays (dependents can import it), the unit is not generated.
    const diagnostic = `RULE_NOT_EMITTED: ${dropped.join(', ')} are in the rulePlan of ${unit.defRef} and absent from ${unit.outputRef}. Their text is in l4/${moduleName}/rules.defs.ts.`;
    await writeUnitStatus(project, moduleName, { ...base(unit, attempt), status: 'blocked', code: 'RULE_NOT_EMITTED', diagnostic, inputHash, outputs });
    return { status: 'blocked', code: 'RULE_NOT_EMITTED', line: `${unit.unitId}: blocked, RULE_NOT_EMITTED ${dropped.join(', ')}`, errors: [] };
  }
  if (unavailable) {
    // Generated and through every gate; the report lists it apart: no compiler proved it.
    await writeUnitStatus(project, moduleName, { ...base(unit, attempt), status: 'done', code: COMPILE_UNAVAILABLE_L1, diagnostic: `${unavailableCause}${waiver}`, inputHash, outputs });
    return { status: 'done', code: COMPILE_UNAVAILABLE_L1, line: `${unit.unitId}: ${unit.outputRef} (not compiled: ${COMPILE_UNAVAILABLE_L1})`, errors: [] };
  }
  await writeUnitStatus(project, moduleName, { ...base(unit, attempt), status: 'done', code: '', diagnostic: waiver.trim(), inputHash, outputs });
  return { status: 'done', code: '', line: `${unit.unitId}: ${unit.outputRef}`, errors: [] };
}

/**
 * One deterministic unit, end to end. A usecase the routing sends to the model is not handled here (the
 * caller dispatches a worker). Never throws: an exception is a failed status with its message.
 */
export async function materializeUnit(ctx: M12Context, unit: M12Unit): Promise<M12UnitOutcome> {
  const { project, module: moduleName, force } = ctx.run;
  try {
    const waiting = await blockingDependencies(ctx, unit);
    if (waiting.length) {
      const diagnostic = `BLOCKED_BY: ${waiting.join(', ')}`;
      await writeUnitStatus(project, moduleName, { ...base(unit), status: 'blocked', code: 'BLOCKED_BY', diagnostic, inputHash: '', outputs: (await readUnitStatus(project, moduleName, unit.layer, unit.unitId))?.outputs ?? {} });
      return { status: 'blocked', code: 'BLOCKED_BY', line: `${unit.unitId}: blocked, ${clip(diagnostic, 300)}` };
    }
    const inputHash = await unitInputHash(ctx, unit);
    const prior = await readUnitStatus(project, moduleName, unit.layer, unit.unitId);
    const decision = await reuseDecision(prior, inputHash, [unit.output], force);
    if (decision.kind === 'reuse') {
      await writeUnitStatus(project, moduleName, { ...base(unit), status: 'reused', code: '', diagnostic: '', inputHash, outputs: prior!.outputs });
      return { status: 'reused', code: prior!.code, line: `${unit.unitId}: reused` };
    }
    if (decision.kind === 'protect') {
      const diagnostic = `EDITED_LOCALLY: ${decision.path} was not written by this agent (use "force": true).`;
      await writeUnitStatus(project, moduleName, { ...base(unit), status: 'skipped', code: 'EDITED_LOCALLY', diagnostic, inputHash, outputs: prior?.outputs ?? {} });
      return { status: 'skipped', code: 'EDITED_LOCALLY', line: `${unit.unitId}: skipped, ${diagnostic}` };
    }
    const emitted = await emitUnit(ctx, unit);
    if ('code' in emitted) {
      const gap = PLATFORM_GAPS.has(emitted.code);
      await writeUnitStatus(project, moduleName, { ...base(unit), status: gap ? 'gap' : 'blocked', code: emitted.code, diagnostic: emitted.detail, inputHash, outputs: {} });
      return { status: gap ? 'gap' : 'blocked', code: emitted.code, line: `${unit.unitId}: ${gap ? 'gap' : 'blocked'}, ${emitted.code} ${clip(emitted.detail, 300)}` };
    }
    const badImport = auditImports(emitted.source, emitted.imports);
    if (badImport) {
      await writeUnitStatus(project, moduleName, { ...base(unit), status: 'failed', code: 'IMPORT_REFUSED', diagnostic: badImport, inputHash, outputs: {} });
      return { status: 'failed', code: 'IMPORT_REFUSED', line: `${unit.unitId}: failed, IMPORT_REFUSED ${clip(badImport, 300)}` };
    }
    const production = ctx.appEnv === 'production';
    if (production && (emitted.seeds || emitted.runsStub)) {
      const diagnostic = `PROFILE_REFUSED: appEnv=production refuses ${emitted.seeds ? 'seeds' : 'a stub'}.`;
      await writeUnitStatus(project, moduleName, { ...base(unit), status: 'blocked', code: 'PROFILE_REFUSED', diagnostic, inputHash, outputs: {} });
      return { status: 'blocked', code: 'PROFILE_REFUSED', line: `${unit.unitId}: blocked, ${diagnostic}` };
    }
    const proved = await writeAndProve(ctx, unit, emitted.source, inputHash);
    return { status: proved.status, code: proved.code, line: proved.line };
  } catch (error) {
    const diagnostic = clip(errorText(error), 2000);
    await writeUnitStatus(project, moduleName, { ...base(unit), status: 'failed', code: 'EXCEPTION', diagnostic, inputHash: '', outputs: {} }).catch(() => undefined);
    return { status: 'failed', code: 'EXCEPTION', line: `${unit.unitId}: failed, ${diagnostic}` };
  }
}

/** The selected units of one layer, dependencies first. */
export function layerUnits(selected: readonly M12Unit[], layer: M12Layer): M12Unit[] {
  return selected.filter(unit => unit.layer === layer && LAYER_OF_TYPE[unit.definition.artifactType] === layer);
}

export type { M12FileInfo };
