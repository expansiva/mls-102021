/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/smoke/typeModel.ts" enhancement="_blank"/>

// d1_321 (parte B, tempo 1): a small reading of TypeScript types for the smoke. From the declarations of a contract (interfaces and type aliases, in the contract file and the
// files it imports) it makes the smallest valid value of a type (`sampleOf`) and says whether a value fits a type (`conformsTo`). Code only, no model.

import ts from 'typescript';

export type TypeTable = Map<string, ts.TypeNode>;

/** Interfaces and type aliases of some sources, by name (an interface becomes an object type literal). Later sources win on a repeated name. */
export function typeTableOf(sources: readonly string[]): TypeTable {
  const table: TypeTable = new Map();
  for (const source of sources) {
    const file = ts.createSourceFile('x.ts', source, ts.ScriptTarget.Latest, true);
    for (const statement of file.statements) {
      if (ts.isTypeAliasDeclaration(statement) && !statement.typeParameters) table.set(statement.name.text, statement.type);
      else if (ts.isInterfaceDeclaration(statement) && !statement.typeParameters) table.set(statement.name.text, ts.factory.createTypeLiteralNode(statement.members.filter(ts.isTypeElement)));
    }
  }
  return table;
}

/** The type written as text (`{ a: string }`, `Foo`), as a node. */
export function typeNodeOf(text: string): ts.TypeNode {
  const file = ts.createSourceFile('x.ts', `type T = ${text};`, ts.ScriptTarget.Latest, true);
  const alias = file.statements[0] as ts.TypeAliasDeclaration;
  return alias.type;
}

function members(node: ts.TypeLiteralNode): Array<{ name: string; optional: boolean; type: ts.TypeNode }> {
  const out: Array<{ name: string; optional: boolean; type: ts.TypeNode }> = [];
  for (const member of node.members) {
    if (!ts.isPropertySignature(member) || !member.type) continue;
    const name = ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) ? member.name.text : '';
    if (name) out.push({ name, optional: !!member.questionToken, type: member.type });
  }
  return out;
}

function resolved(node: ts.TypeNode, table: TypeTable, seen: ReadonlySet<string>): { node: ts.TypeNode; seen: ReadonlySet<string> } {
  if (ts.isParenthesizedTypeNode(node)) return resolved(node.type, table, seen);
  if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && !node.typeArguments) {
    const name = node.typeName.text;
    const target = table.get(name);
    if (target && !seen.has(name)) return resolved(target, table, new Set([...seen, name]));
  }
  return { node, seen };
}

const isNullish = (node: ts.TypeNode): boolean => node.kind === ts.SyntaxKind.NullKeyword || node.kind === ts.SyntaxKind.UndefinedKeyword || (ts.isLiteralTypeNode(node) && node.literal.kind === ts.SyntaxKind.NullKeyword);

const KNOWN_GENERICS = new Set(['Array', 'ReadonlyArray', 'Record', 'Partial', 'Readonly', 'Required', 'Pick', 'Omit', 'Promise', 'Date']);

/** d1_333: a named type the table does not declare (and the language does not): a sample made from it would be `{}`, not a value of that type. */
export function hasUnresolved(node: ts.TypeNode, table: TypeTable, seen: ReadonlySet<string> = new Set(), depth = 0): boolean {
  if (depth > 8) return false;
  const { node: type, seen: next } = resolved(node, table, seen);
  if (ts.isTypeReferenceNode(type) && ts.isIdentifier(type.typeName)) {
    const name = type.typeName.text;
    if (KNOWN_GENERICS.has(name)) return (type.typeArguments ?? []).some(item => hasUnresolved(item, table, next, depth + 1));
    return !table.has(name);
  }
  if (ts.isUnionTypeNode(type) || ts.isIntersectionTypeNode(type)) return type.types.some(item => hasUnresolved(item, table, next, depth + 1));
  if (ts.isArrayTypeNode(type)) return hasUnresolved(type.elementType, table, next, depth + 1);
  if (ts.isTypeLiteralNode(type)) return members(type).some(member => !member.optional && hasUnresolved(member.type, table, next, depth + 1));
  if (ts.isTupleTypeNode(type)) return type.elements.some(item => hasUnresolved(item, table, next, depth + 1));
  return false;
}

