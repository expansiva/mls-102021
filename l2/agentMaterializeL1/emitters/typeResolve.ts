/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/typeResolve.ts" enhancement="_blank"/>

// d1_200: the input type of a usecase as the compiler sees it, in text. Aliases, unions of literals, `extends` and the
// types of other files are expanded until a basic type or a literal, to a limited depth. A name that is cut stays, with
// "(truncated)"; a name that is not found stays, with "(not resolved)". Nothing disappears. The agent graph cannot import
// the TypeScript compiler, so this reads the declarations it needs (interface and type alias) from the text.

import { parseFile, parseNode, plain, splitList, type Decl, type FileEnv, type Member, type Node } from '/_102021_/l2/agentMaterializeL1/helpers/typeParse.js';

export interface ResolveInput {
  /** The text of the file that declares the type (the generated usecase). */
  entry: string;
  /** Name of the type to resolve. */
  typeName: string;
  /** The text of the file an import specifier names, or null. Called once per specifier. */
  readImport(specifier: string): Promise<string | null>;
  /** Reference expansions along one path before a name is left as it is. */
  depth?: number;
}

export interface ResolvedType {
  /** The resolved type, TypeScript-like, '' when `typeName` is not declared. */
  text: string;
  /** Names expanded: 0 means the declaration already had every field and type in place. */
  expanded: number;
  unresolved: string[];
  truncated: string[];
}

const GLOBALS = new Set([
  'string', 'number', 'boolean', 'bigint', 'symbol', 'unknown', 'any', 'never', 'void', 'null', 'undefined', 'object',
  'Date', 'Record', 'Array', 'ReadonlyArray', 'Partial', 'Required', 'Readonly', 'Pick', 'Omit', 'Promise', 'Map', 'Set', 'Uint8Array',
]);


// ---------------------------------------------------------------- resolution

const LINE_LIMIT = 220;

