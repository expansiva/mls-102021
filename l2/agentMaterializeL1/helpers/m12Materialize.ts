/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Materialize.ts" enhancement="_blank"/>

// One deterministic unit: emit from the def with the copied recipes, gate, write, compile in the Studio, check
// the rules, record the status. The LLM usecase worker reuses the write/compile/record half.

import { connectionCatalogSource } from '/_102021_/l2/agentMaterializeL1/helpers/catalogSource.js';
import { DECLARATION_TYPES_REF, integrationLogicalPath, integrationOf } from '/_102021_/l2/helpers/connections/catalogResolve.js';
import { isRecord, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { auditImports, emitController, emitValueObject, type EmitFailure, type EmitResult } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import { behaviorNeedsLlm, emitBehavior } from '/_102021_/l2/agentMaterializeL1/emitters/emitBehavior.js';
import { emitPersistence, type PersistenceEmit, type ReferenceSeedDataset } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';
import { clip, errorText, LAYER_OF_TYPE, M12_LAYERS, type M12Layer, type M12RunArgs } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { compileDiagnostics, compileM12Files, isUnavailable, type M12Compiler } from '/_102021_/l2/agentMaterializeL1/helpers/m12Compile.js';
import {
  COMPILE_UNAVAILABLE_L1,
  createReader,
  hashParts,
  readOptional,
  readUnitStatus,
  removeStorFile,
  reuseDecision,
  storExists,
  writeSource,
  writeText,
  writeUnitStatus,
  type M12UnitStatus,
} from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { fileRef, rulesFile, type M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { moduleDefinitions, type M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { catalogFilePath, catalogImportPath } from '/_102020_/l2/helpers/connections/catalogPath.js';

/** Raised when a recipe or a check of this agent changes: an older status is a new input. */
export const M12_RECIPE_VERSION = '2026-10-16-m12-recipe-v22';

/** Declared platform gaps: nothing is written and the app still boots (closed list, as agentMaterializeL1 m1_47). */
const PLATFORM_GAPS = new Set(['MECHANISM_UNBOUND', 'NO_CONSUMER', 'CM_FROM_PLATFORM']);

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
  integrationOutbound: 'implement.integrationOutbound',
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
  /**
   * Rows the reference-seed step accepted. Read only when emitting `persistenceSeeds`.
   * Absent for every other recipe.
   */
  referenceSeeds?: readonly ReferenceSeedDataset[];
  /** d1_342: the scenario seed rows the last `emitSeedsWhenReady` left out, one line each (`table/scenario: reason`). */
  seedDrops?: string[];
  /** d1_349 s2: the module engine was rewritten in this run; every process that has its file is kept or repaired against it. */
  engineMoved?: boolean;
}

export function createContext(run: M12RunArgs, units: readonly M12Unit[], appEnv: string, compiler?: M12Compiler): M12Context {
  return { run, units, appEnv, read: createReader(run.project), ...(compiler ? { compiler } : {}) };
}

/**
 * Rule (05/10/2026): a type the recipe derives only sometimes always goes to the model. Usecases (rules the
 * recipe cannot bind) and request services (outputs it cannot project) are written by the model, with the
 * recipe's attempt as a draft; every other type is a recipe.
 */
export const MODEL_TYPES: ReadonlySet<string> = new Set(['usecase', 'requestService', 'workflowProcess', 'externalConnection']);

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
  if (unit.definition.artifactType === 'workflowProcess') return { refusal: 'NO_RECIPE: the workflow service is written from the l4 prose of its functions (§11).' };
  if (unit.definition.artifactType === 'externalConnection') return { refusal: 'NO_RECIPE: the declaration of a system is written from the l4 text of the system (hosts, kinds, types, methods and verify are analysis).' };
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
  /** Event gap kept beside a written gateway file. The emitter returns one result, so the receipt carries it. */
  gapCode?: string;
  gapDetail?: string;
  /** d1_347 s8: the receipt says that the bridge of the cm stays (a unit of the module still names `CmGateway`). */
  note?: string;
}

export async function emitUnit(ctx: M12Context, unit: M12Unit): Promise<Emitted | EmitFailure> {
  const recipe = RECIPE_OF_TYPE[unit.definition.artifactType];
  const definitions = moduleDefinitions(ctx.units);
  const output = unit.outputRef;
  if (!recipe) return { code: 'NO_NAMED_HANDLER', detail: `${unit.definition.artifactType} has no recipe.` };
  let produced: EmitResult | PersistenceEmit | EmitFailure;
  if (recipe.startsWith('persistence.') || recipe === 'implement.integrationOutbound') {
    const referenceSeeds = recipe === 'persistence.persistenceSeeds' ? (ctx.referenceSeeds ?? []) : [];
    const persistenceId = recipe === 'implement.integrationOutbound' ? 'persistence.integrationOutbound' : recipe;
    produced = await emitPersistence(persistenceId, unit.definition, output, ctx.read, ctx.units.map(item => item.definition), referenceSeeds);
  }
  else if (recipe === 'structure.valueObject') produced = emitValueObject(unit.definition, output);
  else if (recipe === 'structure.httpController') produced = await emitController(unit.definition, output, ctx.read);
  else produced = await emitBehavior(recipe, unit.definition, output, ctx.read, definitions);
  if ('code' in produced) return produced;
  const gap = 'evidences' in produced ? produced.evidences.find(item => !item.passed && item.detail.startsWith('MECHANISM_')) : undefined;
  const gapCode = gap?.detail.startsWith('MECHANISM_UNBOUND') ? 'MECHANISM_UNBOUND' : gap?.detail.startsWith('MECHANISM_INCOMPATIBLE') ? 'MECHANISM_INCOMPATIBLE' : '';
  return {
    source: produced.source.endsWith('\n') ? produced.source : `${produced.source}\n`,
    imports: produced.imports,
    seeds: 'seeds' in produced ? produced.seeds : false,
    runsStub: produced.runsStub,
    ...(gapCode && gap ? { gapCode, gapDetail: gap.detail } : {}),
    ...(('evidences' in produced ? produced.evidences.find(item => item.id === 'cmBridgeKept') : undefined) ? { note: ('evidences' in produced ? produced.evidences.find(item => item.id === 'cmBridgeKept')?.detail : '') ?? '' } : {}),
  };
}

/** The l1 defs of the same module a unit depends on (l2 contracts and l4 sources are inputs, not units). */
export function dependencyUnits(ctx: M12Context, unit: M12Unit): M12Unit[] {
  return unit.definition.dependencies
    .map(ref => ctx.units.find(item => item.defRef === ref))
    .filter((item): item is M12Unit => !!item);
}

/**
 * Dependencies whose `.ts` is not in the stor. Empty = ready. A receipt does not decide. Only a dependency of the
 * same or an earlier layer is imported when the unit is emitted; a later one (the usecase an outbound event
 * names) is a reference, not an import, and does not block. `.defs.ts` is not the output.
 */
/**
 * The workflow units a request service waits for: the processes whose operations its routes reach through the
 * usecases they use (§11: the handler of such a route calls the process). Without the workflow file the request
 * cannot import it; it waited for nothing and spent three model calls on a gate it could not pass (tarefas 19/10).
 */
export function processUnitsOf(units: readonly M12Unit[], unit: M12Unit): M12Unit[] {
  if (unit.definition.artifactType !== 'requestService') return [];
  const requests = Array.isArray(unit.definition.data.requests) ? unit.definition.data.requests.filter(isRecord) : [];
  const used = new Set(requests.flatMap(row => Array.isArray(row.uses) ? row.uses.map(String) : []));
  const operations = new Set<string>();
  for (const item of units.filter(candidate => candidate.definition.artifactType === 'usecase' && used.has(candidate.unitId))) {
    const entityId = String(item.definition.data.entityId ?? '');
    for (const op of [item.definition.data.operation, item.definition.data.transitionRef]) if (typeof op === 'string' && op) operations.add(`${entityId}.${op}`);
  }
  return units.filter(candidate => candidate.definition.artifactType === 'workflowProcess'
    && Array.isArray(candidate.definition.data.operations)
    && candidate.definition.data.operations.some(row => isRecord(row) && operations.has(String(row.operation ?? ''))));
}

export async function blockingDependencies(ctx: M12Context, unit: M12Unit): Promise<string[]> {
  const out: string[] = [];
  const own = M12_LAYERS.indexOf(unit.layer);
  if (unit.layer === 'adapter') {
    const declaration = ctx.units.find(item => item.layer === 'external' && item.defRef === unit.defRef);
    if (declaration && !storExists(declaration.output)) out.push(`${declaration.defRef} (the declaration is not generated: run the external15 phase first)`);
  }
  for (const dep of [...dependencyUnits(ctx, unit), ...processUnitsOf(ctx.units, unit)]) {
    if (M12_LAYERS.indexOf(dep.layer) > own) continue;
    if (storExists(dep.output)) continue;
    const status = await readUnitStatus(ctx.run.project, ctx.run.module, dep.layer, dep.unitId);
    out.push(`${dep.defRef} (${status?.status ?? 'not materialized'}${status?.code ? ` ${status.code}` : ''})`);
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
  return (await unitInputParts(ctx, unit, extra)).hash;
}

/**
 * The same hash, plus its two halves (d1_329): `deps` is what other units and contracts give this one (the def text
 * and the output of a dependency unit, the contracts it reads, the declaration of an adapter); `own` is the rest
 * (recipe, def, appEnv, L4 sources, rules, seeds). `hash` is the hash of every part in the old order, unchanged.
 * Doubt goes to `own`: an own change generates as before.
 */
export async function unitInputParts(ctx: M12Context, unit: M12Unit, extra: readonly string[] = []): Promise<{ hash: string; own: string; deps: string }> {
  const parts: string[] = [M12_RECIPE_VERSION, unit.text, ctx.appEnv];
  const depIndex = new Set<number>();
  const dep = (...items: string[]): void => { for (const item of items) { depIndex.add(parts.length); parts.push(item); } };
  for (const ref of unit.definition.dependencies) {
    const text = (await ctx.read(ref)) ?? '<absent>';
    if (ctx.units.some(item => item.defRef === ref)) dep(ref, text); else parts.push(ref, text);
  }
  for (const unitDep of dependencyUnits(ctx, unit)) {
    const status = await readUnitStatus(ctx.run.project, ctx.run.module, unitDep.layer, unitDep.unitId);
    dep(unitDep.defRef, JSON.stringify(status?.outputs ?? {}));
  }
  for (const ref of contractRefs(unit.definition)) dep(ref, (await ctx.read(ref)) ?? '<absent>');
  if (unit.definition.artifactType === 'requestService') {
    const requests = Array.isArray(unit.definition.data.requests) ? unit.definition.data.requests.filter(isRecord) : [];
    const connectionIds = [...new Set(requests.flatMap(row => {
      const mark = /^([a-z][A-Za-z0-9]*)\.[a-z][A-Za-z0-9]*$/u.exec(String(row.serves ?? ''));
      return mark ? [mark[1]] : [];
    }))].sort();
    // d1_217: a route that receives a module event is derived from the L4 of the publisher and the entity it writes.
    const published = [...new Set(requests.flatMap(row => {
      const mark = /^([a-z][A-Za-z0-9]*)\.([a-z][A-Za-z0-9]*)$/u.exec(String(row.consumes ?? ''));
      return mark ? [`${mark[1]}.${mark[2]}`] : [];
    }))].sort();
    for (const mark of published) {
      const [from, eventId] = mark.split('.');
      const l4Text = (await ctx.read(`_${ctx.run.project}_/${integrationLogicalPath(from)}`)) ?? '<absent>';
      parts.push(`consumes:${mark}`, l4Text);
      const root = integrationOf(l4Text === '<absent>' ? null : l4Text);
      const line = isRecord(root) && Array.isArray(root.outbound) ? root.outbound.filter(isRecord).find(row => row.event === eventId || row.id === eventId) : undefined;
      const entityId = String(line?.on ?? '').split('.')[0];
      if (entityId) parts.push(`ontology:${entityId}`, (await ctx.read(`_${ctx.run.project}_/l4/${from}/ontology/${entityId}.defs.ts`)) ?? '<absent>');
    }
    if (connectionIds.length) {
      // A serve request is derived from the connection catalog. A page request still hashes only its page contract.
      for (const connectionId of connectionIds) {
        const found = await connectionCatalogSource(ctx.read, ctx.run.project, ctx.run.module, connectionId);
        dep(found.ref, found.source ?? '<absent>');
      }
    } else {
      // The page contract is the source of truth of a request service: its routes, JSDoc and types.
      const ref = `_${ctx.run.project}_/l2/${ctx.run.module}/web/contracts/${String(unit.definition.data.pageId ?? unit.unitId)}.defs.ts`;
      dep(ref, (await ctx.read(ref)) ?? '<absent>');
    }
  }
  if (unit.definition.artifactType === 'usecase') parts.push((await readOptional(rulesFile(ctx.run.project, ctx.run.module))) ?? '');
  // The declaration is read against the type and the validator of the runtime: a change there is a change of its input (d1_208).
  if (unit.definition.artifactType === 'externalConnection') parts.push((await ctx.read(DECLARATION_TYPES_REF)) ?? '<absent>');
  // The adapter is written against the declaration this run generated (d1_209).
  if (unit.layer === 'adapter') {
    const declaration = ctx.units.find(item => item.layer === 'external' && item.defRef === unit.defRef);
    dep(declaration ? (await ctx.read(declaration.outputRef)) ?? '<absent>' : '<no declaration unit>');
  }
  // A port and its adapter also carry the methods the workflow processes apply through them (§11).
  if (unit.definition.artifactType === 'repositoryPort' || unit.definition.artifactType === 'repositoryAdapter') {
    dep(JSON.stringify(ctx.units.filter(item => item.definition.artifactType === 'repositoryPort').map(item => item.definition.data.methods)));
  }
  // The initial rows of seedRows25 and the scenario rows it adds to the def in memory (d1_102 s3) both change the seeds.ts.
  if (unit.definition.artifactType === 'persistenceSeeds') parts.push(JSON.stringify(ctx.referenceSeeds ?? []), JSON.stringify(unit.definition.data.datasets ?? []));
  parts.push(...extra);
  return {
    hash: await hashParts(parts),
    own: await hashParts(parts.filter((_, index) => !depIndex.has(index))),
    deps: await hashParts(parts.filter((_, index) => depIndex.has(index))),
  };
}

function ruleRows(definition: M1Definition): Array<Record<string, unknown>> {
  return Array.isArray(definition.data.rulePlan) ? definition.data.rulePlan.filter(isRecord) : [];
}

/** rulePlan rows the generated code must name: local rules. Storage rows (`#uniqueKeys`) and `RULE_UNBOUND` stay out. */
export function rulesToEnforce(definition: M1Definition): string[] {
  const ids = ruleRows(definition)
    .filter(row => {
      const ruleId = String(row.ruleId ?? '');
      if (!ruleId || row.enforcement !== 'local') return false;
      return !String(row.origin ?? '').endsWith('#uniqueKeys');
    })
    .map(row => String(row.ruleId));
  return [...new Set(ids)].sort();
}

/** Rules no transition binds (`pending` / `RULE_UNBOUND`): shown in the usecase context, not required by the gate. */
export function rulesUnbound(definition: M1Definition): string[] {
  const ids = ruleRows(definition)
    .filter(row => String(row.ruleId ?? '') && row.enforcement === 'pending' && row.gap === 'RULE_UNBOUND')
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
  const halves = await unitInputParts(ctx, unit);
  const keep = { inputParts: { own: halves.own, deps: halves.deps }, ...(notApplicable.length ? { notApplicable: notApplicable.map(item => ({ ruleId: item.ruleId, reason: item.reason })) } : {}) };
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
    await writeUnitStatus(project, moduleName, { ...base(unit, attempt), status: 'blocked', code: 'RULE_NOT_EMITTED', diagnostic, inputHash, outputs, ...keep });
    return { status: 'blocked', code: 'RULE_NOT_EMITTED', line: `${unit.unitId}: blocked, RULE_NOT_EMITTED ${dropped.join(', ')}`, errors: [] };
  }
  if (unavailable) {
    // Generated and through every gate; the report lists it apart: no compiler proved it.
    await writeUnitStatus(project, moduleName, { ...base(unit, attempt), status: 'done', code: COMPILE_UNAVAILABLE_L1, diagnostic: `${unavailableCause}${waiver}`, inputHash, outputs, ...keep });
    return { status: 'done', code: COMPILE_UNAVAILABLE_L1, line: `${unit.unitId}: ${unit.outputRef} (not compiled: ${COMPILE_UNAVAILABLE_L1})`, errors: [] };
  }
  await writeUnitStatus(project, moduleName, { ...base(unit, attempt), status: 'done', code: '', diagnostic: waiver.trim(), inputHash, outputs, ...keep });
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
    const decision = await reuseDecision([unit.output], force);
    if (decision.kind === 'reuse') {
      await writeUnitStatus(project, moduleName, { ...base(unit), status: 'reused', code: '', diagnostic: '', inputHash, outputs: prior?.outputs ?? {} });
      return { status: 'reused', code: prior?.code ?? '', line: `${unit.unitId}: reused` };
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
    if (proved.status === 'done' && proved.code === '' && emitted.gapCode) {
      const written = await readUnitStatus(project, moduleName, unit.layer, unit.unitId);
      await writeUnitStatus(project, moduleName, { ...base(unit), status: 'gap', code: emitted.gapCode, diagnostic: emitted.gapDetail ?? emitted.gapCode, inputHash, outputs: written?.outputs ?? {} });
      return { status: 'gap', code: emitted.gapCode, line: `${unit.unitId}: gap, ${emitted.gapCode} ${clip(emitted.gapDetail ?? '', 300)}` };
    }
    if (proved.status === 'done' && proved.code === '' && emitted.note) {
      const written = await readUnitStatus(project, moduleName, unit.layer, unit.unitId);
      await writeUnitStatus(project, moduleName, { ...base(unit), status: 'done', code: '', diagnostic: emitted.note, inputHash, outputs: written?.outputs ?? {}, ...(written?.inputParts ? { inputParts: written.inputParts } : {}) });
      return { status: 'done', code: '', line: `${proved.line}; ${clip(emitted.note, 300)}` };
    }
    return { status: proved.status, code: proved.code, line: proved.line };
  } catch (error) {
    const diagnostic = clip(errorText(error), 2000);
    await writeUnitStatus(project, moduleName, { ...base(unit), status: 'failed', code: 'EXCEPTION', diagnostic, inputHash: '', outputs: {} }).catch(() => undefined);
    return { status: 'failed', code: 'EXCEPTION', line: `${unit.unitId}: failed, ${diagnostic}` };
  }
}

/** The selected units of one layer, dependencies first. */
export function layerUnits(selected: readonly M12Unit[], layer: M12Layer): M12Unit[] {
  // The adapter of a system is a second unit of the same def (d1_209): its layer is not the one its type maps to.
  return selected.filter(unit => unit.layer === layer && (LAYER_OF_TYPE[unit.definition.artifactType] === layer || layer === 'adapter'));
}

export type { M12FileInfo };