/** The smallest valid value. `prefer`: for a union, the member that has a literal `true` (success) or `false` (failure) field, when asked. `variant`: otherwise the nth member of every union (d1_330: each way to call an arrival). */
export function sampleOf(node: ts.TypeNode, table: TypeTable, options: { prefer?: 'success' | 'failure'; variant?: number } = {}, seen: ReadonlySet<string> = new Set(), depth = 0): unknown {
  if (depth > 8) return undefined;
  const { node: type, seen: next } = resolved(node, table, seen);
  switch (type.kind) {
    case ts.SyntaxKind.StringKeyword: return 'sample';
    case ts.SyntaxKind.NumberKeyword: return 1;
    case ts.SyntaxKind.BooleanKeyword: return true;
    case ts.SyntaxKind.NullKeyword: return null;
    case ts.SyntaxKind.UndefinedKeyword: return undefined;
    case ts.SyntaxKind.UnknownKeyword:
    case ts.SyntaxKind.AnyKeyword: return {};
    default: break;
  }
  if (ts.isLiteralTypeNode(type)) {
    const literal = type.literal;
    if (ts.isStringLiteral(literal)) return literal.text;
    if (ts.isNumericLiteral(literal)) return Number(literal.text);
    if (literal.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (literal.kind === ts.SyntaxKind.FalseKeyword) return false;
    return null;
  }
  if (ts.isArrayTypeNode(type)) return [];
  if (ts.isTypeReferenceNode(type) && ts.isIdentifier(type.typeName)) {
    const name = type.typeName.text;
    if (name === 'Array' || name === 'ReadonlyArray') return [];
    if (name === 'Record') return {};
    if (name === 'Partial' || name === 'Readonly') return type.typeArguments?.[0] ? sampleOf(type.typeArguments[0], table, options, next, depth + 1) : {};
    return {};
  }
  if (ts.isTypeOperatorNode(type)) return sampleOf(type.type, table, options, next, depth + 1);
  if (ts.isUnionTypeNode(type)) {
    const candidates = type.types.filter(item => !isNullish(item));
    const marked = (member: ts.TypeNode, flag: boolean): boolean => {
      const inner = resolved(member, table, next).node;
      return ts.isTypeLiteralNode(inner) && members(inner).some(item => ts.isLiteralTypeNode(item.type) && item.type.literal.kind === (flag ? ts.SyntaxKind.TrueKeyword : ts.SyntaxKind.FalseKeyword));
    };
    const wanted = options.prefer === 'failure' ? candidates.find(item => marked(item, false)) : options.prefer === 'success' ? candidates.find(item => marked(item, true)) : undefined;
    const chosen = wanted ?? candidates[Math.min(options.variant ?? 0, Math.max(candidates.length - 1, 0))];
    return chosen ? sampleOf(chosen, table, options, next, depth + 1) : null;
  }
  if (ts.isIntersectionTypeNode(type)) {
    return Object.assign({}, ...type.types.map(item => { const value = sampleOf(item, table, options, next, depth + 1); return value && typeof value === 'object' ? value : {}; }));
  }
  if (ts.isTypeLiteralNode(type)) {
    const out: Record<string, unknown> = {};
    for (const member of members(type)) {
      if (member.optional) continue;
      const value = sampleOf(member.type, table, options, next, depth + 1);
      if (value !== undefined) out[member.name] = value;
    }
    return out;
  }
  if (ts.isTupleTypeNode(type)) return type.elements.map(item => sampleOf(item, table, options, next, depth + 1));
  return undefined;
}

/** Why `value` does not fit `node`, one line per problem (path and cause); empty when it fits. Extra keys are allowed. */
export function conformsTo(value: unknown, node: ts.TypeNode, table: TypeTable, at = '$', seen: ReadonlySet<string> = new Set(), depth = 0): string[] {
  if (depth > 12) return [];
  const { node: type, seen: next } = resolved(node, table, seen);
  const nullable = ts.isUnionTypeNode(type) && type.types.some(isNullish);
  if (value === null) {
    return nullable || isNullish(type) || type.kind === ts.SyntaxKind.AnyKeyword || type.kind === ts.SyntaxKind.UnknownKeyword ? [] : [`${at}: null where the type has no null`];
  }
  if (value === undefined) return nullable || isNullish(type) || type.kind === ts.SyntaxKind.AnyKeyword || type.kind === ts.SyntaxKind.UnknownKeyword ? [] : [`${at}: missing`];
  switch (type.kind) {
    case ts.SyntaxKind.StringKeyword: return typeof value === 'string' ? [] : [`${at}: ${typeof value} where a string is expected`];
    case ts.SyntaxKind.NumberKeyword: return typeof value === 'number' ? [] : [`${at}: ${typeof value} where a number is expected`];
    case ts.SyntaxKind.BooleanKeyword: return typeof value === 'boolean' ? [] : [`${at}: ${typeof value} where a boolean is expected`];
    case ts.SyntaxKind.AnyKeyword:
    case ts.SyntaxKind.UnknownKeyword: return [];
    default: break;
  }
  if (ts.isLiteralTypeNode(type)) {
    const literal = type.literal;
    const expected = ts.isStringLiteral(literal) ? literal.text : ts.isNumericLiteral(literal) ? Number(literal.text) : literal.kind === ts.SyntaxKind.TrueKeyword ? true : literal.kind === ts.SyntaxKind.FalseKeyword ? false : null;
    return value === expected ? [] : [`${at}: ${JSON.stringify(value)} where ${JSON.stringify(expected)} is expected`];
  }
  if (ts.isArrayTypeNode(type)) {
    if (!Array.isArray(value)) return [`${at}: not an array`];
    return value.flatMap((item, index) => conformsTo(item, type.elementType, table, `${at}[${index}]`, next, depth + 1)).slice(0, 5);
  }
  if (ts.isTypeReferenceNode(type) && ts.isIdentifier(type.typeName)) {
    const name = type.typeName.text;
    if ((name === 'Array' || name === 'ReadonlyArray') && type.typeArguments?.[0]) return Array.isArray(value) ? value.flatMap((item, index) => conformsTo(item, type.typeArguments![0], table, `${at}[${index}]`, next, depth + 1)).slice(0, 5) : [`${at}: not an array`];
    if (name === 'Record') return typeof value === 'object' ? [] : [`${at}: not an object`];
    if ((name === 'Partial' || name === 'Readonly') && type.typeArguments?.[0]) return conformsTo(value, type.typeArguments[0], table, at, next, depth + 1);
    return [];
  }
  if (ts.isTypeOperatorNode(type)) return conformsTo(value, type.type, table, at, next, depth + 1);
  if (ts.isUnionTypeNode(type)) {
    const attempts = type.types.filter(item => !isNullish(item)).map(item => conformsTo(value, item, table, at, next, depth + 1));
    return attempts.some(found => found.length === 0) ? [] : (attempts.sort((left, right) => left.length - right.length)[0] ?? [`${at}: no member fits`]);
  }
  if (ts.isIntersectionTypeNode(type)) return type.types.flatMap(item => conformsTo(value, item, table, at, next, depth + 1));
  if (ts.isTypeLiteralNode(type)) {
    if (typeof value !== 'object' || Array.isArray(value)) return [`${at}: not an object`];
    const record = value as Record<string, unknown>;
    return members(type).flatMap(member => {
      const present = record[member.name];
      if (present === undefined) return member.optional ? [] : [`${at}.${member.name}: missing`];
      return conformsTo(present, member.type, table, `${at}.${member.name}`, next, depth + 1);
    });
  }
  return [];
}
