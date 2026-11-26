/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/adapter17/context.ts" enhancement="_blank"/>

// d1_209: what the model sees to write the adapter of one system outside the app, and the gate of its answer. It sees the declaration
// this module generated, the L4 text of the system and of the lines that use it, and the contract of the adapter (the request, the
// response, the context). No sentence of this file names a service.

import { DECLARATION_TYPES_REF, declarationImportPath, declarationRef, integrationLogicalPath } from '/_102021_/l2/helpers/connections/catalogResolve.js';
import type { M12Context } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import type { M12Repair } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { failureMemberSection, failureMembersOf } from '/_102021_/l2/agentMaterializeL1/steps/adapter17/failureMember.js';
import { adapterContractShown, adapterProblems, resultTypeShown } from '/_102021_/l2/agentMaterializeL1/steps/adapter17/adapter.js';
import { DECLARATION_TYPES_IMPORT, connectionLinesOf, externalFacts } from '/_102021_/l2/agentMaterializeL1/steps/external15/declaration.js';

export const M12_ADAPTER_TOOL = 'writeExternalAdapter' as const;
export const M12_ADAPTER_TOOL_DESCRIPTION = 'Return the whole adapter TypeScript file of the system';
const CATALOG_TYPES_REF = '_102034_/l2/shared/contracts/connections/types.ts';

function section(title: string, body: string): string {
  return `## ${title}\n\n${body.trim()}\n`;
}

function fence(lang: string, body: string): string {
  return `\`\`\`${lang}\n${body.trim()}\n\`\`\``;
}

export async function loadAdapterContext(ctx: M12Context, unit: M12Unit, repair?: M12Repair): Promise<string> {
  const facts = externalFacts(unit.definition.data);
  const { project, module: moduleName } = ctx.run;
  const declaration = await ctx.read(declarationRef(project, moduleName, facts.systemId));
  const lines = connectionLinesOf(await ctx.read(`_${project}_/${integrationLogicalPath(moduleName)}`), facts.systemId).filter(line => line.direction === 'call');
  const types = await ctx.read(DECLARATION_TYPES_REF);
  const results = await ctx.read(CATALOG_TYPES_REF);
  const declarationImport = declarationImportPath(project, moduleName, facts.systemId);
  const parts: string[] = [];
  parts.push(section('Task', [
    `Write the adapter of the system \`${facts.systemId}\` of module ${moduleName}, file \`${unit.outputRef}\`.`,
    `It default-exports one function per \`call\` operation of the declaration and no other key: \`import type { ExternalSystemAdapter, ExternalAdapterContext } from '${DECLARATION_TYPES_IMPORT}';\`, \`import type { <types> } from '${declarationImport}';\`, \`const adapter: ExternalSystemAdapter = { ... };\`, \`export default adapter;\`.`,
    'Each function receives the input of its operation and the context, builds the request, sends it with `ctx.send` and turns the response into the output type. A `serve` operation has no function.',
    '`ctx.hookUrl(operationId)` returns the address without a parameter. When the L4 says the address carries a value, the adapter appends one parameter only, `?<name>=<value>`, with the value passed through `encodeURIComponent`; the name is free and short, because the route of the arrival reads the only value of the parameter, whatever its name.',
  ].join('\n')));
  parts.push(section('The declaration of the system (generated, source)', declaration ? fence('ts', declaration) : '(the declaration of this system was not generated: run the phase before this one)'));
  if (lines.length) {
    parts.push(section('What the module asks of each call (l4 connections, source)', lines.map(line => [
      `- ${line.operationId}${line.usedBy.length ? ` (usedBy: ${line.usedBy.join(' | ')})` : ''}`,
      line.description ? `  ${line.description}` : '',
    ].filter(Boolean).join('\n')).join('\n')));
  }
  parts.push(section('The contract of the adapter (runtime, source)', [
    types ? fence('ts', adapterContractShown(types)) : '(the type file of the runtime was not read)',
    results ? fence('ts', resultTypeShown(results)) : '',
  ].filter(Boolean).join('\n\n')));
  const refusals = failureMemberSection(declaration ? failureMembersOf(declaration) : []);
  if (refusals) parts.push(section('Refusals of the outside system', refusals));
  if (repair) {
    parts.push(section('Repair', [
      'The previous answer was refused. Fix exactly these problems and return the whole file again:',
      repair.problems.map(problem => `- ${problem}`).join('\n'),
      repair.previous ? `\nPrevious answer:\n${fence('ts', repair.previous)}` : '',
    ].join('\n')));
  }
  return parts.join('\n');
}

export async function adapterAnswerProblems(ctx: M12Context, unit: M12Unit, code: string): Promise<string[]> {
  const facts = externalFacts(unit.definition.data);
  const { project, module: moduleName } = ctx.run;
  const header = `/// <mls fileReference="${unit.outputRef}" enhancement="_blank"/>`;
  const declaration = await ctx.read(declarationRef(project, moduleName, facts.systemId));
  if (declaration === null) return [`The declaration of ${facts.systemId} is not generated: run the external15 phase first.`];
  return adapterProblems(code, declaration, header, declarationImportPath(project, moduleName, facts.systemId));
}
