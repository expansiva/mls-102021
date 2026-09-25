/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/structure/gate.ts" enhancement="_blank"/>

/**
 * Route gate shared by the controller emitter and the checkpoint observations.
 * Empty http authority is refused before a grant lookup, and a pending grant
 * is refused before the usecase. The stub never hides either one.
 */

import { M1_STUB_ERROR, M1_STUB_STATUS } from '/_102021_/l2/agentMaterializeL1/testing/catalog.js';

export const FORBIDDEN_ACTOR = 'FORBIDDEN_ACTOR';
export const VALIDATION_ERROR = 'VALIDATION_ERROR';
export const GRANT_ABSENT = 'GRANT_ABSENT';
export const SESSION_UNVERIFIED = 'SESSION_UNVERIFIED';
export const SCOPE_UNBOUND = 'SCOPE_UNBOUND';
export const REPOSITORY_NOT_IMPLEMENTED = 'REPOSITORY_NOT_IMPLEMENTED';

export interface StructureGrant {
  grantId: string;
  actorRef: string;
  scopeMode: string;
  session: string;
  pending: string;
  disclosure: string;
  /** Record field taken from the grant path. Empty when that path does not resolve. */
  recordField?: string;
}

export interface GateInput {
  source: 'http' | 'message' | 'test';
  authorities: readonly string[];
  grantIds: readonly string[];
  grants: readonly StructureGrant[];
  params: unknown;
  requiredFields: readonly string[];
}

export interface GateDecision {
  ok: boolean;
  status: number;
  errorCode: string | null;
  reachedUsecase: boolean;
}

export function resolveGrant(grants: readonly StructureGrant[], grantId: string): StructureGrant | { code: string; detail: string } {
  const grant = grants.find(item => item.grantId === grantId);
  if (!grant) return { code: GRANT_ABSENT, detail: `Grant ${grantId} is not declared.` };
  if (grant.pending) return { code: grant.pending, detail: `Grant ${grantId} is pending ${grant.pending}.` };
  if (grant.session !== 'verified') return { code: SESSION_UNVERIFIED, detail: `Grant ${grantId} session is not verified.` };
  if (!grant.scopeMode) return { code: SCOPE_UNBOUND, detail: `Grant ${grantId} has no scope mode.` };
  if (grant.scopeMode === 'own' && !grant.recordField) {
    return { code: 'ACCESS_ANCHOR', detail: `Grant ${grantId} has no resolved scope path.` };
  }
  return grant;
}

export function missingField(params: unknown, fields: readonly string[]): string {
  const body = params && typeof params === 'object' && !Array.isArray(params) ? params as Record<string, unknown> : null;
  for (const field of fields) {
    if (!body || body[field] === undefined || body[field] === null || body[field] === '') return field;
  }
  return '';
}

/** Same order the emitted controller uses. A stub result means both gates passed. */
export function decideRoute(input: GateInput): GateDecision {
  if (input.source === 'http' && input.authorities.length === 0) {
    return { ok: false, status: 403, errorCode: FORBIDDEN_ACTOR, reachedUsecase: false };
  }
  for (const grantId of input.grantIds) {
    const resolved = resolveGrant(input.grants, grantId);
    if (!('grantId' in resolved)) {
      return { ok: false, status: 403, errorCode: resolved.code, reachedUsecase: false };
    }
    const authorities = input.authorities;
    if (authorities.length > 0 && resolved.actorRef && !authorities.some(item => item === resolved.actorRef || item.endsWith(`:${resolved.actorRef}`))) {
      return { ok: false, status: 403, errorCode: FORBIDDEN_ACTOR, reachedUsecase: false };
    }
  }
  if (missingField(input.params, input.requiredFields)) {
    return { ok: false, status: 400, errorCode: VALIDATION_ERROR, reachedUsecase: false };
  }
  return { ok: false, status: M1_STUB_STATUS, errorCode: M1_STUB_ERROR, reachedUsecase: true };
}

export function stubDecision(): GateDecision {
  return { ok: false, status: M1_STUB_STATUS, errorCode: M1_STUB_ERROR, reachedUsecase: true };
}
