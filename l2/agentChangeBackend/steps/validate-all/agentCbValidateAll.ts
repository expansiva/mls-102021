/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/validate-all/agentCbValidateAll.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Blocking integrity barrier: read the SAVED l1 .defs.ts files and check coverage/integrity (each
// owner produced its artifacts; no MDM/horizontal table emitted). On success -> finalize. On failure,
// findings that map to a MATERIALIZATION-level component (bad/missing .ts) trigger ONE global repair
// round: the component defs are forced stale, the findings are recorded (cbRepair) and cb-materialize
// is re-enqueued in repair mode — the flow reconverges back here (unique planId). Findings that are
// DEFS-level (missing port/entity defs, defs route missing, controller/usecase defs mismatch) are NOT
// repairable by re-materializing: the run fails CLEAN with the objective trace. Budget exhausted ->
// clean failure too. (Repair loop block: todo/ajustesFinaisChangeBackend.md §2.)

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readBackendScan, enqueueNext, createUpdateStatusIntent, isRecord, readStringArray, lowerFirst, logPrefix } from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import {
  readRepairState, saveRepairState, forceDefsStale, clearRepairState, saveHealthReport, GLOBAL_REPAIR_BUDGET,
} from '/_102021_/l2/agentChangeBackend/helpers/cbRepair.js';
import { getFileModified } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeIo.js';
import { isStale } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeCore.js';
import { syntaxDiagnostics } from '/_102021_/l2/agentChangeBackend/helpers/cbSyntaxValidation.js';
import { collectRawMdmAccessIssues } from '/_102021_/l2/agentChangeBackend/helpers/cbMdmGuards.js';
import {
  collectL1Imports, escapeRegExp, fieldNameFromRef, requiredBoundaryFields, collectRequiredChecksByHandler,
  collectExportedHandlers, collectRouteHandlers, collectUsecaseRules, normalizeRuleId,
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

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    let preSeeds = false;
    try { preSeeds = JSON.parse(String(step.prompt || '{}'))?.preSeeds === true; } catch { /* post-register validation */ }
    const scan = await readBackendScan(['toCreate', 'inProgress']);
    const project = mls.actualProject || 0;
    let l1Defs = 0;
    let mdmTableViolations = 0;
    const mdmIds = new Set(scan.entities.filter(e => e.kind === 'mdm').map(e => e.entityId.toLowerCase()));
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
    for (const file of Object.values(mls.stor.files) as any[]) {
      if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted') continue;
      const folder0 = String(file.folder || '');
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
        for (const req of collectL1Imports(content, project)) {
          importReqs.push({ from: `${folder0}/${shortName0}`, key: req.key, target: req.target });
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
      if (folder.includes('/adapters/persistence') && mdmIds.has(shortName)) mdmTableViolations++;
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
    for (const c of controllers) {
      const fns = usecaseFnNames.get(c.id);
      for (const ref of c.refs) {
        if (ref.includes(' | ')) continue; // dispatcher handler delegates to the concrete per-function handlers
        if (!fns) { missing.push(`controller ${c.id} -> usecase defs not found`); break; }
        if (!fns.has(ref)) missing.push(`controller ${c.id} -> usecase export '${ref}' not found (has: ${[...fns].join(', ') || 'none'})`);
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

    const moduleName = scan.moduleNames[0] || 'unknown';
    for (const owner of scan.owners) {
      if (owner.kind !== 'operation' || !owner.id) continue;
      const controllerId = lowerFirst(owner.id).toLowerCase();
      const controller = controllers.find(c => c.id === controllerId);
      if (!controller) continue;
      const expectedRoute = owner.bffName || `${moduleName}.${owner.pageId || owner.id}.${owner.commandName || owner.id}`;
      if (!controller.routes.some(route => route.key === expectedRoute)) {
        missing.push(`controller ${controller.id} -> missing canonical bffName route ${expectedRoute}`);
      }
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
      if (isStale(defsMs, tsMs)) {
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
    for (const ts of tsFiles) {
      if (!defsKeys.has(`${ts.folder}::${ts.shortName}`)) {
        missing.push(`orphan generated ts -> ${ts.folder}/${ts.real}.ts has no matching .defs.ts (manual deletion required)`);
      }
    }
    // Older usecases/controllers frequently survive an entity regeneration. They are not safe to
    // delete automatically because clients may edit them, so make them explicit blocking findings.
    const expectedOperationIds = new Set(scan.owners.filter(owner => owner.kind === 'operation').map(owner => lowerFirst(owner.id).toLowerCase()));
    for (const d of defsFiles) {
      if ((d.folder.endsWith('/layer_2_application/usecases') || d.folder.endsWith('/adapters/http/controllers')) && !expectedOperationIds.has(d.shortName)) {
        missing.push(`orphan generated defs -> ${d.folder}/${d.real}.defs.ts is not owned by a current operation (manual reconciliation required)`);
      }
    }

    if (missing.length) {
      const unique = [...new Set(missing)];
      const unmapped = unique.filter(m => !mappedMsgs.has(m));
      const allMapped = unmapped.length === 0 && repairTargets.size > 0;
      const state = await readRepairState();
      // GLOBAL REPAIR ROUND: only when EVERY finding is materialization-level (re-generating the .ts
      // can fix it) and the global budget is not exhausted. Defs did not change, so seeds/register stay
      // valid — the materialize dispatcher (repair mode) re-runs the stale components with the findings
      // in context and enqueues cb-validate-all-g{n} to re-check.
      if (allMapped && state.globalAttempts < GLOBAL_REPAIR_BUDGET) {
        state.globalAttempts += 1;
        for (const [defRef, findings] of repairTargets) {
          state.componentRepairs[defRef] = {
            target: defRef,
            attempts: 0, // global round grants a fresh worker budget; the GLOBAL budget is the anti-loop
            findings: findings.slice(0, 20),
            source: 'validate-all',
            updatedAt: new Date().toISOString(),
          };
          if (!forceDefsStale(defRef)) console.warn(`${logPrefix(agent)} forceDefsStale failed for ${defRef}`);
        }
        await saveRepairState(state);
        const trace = `INTEGRITY repair round ${state.globalAttempts}/${GLOBAL_REPAIR_BUDGET}: re-materializing ${repairTargets.size} component(s): ${unique.slice(0, 12).join('; ')}`;
        await saveHealthReport({ outcome: 'repair-round', round: state.globalAttempts, l1Defs, findings: unique, warnings, repairHistory: state.history });
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
      const trace = `INTEGRITY FAILED (${reason}): ${unique.length} finding(s): ${unique.slice(0, 30).join('; ')}${historyNote}`;
      await saveHealthReport({ outcome: 'failed', reason, l1Defs, findings: unique, unmapped, warnings, repairHistory: state.history, globalAttempts: state.globalAttempts });
      console.error(`${logPrefix(agent)} ${trace}`);
      return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', trace)];
    }
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
      : `l1 defs=${l1Defs}; 0 warnings.`) + repairNote;
    return [
      enqueueNext(context, parentStep, step, preSeeds ? 'cb-gen-seeds' : 'cb-finalize', preSeeds ? 'agentCbSeeds' : 'agentCbFinalizeStatus', preSeeds ? 'Gerar seeds' : 'Finalizar todoBackend', {}),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', okTrace),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}
