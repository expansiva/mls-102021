/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.ts" enhancement="_blank"/>

export interface D1ContractField {
  name: string;
  type: string;
  optional: boolean;
}

export interface D1ContractSymbol {
  name: string;
  fields: D1ContractField[];
  /** `array` when the exported type is an array. The element fields stay the contracted item. */
  shape: 'object' | 'array';
  /** Element symbol when an array alias points at another type. Empty when the fields are inline. */
  element: string;
}

/** A route string bound to symbols in this file. The symbol name is not an identity. */
export interface D1RouteBinding {
  route: string;
  input: string;
  output: string;
}

export interface D1ContractAst {
  bindings: D1RouteBinding[];
  symbols: D1ContractSymbol[];
  /** Routes whose binding is a type assertion instead of an input/output symbol. */
  assertions: string[];
  /**
   * Exported declarations this reader could see but not close.
   * Callers surface each entry as `CONTRACT_UNPARSED`. Empty on a file this reader finished.
   */
  unparsed: string[];
}

interface Scan {
  source: string;
  i: number;
  fileName: string;
  unparsed: string[];
}

type AstType =
  | { k: 'lit'; fields: D1ContractField[] }
  | { k: 'arr'; el: AstType }
  | { k: 'ref'; name: string }
  | { k: 'gen'; name: string; args: AstType[] }
  | { k: 'paren'; inner: AstType }
  | { k: 'op' };

type Expr =
  | { k: 'object'; props: Array<{ name: string; value: Expr }> }
  | { k: 'string'; text: string }
  | { k: 'ident'; text: string }
  | { k: 'as'; inner: Expr }
  | { k: 'satisfies'; inner: Expr }
  | { k: 'paren'; inner: Expr }
  | { k: 'other' };

const TYPE_KEYWORDS = new Set([
  'string', 'number', 'boolean', 'bigint', 'symbol', 'undefined', 'null', 'void', 'any', 'never',
  'unknown', 'object', 'true', 'false', 'this', 'intrinsic', 'const',
]);

/**
 * Reads exported `routes` bindings and exported type shapes.
 * A file with interfaces but no `routes` map yields no bindings: the first
 * type and a matching name are not an identity.
 * Deno loads this file with the agent. It must not import `typescript`.
 */
export function readContractAst(source: string, fileName: string): D1ContractAst {
  const scan: Scan = { source, i: 0, fileName, unparsed: [] };
  const bindings: D1RouteBinding[] = [];
  const symbols: D1ContractSymbol[] = [];
  const assertions: string[] = [];
  while (scan.i < scan.source.length) {
    const mark = scan.i;
    skipTrivia(scan);
    if (scan.i >= scan.source.length) break;
    if (!consumeKeyword(scan, 'export')) {
      skipStatement(scan);
      if (scan.i === mark) scan.i += 1;
      continue;
    }
    skipTrivia(scan);
    consumeKeyword(scan, 'declare');
    skipTrivia(scan);
    consumeKeyword(scan, 'default');
    skipTrivia(scan);
    if (consumeKeyword(scan, 'interface')) readInterface(scan, symbols);
    else if (consumeKeyword(scan, 'type')) readTypeAlias(scan, symbols);
    else if (consumeKeyword(scan, 'const') || consumeKeyword(scan, 'let') || consumeKeyword(scan, 'var')) {
      readVariables(scan, bindings, assertions);
    } else skipStatement(scan);
  }
  return { bindings, symbols, assertions, unparsed: scan.unparsed };
}

/** The unique symbol of this name, or null when it is missing or duplicated. */
export function symbolFields(ast: D1ContractAst, name: string): D1ContractField[] | null {
  if (!name) return null;
  const found = ast.symbols.filter(item => item.name === name);
  if (found.length !== 1) return null;
  return found[0].fields;
}

function readInterface(scan: Scan, symbols: D1ContractSymbol[]): void {
  const name = readIdent(scan);
  if (!name) {
    fail(scan, 'Exported interface has no name.');
    skipStatement(scan);
    return;
  }
  skipTypeParams(scan);
  skipHeritage(scan);
  skipTrivia(scan);
  if (scan.source[scan.i] !== '{') {
    fail(scan, `Exported interface ${name} has no body.`);
    skipStatement(scan);
    return;
  }
  const block = readBraceMembers(scan);
  if (!block.closed) fail(scan, `Exported interface ${name} did not close.`);
  symbols.push({ name, fields: block.fields, shape: 'object', element: '' });
  consumeSemi(scan);
}

