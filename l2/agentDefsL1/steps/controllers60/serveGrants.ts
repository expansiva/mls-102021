/// <mls fileReference="_102021_/l2/agentDefsL1/steps/controllers60/serveGrants.ts" enhancement="_blank"/>

import type { D1ControllerGrant } from '/_102021_/l2/agentDefsL1/steps/controllers60/contracts.js';
import { isSafeToken } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';

/** One technical caller grant. Shape accepted by `accessScopeIssues` for `connection:*`. */
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

const SERVE_MARK = /^([a-z][A-Za-z0-9]*)\.[a-z][A-Za-z0-9]*$/;

/** One grant per connection that a serve request names. Requests without `serves` add none. */
export function serveGrants(requests: readonly { serves?: string }[]): D1ServeGrant[] {
  const ids = new Set<string>();
  for (const request of requests) {
    const connectionId = SERVE_MARK.exec(request.serves || '')?.[1];
    if (!connectionId) continue;
    const grantId = `connection_${connectionId}`;
    if (!isSafeToken(grantId)) continue;
    ids.add(connectionId);
  }
  return [...ids].sort().map(connectionId => ({
    grantId: `connection_${connectionId}`,
    actorRef: `connection:${connectionId}`,
    entityRefs: [],
    disclosure: 'fullRecord',
    scopeMode: 'organization',
    session: 'verified',
    path: [],
    pending: '',
  }));
}

/** The technical grants as controller grants, for `accessGrantsOf` of controllers60 and support70. */
export function serveControllerGrants(requests: readonly { serves?: string }[]): D1ControllerGrant[] {
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
