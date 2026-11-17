/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/connectionCatalog.ts" enhancement="_blank"/>

/**
 * The operations of a connection catalog file (`export const <id>: ConnectionCatalog = { ... }`, JSON keys), read without
 * evaluating it. One reader for the gateway emitter, the serve controller and the usecase context.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;

function ident(value: string): boolean {
  return IDENTIFIER.test(value);
}

export interface CatalogOperation {
  operationId: string;
  inputType: string;
  outputType: string;
  direction: string;
  kind: string;
  description: string;
  reply: string;
  resultOperation: string;
  noRowLimit: boolean;
  hiddenFromAgents: boolean;
  expectsVersion: boolean;
}

/**
 * The object of `export const <id>: ConnectionCatalog = { ... }` (JSON keys), read without evaluating the file.
 * A copy of the defs reader of agentDefsL1 on purpose: the recipes of this agent are copies, not imports of another agent.
 */
function parseCatalogObject(source: string): unknown {
  const assignment = source.search(/export\s+const\s+[A-Za-z_$][A-Za-z0-9_$]*(?:\s*:\s*[A-Za-z_$][\w$.<>, ]*)?\s*=/);
  const start = assignment < 0 ? -1 : source.indexOf('{', source.indexOf('=', assignment));
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(source.slice(start, index + 1)) as unknown;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export function catalogOperations(source: string): CatalogOperation[] | null {
  const parsed = parseCatalogObject(source);
  if (!isRecord(parsed) || !Array.isArray(parsed.operations)) return null;
  const operations: CatalogOperation[] = [];
  for (const row of parsed.operations) {
    if (!isRecord(row) || !ident(text(row.operationId)) || !ident(text(row.inputType)) || !ident(text(row.outputType))) continue;
    operations.push({
      operationId: text(row.operationId),
      inputType: text(row.inputType),
      outputType: text(row.outputType),
      direction: text(row.direction),
      kind: text(row.kind),
      description: text(row.description),
      reply: text(row.reply),
      resultOperation: text(row.resultOperation),
      noRowLimit: row.noRowLimit === true,
      hiddenFromAgents: row.hiddenFromAgents === true,
      expectsVersion: row.expectsVersion === true,
    });
  }
  return operations;
}