function readTypeAlias(scan: Scan, symbols: D1ContractSymbol[]): void {
  skipTrivia(scan);
  if (scan.source[scan.i] === '{') {
    skipStatement(scan);
    return;
  }
  const name = readIdent(scan);
  if (!name) {
    fail(scan, 'Exported type has no name.');
    skipStatement(scan);
    return;
  }
  skipTypeParams(scan);
  skipTrivia(scan);
  if (scan.source[scan.i] !== '=') {
    fail(scan, `Exported type ${name} has no '='.`);
    skipStatement(scan);
    return;
  }
  scan.i += 1;
  const parsed = parseUnion(scan);
  const element = arrayElement(parsed);
  if (element) {
    const flat = unwrapType(element);
    if (flat.k === 'lit') symbols.push({ name, fields: flat.fields, shape: 'array', element: '' });
    else if (flat.k === 'ref' || flat.k === 'gen') symbols.push({ name, fields: [], shape: 'array', element: flat.name });
    else symbols.push({ name, fields: [], shape: 'array', element: '' });
  } else {
    const flat = unwrapType(parsed);
    if (flat.k === 'lit') symbols.push({ name, fields: flat.fields, shape: 'object', element: '' });
  }
  consumeSemi(scan);
}

function readVariables(scan: Scan, bindings: D1RouteBinding[], assertions: string[]): void {
  while (scan.i < scan.source.length) {
    const name = readIdent(scan);
    if (!name) {
      skipStatement(scan);
      return;
    }
    skipTrivia(scan);
    if (scan.source[scan.i] === ':') {
      scan.i += 1;
      readTypeText(scan, true);
    }
    skipTrivia(scan);
    if (scan.source[scan.i] === '=') {
      scan.i += 1;
      const expr = parseExpr(scan);
      if (name === 'routes') recordRoutes(expr, bindings, assertions);
    }
    skipTrivia(scan);
    if (scan.source[scan.i] === ',') {
      scan.i += 1;
      continue;
    }
    consumeSemi(scan);
    break;
  }
}

function recordRoutes(expr: Expr, bindings: D1RouteBinding[], assertions: string[]): void {
  const value = unwrapExpr(expr);
  if (value.k !== 'object') return;
  for (const prop of value.props) {
    if (!prop.name) continue;
    const inner = unwrapExpr(prop.value);
    if (inner.k !== 'object') {
      if (expressionAsserts(prop.value)) assertions.push(prop.name);
      continue;
    }
    const input = stringProp(inner, 'input');
    const output = stringProp(inner, 'output');
    if (!output) continue;
    bindings.push({ route: prop.name, input, output });
  }
}

function stringProp(object: Extract<Expr, { k: 'object' }>, key: string): string {
  for (const prop of object.props) {
    if (prop.name !== key) continue;
    const value = unwrapExpr(prop.value);
    if (value.k === 'string') return value.text;
  }
  return '';
}

function expressionAsserts(expr: Expr): boolean {
  let current = expr;
  while (current.k === 'paren') current = current.inner;
  return current.k === 'as' || current.k === 'satisfies';
}

function unwrapExpr(expr: Expr): Expr {
  let current = expr;
  while (current.k === 'as' || current.k === 'satisfies' || current.k === 'paren') current = current.inner;
  return current;
}

function arrayElement(type: AstType): AstType | null {
  let current = type;
  while (current.k === 'paren') current = current.inner;
  if (current.k === 'arr') return unwrapType(current.el);
  if (current.k === 'gen' && (current.name === 'Array' || current.name === 'ReadonlyArray') && current.args.length) {
    return unwrapType(current.args[0]);
  }
  return null;
}

function unwrapType(type: AstType): AstType {
  let current = type;
  while (current.k === 'paren') current = current.inner;
  return current;
}

function parseUnion(scan: Scan): AstType {
  const first = parseIntersection(scan);
  skipTrivia(scan);
  if (scan.source[scan.i] !== '|') return first;
  while (scan.source[scan.i] === '|' && scan.source[scan.i + 1] !== '|') {
    scan.i += 1;
    parseIntersection(scan);
    skipTrivia(scan);
  }
  return { k: 'op' };
}

