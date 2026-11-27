/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/external15/inputSecrets.ts" enhancement="_blank"/>

// d1_350: the `inputSecrets` of an operation of the declaration of a system outside the app (what the call carries in its input that must not be logged) comes from the L4 by code: the entities an outbound operation
// names (`entityRefs` of the line of `integration.defs.ts`) have fields marked `secret: true` in the ontology, and the declaration must list, for such an operation, the input fields that carry them. The code does not choose WHICH
// input field carries which secret (no new vocabulary): it says the secret fields and asks for a non-empty `inputSecrets` whose names are fields of the input. A module with no `secret` field has the same context and the same gate.

import { withoutComments } from '/_102021_/l2/agentMaterializeL1/helpers/codeTokens.js';
import { ontologyEntityOf } from '/_102021_/l2/agentMaterializeL1/steps/requests50/arrivalUpsert.js';
import type { M12Context } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';

export interface InputSecretField {
  entityId: string;
  /** The path in the record (`details.accessKey`). */
  path: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** The paths of `fields` (nested through `fields`) the ontology marks `secret: true`. */
export function secretFieldPaths(fields: unknown, prefix = ''): string[] {
  if (!isRecord(fields)) return [];
  const out: string[] = [];
  for (const [name, meta] of Object.entries(fields)) {
    if (!isRecord(meta)) continue;
    const path = prefix ? `${prefix}.${name}` : name;
    if (meta.secret === true) out.push(path);
    out.push(...secretFieldPaths(meta.fields, path));
  }
  return out;
}

/** For each outbound (`call`) operation of the system, the secret fields of the entities its line names. An operation with none is not in the map. */
export async function inputSecretFieldsOf(
  ctx: M12Context,
  lines: ReadonlyArray<{ operationId: string; direction: string; entityRefs: readonly string[] }>,
): Promise<Map<string, InputSecretField[]>> {
  const found = new Map<string, InputSecretField[]>();
  const cache = new Map<string, string[]>();
  for (const line of lines) {
    if (line.direction !== 'call') continue;
    const fields: InputSecretField[] = [];
    for (const entityId of line.entityRefs) {
      if (!cache.has(entityId)) {
        const entity = ontologyEntityOf(await ctx.read(`_${ctx.run.project}_/l4/${ctx.run.module}/ontology/${entityId}.defs.ts`));
        cache.set(entityId, isRecord(entity) && isRecord(entity.record) ? secretFieldPaths(entity.record.fields) : []);
      }
      for (const path of cache.get(entityId) ?? []) fields.push({ entityId, path });
    }
    if (fields.length > 0) found.set(line.operationId, fields);
  }
  return found;
}

/** The section of the context: one line per operation that reads a secret field; '' when no operation does. */
export function inputSecretsSection(secrets: ReadonlyMap<string, readonly InputSecretField[]>): string {
  if (secrets.size === 0) return '';
  return [...secrets].map(([operationId, fields]) => `- ${operationId}: the entity ${[...new Set(fields.map(field => field.entityId))].join(', ')} has secret field(s) ${fields.map(field => `\`${field.path}\``).join(', ')} in the L4. The operation must declare \`uses.inputSecrets\`, with the name(s) of the field(s) of its input that carry the secret.`).join('\n');
}

/** The top-level member names of the declared input type in the file (an interface or `type X = { … }`); null when it is not declared so. Text only: this file runs in the Studio, which does not carry the TypeScript API. */
export function inputFieldNames(code: string, typeName: string): string[] | null {
  const text = withoutComments(code);
  const start = new RegExp(`(?:^|\\n)\\s*(?:export\\s+)?(?:interface\\s+${typeName}\\b[^{]*|type\\s+${typeName}\\s*=\\s*)\\{`, 'u').exec(text);
  if (!start) return null;
  const open = start.index + start[0].length - 1;
  const names: string[] = [];
  let depth = 0;
  let segment = '';
  for (let at = open; at < text.length; at += 1) {
    const char = text[at];
    if (char === '{' || char === '(' || char === '[' || char === '<') { if (depth === 1) segment += char; depth += 1; continue; }
    if (char === '}' || char === ')' || char === ']' || char === '>') {
      depth -= 1;
      if (depth === 0) {
        const last = /^\s*(?:readonly\s+)?(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*\??\s*:/u.exec(segment);
        if (last) names.push(last[1] ?? last[2] ?? last[3]);
        break;
      }
      if (depth >= 1) segment += char;
      continue;
    }
    if (depth === 1 && (char === ';' || char === ',' || char === '\n')) {
      const member = /^\s*(?:readonly\s+)?(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*\??\s*:/u.exec(segment);
      if (member) names.push(member[1] ?? member[2] ?? member[3]);
      segment = '';
      continue;
    }
    if (depth >= 1) segment += char;
  }
  return names;
}

/**
 * The two rules: (a) an operation that reads a secret field declares a non-empty `inputSecrets`; (b) every name in `inputSecrets` is a field of the input of the operation (when the file declares that type).
 * `operations` is the `operations` of the declaration as the model wrote it.
 */
export function inputSecretProblems(code: string, operations: ReadonlyArray<Record<string, unknown>>, secrets: ReadonlyMap<string, readonly InputSecretField[]>): string[] {
  const problems: string[] = [];
  for (const operation of operations) {
    const operationId = typeof operation.operationId === 'string' ? operation.operationId : '';
    const uses = isRecord(operation.uses) ? operation.uses : {};
    const declared = Array.isArray(uses.inputSecrets) ? uses.inputSecrets.filter((item): item is string => typeof item === 'string') : [];
    const fields = secrets.get(operationId);
    if (fields && declared.length === 0) {
      problems.push(`Operation ${operationId} reads ${fields.map(field => `${field.entityId}.${field.path}`).join(', ')}, which the L4 marks secret: declare \`uses.inputSecrets\` with the name of the field of the input that carries it.`);
    }
    const inputType = typeof operation.inputType === 'string' ? operation.inputType : '';
    const names = declared.length > 0 && inputType ? inputFieldNames(code, inputType) : null;
    if (names) {
      for (const name of declared.filter(item => !names.includes(item))) {
        problems.push(`Operation ${operationId}: inputSecrets item ${name} is not a field of the input ${inputType} (fields: ${names.join(', ') || '(none)'}).`);
      }
    }
  }
  return problems;
}
