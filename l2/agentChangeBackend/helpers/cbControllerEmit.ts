/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_102027_/l2/enhancementAgent"/>

// B4 — PURE renderer of the l4-v2 BFF controller: ONE controller `.ts` per workspace, emitted
// DETERMINISTICALLY (like DTOs/seeds — no LLM materialization), so the whole class of controller
// materialization bugs (TS2792, handler outside the input contract, invented function names) cannot
// exist. One handler per bffCall; routes registered by the contract's route CONST (imported from the l1
// mirror — never a hand-typed string); the projection (pick/rename/$items) is derived from the bffCall
// via cbContracts. No file I/O here (testable); the step calls this and writes the string.
//
// Runtime contract (from _102034_/l1/server/layer_2_controllers/contracts.ts, out of scope — read only):
//   BffHandler = ({ request, ctx }) => Promise<BffResponse>;  request.params = the wire input.
//   ok(data) / fail(new AppError(code, message, statusCode)).  ControllerRoute = { key, handler }.
// Wire envelope by output kind (see B4 Notas + the v1 usecase `{ items }` convention):
//   object    -> ok(<projected object>)          (or ok(result) for a command passthrough w/o output)
//   list      -> ok({ items: <projected items> })
//   paginated -> ok({ items: <projected items>, total, page, pageSize })  (meta passed through from the op)

import type { CbBffCall, CbWorkspace } from '/_102021_/l2/agentChangeBackend/helpers/cbWorkspace.js';
import {
  resolveBffProjection, resolveItemsArrayField, parseFromPath, type CbOpOutputShapeView,
} from '/_102021_/l2/agentChangeBackend/helpers/cbContracts.js';

export interface UsecaseFnRef { functionName: string; inputTypeName?: string; }
export interface RenderControllerInput {
  project: number;
  moduleName: string;
  workspace: CbWorkspace;
  opShapes: Map<string, CbOpOutputShapeView | null>;   // operationId -> outputShape (for $items array key)
  usecaseFns: Map<string, UsecaseFnRef>;               // operationId -> primary usecase function
  actorRoleScopes: Map<string, string>;                // actorId -> roleScope (from actors.defs.ts)
}
export interface RenderedController { source: string; usecaseOperationIds: string[]; routeKeys: string[]; }

const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const lowerFirst = (s: string): string => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const RUNTIME_CONTRACTS = '/_102034_/l1/server/layer_2_controllers/contracts.js';

/** Allowed login scopes for a route. The actor->login-role mapping (spec 1 D6.5) is PENDING, so we emit
 * the l4 roleScope (or the `<module>:<actorId>` convention) as ONE const per route — the single place to
 * adjust when D6.5 lands. Enforcement (emitted `enforceActors`) is permissive: absent scope -> allow +
 * telemetry; a NON-EMPTY scope with zero intersection -> deny. */
function allowedScopesOf(ws: CbWorkspace, actorRoleScopes: Map<string, string>, moduleName: string): string[] {
  return ws.actors.map(a => actorRoleScopes.get(a) || `${moduleName}:${a}`);
}

