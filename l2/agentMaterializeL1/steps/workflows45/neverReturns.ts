/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/neverReturns.ts" enhancement="_blank"/>

// d1_288 s3: a function of the process whose result has fields and whose body never reaches a `return` with a value. It compiles when the body only throws, so the
// compiler does not see it, and a function that always refuses is the code of a source that lacks something (the model should have said it in `sourceGaps`).
// No word is searched (no `unsupported`, no `NOT_IMPLEMENTED`, no error code): only the shape of the body. Pure text, no import of a runtime.

import { codeOnly } from '/_102021_/l2/agentMaterializeL1/helpers/codeTokens.js';
import { exportedFunctions, notImplementedFunctions } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/sequence.js';

export const WORKFLOW_FUNCTION_NEVER_RETURNS = 'WORKFLOW_FUNCTION_NEVER_RETURNS';

/** The text of the result type after `Promise<`, with its brackets balanced; '' when the header has none. */
function resultType(header: string): string {
  const at = header.search(/\)\s*:\s*Promise\s*</u);
  if (at < 0) return '';
  const open = header.indexOf('<', at);
  let depth = 0;
  for (let index = open; index < header.length; index += 1) {
    if (header[index] === '<') depth += 1;
    else if (header[index] === '>' && header[index - 1] !== '=') {
      depth -= 1;
      if (depth === 0) return header.slice(open + 1, index).trim();
    }
  }
  return '';
}

/** A result with no field: `void`, `undefined`, `never`, or a type of this file declared with an empty body. A type of another file has fields. */
function resultHasFields(type: string, source: string): boolean {
  if (!type || /^(?:void|undefined|never|null)$/u.test(type)) return false;
  const name = /^[A-Za-z_$][\w$]*$/u.test(type) ? type : '';
  if (!name) return true;
  const declared = new RegExp(`(?:interface\\s+${name}\\b[^{]*|type\\s+${name}\\s*=\\s*)\\{([^}]*)\\}`, 'u').exec(codeOnly(source));
  return declared ? declared[1].trim() !== '' : true;
}

/** True when a `return` with a value sits in the body itself, not in a function declared inside it (a callback, an arrow, a nested function). */
function returnsAValue(body: string): boolean {
  const code = codeOnly(body);
  const nested: boolean[] = [];
  let segment = 0;
  for (let index = 0; index < code.length; index += 1) {
    const char = code[index];
    if (char === '{') {
      const before = code.slice(segment, index);
      nested.push(/=>\s*$/u.test(before) || /\bfunction\b/u.test(before));
      segment = index + 1;
    } else if (char === '}') {
      nested.pop();
      segment = index + 1;
    } else if (char === ';') {
      segment = index + 1;
    } else if (char === 'r' && /^return\b/u.test(code.slice(index)) && !/[\w$.]/u.test(code[index - 1] ?? ' ')) {
      if (nested.some(Boolean)) continue;
      const rest = code.slice(index + 6).trimStart();
      if (rest && !rest.startsWith(';') && !rest.startsWith('}')) return true;
    }
  }
  return false;
}

/** Problems of the exported functions of a process file that never return a value although their result has fields. A function still `NOT_IMPLEMENTED` is reported elsewhere. */
export function neverReturnsProblems(source: string): string[] {
  const stubs = new Set(notImplementedFunctions(source));
  const problems: string[] = [];
  for (const found of exportedFunctions(source)) {
    if (stubs.has(found.name)) continue;
    const type = resultType(source.slice(found.start, found.bodyOpen));
    if (!resultHasFields(type, source)) continue;
    if (returnsAValue(source.slice(found.bodyOpen + 1, found.end - 1))) continue;
    problems.push(`${WORKFLOW_FUNCTION_NEVER_RETURNS}: \`${found.name}\` returns \`${type}\` and no path of its body returns a value. If the source does not give what the result is made of, do not throw in its place: list it in \`sourceGaps\`.`);
  }
  return problems;
}
