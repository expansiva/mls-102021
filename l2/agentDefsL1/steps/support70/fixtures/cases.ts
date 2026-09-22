/// <mls fileReference="_102021_/l2/agentDefsL1/steps/support70/fixtures/cases.ts" enhancement="_blank"/>

import { pipelineId } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { buildD1Controllers } from '/_102021_/l2/agentDefsL1/steps/controllers60/gate.js';
import { coreControllerRequest } from '/_102021_/l2/agentDefsL1/steps/controllers60/fixtures/cases.js';
import { lowerFirst } from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import type { D1SupportAdapter, D1SupportRequest } from '/_102021_/l2/agentDefsL1/steps/support70/contracts.js';

/**
 * Measured from the frozen agendaClinica controller fixture: 7 grants, 1 live adapter.
 * The scope plans are the ones controllers60 already resolved. The anchor is not corrected.
 */
export function coreSupportRequest(): D1SupportRequest {
  const controllers = coreControllerRequest();
  const built = buildD1Controllers(controllers);
  const plans = new Map<string, D1SupportRequest['scopePlans'][number]>();
  const cited: string[] = [];
  for (const controller of built.controllers) {
    for (const handler of controller.handlers) {
      for (const grantId of handler.grantIds) {
        if (!cited.includes(grantId)) cited.push(grantId);
      }
      for (const plan of handler.scopePlan) {
        if (!plans.has(plan.grantId)) plans.set(plan.grantId, plan);
      }
    }
  }
  return {
    project: controllers.project,
    moduleName: controllers.moduleName,
    grants: controllers.grants.map(grant => ({
      ...grant,
      entityRefs: [...grant.entityRefs],
      allowedFields: [...grant.allowedFields],
    })),
    relationships: controllers.relationships.map(rel => ({ ...rel })),
    scopePlans: [...plans.values()],
    citedGrantIds: cited,
    adapters: [consultaAdapter(controllers.moduleName)],
    files: [],
    existingHelpers: [],
    applicationEdges: [],
    formFields: [],
    enumerations: built.enumerations.map(item => ({
      entityId: item.entityId,
      path: item.path,
      values: [...item.values],
    })),
  };
}

export function consultaAdapter(moduleName: string): D1SupportAdapter {
  return {
    portId: 'ConsultaRepository',
    entityId: 'Consulta',
    tableId: 'consulta',
    artifactId: 'ConsultaRepository',
    action: 'create',
    defPath: `l1/${moduleName}/layer_1_external/adapters/persistence/${lowerFirst('Consulta')}RepositoryAdapter.defs.ts`,
  };
}

export function adapterPipelineId(project: number, moduleName: string, portId: string): string {
  return pipelineId(project, moduleName, 'repositoryAdapter', portId);
}
