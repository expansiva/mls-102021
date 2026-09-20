/// <mls fileReference="_102021_/l2/agentPlannerL1/steps/plan20/gate.ts" enhancement="_blank"/>

import {
  P1_BACKEND_SCHEMA_VERSION,
  isP1Kind,
  isP1Operation,
  isP1PlanStatus,
  p1PortId,
  type P1BackendFile,
  type P1EntityView,
  type P1NeedsFile,
} from '/_102021_/l2/agentPlannerL1/steps/plan20/contracts.js';

export interface P1BackendGateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface P1BackendGateResult {
  ok: boolean;
  issues: P1BackendGateIssue[];
}

const ROUTE = /^[a-z][A-Za-z0-9]*\.[a-z][A-Za-z0-9_]*\.(qry|cmd)[A-Z][A-Za-z0-9]*$/;

export function validateP1Backend(
  file: P1BackendFile,
  needs: P1NeedsFile,
  ontology: readonly P1EntityView[],
): P1BackendGateResult {
  const issues: P1BackendGateIssue[] = [];
  if (file.schemaVersion !== P1_BACKEND_SCHEMA_VERSION) {
    error(issues, 'P1_BACKEND_SCHEMA', `schemaVersion must be ${P1_BACKEND_SCHEMA_VERSION}.`, '$.schemaVersion');
  }
  if (file.moduleName !== needs.moduleName) {
    error(issues, 'P1_BACKEND_MODULE', `moduleName must be ${needs.moduleName}.`, '$.moduleName');
  }

  const entityIds = new Set(ontology.map(entity => entity.entityId).filter(Boolean));
  const mdm = new Set(ontology.filter(entity => entity.family === 'mdm' || entity.storageTarget === 'mdm').map(entity => entity.entityId));
  const usecaseIds = new Set<string>();
  const routes = new Set<string>();

  file.usecases.forEach((usecase, index) => {
    const at = `$.usecases[${index}]`;
    if (!usecase.usecaseId) error(issues, 'P1_BACKEND_USECASE_ID', 'usecaseId is required.', `${at}.usecaseId`);
    if (usecaseIds.has(usecase.usecaseId)) {
      error(issues, 'P1_BACKEND_USECASE_DUP', `Duplicate usecase ${usecase.usecaseId}.`, `${at}.usecaseId`);
    }
    usecaseIds.add(usecase.usecaseId);
    if (entityIds.size && usecase.entity && !entityIds.has(usecase.entity)) {
      error(issues, 'P1_BACKEND_ENTITY_UNKNOWN', `Unknown entity ${usecase.entity}.`, `${at}.entity`);
    }
    if (!isP1Operation(usecase.operation)) {
      error(issues, 'P1_BACKEND_OPERATION', 'operation must be list|get|create|update|transition|delete|custom.', `${at}.operation`);
    }
    if (!isP1PlanStatus(usecase.status) || usecase.status === 'toRemove') {
      error(issues, 'P1_BACKEND_STATUS', 'usecase status must be toCreate|toUpdate|done.', `${at}.status`);
    }
    if (!usecase.reason) error(issues, 'P1_BACKEND_REASON', 'reason is required.', `${at}.reason`);
    if (usecase.status === 'toCreate' && usecase.existing) {
      error(issues, 'P1_BACKEND_EXISTING', 'existing must be empty when status is toCreate.', `${at}.existing`);
    }
    if ((usecase.status === 'done' || usecase.status === 'toUpdate') && !usecase.existing) {
      error(issues, 'P1_BACKEND_EXISTING', 'existing is the .defs.ts path when status is done|toUpdate.', `${at}.existing`);
    }
    if (mdm.has(usecase.entity) && usecase.ports.length) {
      error(issues, 'P1_BACKEND_MDM_PORT', `MDM entity ${usecase.entity} must not list ports.`, `${at}.ports`);
    }
    for (const port of usecase.ports) {
      if (mdm.has(port)) error(issues, 'P1_BACKEND_MDM_PORT', `MDM entity ${port} must not appear in ports.`, `${at}.ports`);
    }
  });

  file.endpoints.forEach((endpoint, index) => {
    const at = `$.endpoints[${index}]`;
    if (!ROUTE.test(endpoint.route)) {
      error(issues, 'P1_BACKEND_ROUTE', `route must be mod.page.qry|cmdName — got ${endpoint.route}.`, `${at}.route`);
    }
    if (routes.has(endpoint.route)) {
      error(issues, 'P1_BACKEND_ROUTE_DUP', `Duplicate route ${endpoint.route}.`, `${at}.route`);
    }
    routes.add(endpoint.route);
    if (!isP1Kind(endpoint.kind)) {
      error(issues, 'P1_BACKEND_KIND', 'kind must be qry|cmd.', `${at}.kind`);
    }
    if (!usecaseIds.has(endpoint.usecaseRef)) {
      error(issues, 'P1_BACKEND_USECASE_REF', `usecaseRef ${endpoint.usecaseRef} is not in usecases[].`, `${at}.usecaseRef`);
    }
    if (!isP1PlanStatus(endpoint.status) || endpoint.status === 'toRemove') {
      error(issues, 'P1_BACKEND_STATUS', 'endpoint status must be toCreate|toUpdate|done.', `${at}.status`);
    }
  });

  for (const page of needs.pages) {
    if (!file.endpoints.some(item => item.page === page.pageId)) {
      error(issues, 'P1_BACKEND_PAGE', `page ${page.pageId} has no endpoint.`, '$.endpoints');
    }
  }

  file.ports.forEach((port, index) => {
    const at = `$.ports[${index}]`;
    if (mdm.has(port.entity)) {
      error(issues, 'P1_BACKEND_MDM_PORT', `MDM entity ${port.entity} must not appear in ports[].`, at);
    }
    if (port.portId !== p1PortId(port.entity) && !file.inventoryPresent) {
      error(issues, 'P1_BACKEND_PORT_ID', `portId must be ${p1PortId(port.entity)}.`, `${at}.portId`);
    }
    if (entityIds.size && port.entity && !entityIds.has(port.entity)) {
      error(issues, 'P1_BACKEND_ENTITY_UNKNOWN', `Unknown entity ${port.entity}.`, `${at}.entity`);
    }
  });

  file.tables.forEach((table, index) => {
    const at = `$.tables[${index}]`;
    if (mdm.has(table.entity)) {
      error(issues, 'P1_BACKEND_MDM_TABLE', `MDM entity ${table.entity} must not appear in tables[].`, at);
    }
    if (entityIds.size && table.entity && !entityIds.has(table.entity)) {
      error(issues, 'P1_BACKEND_ENTITY_UNKNOWN', `Unknown entity ${table.entity}.`, `${at}.entity`);
    }
  });

  file.removed.forEach((item, index) => {
    if (item.status !== 'toRemove') {
      error(issues, 'P1_BACKEND_STATUS', 'removed[].status must be toRemove.', `$.removed[${index}].status`);
    }
    if (!item.reason) error(issues, 'P1_BACKEND_REASON', 'reason is required.', `$.removed[${index}].reason`);
  });

  return { ok: issues.every(issue => issue.severity !== 'error'), issues };
}

