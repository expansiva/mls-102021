/// <mls fileReference="_102021_/l2/agentMaterializeL1/context/context.ts" enhancement="_blank"/>

/**
 * Context by artifact type and capability. Paths are real 102034 sources.
 * The MDM catalog (`l4/ontology/mdm.defs.ts`) is a dependency file, not a stand-in
 * for RequestContext or mdmFacade. Domain declarations get no facade.
 * A definition source and a compiled TypeScript signature are different functions:
 * compiledSignature refuses a v2 def.
 */

import { isRecord, type M1ArtifactType, type M1Definition } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { handlerFor, type M1ContextCapability } from '/_102021_/l2/agentMaterializeL1/core/registry.js';

export const PLATFORM_FILES: Record<M1ContextCapability, string> = {
  requestContext: '_102034_/l1/server/layer_2_controllers/contracts.ts',
  dataRuntime: '_102034_/l1/server/layer_1_external/data/runtime.ts',
  tableDefinition: '_102034_/l1/server/layer_1_external/persistence/contracts.ts',
  repositoryRegistry: '_102034_/l1/server/layer_2_application/repositoryRegistry.ts',
  mdmFacade: '_102034_/l1/mdm/layer_3_usecases/mdmFacade.ts',
};

const DEFINITION_EXPORT = 'export const definition = ';
const EXPORT_LINE = /^export\s+(?:declare\s+)?(?:async\s+)?(?:function|class|interface|type|const|enum)\s+\S+/;

export function usesMdm(data: Record<string, unknown>): boolean {
  if (isRecord(data.mdm) && Object.keys(data.mdm).length > 0) return true;
  return Array.isArray(data.sequence) && data.sequence.some(step => isRecord(step) && step.kind === 'mdm');
}

/** Platform files for a named type. Unknown types get nothing — not the full bundle. */
export function platformFilesFor(type: M1ArtifactType, data: Record<string, unknown> = {}): string[] {
  const named = handlerFor(type, 'structure');
  if (!named) return [];
  const capabilities: M1ContextCapability[] = [...named.capabilities];
  if (type === 'usecase' && usesMdm(data)) capabilities.push('mdmFacade');
  return capabilities.map(capability => PLATFORM_FILES[capability]);
}

export function platformFilesForDefinition(definition: M1Definition): string[] {
  return platformFilesFor(definition.artifactType, definition.data);
}

/**
 * Compiled signature of a TypeScript file. A v2 definition source is not a signature,
 * even when it contains `export const`.
 */
export function compiledSignature(source: string): string | null {
  if (source.includes(DEFINITION_EXPORT)) return null;
  const lines = source.split('\n').map(line => line.trim()).filter(line => EXPORT_LINE.test(line));
  return lines.length === 0 ? null : lines.join('\n');
}

export interface ContextEntry {
  ref: string;
  role: 'platform' | 'def' | 'compiled';
  state: 'read' | 'inaccessible';
  sha256: string | null;
  /** Present only for role `compiled` when the bytes are a real signature. */
  signature: string | null;
}

export function renderPrompt(entries: readonly ContextEntry[], unresolved: readonly string[]): string {
  const lines: string[] = [];
  if (unresolved.length > 0) {
    lines.push('## Unresolved', ...unresolved, '');
  }
  lines.push('## Context');
  for (const entry of entries) {
    lines.push('', `### ${entry.role} ${entry.ref}`);
    if (entry.state === 'inaccessible') {
      lines.push(entry.role === 'compiled' ? '(not a compiled signature)' : '(inaccessible)');
    } else if (entry.signature) {
      lines.push(entry.signature);
    } else {
      lines.push(`read ${entry.sha256 ?? ''}`);
    }
  }
  return lines.join('\n');
}