function parseIntersection(scan: Scan): AstType {
  const first = parsePrefix(scan);
  skipTrivia(scan);
  if (scan.source[scan.i] !== '&') return first;
  while (scan.source[scan.i] === '&') {
    scan.i += 1;
    parsePrefix(scan);
    skipTrivia(scan);
  }
  return { k: 'op' };
}

function parsePrefix(scan: Scan): AstType {
  if (
    consumeKeyword(scan, 'readonly')
    || consumeKeyword(scan, 'keyof')
    || consumeKeyword(scan, 'typeof')
    || consumeKeyword(scan, 'infer')
    || consumeKeyword(scan, 'unique')
    || consumeKeyword(scan, 'abstract')
  ) {
    parsePrefix(scan);
    return { k: 'op' };
  }
  return parsePostfix(scan);
}

function parsePostfix(scan: Scan): AstType {
  let current = parsePrimaryType(scan);
  while (true) {
    const save = scan.i;
    skipTrivia(scan);
    if (scan.source[scan.i] !== '[') {
      scan.i = save;
      break;
    }
    const open = scan.i;
    scan.i += 1;
    skipTrivia(scan);
    if (scan.source[scan.i] === ']') {
      scan.i += 1;
      current = { k: 'arr', el: current };
      continue;
    }
    scan.i = open;
    if (!skipGroup(scan, '[', ']')) break;
    current = { k: 'op' };
  }
  return current;
}

function parsePrimaryType(scan: Scan): AstType {
  skipTrivia(scan);
  const ch = scan.source[scan.i];
  if (ch === '(') {
    const save = scan.i;
    scan.i += 1;
    const inner = parseUnion(scan);
    skipTrivia(scan);
    if (scan.source[scan.i] === ')') {
      scan.i += 1;
      return { k: 'paren', inner };
    }
    scan.i = save;
    skipGroup(scan, '(', ')');
    skipTrivia(scan);
    if (scan.source[scan.i] === '=' && scan.source[scan.i + 1] === '>') {
      scan.i += 2;
      parseUnion(scan);
    }
    return { k: 'op' };
  }
  if (ch === '{') {
    const block = readBraceMembers(scan);
    if (!block.closed) fail(scan, 'A type literal did not close.');
    return { k: 'lit', fields: block.fields };
  }
  if (ch === "'" || ch === '"') {
    readQuoted(scan);
    return { k: 'op' };
  }
  if (ch === '`') {
    readTemplate(scan);
    return { k: 'op' };
  }
  const name = readIdent(scan);
  if (!name) return { k: 'op' };
  skipTrivia(scan);
  if (scan.source[scan.i] === '<' && scan.source[scan.i + 1] !== '=') {
    const args = parseTypeArgs(scan);
    if (TYPE_KEYWORDS.has(name)) return { k: 'op' };
    return { k: 'gen', name, args };
  }
  if (TYPE_KEYWORDS.has(name)) return { k: 'op' };
  return { k: 'ref', name };
}

function parseTypeArgs(scan: Scan): AstType[] {
  scan.i += 1;
  const args: AstType[] = [];
  while (scan.i < scan.source.length) {
    skipTrivia(scan);
    if (scan.source[scan.i] === '>') {
      scan.i += 1;
      break;
    }
    args.push(parseUnion(scan));
    skipTrivia(scan);
    if (scan.source[scan.i] === ',') {
      scan.i += 1;
      continue;
    }
    if (scan.source[scan.i] === '>') scan.i += 1;
    break;
  }
  return args;
}

function parseExpr(scan: Scan): Expr {
  let expr = parsePrimaryExpr(scan);
  while (true) {
    if (consumeKeyword(scan, 'as')) {
      parseUnion(scan);
      expr = { k: 'as', inner: expr };
      continue;
    }
    if (consumeKeyword(scan, 'satisfies')) {
      parseUnion(scan);
      expr = { k: 'satisfies', inner: expr };
      continue;
    }
    break;
  }
  return expr;
}

