/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/cmServeOnce.ts" enhancement="_blank"/>

// d1_347 s7: the function of a route served to the cm repeats by `once` (stage 2). A request service whose function for such a route never calls `once(` compiles, and the second simultaneous call runs the work again
// (the duplication measured on the VM). Measured on the rehearsal: the model answered a file with a comment "Incomplete … must not be deployed" and no `once`, and the gate let it pass. Pure text, no word of a rule.

import { withoutComments } from '/_102021_/l2/agentMaterializeL1/helpers/codeTokens.js';

export const CM_SERVE_WITHOUT_ONCE = 'CM_SERVE_WITHOUT_ONCE';

const HANDLER = /['"]([A-Za-z][\w.]*)['"]\s*:\s*async\s*(?:function\b|\()/gu;

/** One problem for each route served to the cm whose function of `requests` has no call to `once(`; a route with no function at all is the business of the typing check. */
export function serveWithoutOnceProblems(code: string, routes: readonly string[]): string[] {
  if (routes.length === 0) return [];
  const text = withoutComments(code);
  const starts = [...text.matchAll(HANDLER)].map(match => ({ route: match[1], at: match.index ?? 0 }));
  const problems: string[] = [];
  for (const route of routes) {
    const index = starts.findIndex(item => item.route === route);
    if (index < 0) continue;
    const end = starts[index + 1]?.at ?? text.length;
    if (/\bonce\s*\(/u.test(text.slice(starts[index].at, end))) continue;
    problems.push(`${CM_SERVE_WITHOUT_ONCE}: the function of \`${route}\` does not call \`once(ctx, { scope, key }, async () => …)\`. A route served to the cm repeats by \`once\`: without it two simultaneous calls with the same key run the work twice. Import it with \`import { once } from '/_102034_/l1/server/layer_1_external/connections/cm/index.js'\`.`);
  }
  return problems;
}
