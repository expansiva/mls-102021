/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/external15/context.ts" enhancement="_blank"/>

// d1_208 s2: what the model sees to write the declaration of one system outside the app, and the gate of its answer.
// The prompt shows the L4 text of the system and of the lines that use it, the part code already wrote, and the type and the
// validator of the runtime. No sentence of this file names a service: the system is the one the L4 describes.

import { integrationLogicalPath } from '/_102021_/l2/helpers/connections/catalogResolve.js';
import type { M12Context } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import type { M12Repair } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import {
  DECLARATION_TYPES_IMPORT,
  DECLARATION_TYPES_REF,
  connectionLinesOf,
  declarationProblems,
  declarationTypeShown,
  externalFacts,
  fixedPart,
} from '/_102021_/l2/agentMaterializeL1/steps/external15/declaration.js';
import { fixedTypeProblems, fixedTypesOf, fixedTypesSection } from '/_102021_/l2/agentMaterializeL1/steps/external15/fixedTypes.js';

export const M12_EXTERNAL_TOOL = 'writeExternalDeclaration' as const;
export const M12_EXTERNAL_TOOL_DESCRIPTION = 'Return the whole declaration TypeScript file of the system';

function section(title: string, body: string): string {
  return `## ${title}\n\n${body.trim()}\n`;
}

function fence(lang: string, body: string): string {
  return `\`\`\`${lang}\n${body.trim()}\n\`\`\``;
}

export async function loadExternalContext(ctx: M12Context, unit: M12Unit, repair?: M12Repair): Promise<string> {
  const facts = externalFacts(unit.definition.data);
  const l4Ref = `_${ctx.run.project}_/${integrationLogicalPath(ctx.run.module)}`;
  const lines = connectionLinesOf(await ctx.read(l4Ref), facts.systemId);
  const typeSource = await ctx.read(DECLARATION_TYPES_REF);
  const parts: string[] = [];
  parts.push(section('Task', [
    `Write the declaration of the system \`${facts.systemId}\` of module ${ctx.run.module}, file \`${unit.outputRef}\`.`,
    `It exports the types of the input and of the output of each operation, and default-exports the declaration of the system. Annotate it: \`import type { ExternalSystemDeclaration } from '${DECLARATION_TYPES_IMPORT}';\`, \`const declaration: ExternalSystemDeclaration = { ... };\`, \`export default declaration;\`.`,
    'The platform reads this file to allow and to show every access of the module to the system. Nothing in it is code that runs.',
  ].join('\n')));
  parts.push(section('The system (l4, source)', [
    'What the L4 says of the system and of each operation. It carries no address, method, format or type: those are yours to decide, from what the system is.',
    fence('json', JSON.stringify({ title: facts.title, description: facts.description, settings: facts.settings, operations: facts.operations }, null, 2)),
  ].join('\n\n')));
  if (lines.length) {
    parts.push(section('What the module does with each operation (l4 connections, source)', lines.map(line => [
      `- ${line.direction} ${line.operationId}${line.usedBy.length ? ` (usedBy: ${line.usedBy.join(' | ')})` : ''}`,
      line.description ? `  ${line.description}` : '',
    ].filter(Boolean).join('\n')).join('\n')));
  }
  parts.push(section('Written by code (copy as is, keep every value)', [
    'These fields are derived from the L4. The declaration must carry exactly them. You add `hosts`, and for each operation what is below.',
    fence('json', JSON.stringify(fixedPart(facts), null, 2)),
  ].join('\n\n')));
  // d1_257: the types the file already has stay as they are (other files import them).
  const fixed = fixedTypesSection(fixedTypesOf(await ctx.read(unit.outputRef), facts));
  if (fixed) parts.push(section('Types already written (fixed)', fixed));
  parts.push(section('The type and the validator of the runtime (source)', typeSource ? fence('ts', declarationTypeShown(typeSource)) : '(the type file of the runtime was not read)'));
  if (repair) {
    parts.push(section('Repair', [
      'The previous answer was refused. Fix exactly these problems and return the whole file again:',
      repair.problems.map(problem => `- ${problem}`).join('\n'),
      repair.previous ? `\nPrevious answer:\n${fence('ts', repair.previous)}` : '',
    ].join('\n')));
  }
  return parts.join('\n');
}

export async function externalAnswerProblems(ctx: M12Context, unit: M12Unit, code: string): Promise<string[]> {
  const header = `/// <mls fileReference="${unit.outputRef}" enhancement="_blank"/>`;
  const facts = externalFacts(unit.definition.data);
  return [...declarationProblems(code, facts, header), ...fixedTypeProblems(code, fixedTypesOf(await ctx.read(unit.outputRef), facts))];
}
