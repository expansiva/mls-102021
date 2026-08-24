/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/gen-http/agentCbHttpController.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Generate the BFF http controllers (layer_1_external/adapters/http). L4 IS THE SOURCE OF TRUTH:
// one controller per l4 owner (operation/workflow), one handler that calls the owner's usecase, and
// the response defaults to the usecase output. The frontend contract is OPTIONAL refinement: when a
// per-page contract exists, it is added to dependsFiles so the materializer shapes the Output to it —
// never a dependency. This step is DETERMINISTIC (binding owner->usecase by id), so handlers are never
// empty; the .ts itself is written by the next step (agentCbMaterialize) from the usecase .d.ts + skill.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  readBackendScan, enqueueNext, createUpdateStatusIntent, parseDefsSource, isRecord,
  saveDefs, buildArtifact, buildPipelineItem, httpControllerFileInfo, usecaseFileInfo,
  dtsRef, layerSkills, capitalize, lowerFirst, logPrefix, readCliCommand, setTodoBackendStatus, handlerKindOf,
  ALL_STATUSES, type CbScan,
} from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { saveGeneratedTs } from '/_102021_/l2/agentChangeBackend/helpers/cbMaterializeIo.js';
import { resolveBffProjection } from '/_102021_/l2/agentChangeBackend/helpers/cbContracts.js';
import { bffCallsWithMaterializedUsecase } from '/_102021_/l2/agentChangeBackend/helpers/cbComponentValidators.js';

// Item 5 — boundary DTO (adapter HTTP owns the wire shape). The DTO .ts is a thin alias of the
// usecase output type + identity toDto: it is the projection SEAM (the ownership boundary), so the day
// a usecase goes domain-shaped only toDto changes and the public contract + frontend stay put. Kept as
// an alias (not a hand-mirrored interface) so it is deterministic and always compiles. The top-level
// `responseShape` copied into the controller defs is the single source the frontend contract derives
// from (killing the l4 re-inference drift). Nested item schemas are NOT carried yet (they live only in
// usecase-defs prose) — deferred; top-level fixes every reported bug and every task2 acceptance case.
const HTTP_DTO_FOLDER_SUFFIX = 'layer_1_external/adapters/http/dto';

function dtoFileInfo(module: string, ownerId: string) {
  return { project: mls.actualProject || 0, level: 1, folder: `${module}/${HTTP_DTO_FOLDER_SUFFIX}`, shortName: lowerFirst(ownerId), extension: '.defs.ts' } as const;
}

/** Top-level wire shape from the usecase output field list (object with named fields; each field kept
 *  as array | object | scalar). The frontend copies this instead of re-inferring the shape from l4. */
function buildResponseShape(output: UsecaseOutputField[] | undefined): { kind: 'object'; fields: UsecaseOutputField[] } | undefined {
  if (!Array.isArray(output) || output.length === 0) return undefined;
  return { kind: 'object', fields: output.map(f => ({ name: f.name, type: f.type, required: f.required })) };
}

function renderDtoTs(module: string, ownerId: string, outputTypeName: string): string {
  const project = mls.actualProject || 0;
  const dtoName = `${capitalize(ownerId)}ResponseDto`;
  const usecaseImport = `/_${project}_/l1/${module}/layer_2_application/usecases/${lowerFirst(ownerId)}.js`;
  return [
    `/// <mls fileReference="_${project}_/l1/${module}/${HTTP_DTO_FOLDER_SUFFIX}/${lowerFirst(ownerId)}.ts" enhancement="_blank"/>`,
    ``,
    `// Boundary DTO for the ${ownerId} routine — the wire shape owned by the HTTP adapter. Alias of the`,
    `// usecase output today (toDto is identity); the seam lets the public contract diverge from the`,
    `// usecase later without touching the frontend. Frontend copies the shape from the controller defs.`,
    `import type { ${outputTypeName} } from '${usecaseImport}';`,
    ``,
    `export type ${dtoName} = ${outputTypeName};`,
    ``,
    `export function toDto(result: ${outputTypeName}): ${dtoName} {`,
    `  return result;`,
    `}`,
    ``,
  ].join('\n');
}

const AGENT_NAME = 'agentCbHttpController';

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102021, agentFolder: 'agentChangeBackend/steps/gen-http', agentDescription: 'Generate BFF http controllers from l4 (usecase-driven; contract optional)', visibility: 'private', beforePromptStep };
}

