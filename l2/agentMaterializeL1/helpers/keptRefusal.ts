/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/keptRefusal.ts" enhancement="_blank"/>

// d1_308: the one form of a refusal that keeps its record, said in the same words to the process (workflows45) and to the route that calls it (requests50).
// The two units are written apart: each would invent its own shape of the result if the text did not give it.

/** The text for a function whose arrival the L4 says can be refused with the record kept. Generic: `<Function>` is the name of the function. */
export function keptRefusalText(): string {
  return [
    'When the L4 says this arrival can be refused and the record of that refusal must be kept, the function exports',
    '`type <Function>Result = { ok: true; output: <the catalog output> } | { ok: false; code: string; message: string }` (`<Function>` is the name of the function, as `<Function>Input` is) and returns that type instead of throwing.',
    'This includes a request whose message does not go out because the system outside failed or refused it: when the L4 says such a request is answered as refused with the reason, the function records it (as `refused` or `failed`, as the L4 says) and returns `{ ok: false, code, message }`.',
    '`code` is the `ruleId` when a rule of the L4 refuses; otherwise it names the cause (for example the reason the system outside gave). It is never a code the platform turns into `invalid` or `conflict` (`VALIDATION_ERROR`, `INVALID_INPUT`, `VERSION_CONFLICT`, `CONCURRENCY_CONFLICT`).',
    'The route runs `const result = await ctx.data.moduleData.runInTransaction(tx => <function>(input, <the ctx bound to tx>))`; after that call returns, the commit is done, and the route does `if (!result.ok) throw new AppError(result.code, result.message, 422)`, otherwise `return result.output`; the engine then delivers the call as `refused`.',
    'A function whose arrival the L4 does not say this about keeps `Output` equal to the catalog output and follows the L4 on whether it throws.',
  ].join(' ');
}