function parsePrimaryExpr(scan: Scan): Expr {
  skipTrivia(scan);
  const ch = scan.source[scan.i];
  if (ch === '(') {
    scan.i += 1;
    const inner = parseExpr(scan);
    skipTrivia(scan);
    if (scan.source[scan.i] === ')') scan.i += 1;
    return { k: 'paren', inner };
  }
  if (ch === '{') return parseObject(scan);
  if (ch === "'" || ch === '"') {
    const quoted = readQuoted(scan);
    return quoted ? { k: 'string', text: quoted.text } : { k: 'other' };
  }
  if (ch === '`') {
    const template = readTemplate(scan);
    if (!template) return { k: 'other' };
    return template.plain ? { k: 'string', text: template.text } : { k: 'other' };
  }
  if (ch >= '0' && ch <= '9') {
    readNumber(scan);
    return { k: 'other' };
  }
  const name = readIdent(scan);
  if (name) return { k: 'ident', text: name };
  if (scan.i < scan.source.length) scan.i += 1;
  return { k: 'other' };
}

function parseObject(scan: Scan): Expr {
  scan.i += 1;
  const props: Array<{ name: string; value: Expr }> = [];
  while (scan.i < scan.source.length) {
    const mark = scan.i;
    skipTrivia(scan);
    if (scan.source[scan.i] === '}') {
      scan.i += 1;
      break;
    }
    if (scan.source.startsWith('...', scan.i)) {
      scan.i += 3;
      parseExpr(scan);
    } else if (scan.source[scan.i] === '(' || scan.source[scan.i] === '<') {
      if (scan.source[scan.i] === '<') skipGroup(scan, '<', '>');
      skipGroup(scan, '(', ')');
      skipTrivia(scan);
      if (scan.source[scan.i] === '{') skipGroup(scan, '{', '}');
    } else {
      const name = readPropName(scan);
      skipTrivia(scan);
      if (name && scan.source[scan.i] === ':') {
        scan.i += 1;
        props.push({ name, value: parseExpr(scan) });
      }
    }
    consumeComma(scan);
    if (scan.i <= mark) scan.i = mark + 1;
  }
  return { k: 'object', props };
}

function readBraceMembers(scan: Scan): { fields: D1ContractField[]; closed: boolean } {
  scan.i += 1;
  const fields: D1ContractField[] = [];
  while (scan.i < scan.source.length) {
    const mark = scan.i;
    skipTrivia(scan);
    if (scan.i >= scan.source.length) return { fields, closed: false };
    const ch = scan.source[scan.i];
    if (ch === '}') {
      scan.i += 1;
      return { fields, closed: true };
    }
    if (ch === ',' || ch === ';') {
      scan.i += 1;
      continue;
    }
    const member = readMember(scan);
    if (member === 'unclosed') return { fields, closed: false };
    if (member) fields.push(member);
    if (scan.i === mark) scan.i += 1;
  }
  return { fields, closed: false };
}