export function renderWorkspaceController(inp: RenderControllerInput): RenderedController {
  const { project, moduleName, workspace: ws, opShapes, usecaseFns, actorRoleScopes } = inp;
  const usecaseOps = new Set<string>();
  const routeKeys: string[] = [];
  const handlers: string[] = [];
  const contractImports: string[] = [];

  const allowed = allowedScopesOf(ws, actorRoleScopes, moduleName);
  const allowedConstName = `${ws.workspaceId}AllowedScopes`;

  for (const bff of ws.bffCalls) {
    const handlerName = `${ws.workspaceId}${cap(bff.bffId)}Handler`;
    const inputType = `${cap(bff.bffId)}Input`;
    const outputType = `${cap(bff.bffId)}Output`;
    const routeConst = `${bff.bffId}Route`;
    const hasOutput = !!bff.output;
    contractImports.push(
      `import { type ${inputType}${hasOutput ? `, type ${outputType}` : ''}, ${routeConst} } ` +
      `from '/_${project}_/l1/${moduleName}/contracts/${ws.workspaceId}.${bff.bffId}.js';`,
    );
    for (const use of bff.uses) usecaseOps.add(use.operationId);
    routeKeys.push(routeConst);
    handlers.push(renderHandler(bff, { handlerName, inputType, outputType, routeConst, allowedConstName, usecaseFns, opShapes }));
  }

  const usecaseImports = [...usecaseOps].map(op => {
    const fn = usecaseFns.get(op);
    const fnName = fn?.functionName || op;
    const typePart = fn?.inputTypeName ? `, type ${fn.inputTypeName}` : '';
    return `import { ${fnName}${typePart} } from '/_${project}_/l1/${moduleName}/layer_2_application/usecases/${lowerFirst(op)}.js';`;
  });

  const source = [
    `/// <mls fileReference="_${project}_/l1/${moduleName}/layer_1_external/adapters/http/controllers/${ws.workspaceId}.ts" enhancement="_blank"/>`,
    ``,
    `// GENERATED MECHANICALLY from _${project}_/l4/${moduleName}/workspaces/${ws.workspaceId}.defs.ts — DO NOT EDIT.`,
    `// Deterministic BFF controller (no LLM): one handler per bffCall; routes = contract consts; projection`,
    `// derived from the workspace. Actor enforcement is permissive pending the D6.5 actor->login-role map.`,
    `import { ok, fail, AppError, type BffHandler, type BffResponse, type ControllerRoute, type RequestContext } from '${RUNTIME_CONTRACTS}';`,
    ...usecaseImports,
    ...contractImports,
    ``,
    `// Login scopes permitted on every route of the "${ws.workspaceId}" workspace (actors: ${JSON.stringify(ws.actors)}).`,
    `const ${allowedConstName}: readonly string[] = ${JSON.stringify(allowed)};`,
    ``,
    ...handlers,
    renderEnforceActors(),
    ``,
    `export const routes: ControllerRoute[] = [`,
    ...ws.bffCalls.map(bff => `  { key: ${bff.bffId}Route, handler: ${ws.workspaceId}${cap(bff.bffId)}Handler },`),
    `];`,
    ``,
  ].join('\n');

  return { source, usecaseOperationIds: [...usecaseOps], routeKeys };
}

interface HandlerCtx {
  handlerName: string; inputType: string; outputType: string; routeConst: string; allowedConstName: string;
  usecaseFns: Map<string, UsecaseFnRef>; opShapes: Map<string, CbOpOutputShapeView | null>;
}

function renderHandler(bff: CbBffCall, h: HandlerCtx): string {
  const body = bff.uses.length > 1 ? renderComposedBody(bff, h) : renderSingleUseBody(bff, h);
  return [
    `export const ${h.handlerName}: BffHandler = async ({ request, ctx }) => {`,
    `  const denial = enforceActors(ctx, ${h.allowedConstName}, ${h.routeConst});`,
    `  if (denial) return denial;`,
    `  const input = (request.params ?? {}) as ${h.inputType};`,
    ...body.map(l => `  ${l}`),
    `};`,
    ``,
  ].join('\n');
}

/** Build the usecase input object literal from the bffCall inputs whose `from` targets this operation. */
function renderUsecaseInput(bff: CbBffCall, operationId: string, fn: UsecaseFnRef | undefined): string[] {
  const assigns: string[] = [];
  for (const field of bff.input) {
    const parsed = parseFromPath(field.from);
    if (!parsed || parsed.operationId !== operationId || parsed.fromItems || parsed.path.length !== 1) continue;
    assigns.push(`    ${parsed.path[0]}: input.${field.name},`);
  }
  const ann = fn?.inputTypeName ? `: ${fn.inputTypeName}` : '';
  return [`const ${operationId}Input${ann} = {`, ...assigns, `  };`];
}

function renderSingleUseBody(bff: CbBffCall, h: HandlerCtx): string[] {
  const op = bff.uses[0].operationId;
  const fn = h.usecaseFns.get(op);
  const fnName = fn?.functionName || op;
  const lines = [
    ...renderUsecaseInput(bff, op, fn),
    `const ${op}Result = await ${fnName}(ctx, ${op}Input);`,
    ...renderEnvelope(bff, h, resultVarProjector(op)),
  ];
  return lines;
}

// A projector maps a resolved field (operationId + path) to a runtime expression on the result variables.
type Projector = (operationId: string, path: string[], base: string) => string;
function resultVarProjector(_singleOp: string): Projector {
  return (operationId, path, base) => `${base ? base : `${operationId}Result`}${path.map(p => `.${p}`).join('')}`;
}

