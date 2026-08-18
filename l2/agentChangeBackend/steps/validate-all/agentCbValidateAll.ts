/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/validate-all/agentCbValidateAll.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Integrity barrier: BLOCKING after register (preSeeds=false), NON-BLOCKING before seeds
// (preSeeds=true: findings are console warnings + health report and the flow continues to seeds).
// It reads the SAVED l1 .defs.ts files and checks coverage/integrity (each
// owner produced its artifacts; no MDM/horizontal table emitted), and runs the WHOLE-PROJECT compile
// over the materialized .ts (the layer sweep defers its compile gate — findings there can be false
// while siblings materialize; here they are real). On success -> finalize. On failure,
// findings that map to a MATERIALIZATION-level component (bad/missing .ts) trigger up to
// GLOBAL_REPAIR_BUDGET global repair rounds: the component defs are forced stale, the findings are
// recorded (cbRepair) and cb-materialize is re-enqueued in repair mode — the flow reconverges back
// here (unique planId). Findings that are DEFS-level (missing port/entity defs, defs route missing,
// controller/usecase defs mismatch) are NOT repairable by re-materializing: the run fails CLEAN with
// the objective trace. Budget exhausted -> clean failure too.
// (Repair loop block: todo/ajustesFinaisChangeBackend.md §2.)

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createStorFile } from '/_102027_/l2/libStor.js';
import { cbTraceFolder } from '/_102021_/l2/agentChangeBackend/helpers/cbTraceScope.js';
import { readBackendScan, enqueueNext, enqueueNextInPhase, createUpdateStatusIntent, isRecord, readStringArray, lowerFirst, logPrefix, ALL_STATUSES, MDM_WRITE_PATH_ENABLED } from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { collectPersistencePolicyIssues } from '/_102021_/l2/agentChangeBackend/helpers/cbMdmPolicy.js';
import {
  readRepairState, saveRepairState, forceDefsStale, clearRepairState, saveHealthReport, pushHistory,
  mergeComponentRepair, GLOBAL_REPAIR_BUDGET,
} from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';
import {
  fileIsPresent, getFileModified, compileSavedTsAndGetErrors, getContentByMlsPath,
  flushBorrowedModels, modelCounts, compileModuleAndGetErrors,
} from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeIo.js';
import { isStale, shouldTargetedRescue } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeCore.js';

// T6: one targeted rescue round (outside the global budget) fires only for a SMALL, compiler-only
// residual — a larger or non-compiler residual is a genuine failure, not a last-mile fix.
const RESCUE_MAX_TARGETS = 4;
import { syntaxDiagnostics } from '/_102021_/l2/agentChangeBackend/helpers/cbSyntaxValidation.js';
import { collectRawMdmAccessIssues } from '/_102021_/l2/agentChangeBackend/helpers/cbMdmGuards.js';
import {
  collectL1Imports, collectRelativeImportIssues, escapeRegExp, fieldNameFromRef, requiredBoundaryFields, collectRequiredChecksByHandler,
  collectExportedHandlers, collectRouteHandlers, collectUsecaseRules, normalizeRuleId,
  stableCompilerErrors, selectCompilerRepairRoots,
  collectOrphanDefsFindings, collectMissingCanonicalRouteIssues,
} from '/_102021_/l2/agentChangeBackend/helpers/cbComponentValidators.js';

// Parse the FIRST `export const ... = {...} as const;` (the artifact). NB: parseDefsSource in cbShared
// uses the LAST ` as const;`, which on an l1 defs (artifact + pipeline) would span both exports and
// fail; here we need only the artifact's data block.
function parseArtifact(content: string): Record<string, unknown> | undefined {
  const s = content.indexOf('= ');
  const e = content.indexOf(' as const;');
  if (s === -1 || e <= s) return undefined;
  try { const o = JSON.parse(content.slice(s + 2, e)); return isRecord(o) ? o : undefined; } catch { return undefined; }
}

export function createAgent(): IAgentAsync {
  return { agentName: 'agentCbValidateAll', agentProject: 102021, agentFolder: 'agentChangeBackend/steps/validate-all', agentDescription: 'Deterministic non-blocking l1 coverage/integrity report', visibility: 'private', beforePromptStep };
}

/**
 * A durable "where am I" for the longest step of the run. The task record only learns the outcome at
 * the end, so a sweep that dies (out of memory, killed tab) used to leave the step in
 * waiting_human_input with nothing recorded anywhere. One small file, overwritten per block.
 */
/** `models: registry=X pending=Y` — the question the console answered by hand, now on the task. */
function modelsTrace(): string {
  const counts = modelCounts();
  return ` models: registry=${counts.registry} pendingRelease=${counts.pendingRelease}.`;
}