function readMember(scan: Scan): D1ContractField | null | 'unclosed' {
  const save = scan.i;
  const hadReadonly = consumeKeyword(scan, 'readonly');
  if (hadReadonly) {
    skipTrivia(scan);
    const next = scan.source[scan.i];
    if (next === ':' || next === '?' || next === ',' || next === ';' || next === '}' || next === undefined) scan.i = save;
  }
  skipTrivia(scan);
  if (scan.source[scan.i] === '(' || (keywordAt(scan, 'new') && /[(<]/.test(scan.source[scan.i + 3] || ''))) {
    if (!skipMemberTail(scan)) return 'unclosed';
    return null;
  }
  if (scan.source[scan.i] === '[') return readBracketMember(scan);
  const name = readPropName(scan);
  if (!name) {
    if (!skipMemberTail(scan)) return 'unclosed';
    return null;
  }
  skipTrivia(scan);
  let optional = false;
  if (scan.source[scan.i] === '?') {
    optional = true;
    scan.i += 1;
    skipTrivia(scan);
  }
  if (scan.source[scan.i] === '(' || scan.source[scan.i] === '<') {
    if (!skipMemberTail(scan)) return 'unclosed';
    return null;
  }
  if (scan.source[scan.i] !== ':') {
    if (!skipMemberTail(scan)) return 'unclosed';
    return null;
  }
  scan.i += 1;
  const typed = readTypeText(scan, false);
  if (!typed.closed) return 'unclosed';
  consumeComma(scan);
  if (!typed.text) return null;
  return { name, type: typed.text, optional };
}

function readBracketMember(scan: Scan): D1ContractField | null | 'unclosed' {
  const start = scan.i;
  const grouped = readBalanced(scan, '[', ']');
  if (!grouped) return 'unclosed';
  const index = /^[A-Za-z_$][\w$]*\s*\??\s*:/.test(grouped.inner.trim());
  skipTrivia(scan);
  let optional = false;
  if (scan.source[scan.i] === '?') {
    optional = true;
    scan.i += 1;
    skipTrivia(scan);
  }
  if (scan.source[scan.i] !== ':') {
    if (!skipMemberTail(scan)) return 'unclosed';
    return null;
  }
  scan.i += 1;
  const typed = readTypeText(scan, false);
  if (!typed.closed) return 'unclosed';
  consumeComma(scan);
  if (index || !typed.text) return null;
  const name = scan.source.slice(start, grouped.end).trim();
  if (!name) return null;
  return { name, type: typed.text, optional };
}

/** Type source as the compiler reports it: leading trivia dropped, whitespace collapsed. */
function readTypeText(scan: Scan, stopAtAssign: boolean): { text: string; closed: boolean } {
  skipTrivia(scan);
  const start = scan.i;
  let end = scan.i;
  let brace = 0;
  let paren = 0;
  let bracket = 0;
  let angle = 0;
  while (scan.i < scan.source.length) {
    if (skipTriviaAt(scan)) continue;
    if (skipStringAt(scan)) {
      end = scan.i;
      continue;
    }
    const ch = scan.source[scan.i];
    const flat = brace === 0 && paren === 0 && bracket === 0 && angle === 0;
    if (flat && (ch === ';' || ch === ',' || ch === ')' || ch === '}' || ch === ']')) break;
    if (flat && stopAtAssign && ch === '=' && scan.source[scan.i + 1] !== '>') break;
    if (ch === '{') brace += 1;
    else if (ch === '}') {
      if (brace === 0) break;
      brace -= 1;
    } else if (ch === '(') paren += 1;
    else if (ch === ')') {
      if (paren === 0) break;
      paren -= 1;
    } else if (ch === '[') bracket += 1;
    else if (ch === ']') {
      if (bracket === 0) break;
      bracket -= 1;
    } else if (ch === '<') angle += 1;
    else if (ch === '>' && angle > 0) angle -= 1;
    scan.i += 1;
    end = scan.i;
    if (brace < 0 || paren < 0 || bracket < 0) return { text: '', closed: false };
  }
  const closed = brace === 0 && paren === 0 && bracket === 0 && angle === 0;
  const text = scan.source.slice(start, end).replace(/\s+/g, ' ').trim();
  return { text, closed };
}

function skipHeritage(scan: Scan): void {
  if (!consumeKeyword(scan, 'extends') && !consumeKeyword(scan, 'implements')) return;
  while (scan.i < scan.source.length) {
    skipTrivia(scan);
    if (scan.source[scan.i] === '{' || scan.i >= scan.source.length) break;
    parseUnion(scan);
    skipTrivia(scan);
    if (scan.source[scan.i] === ',') {
      scan.i += 1;
      continue;
    }
    break;
  }
}

function skipTypeParams(scan: Scan): void {
  skipTrivia(scan);
  if (scan.source[scan.i] !== '<' || scan.source[scan.i + 1] === '=') return;
  skipGroup(scan, '<', '>');
}

function skipMemberTail(scan: Scan): boolean {
  let brace = 0;
  let paren = 0;
  let bracket = 0;
  let angle = 0;
  while (scan.i < scan.source.length) {
    if (skipTriviaAt(scan) || skipStringAt(scan)) continue;
    const ch = scan.source[scan.i];
    const flat = brace === 0 && paren === 0 && bracket === 0 && angle === 0;
    if (flat && (ch === ';' || ch === ',' || ch === '}')) {
      if (ch !== '}') scan.i += 1;
      return true;
    }
    if (ch === '{') brace += 1;
    else if (ch === '}') {
      if (brace === 0) return true;
      brace -= 1;
    } else if (ch === '(') paren += 1;
    else if (ch === ')') paren -= 1;
    else if (ch === '[') bracket += 1;
    else if (ch === ']') bracket -= 1;
    else if (ch === '<') angle += 1;
    else if (ch === '>' && angle > 0) angle -= 1;
    scan.i += 1;
  }
  return false;
}

function skipStatement(scan: Scan): void {
  let brace = 0;
  let paren = 0;
  let bracket = 0;
  let angle = 0;
  while (scan.i < scan.source.length) {
    if (skipTriviaAt(scan) || skipStringAt(scan)) continue;
    const ch = scan.source[scan.i];
    const flat = brace === 0 && paren === 0 && bracket === 0 && angle === 0;
    if (flat && ch === ';') {
      scan.i += 1;
      return;
    }
    if (flat && (ch === '\n' || ch === '\r')) {
      const save = scan.i;
      skipTrivia(scan);
      if (keywordAt(scan, 'export') || keywordAt(scan, 'import')) {
        scan.i = save;
        return;
      }
      continue;
    }
    if (ch === '{') brace += 1;
    else if (ch === '}') {
      brace -= 1;
      scan.i += 1;
      if (brace <= 0 && paren === 0 && bracket === 0) return;
      continue;
    } else if (ch === '(') paren += 1;
    else if (ch === ')') paren -= 1;
    else if (ch === '[') bracket += 1;
    else if (ch === ']') bracket -= 1;
    else if (ch === '<') angle += 1;
    else if (ch === '>' && angle > 0) angle -= 1;
    scan.i += 1;
  }
}

function skipGroup(scan: Scan, open: string, close: string): boolean {
  if (scan.source[scan.i] !== open) return false;
  const grouped = readBalanced(scan, open, close);
  return !!grouped;
}

function readBalanced(scan: Scan, open: string, close: string): { inner: string; end: number } | null {
  if (scan.source[scan.i] !== open) return null;
  const start = scan.i;
  let depth = 0;
  while (scan.i < scan.source.length) {
    if (skipTriviaAt(scan) || skipStringAt(scan)) continue;
    const ch = scan.source[scan.i];
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      scan.i += 1;
      if (depth === 0) return { inner: scan.source.slice(start + 1, scan.i - 1), end: scan.i };
      continue;
    }
    scan.i += 1;
  }
  return null;
}

