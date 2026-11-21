/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/external15/removedTypes.ts" enhancement="_blank"/>

// d1_257: a type of an operation that left the L4 is not kept in the declaration. The trace of the phase says which units of the module
// import it, so the break is seen when it happens. A file of another module that imports it is not seen from here.

import type { M12Context } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { externalFacts } from '/_102021_/l2/agentMaterializeL1/steps/external15/declaration.js';
import { fixedTypesOf } from '/_102021_/l2/agentMaterializeL1/steps/external15/fixedTypes.js';

export async function removedTypesLines(ctx: M12Context, units: readonly M12Unit[]): Promise<string[]> {
  const lines: string[] = [];
  for (const unit of units) {
    const removed = fixedTypesOf(await ctx.read(unit.outputRef), externalFacts(unit.definition.data)).removed;
    if (!removed.length) continue;
    const importers: string[] = [];
    for (const other of ctx.units) {
      if (other.outputRef === unit.outputRef) continue;
      const source = await ctx.read(other.outputRef);
      if (source && removed.some(name => new RegExp(`import\\s+(?:type\\s+)?\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['"][^'"]*/${unit.unitId}\\.js['"]`, 'u').test(source))) importers.push(other.unitId);
    }
    lines.push(`${unit.unitId}: the types of operations that left the L4 are not kept (${removed.join(', ')}); ${importers.length ? `imported by ${importers.join(', ')}: regenerate them` : 'no unit of this module imports them (files of other modules are not checked)'}`);
  }
  return lines;
}
