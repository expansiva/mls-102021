/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/cmClientText.ts" enhancement="_blank"/>

// d1_347 s4: what the contexts of the models say about the platform client of the cm (`cm(ctx)`, `serveCm`, `once`). Only in stage 2 (`stage2.on`, helpers/m12Stage2.ts); off, the contexts are the ones before,
// byte for byte. The phrases were read and approved by the How planner (27/11), with three adjustments: the code the L4 does not handle, the version conflict, and the key of `once`.

export const CM_CLIENT_IMPORT = '/_102034_/l1/server/layer_1_external/connections/cm/index.js';

/** The unit calls the cm (usecases40, and the processes of workflows45 through the same section). */
export const CM_CALL_RULES: readonly string[] = [
  `Call the cm through the platform client: \`import { cm, isTransient } from '${CM_CLIENT_IMPORT}'\`, then \`const answer = await cm(ctx).<operation>(input);\`. It never throws.`,
  '`answer` is `{ ok: true, output }` or `{ ok: false, code, message }`: read `answer.ok` first; the answer of the operation is under `answer.output`.',
  'The repeat key of a command is already the one of the request in course: do not write one. Pass `{ idempotencyKey }` as the second argument only when an l4 rule names a business key. `expectVersion` is a string.',
  '`refused`, `invalid`, `not_found`, `conflict`, `forbidden` and `disabled` are the answer of the cm: do what the l4 says for each one. `isTransient(answer)` is true only for `unavailable`.',
  'A code the l4 does not handle, and `unavailable`, is not a refusal of yours: throw an `AppError` with the code and the message of the cm. Never return a default value and never drop the answer.',
];

/** The function of a process that a route served to the cm calls (workflows45). */
export const CM_SERVE_TRANSACTION = 'called by a route served to the cm, which runs inside the transaction that `serveCm` opens: do not open `runInTransaction` and do not build a bound context.';
export const CM_CONFLICT = 'A version conflict is answered as `{ ok: false, code: \'conflict\', message }`; a repeat is not a conflict: `once` handles it.';
export const CM_REFUSAL = 'Answer a refusal that the rule of the module decides as `{ ok: false, code, message, reason? }` (`code` is one of `refused`, `invalid`, `not_found`, `conflict`, `forbidden`; `reason` is your own reason in lowerCamel, for example `conversationBlocked`, and reaches the cm in the message as `reason: message`). The answer is committed with what you wrote before it. Never throw an `AppError` for a refusal that the rule decides. A code of the cm that the l4 does not handle, and `unavailable`, is not such a refusal: throw an `AppError` with the code and the message of the cm.';
export const CM_ONCE_REFUSAL_RULE = 'A refusal that depends on a state that can change (a record that may appear later) is returned BEFORE the `once`, so a repeat decides again; a refusal that cannot change goes inside it.';
export const CM_ONCE = 'Wrap the work in `once(ctx, { scope: \'<operation>\', key }, async () => …)`: the second call with the same key returns the first answer and the work does not run again. The key is the reference the cm sends when the l4 names one; otherwise `ctx.requestMeta.connection.idempotencyKey`. `once` runs only inside the transaction `serveCm` opens.';
export const CM_ORDER = 'In a route served to the cm the order is: `serveCm` (the platform), then `once`, then the process of the route if it opens one, then your rule.';
/** The request service of a route served to the cm (requests50). */
export const CM_SERVE_ANSWER_TYPE = 'A function of a route served to the cm returns `Promise<CmServeAnswer<Output>>` (the answer rules below); it does not return the output alone, and it does not open a transaction.';

/**
 * d1_347 s7: the order in the request service of a route served to the cm. `CM_ORDER` (the process context) lists the layers; read in a request service it made the model call `serveCm` itself, open
 * `runInTransaction` again and throw the refusal from inside `once` (measured on the rehearsal, three attempts). Text approved by the How planner (27/11).
 */
export const CM_REQUEST_ORDER = '`serveCm` is called by the controller of the route, never by your function: your function is the `decide` it receives, takes `(input, ctx)` and returns the `CmServeAnswer`. Inside it: first the refusal that depends on a state that can change (read it with the read functions of the module), then `once(ctx, { scope, key }, async () => …)` with the work, then your rule. Never call `serveCm`, never open `runInTransaction`, never build a bound context.';

/** d1_347 s7: `once` is a value, and the context of the request service gave only the type import of the answer (the model refused: "the declarations do not give the import or signature of once"). Signature of mls-102034@9432f51 (rt332). */
export const CM_ONCE_IMPORT = `\`once\` is a value of the cm client: \`import { once } from '${CM_CLIENT_IMPORT}'\`. Its signature is \`once<T>(ctx: RequestContext, where: { scope: string; key: string }, work: () => Promise<T & Jsonable<T>>): Promise<T>\`; \`T\` is the answer of your function (\`CmServeAnswer<Output>\`), with no cast: what it keeps has to be a value JSON carries.`;

/**
 * d1_347 s7: the model read the audit (`listMessageAudit`, for the company administrator) before `once` to find a request already answered, and the whole route became `forbidden` for the technical actor of the cm.
 * Text approved by the How planner (27/11); the def does not say who may call a usecase, so the read functions are shown whole and this phrase limits what they are for.
 */
export const CM_BEFORE_ONCE = 'Before `once`, read only what that refusal needs (for example, that the record it names exists). A repeat of a request already answered is handled by `once` and by the process, not by you: do not read records to find it.';

export const CM_SERVE_RULES: readonly string[] = [CM_SERVE_ANSWER_TYPE, CM_REFUSAL, CM_CONFLICT, CM_ONCE_REFUSAL_RULE, CM_BEFORE_ONCE, CM_ONCE, CM_ONCE_IMPORT, CM_REQUEST_ORDER];