function readPropName(scan: Scan): string {
  skipTrivia(scan);
  const ch = scan.source[scan.i];
  if (ch === '[') {
    const start = scan.i;
    const grouped = readBalanced(scan, '[', ']');
    return grouped ? scan.source.slice(start, grouped.end).trim() : '';
  }
  if (ch === "'" || ch === '"') return readQuoted(scan)?.text || '';
  if (ch === '`') {
    const template = readTemplate(scan);
    if (!template) return '';
    return template.plain ? template.text : template.raw.trim();
  }
  if (ch === '#') {
    scan.i += 1;
    const ident = readIdent(scan);
    return ident ? `#${ident}` : '';
  }
  if (isIdentStart(ch)) return readIdent(scan);
  if (ch >= '0' && ch <= '9') return readNumber(scan);
  return '';
}

function readQuoted(scan: Scan): { text: string } | null {
  const quote = scan.source[scan.i];
  if (quote !== "'" && quote !== '"') return null;
  scan.i += 1;
  let raw = '';
  while (scan.i < scan.source.length) {
    const ch = scan.source[scan.i];
    if (ch === '\\') {
      raw += ch + (scan.source[scan.i + 1] || '');
      scan.i += scan.source[scan.i + 1] ? 2 : 1;
      continue;
    }
    scan.i += 1;
    if (ch === quote) return { text: cook(raw) };
    raw += ch;
  }
  return { text: cook(raw) };
}

function readTemplate(scan: Scan): { plain: boolean; text: string; raw: string } | null {
  if (scan.source[scan.i] !== '`') return null;
  const start = scan.i;
  scan.i += 1;
  let plain = true;
  let rawBody = '';
  while (scan.i < scan.source.length) {
    const ch = scan.source[scan.i];
    if (ch === '\\') {
      rawBody += ch + (scan.source[scan.i + 1] || '');
      scan.i += scan.source[scan.i + 1] ? 2 : 1;
      continue;
    }
    if (ch === '`') {
      scan.i += 1;
      return { plain, text: cook(rawBody), raw: scan.source.slice(start, scan.i) };
    }
    if (ch === '$' && scan.source[scan.i + 1] === '{') {
      plain = false;
      scan.i += 2;
      let depth = 1;
      while (scan.i < scan.source.length && depth > 0) {
        if (skipStringAt(scan)) continue;
        if (scan.source[scan.i] === '{') depth += 1;
        else if (scan.source[scan.i] === '}') depth -= 1;
        scan.i += 1;
      }
      continue;
    }
    rawBody += ch;
    scan.i += 1;
  }
  return { plain: false, text: cook(rawBody), raw: scan.source.slice(start) };
}

