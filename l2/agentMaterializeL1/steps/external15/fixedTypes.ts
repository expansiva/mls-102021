/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/external15/fixedTypes.ts" enhancement="_blank"/>

// d1_257: the types of the declaration of a system outside the app stay as they were when the declaration is generated again.
// Other files import them (`LerArquivoOutput`, `GravarArquivoInput`…), so a model that invents them again breaks those files. The file
// already written is the fixed source: code copies from it the exported types of the operations that stay in the L4 (and the types they
// use), byte by byte, and the gate refuses an answer that changes one. The model writes the rest: hosts, methods and the types of a new
// operation. No file before (first generation): nothing is fixed and nothing changes.

import { codeOnly } from '/_102021_/l2/agentMaterializeL1/helpers/codeTokens.js';
import { declarationLiteral, type ExternalFacts } from '/_102021_/l2/agentMaterializeL1/steps/external15/declaration.js';

export interface TypeBlock {
  name: string;
  text: string;
  start: number;
  end: number;
}

export interface FixedTypes {
  /** In the order of the file written before. */
  blocks: TypeBlock[];
  /** The operations that stay in the L4, with the type names the file already gave them. */
  operations: Array<{ operationId: string; inputType: string; outputType: string }>;
  /** The types of the operations that left the L4 and are not used by one that stays. */
  removed: string[];
}

