/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/typeResolve.ts" enhancement="_blank"/>

// d1_200: the input type of a usecase as the compiler sees it, in text. Aliases, unions of literals, `extends` and the
// types of other files are expanded until a basic type or a literal, to a limited depth. A name that is cut stays, with
// "(truncated)"; a name that is not found stays, with "(not resolved)". Nothing disappears. The agent graph cannot import
// the TypeScript compiler, so this reads the declarations it needs (interface and type alias) from the text.

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

type Node =
  | { k: 'lit'; text: string }
  | { k: 'ref'; name: string; args: Node[] }
  | { k: 'obj'; members: Member[] }
  | { k: 'union'; items: Node[] }
  | { k: 'inter'; items: Node[] }
  | { k: 'array'; of: Node }
  | { k: 'tuple'; items: Node[] }
  | { k: 'raw'; text: string };

interface Member {
  key: string;
  optional: boolean;
  readonly: boolean;
  /** `[key: string]: T` */
  index: boolean;
  type: Node;
  comment: string;
  /** The file that declares the member: its names resolve there, not in the file that extends it. */
  file?: FileEnv;
}

interface Decl {
  name: string;
  params: string[];
  extendsList: string[];
  /** interface: members; alias: the type. */
  node: Node;
  isInterface: boolean;
  file: FileEnv;
}

interface FileEnv {
  decls: Map<string, Decl>;
  imports: Map<string, { specifier: string; original: string }>;
}

/** Language names: primitives and the global generic types. Not a domain name. */
const GLOBALS = new Set([
  'string', 'number', 'boolean', 'bigint', 'symbol', 'unknown', 'any', 'never', 'void', 'null', 'undefined', 'object',
  'Date', 'Record', 'Array', 'ReadonlyArray', 'Partial', 'Required', 'Readonly', 'Pick', 'Omit', 'Promise', 'Map', 'Set', 'Uint8Array',
]);

// ---------------------------------------------------------------- tokens

type Token = { t: 'id' | 'str' | 'num' | 'p'; v: string; comment: string; s: number; e: number };

function tokenize(source: string): Token[] {
  const out: Token[] = [];
  let comment = '';
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (/\s/u.test(char)) { index += 1; continue; }
    if (source.startsWith('/*', index)) {
      const end = source.indexOf('*/', index + 2);
      const stop = end < 0 ? source.length : end;
      comment = source.slice(index + 2, stop).split('\n').map(line => line.replace(/^\s*\*+\s?/u, '').trim()).filter(Boolean).join(' ');
      index = stop + 2;
      continue;
    }
    if (source.startsWith('//', index)) {
      const end = source.indexOf('\n', index);
      const stop = end < 0 ? source.length : end;
      comment = source.slice(index + 2, stop).trim();
      index = stop;
      continue;
    }
    if (char === '\'' || char === '"' || char === '`') {
      let end = index + 1;
      while (end < source.length && source[end] !== char) end += source[end] === '\\' ? 2 : 1;
      out.push({ t: 'str', v: source.slice(index, end + 1), comment, s: index, e: end + 1 });
      comment = '';
      index = end + 1;
      continue;
    }
    if (/[A-Za-z_$]/u.test(char)) {
      let end = index + 1;
      while (end < source.length && /[\w$]/u.test(source[end])) end += 1;
      out.push({ t: 'id', v: source.slice(index, end), comment, s: index, e: end });
      comment = '';
      index = end;
      continue;
    }
    if (/\d/u.test(char) || (char === '-' && /\d/u.test(source[index + 1] ?? ''))) {
      let end = index + 1;
      while (end < source.length && /[\d._]/u.test(source[end])) end += 1;
      out.push({ t: 'num', v: source.slice(index, end), comment, s: index, e: end });
      comment = '';
      index = end;
      continue;
    }
    const two = source.slice(index, index + 2);
    const punct = two === '=>' || two === '..' ? (source.startsWith('...', index) ? '...' : two) : char;
    out.push({ t: 'p', v: punct, comment, s: index, e: index + punct.length });
    comment = '';
    index += punct.length;
  }
  return out;
}

// ---------------------------------------------------------------- parser

class Parser {
  private at = 0;
  constructor(private readonly tokens: Token[], private readonly source: string) {}

  done(): boolean { return this.at >= this.tokens.length; }
  private peek(offset = 0): Token | undefined { return this.tokens[this.at + offset]; }
  private is(value: string, offset = 0): boolean { const token = this.peek(offset); return token?.t === 'p' && token.v === value; }
  private eat(value: string): boolean { if (this.is(value)) { this.at += 1; return true; } return false; }
  private expect(value: string): void { if (!this.eat(value)) throw new Error(`expected ${value}`); }