function readIdent(scan: Scan): string {
  skipTrivia(scan);
  if (!isIdentStart(scan.source[scan.i] || '')) return '';
  const start = scan.i;
  scan.i += 1;
  while (isIdentPart(scan.source[scan.i] || '')) scan.i += 1;
  return scan.source.slice(start, scan.i);
}

function readNumber(scan: Scan): string {
  const start = scan.i;
  while (/[0-9_]/.test(scan.source[scan.i] || '')) scan.i += 1;
  if (scan.source[scan.i] === '.' && /[0-9]/.test(scan.source[scan.i + 1] || '')) {
    scan.i += 1;
    while (/[0-9_]/.test(scan.source[scan.i] || '')) scan.i += 1;
  }
  return scan.source.slice(start, scan.i);
}

function cook(raw: string): string {
  let out = '';
  for (let index = 0; index < raw.length; index += 1) {
    if (raw[index] !== '\\') {
      out += raw[index];
      continue;
    }
    const next = raw[index + 1] || '';
    index += 1;
    if (next === 'n') out += '\n';
    else if (next === 'r') out += '\r';
    else if (next === 't') out += '\t';
    else if (next === 'b') out += '\b';
    else if (next === 'f') out += '\f';
    else if (next === 'v') out += '\v';
    else if (next === '0') out += '\0';
    else if (next === 'u' && raw[index + 1] === '{') {
      const end = raw.indexOf('}', index + 2);
      const hex = end > index ? raw.slice(index + 2, end) : '';
      out += hex ? String.fromCodePoint(Number.parseInt(hex, 16)) : '';
      index = end > index ? end : index;
    } else if (next === 'u') {
      out += String.fromCharCode(Number.parseInt(raw.slice(index + 1, index + 5) || '0', 16));
      index += 4;
    } else if (next === 'x') {
      out += String.fromCharCode(Number.parseInt(raw.slice(index + 1, index + 3) || '0', 16));
      index += 2;
    } else if (next === '\n' || next === '\r') {
      if (next === '\r' && raw[index + 1] === '\n') index += 1;
    } else out += next;
  }
  return out;
}

function consumeKeyword(scan: Scan, word: string): boolean {
  skipTrivia(scan);
  if (!keywordAt(scan, word)) return false;
  scan.i += word.length;
  return true;
}

function keywordAt(scan: Scan, word: string): boolean {
  if (!scan.source.startsWith(word, scan.i)) return false;
  return !isIdentPart(scan.source[scan.i + word.length] || '');
}

function consumeSemi(scan: Scan): void {
  skipTrivia(scan);
  if (scan.source[scan.i] === ';') scan.i += 1;
}

function consumeComma(scan: Scan): void {
  skipTrivia(scan);
  if (scan.source[scan.i] === ',' || scan.source[scan.i] === ';') scan.i += 1;
}

function fail(scan: Scan, detail: string): void {
  const where = scan.fileName ? `${detail} (${scan.fileName})` : detail;
  if (!scan.unparsed.includes(where)) scan.unparsed.push(where);
}

function skipTrivia(scan: Scan): void {
  while (skipTriviaAt(scan)) { /* advance */ }
}

function skipTriviaAt(scan: Scan): boolean {
  const ch = scan.source[scan.i];
  if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v') {
    scan.i += 1;
    return true;
  }
  if (ch === '/' && scan.source[scan.i + 1] === '/') {
    scan.i += 2;
    while (scan.i < scan.source.length && scan.source[scan.i] !== '\n') scan.i += 1;
    return true;
  }
  if (ch === '/' && scan.source[scan.i + 1] === '*') {
    scan.i += 2;
    while (scan.i < scan.source.length && !(scan.source[scan.i] === '*' && scan.source[scan.i + 1] === '/')) scan.i += 1;
    if (scan.i < scan.source.length) scan.i += 2;
    return true;
  }
  return false;
}

function skipStringAt(scan: Scan): boolean {
  const ch = scan.source[scan.i];
  if (ch !== "'" && ch !== '"' && ch !== '`') return false;
  if (ch === '`') {
    readTemplate(scan);
    return true;
  }
  readQuoted(scan);
  return true;
}

function isIdentStart(ch: string): boolean {
  return /[A-Za-z_$]/.test(ch);
}

function isIdentPart(ch: string): boolean {
  return /[A-Za-z0-9_$]/.test(ch);
}
