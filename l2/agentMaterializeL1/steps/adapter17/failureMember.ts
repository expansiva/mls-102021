/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/adapter17/failureMember.ts" enhancement="_blank"/>

// d1_319: an operation whose output type has a failure member with a reason (`{ success: false; reason: string }`) says that the outside system can refuse and the
// module wants to know why. The adapter turns the refusal the system answered (a 4xx with a body, `response` of `ctx.send`) into that member, instead of returning
// the transport error (which `callConnection` strips of its body). Read from the declaration only: the output type of each operation, no name of any system.

import { declarationLiteral } from '/_102021_/l2/agentMaterializeL1/steps/external15/declaration.js';

export interface FailureMember {
  operationId: string;
  outputType: string;
  /** The field that is the literal `false` (`success`, `ok`). */
  marker: string;
  /** The text field that carries why. */
  reasonField: string;
}

/** Top-level `|` members of `export type <name> = …;` that are object types; null when the alias is not found or is not a union of objects. */
function unionMembers(source: string, name: string): string[] | null {
  const head = new RegExp(`export\\s+type\\s+${name}\\s*=\\s*`, 'u').exec(source);
  if (!head) return null;
  let depth = 0;
  let end = head.index + head[0].length;
  for (; end < source.length; end += 1) {
    const char = source[end];
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    else if (char === ';' && depth === 0) break;
  }
  const text = source.slice(head.index + head[0].length, end).replace(/\/\*[\s\S]*?\*\//gu, '').replace(/\/\/[^\n]*/gu, '').trim().replace(/^\|\s*/u, '');
  const members: string[] = [];
  let level = 0;
  let from = 0;
  for (let at = 0; at < text.length; at += 1) {
    if (text[at] === '{') level += 1;
    else if (text[at] === '}') level -= 1;
    else if (text[at] === '|' && level === 0) { members.push(text.slice(from, at).trim()); from = at + 1; }
  }
  members.push(text.slice(from).trim());
  return members.length > 1 && members.every(member => member.startsWith('{') && member.endsWith('}')) ? members : null;
}

function properties(member: string): Array<{ name: string; type: string }> {
  return member.slice(1, -1).split(/[;,\n]/u).map(part => /^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\??\s*:\s*(.+?)\s*$/u.exec(part)).filter((match): match is RegExpExecArray => !!match).map(match => ({ name: match[1], type: match[2] }));
}

/** The operations of the declaration whose output has a failure member with a reason. */
export function failureMembersOf(declarationSource: string): FailureMember[] {
  const literal = declarationLiteral(declarationSource);
  if ('problem' in literal) return [];
  const operations = (literal.value as { operations?: unknown }).operations;
  if (!Array.isArray(operations)) return [];
  const out: FailureMember[] = [];
  for (const operation of operations) {
    const row = operation as { operationId?: unknown; outputType?: unknown; direction?: unknown; kind?: unknown };
    if (typeof row.operationId !== 'string' || typeof row.outputType !== 'string' || row.direction === 'serve') continue;
    const members = unionMembers(declarationSource, row.outputType);
    if (!members) continue;
    for (const member of members) {
      const props = properties(member);
      const marker = props.find(prop => prop.type === 'false');
      const reason = marker ? (props.find(prop => prop.name === 'reason' && prop.type === 'string') ?? props.find(prop => prop.type === 'string' && prop.name !== marker.name)) : undefined;
      if (marker && reason) { out.push({ operationId: row.operationId, outputType: row.outputType, marker: marker.name, reasonField: reason.name }); break; }
    }
  }
  return out;
}

/** The text the adapter model reads about the refusals; '' when no operation has a failure member. */
export function failureMemberSection(members: readonly FailureMember[]): string {
  if (!members.length) return '';
  return [
    'The outside system can refuse, and these operations say how the module wants to know it: their output type has a failure member with a reason.',
    ...members.map(item => `- \`${item.operationId}\`: \`${item.outputType}\` has the member \`{ ${item.marker}: false; ${item.reasonField}: string; … }\`.`),
    'When `ctx.send` answers `{ ok: false, code, message, response }` with a `response` (the system answered with an HTTP status of 400 or more and a body) and `code` is `refused`, `invalid`, `not_found` or `conflict`, the system refused on its own account: read `response.body` the way the 2xx body is read, and return `{ ok: true, output: <the failure member> }` with the reason the body gives (the `message` of the result when the body gives none).',
    'When `code` is `unavailable` (timeout, 5xx, 429), or the result has no `response` (network, blocked address, body over the ceiling), return the result as it came: that is an error, not a refusal of the business.',
    'An operation not listed above keeps returning the result as it came.',
  ].join('\n');
}

/** Problems of the member of the adapter for one operation with a failure member: it must read `response` (a 4xx answer is not returned before its body is read). */
export function failureMemberProblems(members: ReadonlyArray<{ name: string; text: string }>, failing: readonly FailureMember[]): string[] {
  const problems: string[] = [];
  for (const item of failing) {
    const member = members.find(entry => entry.name === item.operationId);
    if (!member) continue;
    if (!/\.\s*response\b|\{\s*[^}]*\bresponse\b[^}]*\}\s*=/u.test(member.text)) {
      problems.push(`Operation ${item.operationId}: its output has a failure member (${item.marker}: false, ${item.reasonField}). The \`send\` result of a 4xx answer carries \`response\` (status, body): read it and return \`{ ok: true, output: { ${item.marker}: false, ${item.reasonField}: … } }\` when the code is refused, invalid, not_found or conflict; do not return the failed result before reading its body.`);
    }
  }
  return problems;
}
