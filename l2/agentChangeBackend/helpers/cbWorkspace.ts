/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/.ts" enhancement="_102027_/l2/enhancementAgent"/>

// l4 v2 workspace/bffCall model + PURE parsers (no file I/O, no side-effecting imports). Kept in its own
// module so it stays unit-testable: cbShared pulls in libStor -> libModel whose top-level
// `mls.events.addEventListener` crashes the l2 test stub. Everything here depends only on isRecord.
// The controller (gen-http v2, B4) is derived deterministically from these — see newSolution_10 §A2/A5.

import { isRecord } from '/_102021_/l2/agentChangeBackend/helpers/cbPlanner.js';

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(readString).filter(Boolean) : [];
}

// A bffCall is the wire contract of a page view: it composes 1..N operations (`uses`) and projects
// (select/rename/nest) their outputShape into the page-shaped Output. `from` is a traceable path:
// `<operationId>.<field>` for top-level fields/inputs, `<operationId>.$items.<field>` for array columns.
export interface CbBffCallInput { name: string; from: string; type?: string; }
export interface CbBffCallOutputField {
  name: string;
  from?: string;
  type?: string;
  required?: boolean;
  item?: { fields: CbBffCallOutputField[] };
}
export interface CbBffCallOutput { kind: 'object' | 'list' | 'paginated'; fields: CbBffCallOutputField[]; }
export interface CbBffCallUse { operationId: string; optional?: boolean; }
export interface CbBffCall {
  bffId: string;
  kind: 'query' | 'command';
  uses: CbBffCallUse[];
  input: CbBffCallInput[];
  output?: CbBffCallOutput;   // command passthrough may omit output (1:1 with the operation)
  route: string;              // `<module>.<workspaceId>.<bffId>` — derived, never hand-typed
}
export interface CbWorkspace {
  workspaceId: string;
  moduleName: string;
  title: string;
  actors: string[];           // authorization for every route the workspace owns
  kind: string;               // operation | workflow | landing | ...
  purpose: string;
  bffCalls: CbBffCall[];
  operationIds: string[];     // union of bffCalls[].uses (deprecated inline field is honored as fallback)
}
export interface CbActor { actorId: string; title: string; roleScope: string; moduleName: string; }

// Actors: l4 v2 declares `actors: string[]`; v1 `actor: string` (folded to a single-element array).
export function readActorsField(obj: Record<string, unknown>): string[] {
  const plural = readStringArray(obj.actors);
  if (plural.length) return plural;
  const singular = readString(obj.actor);
  return singular ? [singular] : [];
}

// Module actors file (l4 v2): `actors` is an array of objects, not strings — read separately.
export function readModuleActors(obj: Record<string, unknown>, moduleName: string): CbActor[] {
  const arr = Array.isArray(obj.actors) ? obj.actors.filter(isRecord) : [];
  return arr
    .map(a => {
      const actorId = readString(a.actorId);
      if (!actorId) return null;
      return { actorId, title: readString(a.title) || actorId, roleScope: readString(a.roleScope), moduleName };
    })
    .filter((a): a is CbActor => a !== null);
}

/**
 * ns4 has no `actors.defs.ts`: the audience of the module is the access matrix, whose profiles are
 * exactly the ids the operations already name in `actors[]`. `kind` (internal/external/system) is
 * the role scope.
 */
export function readAccessMatrixActors(obj: Record<string, unknown>, moduleName: string): CbActor[] {
  const arr = Array.isArray(obj.profiles) ? obj.profiles.filter(isRecord) : [];
  return arr
    .map(profile => {
      const actorId = readString(profile.profileId);
      if (!actorId) return null;
      return { actorId, title: readString(profile.title) || actorId, roleScope: readString(profile.kind), moduleName };
    })
    .filter((a): a is CbActor => a !== null);
}

// Parse a l4 v2 workspace defs into a CbWorkspace (bffCalls + projection). Pure/testable: no file I/O.
export function parseWorkspaceDefs(obj: Record<string, unknown>, moduleName: string): CbWorkspace | null {
  if (!isRecord(obj)) return null;
  const workspaceId = readString(obj.workspaceId);
  if (!workspaceId) return null;
  const bffCalls = (Array.isArray(obj.bffCalls) ? obj.bffCalls.filter(isRecord) : [])
    .map(c => parseBffCall(c, moduleName, workspaceId))
    .filter((c): c is CbBffCall => c !== null);
  const usedOps = [...new Set(bffCalls.flatMap(c => c.uses.map(u => u.operationId)).filter(Boolean))];
  return {
    workspaceId,
    moduleName,
    title: readString(obj.title) || workspaceId,
    actors: readActorsField(obj),
    kind: readString(obj.kind),
    purpose: readString(obj.purpose),
    bffCalls,
    operationIds: usedOps.length ? usedOps : readStringArray(obj.operationIds),
  };
}

function parseBffCall(obj: Record<string, unknown>, moduleName: string, workspaceId: string): CbBffCall | null {
  const bffId = readString(obj.bffId);
  if (!bffId) return null;
  const kind = readString(obj.kind) === 'command' ? 'command' : 'query';
  const uses = (Array.isArray(obj.uses) ? obj.uses.filter(isRecord) : [])
    .map(u => {
      const operationId = readString(u.operationId);
      return operationId ? { operationId, ...(u.optional === true ? { optional: true } : {}) } : null;
    })
    .filter((u): u is CbBffCallUse => u !== null);
  const input = (Array.isArray(obj.input) ? obj.input.filter(isRecord) : [])
    .map(i => {
      const name = readString(i.name);
      if (!name) return null;
      const field: CbBffCallInput = { name, from: readString(i.from) };
      if (readString(i.type)) field.type = readString(i.type);
      return field;
    })
    .filter((i): i is CbBffCallInput => i !== null);
  const output = parseBffCallOutput(obj.output);
  const route = readString(obj.route) || `${moduleName}.${workspaceId}.${bffId}`;
  return { bffId, kind, uses, input, ...(output ? { output } : {}), route };
}

function parseBffCallOutput(value: unknown): CbBffCallOutput | undefined {
  if (!isRecord(value)) return undefined;
  const kind = readString(value.kind) as CbBffCallOutput['kind'];
  const fields = (Array.isArray(value.fields) ? value.fields : [])
    .map(parseBffCallOutputField)
    .filter((f): f is CbBffCallOutputField => f !== null);
  if (!kind || fields.length === 0) return undefined;
  return { kind, fields };
}

function parseBffCallOutputField(value: unknown): CbBffCallOutputField | null {
  if (!isRecord(value)) return null;
  const name = readString(value.name);
  if (!name) return null;
  const field: CbBffCallOutputField = { name };
  if (readString(value.from)) field.from = readString(value.from);
  if (readString(value.type)) field.type = readString(value.type);
  if (value.required === true) field.required = true;
  if (isRecord(value.item) && Array.isArray(value.item.fields)) {
    const fields = value.item.fields.map(parseBffCallOutputField).filter((f): f is CbBffCallOutputField => f !== null);
    if (fields.length) field.item = { fields };
  }
  return field;
}