  parseType(): Node {
    this.eat('|');
    const first = this.parseInter();
    const items = [first];
    while (this.eat('|')) items.push(this.parseInter());
    return items.length === 1 ? first : { k: 'union', items };
  }

  private parseInter(): Node {
    const first = this.parsePostfix();
    const items = [first];
    while (this.eat('&')) items.push(this.parsePostfix());
    return items.length === 1 ? first : { k: 'inter', items };
  }

  private parsePostfix(): Node {
    let node = this.parsePrimary();
    while (this.is('[') && this.is(']', 1)) { this.at += 2; node = { k: 'array', of: node }; }
    return node;
  }

  private parsePrimary(): Node {
    const token = this.peek();
    if (!token) throw new Error('unexpected end');
    if (token.t === 'str' || token.t === 'num') { this.at += 1; return { k: 'lit', text: token.v }; }
    if (this.eat('(')) {
      const inner = this.parseType();
      this.expect(')');
      if (this.is('=>')) throw new Error('function type');
      return inner;
    }
    if (this.is('{')) return this.parseObject();
    if (this.eat('[')) {
      const items: Node[] = [];
      while (!this.is(']')) { items.push(this.parseType()); if (!this.eat(',')) break; }
      this.expect(']');
      return { k: 'tuple', items };
    }
    if (token.t === 'id') {
      if (token.v === 'keyof' || token.v === 'typeof' || token.v === 'infer' || token.v === 'new') throw new Error(token.v);
      this.at += 1;
      let name = token.v;
      while (this.is('.') && this.peek(1)?.t === 'id') { name += `.${this.peek(1)?.v}`; this.at += 2; }
      const args: Node[] = [];
      if (this.eat('<')) {
        while (!this.is('>')) { args.push(this.parseType()); if (!this.eat(',')) break; }
        this.expect('>');
      }
      if (name === 'true' || name === 'false') return { k: 'lit', text: name };
      return { k: 'ref', name, args };
    }
    throw new Error(`unexpected ${token.v}`);
  }

  /** The member at the cursor, as written, up to its `;` or `,` (or the closing brace of the object). */
  private rawMember(comment: string): Member {
    const first = this.peek() as Token;
    let depth = 0;
    let last = first;
    while (!this.done()) {
      const token = this.peek() as Token;
      if (token.t === 'p') {
        if ('{(['.includes(token.v)) depth += 1;
        if (')]'.includes(token.v)) depth -= 1;
        if (token.v === '}') { if (depth === 0) break; depth -= 1; }
        if (depth === 0 && (token.v === ';' || token.v === ',')) { this.at += 1; break; }
      }
      last = token;
      this.at += 1;
    }
    const text = this.source.slice(first.s, last.e).replace(/\s+/gu, ' ').trim();
    const colon = text.indexOf(':');
    const key = colon < 0 ? text : text.slice(0, colon).trim();
    const optional = key.endsWith('?');
    return { key: optional ? key.slice(0, -1) : key, optional, readonly: false, index: false, type: { k: 'raw', text: colon < 0 ? '(not parsed)' : text.slice(colon + 1).trim() }, comment };
  }

  parseObject(): Node {
    this.expect('{');
    const members: Member[] = [];
    while (!this.is('}')) {
      const start = this.peek();
      if (!start) throw new Error('unterminated object');
      const comment = start.comment;
      const from = this.at;
      try {
      let readonly = false;
      if (start.t === 'id' && start.v === 'readonly' && this.peek(1) && !this.is(':', 1) && !this.is('?', 1)) { readonly = true; this.at += 1; }
      if (this.is('[')) {
        this.at += 1;
        const keyName = this.peek()?.v ?? 'key';
        this.at += 1;
        this.expect(':');
        const keyType = this.parseType();
        this.expect(']');
        this.expect(':');
        const type = this.parseType();
        members.push({ key: `[${keyName}: ${plain(keyType)}]`, optional: false, readonly, index: true, type, comment });
      } else {
        const key = this.peek();
        if (!key || (key.t !== 'id' && key.t !== 'str' && key.t !== 'num')) throw new Error('member key');
        this.at += 1;
        const optional = this.eat('?');
        if (this.is('(') || this.is('<')) throw new Error('method');
        this.expect(':');
        members.push({ key: key.v, optional, readonly, index: false, type: this.parseType(), comment });
      }
      if (!this.eat(';') && !this.eat(',') && !this.is('}')) throw new Error('member end');
      } catch {
        // A member this reader cannot parse is kept as written, not dropped.
        this.at = from;
        members.push(this.rawMember(comment));
      }
    }
    this.expect('}');
    return { k: 'obj', members };
  }
}

