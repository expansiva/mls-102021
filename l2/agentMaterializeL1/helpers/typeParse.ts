/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/typeParse.ts" enhancement="_blank"/>

// d1_332: the one reader of TypeScript type declarations the agent graph can use (it cannot import the `typescript` compiler). It reads interface and type alias
// declarations from text into a small tree (`Node`: literal, reference, object, union, intersection, array, tuple), with the imports of each file.
// Moved from `emitters/typeResolve.ts` without change of behavior; `resolveInputType` and the controller emitter read through it.

export type Node =
  | { k: 'lit'; text: string }
  | { k: 'ref'; name: string; args: Node[] }
  | { k: 'obj'; members: Member[] }
  | { k: 'union'; items: Node[] }
  | { k: 'inter'; items: Node[] }
  | { k: 'array'; of: Node }
  | { k: 'tuple'; items: Node[] }
  | { k: 'raw'; text: string };

export interface Member {
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

export interface Decl {
  name: string;
  params: string[];
  extendsList: string[];
  /** interface: members; alias: the type. */
  node: Node;
  isInterface: boolean;
  file: FileEnv;
}

export interface FileEnv {
  decls: Map<string, Decl>;
  imports: Map<string, { specifier: string; original: string }>;
}

/** Language names: primitives and the global generic types. Not a domain name. */

// ---------------------------------------------------------------- tokens

export type Token = { t: 'id' | 'str' | 'num' | 'p'; v: string; comment: string; s: number; e: number };

export function tokenize(source: string): Token[] {
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

export class Parser {
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


export function parseNode(text: string): Node {
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

export function matchClose(source: string, open: number, openChar: string, closeChar: string): number {
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

export function splitList(text: string): string[] {
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

export function parseFile(source: string): FileEnv {
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

export function plain(node: Node): string {
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

// ---------------------------------------------------------------- shape of an input type (d1_332)

export interface TypeShape {
  /** Every member path of every alternative, no index for lists, parent before children. */
  allowedPaths: string[];
  /** Paths that are not optional in EVERY alternative of the type they belong to (exactly-one stays with the code that receives it). */
  requiredFields: string[];
  /** Paths whose declared type admits `null`. */
  nullablePaths: string[];
  /** Paths whose declared type is written as a union of string literals (`'a' | 'b'`, a single literal, with `null`/`undefined`). */
  unions: Array<{ path: string; values: string[] }>;
}

const isNullish = (node: Node): boolean => node.k === 'ref' && (node.name === 'null' || node.name === 'undefined') && node.args.length === 0;

function stripQuotes(key: string): string {
  const match = /^(['"])([\s\S]*)\1$/u.exec(key);
  return match ? match[2] : key;
}

/** `'a' | 'b'` (also `| null`, `| undefined`, or one literal) as written; null when anything else is in it, an alias included. */
function literalValues(node: Node): string[] | null {
  const items = node.k === 'union' ? node.items : [node];
  const rest = items.filter(item => !isNullish(item));
  if (rest.length === 0) return null;
  const values: string[] = [];
  for (const item of rest) {
    if (item.k !== 'lit') return null;
    const match = /^(['"])((?:\\.|(?!\1).)*)\1$/u.exec(item.text);
    if (!match) return null;
    values.push(match[2].replace(/\\(['"\\])/gu, '$1'));
  }
  return values;
}

interface Collected { allowed: string[]; required: string[]; nullable: string[]; unions: Array<{ path: string; values: string[] }> }

const empty = (): Collected => ({ allowed: [], required: [], nullable: [], unions: [] });

function declMembers(decl: Decl, env: FileEnv, seen: ReadonlySet<string>): Member[] {
  const own = decl.node.k === 'obj' ? decl.node.members : [];
  const inherited = decl.extendsList.flatMap(name => {
    const parent = env.decls.get(name.replace(/<.*$/u, '').trim());
    return parent && !seen.has(parent.name) ? declMembers(parent, env, new Set([...seen, parent.name])) : [];
  });
  return [...inherited, ...own];
}

function collectNode(node: Node, env: FileEnv, prefix: string, seen: ReadonlySet<string>, depth: number): Collected {
  const out = empty();
  if (depth > 12) return out;
  const join = (into: Collected, child: Collected): void => {
    into.allowed.push(...child.allowed);
    into.required.push(...child.required);
    into.nullable.push(...child.nullable);
    into.unions.push(...child.unions);
  };
  switch (node.k) {
    case 'obj': {
      for (const member of node.members) {
        if (member.index) continue;
        const key = stripQuotes(member.key);
        const path = prefix ? `${prefix}.${key}` : key;
        out.allowed.push(path);
        if (!member.optional) out.required.push(path);
        const items = member.type.k === 'union' ? member.type.items : [member.type];
        if (items.some(isNullish)) out.nullable.push(path);
        const literals = literalValues(member.type);
        if (literals) out.unions.push({ path, values: literals });
        join(out, collectNode(member.type, member.file ?? env, path, seen, depth + 1));
      }
      return out;
    }
    case 'union': {
      const alternatives = node.items.filter(item => !isNullish(item)).map(item => collectNode(item, env, prefix, seen, depth + 1));
      for (const alternative of alternatives) { out.allowed.push(...alternative.allowed); out.nullable.push(...alternative.nullable); out.unions.push(...alternative.unions); }
      // required in every alternative; a primitive or an unreadable alternative requires nothing
      const [first, ...others] = alternatives;
      if (first) out.required.push(...first.required.filter(path => others.every(other => other.required.includes(path))));
      return out;
    }
    case 'inter': {
      for (const item of node.items) join(out, collectNode(item, env, prefix, seen, depth + 1));
      return out;
    }
    case 'array': return collectNode(node.of, env, prefix, seen, depth + 1);
    case 'ref': {
      if ((node.name === 'Array' || node.name === 'ReadonlyArray') && node.args[0]) return collectNode(node.args[0], env, prefix, seen, depth + 1);
      if (node.args.length > 0) return out;
      const decl = env.decls.get(node.name);
      if (!decl || seen.has(node.name) || decl.params.length > 0) return out;
      const next = new Set([...seen, node.name]);
      if (decl.isInterface) return collectNode({ k: 'obj', members: declMembers(decl, env, next) }, decl.file, prefix, next, depth + 1);
      return collectNode(decl.node, decl.file, prefix, next, depth + 1);
    }
    default: return out;
  }
}

/** The input is an object type: an interface or an alias of an object literal (d1_215: a union, an intersection or another name at the top is a problem of its own, not an input). */
function isObjectRoot(node: Node, env: FileEnv): boolean {
  if (node.k === 'obj') return true;
  if (node.k !== 'ref' || node.args.length > 0) return false;
  const decl = env.decls.get(node.name);
  return !!decl && (decl.isInterface || decl.node.k === 'obj');
}

const unique = (items: string[]): string[] => [...new Set(items)];

/**
 * What a controller needs to know of the input type of a route: the paths it may carry, the ones it must carry, the ones that may be null and the closed literal sets.
 * Every alternative of a union counts (the type is the union of what each says); only what ALL alternatives require is required. `typeText` is `{ … }` or the name of a
 * type declared in `source`; null when it is neither. Same lists, same order, as the line reader this replaces, wherever the input has no union of objects.
 */
export function typeShape(source: string, typeText: string): TypeShape | null {
  const env = parseFile(source);
  const text = typeText.trim();
  let node: Node;
  if (text.startsWith('{')) node = parseNode(text);
  else if (/^[A-Za-z_$][\w$]*$/u.test(text) && env.decls.has(text)) node = { k: 'ref', name: text, args: [] };
  else return null;
  if (!isObjectRoot(node, env)) return null;
  const collected = collectNode(node, env, '', new Set<string>(), 0);
  const seenUnion = new Set<string>();
  const unions = collected.unions.filter(item => { const key = `${item.path}|${item.values.join(',')}`; if (seenUnion.has(key)) return false; seenUnion.add(key); return true; });
  return { allowedPaths: unique(collected.allowed), requiredFields: unique(collected.required), nullablePaths: unique(collected.nullable), unions };
}