export async function resolveInputType(input: ResolveInput): Promise<ResolvedType> {
  const limit = input.depth ?? 4;
  const files = new Map<string, FileEnv | null>();
  const entry = parseFile(input.entry);
  const unresolved = new Set<string>();
  const truncated = new Set<string>();
  let expanded = 0;

  // Every file an import can reach is read before printing, so the printer stays synchronous.
  const queue: FileEnv[] = [entry];
  while (queue.length) {
    const env = queue.pop() as FileEnv;
    for (const { specifier } of env.imports.values()) {
      if (files.has(specifier)) continue;
      const text = await input.readImport(specifier);
      const loaded = text === null ? null : parseFile(text);
      files.set(specifier, loaded);
      if (loaded) queue.push(loaded);
    }
  }

  // A catalog barrel re-exports the type (`export type { A } from`). The declaration is one file further.
  const lookup = (env: FileEnv, name: string, seen?: Set<string>): Decl | null => {
    const local = env.decls.get(name);
    if (local) return local;
    const imported = env.imports.get(name);
    if (!imported) return null;
    const next = files.get(imported.specifier);
    if (!next) return null;
    const mark = `${imported.specifier}\0${imported.original}`;
    const trail = seen ?? new Set<string>();
    if (trail.has(mark)) return null;
    trail.add(mark);
    return lookup(next, imported.original, trail);
  };

  const comment = (text: string, pad: string): string => {
    const clipped = text.length > LINE_LIMIT ? `${text.slice(0, LINE_LIMIT)}…` : text;
    return clipped ? `${pad}// ${clipped}\n` : '';
  };

  /** Members of an interface with its `extends` merged in; the bases that are not objects add an index signature. */
  const membersOf = (decl: Decl, params: ReadonlyMap<string, Node>, trail: readonly string[], level: number): Member[] => {
    const own = (decl.node.k === 'obj' ? decl.node.members : []).map(member => ({ ...member, file: decl.file }));
    const merged: Member[] = [];
    for (const base of decl.extendsList) {
      const node = parseNode(base);
      if (node.k !== 'ref') continue;
      const target = lookup(decl.file, node.name);
      if (target && !trail.includes(target.name) && level < limit) {
        expanded += 1;
        const targetParams = new Map<string, Node>(target.params.map((param, index) => [param, node.args[index] ?? { k: 'raw', text: param } as Node]));
        merged.push(...membersOf(target, targetParams, [...trail, target.name], level + 1));
      } else if (node.name === 'Record' && node.args.length === 2) {
        merged.push({ key: `[key: ${plain(node.args[0])}]`, optional: false, readonly: false, index: true, type: node.args[1], comment: '' });
      } else if (!GLOBALS.has(node.name)) {
        if (target) truncated.add(node.name); else unresolved.add(node.name);
        merged.push({ key: `/* ${node.name} ${target ? '(truncated)' : '(not resolved)'} */`, optional: false, readonly: false, index: true, type: { k: 'raw', text: 'unknown' }, comment: '' });
      }
    }
    const names = new Set(own.map(member => member.key));
    return [...merged.filter(member => member.index || !names.has(member.key)), ...own].map(member => ({ ...member, type: substitute(member.type, params) }));
  };

  const substitute = (node: Node, params: ReadonlyMap<string, Node>): Node => {
    if (!params.size) return node;
    switch (node.k) {
      case 'ref': return params.has(node.name) && !node.args.length ? params.get(node.name) as Node : { ...node, args: node.args.map(arg => substitute(arg, params)) };
      case 'array': return { k: 'array', of: substitute(node.of, params) };
      case 'union': return { k: 'union', items: node.items.map(item => substitute(item, params)) };
      case 'inter': return { k: 'inter', items: node.items.map(item => substitute(item, params)) };
      case 'tuple': return { k: 'tuple', items: node.items.map(item => substitute(item, params)) };
      case 'obj': return { k: 'obj', members: node.members.map(member => ({ ...member, type: substitute(member.type, params) })) };
      default: return node;
    }
  };

  const print = (node: Node, env: FileEnv, pad: string, level: number, trail: readonly string[], params: ReadonlySet<string>): string => {
    switch (node.k) {
      case 'lit': return node.text;
      case 'raw': return node.text;
      case 'array': {
        const inner = print(node.of, env, pad, level, trail, params);
        return node.of.k === 'union' || node.of.k === 'inter' ? `(${inner})[]` : `${inner}[]`;
      }
      case 'tuple': return `[${node.items.map(item => print(item, env, pad, level, trail, params)).join(', ')}]`;
      case 'union': return node.items.map(item => print(item, env, pad, level, trail, params)).join(' | ');
      case 'inter': return node.items.map(item => print(item, env, pad, level, trail, params)).join(' & ');
      case 'obj': return printObject(node.members, env, pad, level, trail, params);
      case 'ref': {
        if (params.has(node.name)) return node.name;
        const decl = lookup(env, node.name);
        if (!decl) {
          const args = node.args.length ? `<${node.args.map(arg => print(arg, env, pad, level, trail, params)).join(', ')}>` : '';
          if (GLOBALS.has(node.name)) return `${node.name}${args}`;
          unresolved.add(node.name);
          return `${node.name}${args} /* not resolved */`;
        }
        if (trail.includes(decl.name)) { truncated.add(decl.name); return `${decl.name} /* recursive */`; }
        if (level >= limit) { truncated.add(decl.name); return `${decl.name} /* (truncated) */`; }
        expanded += 1;
        const bound = new Map<string, Node>(decl.params.map((param, index) => [param, node.args[index] ?? { k: 'raw', text: param } as Node]));
        const next = [...trail, decl.name];
        if (decl.isInterface) return printObject(membersOf(decl, bound, next, level + 1), decl.file, pad, level + 1, next, new Set(decl.params));
        return print(substitute(decl.node, bound), decl.file, pad, level + 1, next, new Set(decl.params));
      }
    }
  };

  const printObject = (members: Member[], env: FileEnv, pad: string, level: number, trail: readonly string[], params: ReadonlySet<string>): string => {
    if (!members.length) return '{}';
    const inner = `${pad}  `;
    const lines = members.map(member => `${comment(member.comment, inner)}${inner}${member.readonly ? 'readonly ' : ''}${member.key}${member.optional ? '?' : ''}: ${print(member.type, member.file ?? env, inner, level, trail, params)};`);
    return `{\n${lines.join('\n')}\n${pad}}`;
  };

  const root = lookup(entry, input.typeName);
  if (!root) return { text: '', expanded: 0, unresolved: [], truncated: [] };
  const bound = new Map<string, Node>();
  const text = root.isInterface
    ? printObject(membersOf(root, bound, [root.name], 1), root.file, '', 1, [root.name], new Set(root.params))
    : print(root.node, root.file, '', 1, [root.name], new Set(root.params));
  return { text, expanded, unresolved: [...unresolved].sort(), truncated: [...truncated].sort() };
}