const NONE: FixedTypes = { blocks: [], operations: [], removed: [] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * The end of the exported type or interface that starts at `from`, read on the structure of the file (`codeOnly`: comments, strings,
 * template text and regex literals blanked, d1_258): the `;` at depth 0 (a type) or the closing `}` and its `;` (an interface).
 */
function blockEnd(structure: string, from: number, isInterface: boolean): number {
  let depth = 0;
  for (let at = from; at < structure.length; at += 1) {
    const char = structure[at];
    if (char === '{' || char === '(' || char === '[') depth += 1;
    else if (char === '}' || char === ')' || char === ']') {
      depth -= 1;
      if (isInterface && depth === 0 && char === '}') return structure[at + 1] === ';' ? at + 2 : at + 1;
    } else if (char === ';' && depth === 0) return at + 1;
  }
  return structure.length;
}

/** The exported `type` and `interface` declarations of the file, as they are written (the part of the file that is data is not one). */
export function exportedTypeBlocks(code: string): TypeBlock[] {
  const blocks: TypeBlock[] = [];
  const structure = codeOnly(code);
  for (const match of structure.matchAll(/^export\s+(?:declare\s+)?(?:interface|type)\s+([A-Za-z_$][\w$]*)/gmu)) {
    const start = match.index ?? 0;
    if (blocks.length && start < blocks[blocks.length - 1].end) continue;
    const end = blockEnd(structure, start, /^export\s+(?:declare\s+)?interface\b/u.test(structure.slice(start, start + 40)));
    blocks.push({ name: match[1], text: code.slice(start, end).trimEnd(), start, end });
  }
  return blocks;
}

function operationsOf(code: string): Array<Record<string, unknown>> {
  const literal = declarationLiteral(code);
  if ('problem' in literal || !isRecord(literal.value) || !Array.isArray(literal.value.operations)) return [];
  return literal.value.operations.filter(isRecord);
}

function namesIn(source: string, among: ReadonlySet<string>): string[] {
  return [...new Set((source.match(/[A-Za-z_$][\w$]*/gu) ?? []).filter(name => among.has(name)))];
}

/** What the file written before fixes: the types of its operations that the L4 still has, and what they use. Nothing when there is no usable file. */
export function fixedTypesOf(previous: string | null, facts: ExternalFacts): FixedTypes {
  if (!previous) return NONE;
  const blocks = exportedTypeBlocks(previous);
  const byName = new Map(blocks.map(block => [block.name, block]));
  const previousOperations = operationsOf(previous);
  if (!blocks.length || !previousOperations.length) return NONE;
  const staying = new Set(facts.operations.map(item => item.operationId));
  // d1_310: an operation whose line the L4 changed (description or direction, as the file before recorded them) is not "the same operation": its types are
  // free for the model to write again. The names stay in `operations`, so the files that import them keep compiling when the model keeps the names.
  const lineNow = new Map(facts.operations.map(item => [item.operationId, item] as const));
  const changed = new Set(previousOperations.filter(operation => {
    const now = lineNow.get(text(operation.operationId));
    return !!now && (now.description !== text(operation.description) || now.direction !== text(operation.direction));
  }).map(operation => text(operation.operationId)));
  const rootsOf = (operation: Record<string, unknown>) => [text(operation.inputType), text(operation.outputType)].filter(name => byName.has(name));
  const kept = new Set<string>();
  const visit = (name: string) => {
    if (kept.has(name)) return;
    kept.add(name);
    const block = byName.get(name);
    if (block) for (const used of namesIn(block.text.replace(/^export\s+(?:declare\s+)?(?:interface|type)\s+[\w$]+/u, ''), new Set(byName.keys()))) visit(used);
  };
  const operations: FixedTypes['operations'] = [];
  for (const operation of previousOperations) {
    if (!staying.has(text(operation.operationId))) continue;
    operations.push({ operationId: text(operation.operationId), inputType: text(operation.inputType), outputType: text(operation.outputType) });
    if (changed.has(text(operation.operationId))) continue;
    for (const name of rootsOf(operation)) visit(name);
  }
  // What only the operations that left use goes with them, in the order of the file.
  const leaving = new Set<string>();
  const leave = (name: string) => {
    if (kept.has(name) || leaving.has(name)) return;
    leaving.add(name);
    const block = byName.get(name);
    if (block) for (const used of namesIn(block.text.replace(/^export\s+(?:declare\s+)?(?:interface|type)\s+[\w$]+/u, ''), new Set(byName.keys()))) leave(used);
  };
  for (const operation of previousOperations) if (!staying.has(text(operation.operationId))) for (const name of rootsOf(operation)) leave(name);
  const removed = blocks.filter(block => leaving.has(block.name)).map(block => block.name);
  return { blocks: blocks.filter(block => kept.has(block.name)), operations, removed };
}

/**
 * The answer with the fixed types copied by code: the model's own declaration of a fixed name is taken out and the written ones go after
 * the last import, in the order of the file before. An answer with no fixed type is returned as it came.
 */
export function withFixedTypes(code: string, fixed: FixedTypes): string {
  if (!fixed.blocks.length) return code;
  const names = new Set(fixed.blocks.map(block => block.name));
  let rest = code;
  for (const block of exportedTypeBlocks(code).filter(item => names.has(item.name)).reverse()) rest = `${rest.slice(0, block.start)}${rest.slice(block.end)}`;
  let at = rest.indexOf('\n') < 0 ? rest.length : rest.indexOf('\n');
  for (const match of rest.matchAll(/^\s*import\b[^;]*?from\s+['"][^'"]+['"];?/gmu)) at = (match.index ?? 0) + match[0].length;
  const head = rest.slice(0, at).trimEnd();
  const tail = rest.slice(at).replace(/^\s+/u, '');
  return `${head}\n\n${fixed.blocks.map(block => block.text).join('\n\n')}\n\n${tail}`;
}

/** Problems of an answer against the types fixed by the file written before. */
export function fixedTypeProblems(code: string, fixed: FixedTypes): string[] {
  const problems: string[] = [];
  const given = new Map(exportedTypeBlocks(code).map(block => [block.name, block]));
  for (const block of fixed.blocks) {
    const found = given.get(block.name);
    if (!found) problems.push(`Type ${block.name} is fixed: it is already written in the file and other files import it. Keep it exactly as it is.`);
    else if (found.text !== block.text) problems.push(`Type ${block.name} is fixed: it is already written in the file and other files import it. Keep it exactly as it is, byte by byte; do not rename, add or drop a field.`);
  }
  const operations = new Map(operationsOf(code).map(operation => [text(operation.operationId), operation]));
  for (const operation of fixed.operations) {
    const found = operations.get(operation.operationId);
    if (!found) continue;
    for (const key of ['inputType', 'outputType'] as const) {
      if (operation[key] && text(found[key]) !== operation[key]) problems.push(`Operation ${operation.operationId}: ${key} stays ${operation[key]} (the type already written in the file); the answer has ${text(found[key]) || '(none)'}.`);
    }
  }
  return problems;
}

/** The human prompt section: the fixed types as written, and the type names each operation that stays already has. Empty when nothing is fixed. */
export function fixedTypesSection(fixed: FixedTypes): string {
  if (!fixed.blocks.length) return '';
  return [
    'The file of this system is already written and other files import these types: they are fixed. Code puts them in the file as they are; do not write them again and do not change them. Use the same names in the declaration:',
    ...fixed.operations.map(item => `- ${item.operationId}: inputType ${item.inputType || '(none)'}, outputType ${item.outputType || '(none)'}`),
    `\`\`\`ts\n${fixed.blocks.map(block => block.text).join('\n\n')}\n\`\`\``,
    'An operation of the L4 that is not in the list is new: you write its types, with names that no type above uses.',
  ].join('\n\n');
}