export function repairP1Backend(
  file: P1BackendFile,
  needs: P1NeedsFile,
  ontology: readonly P1EntityView[],
): P1BackendFile {
  const mdm = new Set(ontology.filter(entity => entity.family === 'mdm' || entity.storageTarget === 'mdm').map(entity => entity.entityId));
  const usecases = file.usecases.map(usecase => ({
    ...usecase,
    ports: usecase.ports.filter(entity => !mdm.has(entity)),
    existing: usecase.status === 'toCreate' ? '' : usecase.existing,
    reason: usecase.reason || `no l1 usecase for ${usecase.entity}.${usecase.operation}`,
    status: usecase.status === 'toRemove' ? 'toCreate' as const : usecase.status,
  }));
  const usecaseIds = new Set(usecases.map(item => item.usecaseId));
  const seenRoutes = new Set<string>();
  const endpoints = file.endpoints.filter(endpoint => {
    if (!usecaseIds.has(endpoint.usecaseRef)) return false;
    if (seenRoutes.has(endpoint.route)) return false;
    seenRoutes.add(endpoint.route);
    return true;
  });
  const pages = { ...file.meta.pages };
  for (const page of needs.pages) {
    pages[page.pageId] = endpoints.filter(item => item.page === page.pageId).map(item => item.route);
  }
  return {
    ...file,
    schemaVersion: P1_BACKEND_SCHEMA_VERSION,
    usecases,
    endpoints,
    ports: file.ports.filter(port => !mdm.has(port.entity)),
    tables: file.tables.filter(table => !mdm.has(table.entity)),
    meta: { ...file.meta, pages },
  };
}

export function formatP1BackendGate(issues: readonly P1BackendGateIssue[]): string {
  return issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');
}

function error(issues: P1BackendGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, path });
}