function renderEnvelope(bff: CbBffCall, h: HandlerCtx, project: Projector): string[] {
  if (!bff.output) return [`return ok(${bff.uses[0].operationId}Result);`]; // command passthrough
  const proj = resolveBffProjection(bff);
  if (proj.kind === 'object') {
    // WIRE = the projected object. Typed to Output so the contract shape is enforced at compile.
    const fields = proj.topFields.map(f => `    ${f.name}: ${project(f.operationId, f.path, '')},`);
    return [`const out: ${h.outputType} = {`, ...fields, `  };`, `return ok(out);`];
  }
  // list | paginated: map the op's SOURCE array to the projected item columns. `row` is UN-annotated so
  // its columns infer from the usecase's typed result array (outputShape pinned = CP2; the materializer
  // types the element as a named projection). The SOURCE key is the op's array field (list -> the
  // materializer's `items`; paginated -> the declared array field name of the operation outputShape).
  const op = proj.arrayOperationId || bff.uses[0].operationId;
  const srcArray = resolveItemsArrayField(h.opShapes.get(op)) || 'items';
  const cols = proj.itemFields.map(f => `    ${f.name}: row${f.path.map(p => `.${p}`).join('')},`);
  if (proj.kind === 'list') {
    // WIRE = a BARE array (contract `Output = Item[]`), NOT `{ items }`.
    return [
      `const items: ${h.outputType} = (${op}Result.${srcArray} ?? []).map((row) => ({`,
      ...cols,
      `  }));`,
      `return ok(items);`,
    ];
  }
  // paginated: WIRE = `{ <declaredArrayName>: Item[], ...meta }` — the DECLARED array name (e.g.
  // `reservations`), never `items`. Meta (total/page/pageSize) is passed through from the op result.
  const arrName = proj.arrayFieldName || 'items';
  const meta = proj.topFields.map(f => `${f.name}: ${project(f.operationId, f.path, '')}`);
  return [
    `const ${arrName}: ${h.outputType}['${arrName}'] = (${op}Result.${srcArray} ?? []).map((row) => ({`,
    ...cols,
    `  }));`,
    `return ok({ ${[arrName, ...meta].join(', ')} });`,
  ];
}

// Composed call (uses > 1): Promise.all of the usecases, optional slices degrade to null + a warning in
// the envelope. UNVERIFIED against a real composed workspace (none exist in the 102049 target) — see Notas.
function renderComposedBody(bff: CbBffCall, h: HandlerCtx): string[] {
  const lines: string[] = [`const warnings: string[] = [];`];
  for (const use of bff.uses) {
    const fn = h.usecaseFns.get(use.operationId);
    const fnName = fn?.functionName || use.operationId;
    lines.push(...renderUsecaseInput(bff, use.operationId, fn));
    if (use.optional) {
      lines.push(
        `const ${use.operationId}Result = await ${fnName}(ctx, ${use.operationId}Input).catch((e: unknown) => {`,
        `  warnings.push('${use.operationId}: ' + (e instanceof Error ? e.message : String(e)));`,
        `  return null;`,
        `});`,
      );
    } else {
      lines.push(`const ${use.operationId}Result = await ${fnName}(ctx, ${use.operationId}Input);`);
    }
  }
  // Composed output is always an object grouping the slices; each field reads from its op's result
  // (null-safe for optional uses).
  const proj = resolveBffProjection(bff);
  const optional = new Set(bff.uses.filter(u => u.optional).map(u => u.operationId));
  const fields = proj.topFields.map(f => {
    const opt = optional.has(f.operationId) ? '?' : '';
    return `    ${f.name}: ${f.operationId}Result${opt}${f.path.map(p => `.${p}`).join('')} ?? null,`;
  });
  return [`return ok({`, ...fields, `    warnings,`, `  });`];
}

function renderEnforceActors(): string {
  return [
    `// Actor authorization (permissive; D6.5 actor->login-role mapping pending). Absent session scope ->`,
    `// allow + telemetry; a declared scope with zero intersection against the route's allowed scopes -> deny.`,
    `function enforceActors(ctx: RequestContext, allowed: readonly string[], route: string): BffResponse | null {`,
    `  if (allowed.length === 0) return null;`,
    `  const scope = ctx.sessionContext?.actorScope ?? [];`,
    `  if (scope.length === 0) { ctx.log.info('bff.actor.no-scope', { route, allowed }); return null; }`,
    `  if (scope.some((s) => allowed.includes(s))) return null;`,
    `  return fail(new AppError('FORBIDDEN_ACTOR', 'actor scope not permitted for ' + route, 403, { route, scope }));`,
    `}`,
  ].join('\n');
}
