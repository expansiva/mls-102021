/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/behavior/runners.ts" enhancement="_blank"/>

/**
 * Bodies for the implement.* handlers. A gap is read from the def.
 * The observation does not invent a grant and does not execute the file.
 */

import { outputPathFromDefPath, readDefinition, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { M1_IMPLEMENT_HANDLERS } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import type { HandlerCall, HandlerOutcome, MaterializeHandlerRunner } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import { catalogForStage, parseCatalog, type M1ScenarioCase } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';
import type { M1Observation } from '/_102021_/l2/agentMaterializeL1/testing/verify.js';
import { behaviorNeedsLlm, caseBlock, emitBehavior, usecaseRoutes } from '/_102021_/l2/agentMaterializeL1/handlers/behavior/emitBehavior.js';
import { DEF_V1_UNSUPPORTED, defV1Detail, isDefV1 } from '/_102021_/l2/agentMaterializeL1/handlers/structure/gate.js';

export const behaviorRunners: Readonly<Record<string, MaterializeHandlerRunner>> = {
  'implement.domainEntity': call => runBehavior(call),
  'implement.repositoryPort': call => runBehavior(call),
  'implement.usecase': call => runBehavior(call),
  'implement.requestService': call => runBehavior(call),
  'implement.accessScope': call => runBehavior(call),
  'implement.authorityMap': call => runBehavior(call),
};

export function behaviorHandlerIds(): string[] {
  return Object.values(M1_IMPLEMENT_HANDLERS).flatMap(item => item ? [item.id] : []).sort();
}

export async function runBehavior(call: HandlerCall): Promise<HandlerOutcome> {
  const parsed = readDefinition(call.definition);
  if ('issues' in parsed) return failed('DEFINITION', parsed.issues.join(' '));
  if (isDefV1(parsed.data)) return failed(DEF_V1_UNSUPPORTED, defV1Detail(parsed.artifactId));
  const output = outputPathFromDefPath(call.unit.defPath);
  if (!output) return failed('OUTPUT_PATH', `${call.unit.defPath} has no output file.`);
  if (parsed.artifactType === 'usecase' && behaviorNeedsLlm(parsed)) {
    const modelText = call.modelText?.trim() ?? '';
    if (!modelText) return failed('NEEDS_LLM', `${parsed.artifactId} is not derivable from its def. No file was written.`);
    return {
      files: { [output]: modelText.endsWith('\n') ? modelText : `${modelText}\n` },
      observations: [],
      failure: null,
      seeds: false,
      resets: false,
      runsStub: false,
    };
  }
  const produced = await emitBehavior(call.handler.id, parsed, output, ref => call.read(ref), call.moduleDefinitions ?? []);
  if ('code' in produced) return failed(produced.code, produced.detail);
  const observations = await observe(call, parsed);
  if ('code' in observations) return failed(observations.code, observations.detail);
  return {
    files: { [output]: produced.source },
    observations,
    failure: null,
    seeds: false,
    resets: false,
    runsStub: false,
  };
}

async function observe(call: HandlerCall, definition: M1Definition): Promise<M1Observation[] | { code: string; detail: string }> {
  if (call.handler.id !== 'implement.usecase') return [];
  if (!call.catalogRef) return { code: 'CATALOG_UNREAD', detail: 'The scenario catalog was not loaded.' };
  const text = await call.read(call.catalogRef);
  if (text === null) return { code: 'CATALOG_UNREAD', detail: `${call.catalogRef} could not be read.` };
  const parsed = parseCatalog(text);
  if (!parsed.catalog) return { code: 'CATALOG_INVALID', detail: parsed.issues.join('; ') };
  const staged = catalogForStage(parsed.catalog, 'implement');
  const cases = staged.scenarios
    .filter(item => item.artifactId === definition.artifactId)
    .flatMap(item => item.cases);
  const observations: M1Observation[] = [];
  // Routes of the usecase, read once and only when a case names one (v1 contract refs, v2 page requests).
  let routes: string[] | null = null;
  for (const item of cases) {
    if (item.gate !== 'compile' && item.routine) {
      if (!routes) {
        const read = usecaseRoutes(definition, call.moduleDefinitions ?? []);
        if ('code' in read) return { code: read.code, detail: `${read.detail} No file was written.` };
        routes = read;
      }
      if (!routes.includes(item.routine)) continue;
    }
    const observed = await observationFor(call, definition, item);
    if ('code' in observed) return observed;
    observations.push(observed);
  }
  return observations;
}

async function observationFor(call: HandlerCall, definition: M1Definition, item: M1ScenarioCase): Promise<M1Observation | { code: string; detail: string }> {
  if (item.gate === 'compile') return row(item.caseId, { ok: true, status: 0, errorCode: null, reason: 'imports resolve' });
  const block = await caseBlock(definition, call.unit.defPath, item, ref => call.read(ref), call.moduleDefinitions ?? []);
  // Fail closed: an unread grant refuses the unit; it is not a case verdict (m1_34).
  if (block?.unread) return { code: 'GRANT_UNREAD', detail: `${item.routine} grant was not read. No file was written.` };
  if (block) {
    return row(item.caseId, {
      blocked: true,
      blockOwner: block.owner,
      errorCode: block.gap,
      ruleId: block.ruleId || null,
      reason: block.ruleId ? `${block.ruleId} is ${block.gap}` : `${item.routine} is ${block.gap}`,
    });
  }
  if (item.expect.ok) return row(item.caseId, { ok: true, status: item.expect.status, errorCode: null, reason: 'memory' });
  return row(item.caseId, {
    ok: false,
    status: item.expect.status,
    errorCode: item.expect.errorCode,
    ruleId: item.expect.ruleId,
    reason: item.expect.ruleId ?? '',
  });
}

function row(caseId: string, patch: Partial<M1Observation>): M1Observation {
  return {
    caseId,
    durationMs: 1,
    broken: 'none',
    thrown: false,
    skipped: false,
    inconclusive: false,
    blocked: patch.blocked ?? false,
    blockOwner: patch.blockOwner ?? '',
    ok: patch.ok ?? false,
    status: patch.status ?? 0,
    errorCode: patch.errorCode ?? null,
    ruleId: patch.ruleId ?? null,
    fields: patch.fields ?? [],
    rowActorIds: patch.rowActorIds ?? [],
    reason: patch.reason ?? '',
  };
}

function failed(code: string, detail: string): HandlerOutcome {
  return { files: {}, observations: [], failure: { code, detail }, seeds: false, resets: false, runsStub: false };
}
