/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/serveGrants.ts" enhancement="_blank"/>

import type { D1ControllerGrant } from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';
import { isSafeToken } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';

/** One technical caller grant. Shape accepted by `accessScopeIssues` for `connection:*` and `module:*`. */
export interface D1ServeGrant {
  grantId: string;
  actorRef: string;
  entityRefs: [];
  disclosure: 'fullRecord';
  scopeMode: 'organization';
  session: 'verified';
  path: [];
  pending: '';
}

const MARK = /^([a-z][A-Za-z0-9]*)\.[a-z][A-Za-z0-9]*$/;

/** The marks of a route the platform reaches, not a person: `serves` (a connection) or `consumes` (a module event, d1_217). */
export interface D1RouteMark {
  serves?: string;
  consumes?: string;
}

export function isMarkedRoute(route: D1RouteMark): boolean {
  return Boolean(route.serves || route.consumes);
}

/**
 * The technical caller of a marked route: the connection that serves it (`connection:<id>`) or the module that publishes the event it
 * consumes (`module:<publisher>`, the actor the delivery runs as). Null for a route that is not marked.
 */
export function technicalCaller(route: D1RouteMark): { id: string; kind: 'connection' | 'module'; actorRef: string; grantId: string } | null {
  const served = MARK.exec(route.serves || '')?.[1];
  if (served) return { id: served, kind: 'connection', actorRef: `connection:${served}`, grantId: `connection_${served}` };
  const consumed = MARK.exec(route.consumes || '')?.[1];
  if (consumed) return { id: consumed, kind: 'module', actorRef: `module:${consumed}`, grantId: `module_${consumed}` };
  return null;
}

/** One grant per technical caller that a marked request names. Requests without a mark add none. */
export function serveGrants(requests: readonly D1RouteMark[]): D1ServeGrant[] {
  const callers = new Map<string, string>();
  for (const request of requests) {
    const caller = technicalCaller(request);
    if (!caller || !isSafeToken(caller.grantId)) continue;
    callers.set(caller.grantId, caller.actorRef);
  }
  return [...callers.keys()].sort().map(grantId => ({
    grantId,
    actorRef: callers.get(grantId) as string,
    entityRefs: [],
    disclosure: 'fullRecord',
    scopeMode: 'organization',
    session: 'verified',
    path: [],
    pending: '',
  }));
}

/** The technical grants as controller grants, for `accessGrantsOf` of controllers60 and support70. */
export function serveControllerGrants(requests: readonly D1RouteMark[]): D1ControllerGrant[] {
  return serveGrants(requests).map(grant => ({
    grantId: grant.grantId,
    actorRef: grant.actorRef,
    entityRefs: [],
    disclosure: grant.disclosure,
    allowedFields: [],
    anchorEntity: '',
    scopeMode: grant.scopeMode,
  }));
}
