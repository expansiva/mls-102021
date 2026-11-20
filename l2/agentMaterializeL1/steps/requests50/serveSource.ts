/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/requests50/serveSource.ts" enhancement="_blank"/>

// d1_207: what the L4 writes on a `direction: 'serve'` line of `integration.defs.ts`. The catalog of the connection gives the shape of the
// message; the L4 `usedBy` and `description` say what the module does with it. The prompt of the route shows them as the source.

export interface ServeSource {
  usedBy: string[];
  description: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** The text of the serve line `connectionId.operationId`. `null` when the file is not readable, the line is absent or it has no text. */
export function serveSourceOf(integrationSource: string | null, connectionId: string, operationId: string): ServeSource | null {
  const match = integrationSource ? /=\s*(\{[\s\S]*\})\s*(?:as const)?\s*(?:satisfies[^;]*)?;/u.exec(integrationSource) : null;
  if (!match) return null;
  let root: unknown;
  try { root = JSON.parse(match[1]); } catch { return null; }
  const rows = isRecord(root) && Array.isArray(root.connections) ? root.connections.filter(isRecord) : [];
  const row = rows.find(item => item.direction === 'serve' && item.connectionId === connectionId && item.operationId === operationId);
  if (!row) return null;
  const usedBy = Array.isArray(row.usedBy) ? row.usedBy.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : [];
  const description = typeof row.description === 'string' ? row.description.trim() : '';
  return usedBy.length || description ? { usedBy, description } : null;
}

function integrationRoot(integrationSource: string | null): Record<string, unknown> | null {
  const match = integrationSource ? /=\s*(\{[\s\S]*\})\s*(?:as const)?\s*(?:satisfies[^;]*)?;/u.exec(integrationSource) : null;
  if (!match) return null;
  try {
    const root: unknown = JSON.parse(match[1]);
    return isRecord(root) ? root : null;
  } catch { return null; }
}

/** The whole serve line `connectionId.operationId` of the L4 (d1_232: the one reader of the NS5 says what it does to each entity). `null` when absent. */
export function serveRowOf(integrationSource: string | null, connectionId: string, operationId: string): Record<string, unknown> | null {
  const rows = (integrationRoot(integrationSource)?.connections as unknown[] | undefined) ?? [];
  return rows.filter(isRecord).find(item => item.direction === 'serve' && item.connectionId === connectionId && item.operationId === operationId) ?? null;
}