async function saveValidateProgress(
  project: number,
  progress: { phase: string; done: number; total: number; models: { registry: number; pendingRelease: number }; released?: number },
): Promise<void> {
  try {
    const info = { project, level: 4, folder: cbTraceFolder(), shortName: 'cb-validate-progress', extension: '.json' };
    const source = `${JSON.stringify({ ...progress, savedAt: new Date().toISOString() }, null, 2)}\n`;
    const key = mls.stor.getKeyToFile(info);
    let file = mls.stor.files[key];
    if (!file) file = await createStorFile({ ...info, source }, false, false, false);
    await mls.stor.localStor.setContent(file, { contentType: 'string', content: source });
  } catch { /* progress is diagnostics: never fail the step over it */ }
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    let preSeeds = false;
    try { preSeeds = JSON.parse(String(step.prompt || '{}'))?.preSeeds === true; } catch { /* post-register validation */ }
    // A1 (T10): ALL_STATUSES, not ['toCreate','inProgress']. Every use of this scan here is a
    // PROPERTY/STRUCTURE question — "which module is this?", "which workspaces exist?", "which ids are
    // MDM?", "does this defs belong to an operation?", "does this controller expose its canonical
    // route?" — and none of them depends on what is still PENDING. With the pending filter, the
    // gen-http `done` flip (which means "defs generated") emptied scan.owners and every one of the 20
    // usecases generated by the run was reported as an orphan, blocking the repair round for the 2 real
    // findings (erro5). The audit of all 5 scan uses is in todo/changeBackend/erro5_changeBackend_tasks.md.
    const scan = await readBackendScan(ALL_STATUSES, context);
    const project = mls.actualProject || 0;
    const moduleName = scan.moduleNames[0] || 'unknown';
    const moduleFolderPrefix = `${moduleName}/`;
    // l4 v2: a module that declares workspaces gets deterministic per-workspace controllers (orphan .ts,
    // no .defs.ts) + the l1 contract mirror. The controller/route/orphan checks below branch on this.
    const moduleWorkspaces = scan.workspaces.filter(w => w.moduleName === moduleName);
    const isV2 = moduleWorkspaces.length > 0;
    let l1Defs = 0;
    let mdmTableViolations = 0;
    const mdmIds = new Set(scan.entities.filter(e => e.kind === 'mdm').map(e => e.entityId.toLowerCase()));
    // Item 4 of the MDM write path: the entities whose l4 declares where they live, so the policy gate
    // can compare the DECLARATION against the artifacts that were actually generated.
    const policyEntities = scan.entities.map(e => ({ entityId: e.entityId, kind: e.kind, storageTarget: e.storageTarget || '' }));
    const persistenceArtifacts: string[] = [];
    const portDefs = new Set<string>();    // lowercased shortNames present in layer_2_application/ports
    const domainDefs = new Set<string>();  // lowercased shortNames present in layer_3_domain/entities
    const mdmDomainArtifacts: string[] = [];
    const usecases: { id: string; ports: string[]; rulesApplied: string[] }[] = [];
    const usecaseFnNames = new Map<string, Set<string>>(); // usecaseId (lc) -> exported function names
    const controllers: {
      id: string;
      refs: string[];
      handlers: { handlerName: string; inputContract: unknown; usecaseRef: string }[];
      routes: { key: string; handlerName: string }[];
    }[] = []; // handler usecaseRefs per controller
    const tsSet = new Set<string>();       // `${folder}::${shortName}` of MATERIALIZED .ts outputs
    const tsFiles: { folder: string; shortName: string; real: string }[] = [];
    const defsFiles: { folder: string; shortName: string; real: string }[] = []; // each .defs.ts (real = original-case shortName)
    const syntaxIssues: { folder: string; shortName: string; message: string }[] = [];
    // MATERIALIZATION-level findings routed to their origin component (defRef -> findings). Only these
    // are candidates for the global repair round; everything else fails clean.
    const repairTargets = new Map<string, string[]>();
    const mappedMsgs = new Set<string>();
    // T2 sanity guard: how many whole-project compile findings were suppressed as flaky (non-reproducible
    // on double-check) or as cascade (importer of a file that itself has a finding). Logged to the round
    // health report + trace so a suppressed-then-reappearing finding is auditable (deferred, never lost).
    let flakyCompilerSuppressed = 0;
    let cascadeCompilerSuppressed = 0;
    const addRepair = (defRef: string, msg: string): void => {
      const list = repairTargets.get(defRef) || [];
      list.push(msg);
      repairTargets.set(defRef, list);
      mappedMsgs.add(msg);
    };
    const defRefByLc = new Map<string, string>(); // `${folderSuffix}::${lcShortName}` -> defRef
    const defRefOf = (folder: string, real: string): string => `_${project}_/l1/${folder}/${real}.defs.ts`;
    const importReqs: { from: string; key: string; target: string }[] = []; // module-local l1 imports to resolve
    const usecaseSources = new Map<string, string>(); // usecase shortName (lc) -> generated .ts
    const controllerSources = new Map<string, string>(); // controller shortName (lc) -> generated .ts
    const persistenceSources = new Map<string, string>(); // adapters/persistence shortName (lc) -> generated .ts
    for (const file of Object.values(mls.stor.files) as any[]) {
      if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted') continue;
      const folder0 = String(file.folder || '');
      // A Studio project can retain artifacts from a previous module. Validation must only compare
      // the module described by the current scan; otherwise same-named cafeFlow/petShop files are
      // cross-paired and turn a clean current module into false blocking findings.
      if (!folder0.startsWith(moduleFolderPrefix)) continue;
      const shortName0 = String(file.shortName || '');
      // Collect materialized .ts outputs (not the .defs.ts / .d.ts) for the completeness check, and
      // record their module-local l1 imports for the cross-file resolution check below.
      if (file.extension === '.ts' && !shortName0.endsWith('.defs') && !shortName0.endsWith('.d')) {
        const content = String(await file.getContent());
        tsSet.add(`${folder0}::${shortName0.toLowerCase()}`);
        tsFiles.push({ folder: folder0, shortName: shortName0.toLowerCase(), real: shortName0 });
        for (const issue of syntaxDiagnostics(content)) {
          syntaxIssues.push({ folder: folder0, shortName: shortName0.toLowerCase(), message: `TS5076 -> ${folder0}/${shortName0}.ts ${issue}` });
        }
        if (folder0.endsWith('/layer_2_application/usecases')) {
          usecaseSources.set(shortName0.toLowerCase(), content);
          if (/\/_\d+_\/l1\/[^'"]*\/layer_3_domain\/rules\//.test(content)) {
            importReqs.push({
              from: `${folder0}/${shortName0}`,
              key: '__invalid_rule_import__',
              target: 'rulesApplied must be applied inline; layer_3_domain/rules/* is not generated by agentChangeBackend',
            });
          }
        }
        if (folder0.endsWith('/adapters/http/controllers')) controllerSources.set(shortName0.toLowerCase(), content);
        if (folder0.endsWith('/adapters/persistence')) persistenceSources.set(shortName0.toLowerCase(), content);
        for (const req of collectL1Imports(content, project)) {
          importReqs.push({ from: `${folder0}/${shortName0}`, key: req.key, target: req.target });
        }
        // Alias-only imports (same rule as the materialize worker): a relative import escapes
        // collectL1Imports entirely, so without this check it would pass the gate unseen.
        for (const issue of collectRelativeImportIssues(content)) {
          importReqs.push({ from: `${folder0}/${shortName0}`, key: '__relative_import__', target: issue });
        }
        const compact = content.replace(/\s+/g, ' ');
        if (/mdmEntityIndex\.findMany\(\s*\{[^}]*where\s*:\s*\{[^}]*\b(entityType|entityId|productId|warehouseId)\s*:/.test(compact)) {
          importReqs.push({
            from: `${folder0}/${shortName0}`,
            key: '__invalid_mdm_index_filter__',
            target: 'mdmEntityIndex uses invented fields; use MdmEntityIndexRecord fields and load module data from mdmDocument.details',
          });
        }
        if (/mdmRelationship/.test(content) && /\b(source_entity_|target_entity_)/.test(content)) {
          importReqs.push({
            from: `${folder0}/${shortName0}`,
            key: '__invalid_mdm_relationship_shape__',
            target: 'mdmRelationship uses invented source_entity/target_entity fields; use MdmRelationshipRecord fromId/toId/type',
          });
        }
        for (const issue of collectRawMdmAccessIssues(content)) {
          importReqs.push({
            from: `${folder0}/${shortName0}`,
            key: '__invalid_raw_mdm_access__',
            target: issue,
          });
        }
        continue;
      }
      if (file.extension !== '.defs.ts') continue;
      l1Defs++;
      const folder = folder0;
      const shortName = shortName0.toLowerCase();
      defsFiles.push({ folder, shortName, real: shortName0 });
      if (folder.endsWith('/layer_2_application/usecases')) defRefByLc.set(`usecases::${shortName}`, defRefOf(folder, shortName0));
      if (folder.endsWith('/adapters/http/controllers')) defRefByLc.set(`controllers::${shortName}`, defRefOf(folder, shortName0));
      if (folder.includes('/adapters/persistence')) {
        persistenceArtifacts.push(shortName);
        if (mdmIds.has(shortName)) mdmTableViolations++;
      }
      if (folder.endsWith('/layer_2_application/ports')) portDefs.add(shortName);
      else if (folder.endsWith('/layer_3_domain/entities')) {
        if (mdmIds.has(shortName)) mdmDomainArtifacts.push(`${folder}/${shortName}.defs.ts`);
        else domainDefs.add(shortName);
      }
      else if (folder.endsWith('/layer_2_application/usecases')) {
        const artifact = parseArtifact(String(await file.getContent()));
        const data = artifact && isRecord(artifact.data) ? artifact.data : undefined;
        usecases.push({ id: shortName, ports: data ? readStringArray(data.ports) : [], rulesApplied: collectUsecaseRules(data) });
        const fns = data && Array.isArray((data as any).functions) ? (data as any).functions : [];
        usecaseFnNames.set(shortName, new Set<string>(fns.map((f: any) => String(f?.functionName || '')).filter(Boolean)));
      } else if (folder.endsWith('/adapters/http/controllers')) {
        const artifact = parseArtifact(String(await file.getContent()));
        const data = artifact && isRecord(artifact.data) ? artifact.data : undefined;
        const handlers = data && Array.isArray((data as any).handlers) ? (data as any).handlers : [];
        const routes = data && Array.isArray((data as any).routes) ? (data as any).routes : [];
        controllers.push({
          id: shortName,
          refs: handlers.map((h: any) => String(h?.usecaseRef || '')).filter(Boolean),
          handlers: handlers.filter(isRecord).map((h: any) => ({
            handlerName: String(h?.handlerName || ''),
            inputContract: h?.inputContract,
            usecaseRef: String(h?.usecaseRef || ''),
          })).filter((h: { handlerName: string }) => !!h.handlerName),
          routes: routes.filter(isRecord).map((r: any) => ({
            key: String(r?.key || ''),
            handlerName: String(r?.handlerName || ''),
          })).filter((r: { key: string; handlerName: string }) => !!r.key && !!r.handlerName),
        });
      }
    }

    // INTEGRITY: every port a usecase references must have a port .defs.ts AND a domain entity .defs.ts.
    // Catches the "usecase imports a module that was never generated" class of errors before tsc.
    const missing: string[] = [];
    for (const artifact of mdmDomainArtifacts) {
      missing.push(`mdm local domain artifact forbidden -> ${artifact}`);
    }
    // A local table for master data is valid CODE, which is why nothing failed in run 9 while three
    // shared registries were being duplicated per module. Only a policy finding makes it blocking; it
    // stays behind the write-path flag because with the flag off `mdm + moduleOwned` legitimately IS a
    // local aggregate (the band-aid this replaces).
    if (MDM_WRITE_PATH_ENABLED) {
      missing.push(...collectPersistencePolicyIssues(policyEntities, {
        domainEntities: [...mdmDomainArtifacts.map(a => a.split('/').pop()?.replace(/\.defs\.ts$/u, '') || ''), ...domainDefs],
        ports: portDefs,
        persistence: persistenceArtifacts,
      }));
    }
    for (const uc of usecases) {
      for (const p of uc.ports) {
        if (mdmIds.has(p.toLowerCase())) continue;   // mdm = master data read by id via 102034; no local port/entity
        const portSn = `${lowerFirst(p)}Repository`.toLowerCase();
        const domSn = lowerFirst(p).toLowerCase();
        if (!portDefs.has(portSn)) missing.push(`usecase ${uc.id} -> missing port ${lowerFirst(p)}Repository`);
        if (!domainDefs.has(domSn)) missing.push(`usecase ${uc.id} -> missing entity ${lowerFirst(p)}`);
      }
    }

    // COHERENCE (item 3): every controller handler must reference a function the usecase actually
    // exports. Catches the "controller imports an export the usecase never produced" break (orderFlow).
    // V1: controller id == usecase id (per operation). V2: controller id == workspaceId and each handler
    // ref points at a DIFFERENT operation's usecase export, so check against ALL the module's exports.
    const allUsecaseFns = new Set<string>();
    for (const fns of usecaseFnNames.values()) for (const fn of fns) allUsecaseFns.add(fn);
    for (const c of controllers) {
      const fns = isV2 ? allUsecaseFns : usecaseFnNames.get(c.id);
      for (const ref of c.refs) {
        if (ref.includes(' | ')) continue; // dispatcher / composed handler delegates to the concrete functions
        if (!fns) { missing.push(`controller ${c.id} -> usecase defs not found`); break; }
        if (!fns.has(ref)) missing.push(`controller ${c.id} -> usecase export '${ref}' not found (has: ${[...fns].slice(0, 20).join(', ') || 'none'})`);
      }
    }

    // ROUTES + HANDLER BOUNDARY: every route from the controller defs must be present in the generated
    // .ts and point to an exported handler. Required field validation must stay within the public L4
    // inputContract; contextResolution-only fields are resolved context, not mandatory request params.
    for (const c of controllers) {
      const handlerNames = new Set(c.handlers.map(h => h.handlerName));
      for (const route of c.routes) {
        if (!handlerNames.has(route.handlerName)) missing.push(`controller ${c.id} -> route ${route.key} points to missing handler ${route.handlerName}`);
      }
      const source = controllerSources.get(c.id);
      if (!source) continue;
      const controllerDefRef = defRefByLc.get(`controllers::${c.id}`);
      const pushControllerTsIssue = (msg: string): void => {
        missing.push(msg);
        if (controllerDefRef) addRepair(controllerDefRef, msg); // bad .ts -> re-materializable
      };
      const exportedHandlers = collectExportedHandlers(source);
      const emittedRoutes = collectRouteHandlers(source);
      const requiredChecks = collectRequiredChecksByHandler(source);
      for (const handler of c.handlers) {
        if (!exportedHandlers.has(handler.handlerName)) pushControllerTsIssue(`controller ${c.id} -> handler ${handler.handlerName} not exported in .ts`);
        const allowedRequired = requiredBoundaryFields(handler.inputContract);
        for (const checked of requiredChecks.get(handler.handlerName) ?? []) {
          if (!allowedRequired.has(checked)) {
            pushControllerTsIssue(`controller ${c.id} -> handler ${handler.handlerName} requires '${checked}' outside l4 inputContract`);
          }
        }
      }
      for (const route of c.routes) {
        const emittedHandler = emittedRoutes.get(route.key);
        if (emittedHandler !== route.handlerName) {
          pushControllerTsIssue(`controller ${c.id} -> route ${route.key} not exported with handler ${route.handlerName}`);
        }
      }
    }

    // V1-only canonical bffName route (per-operation controller). v2 controllers are per-WORKSPACE with
    // routes = bffCalls (checked by the coherence + routes checks above, which now apply because a v2
    // controller HAS a .defs.ts with handlers/routes and an LLM-materialized .ts).
    if (!isV2) {
      // Pure + unit-tested; the ALL_STATUSES scan (A1) keeps this working for owners already flipped to
      // `done` by gen-http — with the old pending-filtered scan it silently checked nothing post-gen-http.
      missing.push(...collectMissingCanonicalRouteIssues(scan.owners, controllers, moduleName, lowerFirst));
    }

    // COMPLETENESS (items 4 & 6): every .defs.ts must have its materialized .ts sibling. This is the
    // project-level barrier the per-file Monaco compile cannot see — it stops finalize from marking the
    // owners done while any .ts is still missing (the "finalize before materialization finished" gap).
    for (const d of defsFiles) {
      if (!tsSet.has(`${d.folder}::${d.shortName}`)) {
        const msg = `materialization incomplete -> ${d.folder}/${d.shortName}.ts not generated from its .defs.ts`;
        missing.push(msg);
        addRepair(defRefOf(d.folder, d.real), msg); // missing .ts -> re-materializable
        continue;
      }
      // STALENESS (lesson task2/102049): a worker that failed validation saves NO .ts, but an OLD .ts
      // from a previous run may still exist and silently mask the failure ("passed" with outdated
      // code). A .defs.ts newer than its materialized .ts means the current defs were never
      // materialized -> blocking finding, re-materializable.
      const defsMs = getFileModified(project, 1, d.folder, d.real, '.defs.ts');
      const tsMs = getFileModified(project, 1, d.folder, d.real, '.ts');
      if (isStale(defsMs, tsMs, fileIsPresent(project, 1, d.folder, d.real, '.ts'))) {
        const msg = `materialization stale -> ${d.folder}/${d.shortName}.ts is older than its .defs.ts (failed worker masked by a previous run's output)`;
        missing.push(msg);
        addRepair(defRefOf(d.folder, d.real), msg);
      }
    }

    // Syntax fallback is repeated at the gate: a compiler unavailable in a worker cannot turn a
    // syntactically invalid cached output into a clean materialization result.
    for (const issue of syntaxIssues) {
      missing.push(issue.message);
      const defs = defsFiles.find(d => d.folder === issue.folder && d.shortName === issue.shortName);
      if (defs) addRepair(defRefOf(defs.folder, defs.real), issue.message);
    }

    // CROSS-FILE IMPORTS: every module-local l1 import in a generated .ts must resolve to a generated
    // .ts. Root guard for hallucinated modules (e.g. importing layer_3_domain/rules/* — rules live
    // inside the entity, that folder is never generated). Catches it deterministically before the VM build.
    for (const req of importReqs) {
      if (req.key === '__relative_import__') {
        const msg = `relative import -> ${req.from}.ts: ${req.target}`;
        missing.push(msg);
        addRepair(`_${project}_/l1/${req.from}.defs.ts`, msg); // bad .ts -> re-materializable
        continue;
      }
      if (req.key === '__invalid_mdm_index_filter__' || req.key === '__invalid_mdm_relationship_shape__' || req.key === '__invalid_rule_import__' || req.key === '__invalid_raw_mdm_access__') {
        const msg = `platform contract violation -> ${req.from}.ts: ${req.target}`;
        missing.push(msg);
        addRepair(`_${project}_/l1/${req.from}.defs.ts`, msg); // bad .ts -> re-materializable
        continue;
      }
      if (!tsSet.has(req.key)) {
        const msg = `import unresolved -> ${req.from}.ts imports '${req.target}' which was not generated`;
        missing.push(msg);
        addRepair(`_${project}_/l1/${req.from}.defs.ts`, msg); // hallucinated import -> re-materializable
      }
    }

    // WHOLE-PROJECT COMPILE (user decision 2026-07-17, run 102049-e): the per-file compile of the
    // layer sweep is DEFERRED (siblings/other layers still materializing produced false TS2792/type
    // findings that burned repair budget). Here every generated .ts exists, so compiler findings are
    // REAL and re-materializable via the global repair rounds.
    //
    // T2: two defenses BEFORE a compiler finding becomes an LLM re-materialization (erro4: g1/g2 flagged
    // ~43 files — ports included — while the final pass found 3, and $4.50 was spent re-generating
    // already-correct files). Both are local compute (zero LLM) and NEVER drop a real error: every pass
    // recomputes from scratch and the post-register pass compiles all files, so a suppressed finding that
    // is real re-appears and is caught later.
    const compileFlagged = new Map<string, { folder: string; real: string; errors: string[] }>();
    // MEMORY + VISIBILITY (run be3: this step compiled ~200 files, each borrowing the models of its
    // imports, and the tab ran out of memory before the step could say anything). The borrow queue
    // only drains at a quiescent point, which a long sweep never reaches on its own, so it is drained
    // every block; and each block leaves a durable progress line, so a run that dies mid-sweep still
    // says WHERE it was.
    const compileBlock = 25;
    const startCounts = modelCounts();
    await saveValidateProgress(project, { phase: 'compile', done: 0, total: defsFiles.length, models: startCounts });
    const inScope = defsFiles.filter(d => tsSet.has(`${d.folder}::${d.shortName}`)); // the rest is a completeness finding
    // ONE pass over the module: the models are loaded once and the TS worker answers per file from its
    // incremental program. The old loop paid `N × the platform` (~6s/file, ~20 min for 193 files) and
    // paid it twice for every flagged file. Falls back to the per-file path when the worker is absent.
    const single = await compileModuleAndGetErrors(project, inScope.map(d => ({ folder: d.folder, shortName: d.real })));
    if (single) {
      const flaggedFirst = inScope.filter(d => (single.get(`${d.folder}::${d.real}`) || []).length);
      // The stable model set removes the flakiness the double compile existed for; ONE re-ask of the
      // flagged files, in the same worker session, keeps `stableCompilerErrors` meaningful and cheap.
      const second = flaggedFirst.length
        ? await compileModuleAndGetErrors(project, flaggedFirst.map(d => ({ folder: d.folder, shortName: d.real })))
        : new Map<string, string[]>();
      for (const d of flaggedFirst) {
        const key = `${d.folder}::${d.real}`;
        const first = single.get(key) || [];
        const stable = stableCompilerErrors(first, second?.get(key) || first);
        flakyCompilerSuppressed += first.length - stable.length;
        if (stable.length) compileFlagged.set(`${d.folder}::${d.shortName}`, { folder: d.folder, real: d.real, errors: stable });
      }
      await saveValidateProgress(project, { phase: 'compile-single-pass', done: inScope.length, total: defsFiles.length, models: modelCounts() });
    } else {
      let compiled = 0;
      for (const d of inScope) {
        compiled++;
        if (compiled % compileBlock === 0) {
          const flushed = await flushBorrowedModels();
          await saveValidateProgress(project, { phase: 'compile', done: compiled, total: inScope.length, models: modelCounts(), released: flushed.released });
        }
        const first = await compileSavedTsAndGetErrors(project, d.folder, d.real);
        if (!first.length) continue;
        // STEP 2 (double-check vs H1 — flaky): recompile once more (models/imports now settled) and keep
        // only errors that reproduce. A transient finding (Monaco model lag / ensureImportModels
        // best-effort) must not force a full re-generation of a file that was already correct.
        const second = await compileSavedTsAndGetErrors(project, d.folder, d.real);
        const stable = stableCompilerErrors(first, second);
        flakyCompilerSuppressed += first.length - stable.length;
        if (stable.length) compileFlagged.set(`${d.folder}::${d.shortName}`, { folder: d.folder, real: d.real, errors: stable });
      }
    }
    // STEP 3 (cascade dedup vs H2 — derived): a broken file B stays saved (saveGeneratedTs writes before
    // the gate), so importers of B report DERIVED errors. Resolve each flagged file's l1 imports, then
    // keep only ROOTS this round (a file that imports another flagged file is deferred — fixing the root
    // almost always clears it, and it is re-flagged next round / by the final pass if not).
    const importsByKey = new Map<string, string[]>();
    for (const [key, info] of compileFlagged) {
      const tsContent = await getContentByMlsPath(`_${project}_/l1/${info.folder}/${info.real}.ts`);
      importsByKey.set(key, tsContent ? collectL1Imports(tsContent, project).map(req => req.key) : []);
    }
    const endFlush = await flushBorrowedModels();
    await saveValidateProgress(project, { phase: 'compile-done', done: inScope.length, total: defsFiles.length, models: modelCounts(), released: endFlush.released });
    const { cascades } = selectCompilerRepairRoots(compileFlagged.keys(), key => importsByKey.get(key) ?? []);
    const cascadeSet = new Set(cascades);
    for (const [key, info] of compileFlagged) {
      if (cascadeSet.has(key)) { cascadeCompilerSuppressed += info.errors.length; continue; }
      for (const err of info.errors.slice(0, 6)) {
        const msg = `compiler -> ${info.folder}/${info.real}.ts: ${err}`;
        missing.push(msg);
        addRepair(defRefOf(info.folder, info.real), msg);
      }
    }

    // RULES APPLIED: if a usecase defs says a rule is applied, the materialized .ts must mention that
    // rule id. This blocks the concrete "referenced in defs and then disappeared" class, while the
    // explicit rule-import ban above keeps the current strategy inline.
    for (const uc of usecases) {
      if (!uc.rulesApplied.length) continue;
      const source = usecaseSources.get(uc.id);
      if (!source) continue;
      for (const rule of uc.rulesApplied) {
        if (!new RegExp(`\\b${escapeRegExp(rule)}\\b`).test(source)) {
          const msg = `usecase ${uc.id} -> rulesApplied '${rule}' not present in generated .ts`;
          missing.push(msg);
          const ucDefRef = defRefByLc.get(`usecases::${uc.id}`);
          if (ucDefRef) addRepair(ucDefRef, msg); // rule dropped in .ts -> re-materializable
        }
      }
    }
    // TABLE BINDING (lesson run 2026-07-16 cafeFlow: getTable('orders') vs tableName 'order'): every
    // getTable('<name>') in a repository adapter must be a tableName declared by one of the module's
    // TableDefinition artifacts — an unknown name only explodes at runtime (PERSISTENCE_TABLE_NOT_FOUND).
    const declaredTableNames = new Set<string>();
    for (const [, source] of persistenceSources) {
      for (const m of source.matchAll(/tableName:\s*'([^']+)'/g)) declaredTableNames.add(m[1]);
    }
    if (declaredTableNames.size > 0) {
      for (const [sn, source] of persistenceSources) {
        if (!sn.endsWith('repositoryadapter')) continue;
        for (const m of source.matchAll(/getTable(?:<[^>]*>)?\(\s*'([^']+)'\s*\)/g)) {
          if (declaredTableNames.has(m[1])) continue;
          const msg = `adapter ${sn} -> getTable('${m[1]}') does not match any declared tableName (${[...declaredTableNames].sort().join(', ')})`;
          missing.push(msg);
          const defs = defsFiles.find(d => d.folder.endsWith('/adapters/persistence') && d.shortName === sn);
          if (defs) addRepair(defRefOf(defs.folder, defs.real), msg); // bad .ts -> re-materializable
        }
      }
    }
    // COMPOSITION ROOT (102034 requirement — lesson run 24/25): if the module has repository adapters,
    // registerRepositories.ts MUST exist and register EVERY adapter's port. A missing/partial root passes
    // every other check but makes resolveRepository 500 at runtime (silent failure: agentCbRegister used
    // to key off the LLM `className`, which drifted, and skipped the root). Adapter defs are identified by
    // the deterministic file name `<entity>RepositoryAdapter`.
    const adapterDefCount = defsFiles.filter(d => d.folder.endsWith('/adapters/persistence') && d.shortName.endsWith('repositoryadapter')).length;
    if (adapterDefCount > 0) {
      const root = persistenceSources.get('registerrepositories');
      if (!root) {
        missing.push(`composition root missing -> registerRepositories.ts absent though ${adapterDefCount} repository adapter(s) exist (102034 resolveRepository will 500)`);
      } else {
        const registered = (root.match(/registerRepository\(/g) ?? []).length;
        if (registered < adapterDefCount) missing.push(`composition root incomplete -> registerRepositories.ts binds ${registered} of ${adapterDefCount} adapter(s)`);
      }
    }
    const warnings = mdmTableViolations > 0 ? [`${mdmTableViolations} MDM table artifact(s) found in persistence (should be 0)`] : [];
    // Safe reconciliation policy: do not delete files that may contain a manual client edit, but
    // block on duplicate generated names so stale snake_case/camelCase artifacts cannot leak into runtime.
    const normalizedDefs = new Map<string, string[]>();
    for (const d of defsFiles) {
      const key = `${d.folder}::${d.shortName.replace(/[_-]/g, '')}`;
      const names = normalizedDefs.get(key) ?? [];
      names.push(d.real);
      normalizedDefs.set(key, names);
    }
    for (const [key, names] of normalizedDefs) {
      if (new Set(names).size > 1) missing.push(`orphan/duplicate generated defs -> ${key} has ${[...new Set(names)].join(', ')}`);
    }
    const defsKeys = new Set(defsFiles.map(d => `${d.folder}::${d.shortName}`));
    // seeds.ts is INTENTIONALLY a .ts without a .defs.ts sibling: agentCbSeeds compiles it
    // deterministically (cbSeedsCore -> saveGeneratedTs), outside the defs->materialize pipeline
    // (flow.json cb-gen-seeds/writes). Declarative allowlist so expected artifacts of that kind are
    // never blocking orphans; extend it here (and in flow.json expectedGeneratedTsWithoutDefs) only
    // for artifacts generated deterministically outside materialization.
    const expectedTsWithoutDefs = new Set([
      `${moduleName}/layer_1_external/adapters/persistence::seeds`,
      // registerRepositories.ts: composition root compiled deterministically by agentCbRegister
      // (lesson run 2026-07-16 cafeFlow: the orphan check must not flag it for manual deletion).
      `${moduleName}/layer_1_external/adapters/persistence::registerrepositories`,
    ]);
    // Whole-folder allowlist: the boundary DTOs (adapters/http/dto/<op>.ts + toDto, Item 5) are emitted
    // deterministically by gen-http (one per routine, no .defs.ts by design, like seeds), so every .ts
    // in this folder is an expected defs-less artifact. Mirrored in flow.json expectedGeneratedTsWithoutDefs.
    const expectedTsFolderWithoutDefs = new Set([
      `${moduleName}/layer_1_external/adapters/http/dto`,
    ]);
    // v2 note: there is NO l1/contracts folder (the controller imports the usecase types + projects
    // structurally; the wire contract of record stays in l4). v2 controllers DO have a `.defs.ts` and
    // materialize via the pipeline, so completeness/orphan checks apply to them normally.
    for (const ts of tsFiles) {
      const tsKey = `${ts.folder}::${ts.shortName}`;
      if (!defsKeys.has(tsKey) && !expectedTsWithoutDefs.has(tsKey) && !expectedTsFolderWithoutDefs.has(ts.folder)) {
        missing.push(`orphan generated ts -> ${ts.folder}/${ts.real}.ts has no matching .defs.ts (manual deletion required)`);
      }
    }
    // Older usecases/controllers frequently survive an entity regeneration. Not safe to auto-delete
    // (clients may edit them) -> explicit blocking findings. Usecase defs are owned by an operation;
    // v2 controller defs are owned by a WORKSPACE (per-page), so both id sets are accepted for controllers.
    const expectedOperationIds = new Set(scan.owners.filter(owner => owner.kind === 'operation').map(owner => lowerFirst(owner.id).toLowerCase()));
    const expectedWorkspaceIds = new Set(moduleWorkspaces.map(w => w.workspaceId.toLowerCase()));
    // T10 GUARD (pure, unit-tested in cbComponentValidators.test.ts): an ownership check whose id set is
    // empty while generated defs exist has a FAILED PRECONDITION — it degrades to one warning instead of
    // a blocking "manual reconciliation required" per file (erro5 emitted 20 false orphans that way,
    // flipping allMapped to false and starving the repair round of the 2 real findings).
    const orphans = collectOrphanDefsFindings(defsFiles, expectedOperationIds, expectedWorkspaceIds);
    missing.push(...orphans.findings);
    for (const warning of orphans.warnings) {
      console.warn(`${logPrefix(agent)} ${warning}`);
      warnings.push(warning);
    }

    if (missing.length) {
      const unique = [...new Set(missing)];
      const unmapped = unique.filter(m => !mappedMsgs.has(m));
      const allMapped = unmapped.length === 0 && repairTargets.size > 0;
      const state = await readRepairState();
      // T6 TARGETED RESCUE: the global budget is spent, but only a FEW compiler-only findings remain — one
      // more round (OUTSIDE the budget) fixes them cheaply (T2 scopes it, T4 makes each call surgical)
      // instead of shipping a "green" artifact with real type errors (erro4 ended with 3). Fires EXACTLY
      // once: it bumps globalAttempts to budget+1, so the gate (=== budget) is false on the re-check, and
      // it never applies to defs-level findings (not fixable by re-materialization) or a large residual.
      const isRescue = shouldTargetedRescue({ globalAttempts: state.globalAttempts, budget: GLOBAL_REPAIR_BUDGET, targetCount: repairTargets.size, maxTargets: RESCUE_MAX_TARGETS, findings: unique });
      // GLOBAL REPAIR ROUND: only when EVERY finding is materialization-level (re-generating the .ts
      // can fix it) and the global budget is not exhausted. Defs did not change, so seeds/register stay
      // valid — the materialize dispatcher (repair mode) re-runs the stale components with the findings
      // in context and enqueues cb-validate-all-g{n} to re-check.
      if (allMapped && (state.globalAttempts < GLOBAL_REPAIR_BUDGET || isRescue)) {
        state.globalAttempts += 1;
        const roundTargets: Array<{ defRef: string; findings: number; first: string }> = [];
        for (const [defRef, findings] of repairTargets) {
          const prev = state.componentRepairs[defRef];
          // T3: MERGE instead of overwrite — carry priorFindings (what earlier rounds already fixed) and
          // the last code so the worker does not re-roll and reintroduce a fixed error (createStockAdjustment
          // 'save() misuse' reappeared as attempt 1 in g0/g1/g2 because the state was overwritten each round).
          // attempts:0 is intentional (the global round grants a fresh worker budget; GLOBAL is the anti-loop).
          // When the state has no lastCode yet, seed it with the CURRENT saved .ts so the model fixes that
          // exact file (it was saved before the gate) instead of regenerating from scratch.
          let lastCode: string | undefined;
          if (!prev?.lastCode) {
            const tsRef = defRef.replace(/\.defs\.ts$/u, '.ts');
            lastCode = (await getContentByMlsPath(tsRef)) ?? undefined;
          }
          state.componentRepairs[defRef] = mergeComponentRepair(prev, defRef, findings, { attempts: 0, source: 'validate-all', lastCode });
          // T1: record EACH forced-stale target in the durable history so post-mortem can tell which
          // defRefs a given g{n} round re-materialized.
          pushHistory(state, `${defRef} :: validate-all g${state.globalAttempts} :: ${findings[0] ?? 'finding'}`);
          roundTargets.push({ defRef, findings: findings.length, first: findings[0] ?? 'finding' });
          if (!forceDefsStale(defRef)) console.warn(`${logPrefix(agent)} forceDefsStale failed for ${defRef}`);
        }
        await saveRepairState(state);
        const suppressedNote = (flakyCompilerSuppressed || cascadeCompilerSuppressed)
          ? ` (T2 suppressed ${flakyCompilerSuppressed} flaky + ${cascadeCompilerSuppressed} cascade compiler finding(s))`
          : '';
        const trace = (isRescue
          ? `INTEGRITY targeted rescue (global budget spent; ${repairTargets.size} compiler-only component(s))${suppressedNote}: ${unique.slice(0, 12).join('; ')}`
          : `INTEGRITY repair round ${state.globalAttempts}/${GLOBAL_REPAIR_BUDGET}: re-materializing ${repairTargets.size} component(s)${suppressedNote}: ${unique.slice(0, 12).join('; ')}`) + modelsTrace();
        // T1: the round snapshot carries the FULL forced-stale target list (defRef + finding count) so
        // cb-health-report.json's `rounds` array is a durable, per-round audit of what each g{n} decided.
        // T2: the suppressed counts make the double-check/dedup auditable (a suppressed finding that is
        // real re-appears next round / at the final pass — deferred, never lost).
        await saveHealthReport({ outcome: isRescue ? 'rescue-round' : 'repair-round', round: state.globalAttempts, globalAttempts: state.globalAttempts, repairTargets: roundTargets, targetCount: roundTargets.length, flakyCompilerSuppressed, cascadeCompilerSuppressed, l1Defs, findings: unique, warnings, repairHistory: state.history });
        return [
          enqueueNext(context, parentStep, step, `cb-materialize-g${state.globalAttempts}`, 'agentCbMaterialize', 'Re-materializar (repair)', { repair: true, ...(preSeeds ? { preSeeds: true } : {}) }),
          createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace),
        ];
      }
      // CLEAN FAILURE: budget exhausted, or at least one finding is defs-level (re-materializing cannot
      // fix it — the defect is upstream). Objective trace; owners stay inProgress; nothing marked done.
      const reason = !allMapped
        ? `${unmapped.length} finding(s) are defs-level (not repairable by re-materialization)`
        : `repair budget exhausted (${state.globalAttempts}/${GLOBAL_REPAIR_BUDGET})`;
      const historyNote = state.history.length ? ` | repair history (${state.history.length}): ${state.history.slice(-8).join(' | ')}` : '';
      // PRE-SEEDS: NON-BLOCKING (user decision 2026-07-14). The pre-seeds barrier only reports —
      // findings go to the console/health report as warnings and the flow proceeds to cb-gen-seeds,
      // so seeds can be exercised over a partially converged l1. The post-register cb-validate-all
      // (preSeeds=false) keeps the blocking semantics: nothing is finalized over these findings.
      if (preSeeds) {
        // No console dump (user decision 2026-07-17, run f): the full findings list already lives on
        // the step trace and in the health report — printing it again only floods the console.
        const trace = `INTEGRITY WARNING (non-blocking before seeds; ${reason}): ${unique.length} finding(s): ${unique.slice(0, 30).join('; ')}${historyNote}${modelsTrace()}`;
        await saveHealthReport({ outcome: 'pre-seeds-warning', reason, l1Defs, findings: unique, unmapped, warnings, repairHistory: state.history, globalAttempts: state.globalAttempts });
        return [
          enqueueNextInPhase(context, step, 'seeds', 'cb-gen-seeds', 'agentCbSeeds', 'Gerar seeds', {}),
          createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace),
        ];
      }
      const trace = `INTEGRITY FAILED (${reason}): ${unique.length} finding(s): ${unique.slice(0, 30).join('; ')}${historyNote}${modelsTrace()}`;
      await saveHealthReport({ outcome: 'failed', reason, l1Defs, findings: unique, unmapped, warnings, repairHistory: state.history, globalAttempts: state.globalAttempts });
      return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', trace)];
    }
    // Every terminal trace of this step carries the model counts: it is the measurement that used to be
    // taken by hand in the console, now recorded on the task forever (permanent leak detector).
    const modelsNote = modelsTrace();
    // Clean run: embed the repair audit in the TASK trace (the fan-out children were deleted by the
    // runtime, so this is where the repaired findings survive), then clear the state.
    const finalState = await readRepairState();
    const repairNote = finalState.history.length
      ? `; repaired during this run: ${finalState.history.length} occurrence(s) [${finalState.history.slice(-8).join(' | ')}]`
      : '';
    await saveHealthReport({ outcome: 'passed', l1Defs, findings: [], warnings, repairHistory: finalState.history, globalAttempts: finalState.globalAttempts, judgeRuns: finalState.judgeRuns });
    await clearRepairState();
    // Record the warning details on the step log too (not just the count), so they are visible in the trace.
    const okTrace = (warnings.length
      ? `l1 defs=${l1Defs}; ${warnings.length} warning(s): ${warnings.slice(0, 12).join('; ')}`
      : `l1 defs=${l1Defs}; 0 warnings.`) + repairNote + modelsNote;
    return [
      enqueueNextInPhase(context, step, preSeeds ? 'seeds' : 'finalization', preSeeds ? 'cb-gen-seeds' : 'cb-finalize', preSeeds ? 'agentCbSeeds' : 'agentCbFinalizeStatus', preSeeds ? 'Gerar seeds' : 'Finalizar todoBackend', {}),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', okTrace),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}
