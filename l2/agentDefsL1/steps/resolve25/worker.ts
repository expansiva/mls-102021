/// <mls fileReference="_102021_/l2/agentDefsL1/steps/resolve25/worker.ts" enhancement="_blank"/>

import type { D2ContractV2Definition, D2ContractV2Route } from '/_102020_/l2/helpers/contractV2/types.js';
import type { D1ResolveUnit } from '/_102021_/l2/agentDefsL1/steps/resolve25/contracts.js';

export const RESOLVE_TOOL_NAME = 'resolveRouteGaps';

/** One property per gap, with its closed candidates as the enum. The model does not write a free name. */
export function resolveTool(unit: D1ResolveUnit): mls.msg.LLMTool {
  const properties: Record<string, unknown> = {};
  for (const gap of unit.gaps) {
    properties[gap.gapId] = { type: 'string', enum: [...gap.candidates], description: `${gap.path} (${gap.kind})` };
  }
  return {
    type: 'function',
    function: {
      name: RESOLVE_TOOL_NAME,
      description: 'One choice per open part of the route, among its candidates. none leaves it open.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['answers'],
        properties: {
          answers: {
            type: 'object',
            additionalProperties: false,
            required: unit.gaps.map(gap => gap.gapId),
            properties,
          },
        },
      },
    },
  };
}

/** The route JSDoc, its input and output types with the interfaces they name, its rules, and the gaps. */
export function resolveHumanPrompt(input: {
  unit: D1ResolveUnit;
  route: D2ContractV2Route;
  definition: D2ContractV2Definition;
  feedback?: string;
}): string {
  const { unit, route, definition } = input;
  const lines = [`Route ${route.route} (${route.kind}${route.writes ? `, writes ${route.writes}` : ''}).`];
  if (route.jsdoc?.raw) lines.push('', 'JSDoc:', route.jsdoc.raw.trim());
  lines.push('', `Input: ${route.input}`, `Output: ${route.output}`);
  const named = namedInterfaces(definition, `${route.input} ${route.output}`);
  if (named.length) {
    lines.push('', 'Interfaces:');
    for (const item of named) lines.push(`${item.jsdoc ? `/** ${item.jsdoc.trim()} */ ` : ''}interface ${item.name} ${item.body.trim()}`);
  }
  lines.push('', `Rules: ${route.rules.length ? route.rules.join(', ') : '(none)'}`);
  lines.push('', 'Open parts. Answer each id with one of its candidates:');
  for (const gap of unit.gaps) {
    lines.push(`- ${gap.gapId}: ${gap.path} [${gap.kind}] ${gap.reason} Candidates: ${gap.candidates.join(', ')}.`);
  }
  if (input.feedback) lines.push('', `The previous reply was refused: ${input.feedback}`);
  return lines.join('\n');
}

/** Interfaces the text names, and the ones they name in turn. */
function namedInterfaces(definition: D2ContractV2Definition, text: string): D2ContractV2Definition['projections'] {
  const byName = new Map(definition.projections.map(item => [item.name, item]));
  const seen = new Set<string>();
  const queue = [text];
  while (queue.length) {
    const source = queue.shift() || '';
    for (const match of source.matchAll(/\b([A-Z][A-Za-z0-9]*)\b/gu)) {
      const item = byName.get(match[1]);
      if (!item || seen.has(item.name)) continue;
      seen.add(item.name);
      queue.push(item.body);
    }
  }
  return definition.projections.filter(item => seen.has(item.name));
}
