/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/requests50/confirmOnly.ts" enhancement="_blank"/>

// d1_225: the request service of a page whose routes only confirm the receipt of an event. An `inbound` line of the L4 that writes nothing has no
// usecase to call, so there is nothing for a model to write: the file is derived. It checks the envelope the runtime passes (`eventId`, `ref`,
// `publishedAt`) and that `ref` is the event the route is for, and answers `{ received: true }`. The route exists because the runtime
// subscribes the module by the L4 line and a delivery with no route is marked `no-route` and fails.

import { consumeMessageTypeName } from '/_102021_/l2/agentMaterializeL1/emitters/connectionCatalog.js';
import { consumeMarks, requestsTypeOfConsume } from '/_102021_/l2/agentMaterializeL1/steps/requests50/context.js';

/**
 * The file, or null when this request service is not only confirmations: a row with a usecase, or a row that is not a `consumes` route, goes to
 * the model as before.
 */
export function confirmOnlySource(data: Record<string, unknown>, outputRef: string): string | null {
  const marks = consumeMarks(data);
  const rows = Array.isArray(data.requests) ? data.requests : [];
  if (marks.length === 0 || marks.length !== rows.length) return null;
  if (marks.some(item => Array.isArray(item.row.uses) && item.row.uses.some(use => typeof use === 'string' && use !== ''))) return null;
  const routes = marks.map(item => ({ route: String(item.row.route ?? ''), messageType: consumeMessageTypeName(item.mark), from: item.from, eventId: item.eventId }));
  if (routes.some(item => item.route === '')) return null;
  const message = (name: string): string => [
    `export interface ${name} {`,
    '  eventId: string;',
    '  ref: { module: string; eventId: string };',
    '  publishedAt: string;',
    '  payload: Record<string, unknown>;',
    "  actor?: { kind: 'person' | 'agent'; id: string };",
    '  requestId?: string;',
    '}',
  ].join('\n');
  return [
    `/// <mls fileReference="${outputRef}" enhancement="_blank"/>`,
    "import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';",
    "import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';",
    '',
    ...routes.flatMap(item => [message(item.messageType), '']),
    'function confirmReceipt(input: { eventId: string; ref: { module: string; eventId: string }; publishedAt: string }, module: string, eventId: string): { received: true } {',
    "  if (typeof input.eventId !== 'string' || input.eventId === '') {",
    "    throw new AppError('INVALID_MESSAGE', 'The message has no eventId.', 400);",
    '  }',
    "  if (typeof input.publishedAt !== 'string' || input.publishedAt === '') {",
    "    throw new AppError('INVALID_MESSAGE', 'The message has no publishedAt.', 400);",
    '  }',
    '  if (input.ref?.module !== module || input.ref?.eventId !== eventId) {',
    "    throw new AppError('INVALID_MESSAGE', `The message is for ${String(input.ref?.module)}.${String(input.ref?.eventId)}, and this route receives ${module}.${eventId}.`, 400);",
    '  }',
    '  return { received: true };',
    '}',
    '',
    `export const requests: ${requestsTypeOfConsume(routes)} = {`,
    ...routes.map(item => `  '${item.route}': async function (input) { return confirmReceipt(input, '${item.from}', '${item.eventId}'); },`),
    '};',
    '',
  ].join('\n');
}
