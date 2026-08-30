/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/judge/judgeBatchContext.ts" enhancement="_blank"/>

// Context lines that precede the (L4, defs) pairs in the judge-batch human prompt.
// Pure so the derived-projection carve-out is unit-testable without the agent's runtime graph.

export function judgeBatchContextLines(
  validPorts: readonly string[],
  mdmIds: readonly string[],
  derivedIds: readonly string[] = [],
): string[] {
  const lines = [
    `## Valid repository ports (aggregate roots + persisted event stores): ${JSON.stringify([...validPorts])}`,
    `## MDM entities (read by id via 102034; NEVER a port, NEVER a local entity): ${JSON.stringify([...mdmIds])}`,
  ];
  // Absent, not empty: a module with no derived projection must see the same two lines as before.
  if (derivedIds.length) {
    lines.push(
      `## Derived projections (computed — no table, no port; the operation reads persisted sources and COMPOSES the projection in the output; ofEntity pointing at them is legitimate): ${JSON.stringify([...derivedIds])}`,
    );
  }
  return lines;
}
