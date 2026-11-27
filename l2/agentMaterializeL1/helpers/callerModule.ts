/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/callerModule.ts" enhancement="_blank"/>

// d1_349 s4: `ctx.moduleId` is the module that runs the request (execBff: the module of the route), never the caller. A usecase or process that compares it with a text that is not its own module
// (`ctx.moduleId !== 'cm'`, "only the cm can do this") can never be true in the module that serves the call, and the call is refused whatever the cm sends. Measured: the only such comparison in the
// generated l1 modules was `telegram/updateTelegramConversation`. Pure text, no word of a rule: only the comparison of the field with a literal.

import { withoutComments } from '/_102021_/l2/agentMaterializeL1/helpers/codeTokens.js';

export const CALLER_MODULE_COMPARED = 'CALLER_MODULE_COMPARED';

const LITERAL = '([\'"`])([^\'"`\\n]*)\\1';
const OPERATOR = String.raw`(?:===|!==|==|!=)`;
const FIELD = String.raw`\b(?:ctx|context)\.moduleId\b`;

/** Problems for each comparison of `ctx.moduleId` with a text other than `moduleName`. */
export function callerModuleProblems(code: string, moduleName: string): string[] {
  const text = withoutComments(code);
  const found = new Set<string>();
  for (const match of text.matchAll(new RegExp(`${FIELD}\\s*${OPERATOR}\\s*${LITERAL}`, 'gu'))) found.add(match[2]);
  for (const match of text.matchAll(new RegExp(`${LITERAL}\\s*${OPERATOR}\\s*${FIELD}`, 'gu'))) found.add(match[2]);
  found.delete(moduleName);
  return [...found].map(literal => `${CALLER_MODULE_COMPARED}: \`ctx.moduleId\` is compared with '${literal}'. ctx.moduleId is always the module that runs; to know the cm is the caller read ctx.requestMeta?.connection?.connectionId === 'cm'.`);
}