/** Page ids that already have a frontend contract (optional Output refinement). */
async function contractPageIds(): Promise<Set<string>> {
  const project = mls.actualProject || 0;
  const ids = new Set<string>();
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 2 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts' || !String(file.folder || '').endsWith('/web/contracts')) continue;
    const sn = String(file.shortName || '');
    if (sn) ids.add(sn);
  }
  return ids;
}

type UsecaseOutputField = { name: string; type: string; required: boolean };
type UsecaseFn = { functionName: string; inputTypeName?: string; outputTypeName?: string; kind?: string; output?: UsecaseOutputField[] };

/** First `export const … = {…} as const;` — the artifact block (parseDefsSource spans both exports). */
function parseArtifactData(content: string): Record<string, unknown> | undefined {
  const s = content.indexOf('= ');
  const e = content.indexOf(' as const;');
  if (s === -1 || e <= s) return undefined;
  try { const o = JSON.parse(content.slice(s + 2, e)); if (!isRecord(o)) return undefined; return isRecord(o.data) ? o.data : o; } catch { return undefined; }
}

/** Read each generated usecase's EXPORTED functions from its saved defs, keyed by usecaseId. The
 * controller binds to these real names so it never imports a function the usecase did not produce. */
async function readUsecaseFunctions(): Promise<Map<string, UsecaseFn[]>> {
  const project = mls.actualProject || 0;
  const map = new Map<string, UsecaseFn[]>();
  for (const file of Object.values(mls.stor.files) as any[]) {
    if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted') continue;
    if (file.extension !== '.defs.ts' || !String(file.folder || '').endsWith('/layer_2_application/usecases')) continue;
    const data = parseArtifactData(String(await file.getContent()));
    if (!data) continue;
    const usecaseId = String((data as any).usecaseId || file.shortName || '');
    const fns = Array.isArray((data as any).functions) ? (data as any).functions : [];
    const parsed: UsecaseFn[] = fns
      .map((f: any) => ({
        functionName: String(f?.functionName || ''),
        inputTypeName: f?.inputTypeName ? String(f.inputTypeName) : undefined,
        outputTypeName: f?.outputTypeName ? String(f.outputTypeName) : undefined,
        kind: f?.kind ? String(f.kind) : undefined,
        output: Array.isArray(f?.output)
          ? f.output.filter(isRecord).map((o: any) => ({ name: String(o?.name || ''), type: String(o?.type || 'unknown'), required: o?.required === true })).filter((o: UsecaseOutputField) => !!o.name)
          : undefined,
      }))
      .filter((f: UsecaseFn) => !!f.functionName);
    if (usecaseId && parsed.length) map.set(usecaseId, parsed);
  }
  return map;
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    // Read ALL statuses: v2 controllers are per-WORKSPACE and a workspace's bffCalls may `use` operations
    // of mixed status (a partial /run). The v1 loop still processes only the pending owners (filtered below).
    const scan = await readBackendScan(ALL_STATUSES, context);
    const contracts = await contractPageIds();
    const usecaseFns = await readUsecaseFunctions();
    // defs-only is TOTAL (B2): the controller .defs.ts is written, but NOTHING is materialized to .ts —
    // not the DTO seam here, not the tail (materialize/seeds/seed-assets/register/validate-all).
    const defsOnly = readCliCommand(context) === 'rebuild-defs';

    // ── l4 v2: modules that declare workspaces get ONE controller .defs.ts per WORKSPACE (N routes, one
    // per bffCall) + a pipeline entry, so cb-materialize (LLM, httpController.md) generates the .ts —
    // adding auth/filters/adjustments beyond the mechanical projection (user decision 19/jul). The
    // controller imports the USECASE types and projects the wire output structurally — there is NO l1
    // contract file (the wire contract of record lives in l4/contracts/*.defs.ts, which only the FE and
    // the materializer PROMPT read; the controller does not import it). ──
    const v2Modules = new Set(scan.workspaces.map(w => w.moduleName).filter(Boolean));
    let savedV2 = 0;
    for (const module of scan.moduleNames) {
      if (!v2Modules.has(module)) continue;
      savedV2 += await emitWorkspaceControllerDefs(scan, module, usecaseFns);   // .defs.ts (always)
    }

    // ── l4 v1 fallback: one controller .defs.ts per pending OPERATION (materialized by cb-materialize). ──
    const pendingOwners = scan.owners.filter(o => o.todoStatus === 'toCreate' || o.todoStatus === 'inProgress');
    let saved = 0;
    for (const owner of pendingOwners) {
      const ownerId = owner.id;
      if (!ownerId) continue;
      // Only OPERATIONS are BFF command owners. Workflows are pure orchestration — no controller/command.
      if (owner.kind !== 'operation') continue;
      // v2 modules are handled deterministically above (per workspace) — never emit per-operation defs for them.
      if (v2Modules.has(owner.moduleName)) continue;
      const module = owner.moduleName || scan.moduleNames[0] || 'unknown';
      const routePageId = owner.pageId || ownerId;
      let outputSource = contracts.has(routePageId) ? 'contract' : 'usecase';
      // COHERENCE (item 3): bind handlers to the usecase's REAL exported functions read from the
      // generated defs — never an assumed name. This prevents the controller from importing a function
      // the usecase never produced (the orderFlow-class break). Fallback to the ownerId only if the defs
      // are missing/unparsed.
      const fns = usecaseFns.get(ownerId) || [];
      // Abandoned usecase (repair budget spent, defs never written): do not emit a controller/route
      // that would import an export that does not exist. The give-up is the repair finding on the owner.
      if (!fns.length) continue;
      const handlers: {
        handlerName: string;
        command: string;
        usecaseRef: string;
        inputTypeName?: string;
        kind: string;
        inputContract?: unknown[];
        contextResolution?: unknown[];
        accessPattern?: unknown;
      }[] = [];
      const routes: { key: string; handlerName: string }[] = [];
      if (fns.length > 1) {
        // A usecase exposing several functions -> one command/route per function (1:1 function<->command).
        for (const fn of fns) {
          const handlerName = `${module}${capitalize(fn.functionName)}Handler`;
          handlers.push({
            handlerName,
            command: fn.functionName,
            usecaseRef: fn.functionName,
            inputTypeName: fn.inputTypeName,
            kind: fn.kind || handlerKindOf(owner.opKind),
            inputContract: owner.inputs,
            contextResolution: owner.contextResolution,
            accessPattern: owner.accessPattern,
          });
          routes.push({ key: `${module}.${routePageId}.${fn.functionName}`, handlerName });
        }
        // L4 is the source of truth for the BFF contract: the canonical bffName route MUST
        // also exist (the l2 contract calls it). Emit a dispatcher handler that selects the
        // usecase function from the provided params (see httpController.md, kind 'dispatcher').
        const canonicalKey = owner.bffName || `${module}.${routePageId}.${owner.commandName || ownerId}`;
        if (!routes.some(r => r.key === canonicalKey)) {
          const dispatcherName = `${module}${capitalize(owner.commandName || ownerId)}Handler`;
          handlers.push({
            handlerName: dispatcherName,
            command: owner.commandName || ownerId,
            usecaseRef: fns.map(f => f.functionName).join(' | '),
            kind: 'dispatcher',
            inputContract: owner.inputs,
            contextResolution: owner.contextResolution,
            accessPattern: owner.accessPattern,
          });
          routes.push({ key: canonicalKey, handlerName: dispatcherName });
        }
      } else {
        const fn = fns[0];
        const handlerName = `${module}${capitalize(ownerId)}Handler`;
        const routeKey = owner.bffName || `${module}.${routePageId}.${owner.commandName || ownerId}`;
        handlers.push({
          handlerName,
          command: owner.commandName || ownerId,
          usecaseRef: fn?.functionName || ownerId,
          inputTypeName: fn?.inputTypeName,
          kind: fn?.kind || handlerKindOf(owner.opKind),
          inputContract: owner.inputs,
          contextResolution: owner.contextResolution,
          accessPattern: owner.accessPattern,
        });
        routes.push({ key: routeKey, handlerName });
      }
      // Item 5: for a single-function operation, emit the boundary DTO and anchor the wire shape on it.
      // The controller then returns ok(toDto(result)); the frontend copies responseShape by routine key.
      // Multi-function/dispatcher owners keep the legacy path (no DTO) — best-effort, flagged.
      const soleFn = fns.length <= 1 ? fns[0] : undefined;
      const responseShape = soleFn ? buildResponseShape(soleFn.output) : undefined;
      const dtoRefs: string[] = [];
      let dtoMeta: Record<string, unknown> = {};
      if (soleFn?.outputTypeName && !defsOnly) {
        await saveGeneratedTs(mls.actualProject || 0, 1, `${module}/${HTTP_DTO_FOLDER_SUFFIX}`, lowerFirst(ownerId), renderDtoTs(module, ownerId, soleFn.outputTypeName));
        outputSource = 'dto';
        dtoRefs.push(dtsRef(dtoFileInfo(module, ownerId)));
        dtoMeta = { dtoTypeName: `${capitalize(ownerId)}ResponseDto`, dtoModulePath: `_${mls.actualProject || 0}_/l1/${module}/${HTTP_DTO_FOLDER_SUFFIX}/${lowerFirst(ownerId)}.js`, usecaseOutputTypeName: soleFn.outputTypeName };
      }
      const data = {
        pageId: routePageId,
        controllerName: `${capitalize(ownerId)}Controller`,
        ownerKind: owner.kind,            // operation (workflows are skipped)
        outputSource,
        ...dtoMeta,
        ...(responseShape ? { responseShape } : {}),
        handlers,
        routes,
      };
      const fi = httpControllerFileInfo(module, ownerId);
      const dependsFiles = [dtsRef(usecaseFileInfo(module, ownerId)), ...dtoRefs];
      // Legacy contract-mapping path only when no DTO was emitted (DTO now owns the wire shape).
      if (outputSource === 'contract' && contracts.has(routePageId)) dependsFiles.push(`_${mls.actualProject || 0}_/l2/${module}/web/contracts/${routePageId}.ts`);
      const pipeline = [buildPipelineItem(lowerFirst(ownerId), 'httpController', fi, dependsFiles, layerSkills('httpController.md'))];
      await saveDefs(fi, `${lowerFirst(ownerId)}Controller`, buildArtifact('httpController', ownerId, module, AGENT_NAME, data), pipeline);
      saved++;
    }
    // All defs for the processed owners are now generated (domain/port/table/adapter/usecase/controller).
    // Flip todoBackend -> done HERE, before materialization: materialize/seeds/assets are the steps that
    // fail at the very end, and marking done after defs means a re-run reuses the finished defs (skips the
    // whole generation chain, including the LLM judge) and only materializes stale .ts + missing seeds.
    // `done` therefore means "defs generated"; the run's overall success (compiling .ts) is still gated by
    // cb-validate-all, which reports any broken .ts even though the owner is already done.
    //
    // A3 (T10) — CONSEQUENCE ANY FUTURE READER MUST KNOW: after this flip, every
    // readBackendScan(['toCreate','inProgress']) downstream returns ZERO owners. A check that asks
    // "does this artifact belong to a current owner?" MUST therefore scan ALL_STATUSES, or it will
    // conclude that everything the run just generated is an orphan — that is exactly how erro5 turned
    // 20 freshly generated usecases into blocking "manual reconciliation required" findings and starved
    // the repair round of the 2 real errors. cb-validate-all now scans ALL_STATUSES (A1) and degrades an
    // ownership check with an empty owner set to a warning (the guard). Downstream steps that legitimately
    // ask "what is still PENDING?" keep the filtered scan. Decision + audit:
    if (!defsOnly) {
      for (const owner of scan.owners) await setTodoBackendStatus(owner, 'done');
    }
    // /rebuild defs is defs-only TOTAL: skip cb-materialize AND the materializing tail (seeds/seed-assets/
    // register/validate-all); route straight to the cleanup that soft-deletes stale derived .ts, then finalize.
    const next = defsOnly
      ? enqueueNext(context, parentStep, step, 'cb-rebuild-defs-cleanup', 'agentCbRebuildDefsCleanup', 'Limpar .ts derivados (defs-only)', { modules: scan.moduleNames })
      : enqueueNext(context, parentStep, step, 'cb-materialize', 'agentCbMaterialize', 'Materializar .defs.ts -> .ts', {});
    const v2Note = v2Modules.size ? ` + ${savedV2} v2 workspace controller def(s)` : '';
    return [
      next,
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `Generated ${saved} v1 controller(s)${v2Note} from l4${defsOnly ? ' (defs-only: .ts skipped)' : ''}.`),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

// ── B4 v2: emit ONE controller .defs.ts per WORKSPACE (N handlers/routes, one per bffCall) + a pipeline
// entry, so cb-materialize (LLM + httpController.md) generates the .ts. The def carries what the LLM
// needs: the routes, the usecase function to call per bffCall (real export names), the boundary
// inputContract, the projection spec (pick/rename/$items per bffCall), the wire contract type names, and
// the workspace actors/scopes for authorization. Deterministic def; the .ts is LLM-materialized. ──
async function emitWorkspaceControllerDefs(scan: CbScan, module: string, usecaseFns: Map<string, UsecaseFn[]>): Promise<number> {
  const project = mls.actualProject || 0;
  const actorRoleScopes = new Map<string, string>();
  for (const a of scan.actors) if (a.moduleName === module) actorRoleScopes.set(a.actorId, a.roleScope);
  const opFn = new Map<string, { functionName: string; inputTypeName?: string }>();
  for (const [op, fns] of usecaseFns) { const fn = fns[0]; if (fn) opFn.set(op, { functionName: fn.functionName, inputTypeName: fn.inputTypeName }); }
  const opById = new Map(scan.owners.filter(o => o.kind === 'operation' && o.moduleName === module).map(o => [o.id, o]));

  let n = 0;
  for (const ws of scan.workspaces) {
    if (ws.moduleName !== module || !ws.bffCalls.length) continue;
    const allowedScopes = ws.actors.map(a => actorRoleScopes.get(a) || `${module}:${a}`);
    const handlers: Record<string, unknown>[] = [];
    const routes: { key: string; handlerName: string }[] = [];
    const dependsFiles = new Set<string>();
    const usecaseIds = new Set(usecaseFns.keys());
    const { kept: bffCalls } = bffCallsWithMaterializedUsecase(ws.bffCalls, usecaseIds);
    if (!bffCalls.length) continue;
    for (const bff of bffCalls) {
      const handlerName = `${ws.workspaceId}${capitalize(bff.bffId)}Handler`;
      const proj = resolveBffProjection(bff);
      const usecaseRefs = bff.uses.map(u => opFn.get(u.operationId)?.functionName || u.operationId);
      const inputContract = bff.uses.flatMap(u => opById.get(u.operationId)?.inputs ?? []);
      for (const u of bff.uses) dependsFiles.add(dtsRef(usecaseFileInfo(module, u.operationId)));
      // Contract CONTEXT for the materializer prompt: the l4 contract .defs.ts (ALWAYS exists — fetchable
      // even in defs-only). Context only — the controller does NOT import it (there is no l1 contract; it
      // uses the usecase types + projects structurally). The wire type of record stays in l4.
      dependsFiles.add(`_${project}_/l4/${module}/contracts/${ws.workspaceId}--${bff.bffId}.defs.ts`);
      handlers.push({
        handlerName,
        command: bff.bffId,
        bffId: bff.bffId,
        route: bff.route,
        kind: bff.kind,                              // query | command
        usecaseRef: usecaseRefs.join(' | '),         // coherence check (v1-compatible); ' | ' for composed
        usecaseRefs,
        inputTypeName: bff.uses.length === 1 ? opFn.get(bff.uses[0].operationId)?.inputTypeName : undefined,
        inputContract,
        projection: { kind: proj.kind, arrayFieldName: proj.arrayFieldName, itemFields: proj.itemFields, topFields: proj.topFields },
        optionalUses: bff.uses.filter(u => u.optional).map(u => u.operationId),
      });
      routes.push({ key: bff.route, handlerName });
    }
    const data = {
      pageId: ws.workspaceId,
      controllerName: `${capitalize(ws.workspaceId)}Controller`,
      ownerKind: 'workspace',
      workspaceId: ws.workspaceId,
      actors: ws.actors,
      allowedScopes,
      handlers,
      routes,
    };
    const fi = httpControllerFileInfo(module, ws.workspaceId);
    const pipeline = [buildPipelineItem(lowerFirst(ws.workspaceId), 'httpController', fi, [...dependsFiles], layerSkills('httpController.md'))];
    await saveDefs(fi, `${lowerFirst(ws.workspaceId)}Controller`, buildArtifact('httpController', ws.workspaceId, module, AGENT_NAME, data), pipeline);
    n++;
  }
  return n;
}