function plain(node: Node): string {
  switch (node.k) {
    case 'lit': return node.text;
    case 'raw': return node.text;
    case 'ref': return node.args.length ? `${node.name}<${node.args.map(plain).join(', ')}>` : node.name;
    case 'array': return `${plain(node.of)}[]`;
    case 'union': return node.items.map(plain).join(' | ');
    case 'inter': return node.items.map(plain).join(' & ');
    case 'tuple': return `[${node.items.map(plain).join(', ')}]`;
    case 'obj': return '{ … }';
  }
}

function parseNode(text: string): Node {
  try {
    const parser = new Parser(tokenize(text), text);
    const node = parser.parseType();
    if (!parser.done()) throw new Error('trailing tokens');
    return node;
  } catch {
    return { k: 'raw', text: text.replace(/\s+/gu, ' ').trim() };
  }
}

// ---------------------------------------------------------------- declarations

function matchClose(source: string, open: number, openChar: string, closeChar: string): number {
  let depth = 0;
  let quote = '';
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === '\\') { index += 1; continue; }
      if (char === quote) quote = '';
      continue;
    }
    if (char === '\'' || char === '"' || char === '`') { quote = char; continue; }
    if (source.startsWith('//', index)) { index = source.indexOf('\n', index); if (index < 0) return -1; continue; }
    if (source.startsWith('/*', index)) { const end = source.indexOf('*/', index + 2); if (end < 0) return -1; index = end + 1; continue; }
    if (char === openChar) depth += 1;
    if (char === closeChar) { depth -= 1; if (depth === 0) return index; }
  }
  return -1;
}

function splitList(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '<' || text[index] === '{' || text[index] === '(' || text[index] === '[') depth += 1;
    if (text[index] === '>' || text[index] === '}' || text[index] === ')' || text[index] === ']') depth -= 1;
    if (text[index] === ',' && depth === 0) { parts.push(text.slice(start, index)); start = index + 1; }
  }
  parts.push(text.slice(start));
  return parts.map(part => part.trim()).filter(Boolean);
}

function addNamedImports(env: FileEnv, list: string, specifier: string): void {
  for (const raw of splitList(list)) {
    const parts = raw.replace(/^type\s+/u, '').split(/\s+as\s+/u).map(item => item.trim());
    const original = parts[0];
    const local = parts[parts.length - 1];
    if (local) env.imports.set(local, { specifier, original });
  }
}

function parseFile(source: string): FileEnv {
  const env: FileEnv = { decls: new Map(), imports: new Map() };
  // `export type { A as B } from` is the same binding as `import type`: the local name is the alias.
  for (const match of source.matchAll(/(?:import\s+(?:type\s+)?|export\s+type\s+)\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]/gu)) {
    addNamedImports(env, match[1], match[2]);
  }
  const header = /(?:^|\n)\s*(?:export\s+)?(?:declare\s+)?(interface|type)\s+([A-Za-z_$][\w$]*)\s*(<[^{=]*>)?/gu;
  for (let match = header.exec(source); match; match = header.exec(source)) {
    const isInterface = match[1] === 'interface';
    const params = match[3] ? splitList(match[3].slice(1, -1)).map(item => item.split(/\s+/u)[0]) : [];
    const rest = match.index + match[0].length;
    if (isInterface) {
      const open = source.indexOf('{', rest);
      if (open < 0) continue;
      const between = source.slice(rest, open).trim();
      const extendsList = /^extends\s+/u.test(between) ? splitList(between.replace(/^extends\s+/u, '')) : [];
      const close = matchClose(source, open, '{', '}');
      if (close < 0) continue;
      env.decls.set(match[2], { name: match[2], params, extendsList, node: parseNode(source.slice(open, close + 1)), isInterface, file: env });
      header.lastIndex = close;
    } else {
      const eq = source.slice(rest).search(/^\s*=/u);
      if (eq < 0) continue;
      const bodyStart = source.indexOf('=', rest) + 1;
      let end = bodyStart;
      let depth = 0;
      let quote = '';
      for (; end < source.length; end += 1) {
        const char = source[end];
        if (quote) { if (char === '\\') { end += 1; continue; } if (char === quote) quote = ''; continue; }
        if (char === '\'' || char === '"' || char === '`') { quote = char; continue; }
        if (char === '{' || char === '(' || char === '[') depth += 1;
        if (char === '}' || char === ')' || char === ']') depth -= 1;
        if (char === ';' && depth === 0) break;
      }
      env.decls.set(match[2], { name: match[2], params, extendsList: [], node: parseNode(source.slice(bodyStart, end)), isInterface, file: env });
      header.lastIndex = end;
    }
  }
  return env;
}

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
