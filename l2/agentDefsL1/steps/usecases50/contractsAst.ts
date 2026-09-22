/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.ts" enhancement="_blank"/>

import ts from 'typescript';

export interface D1ContractField {
  name: string;
  type: string;
  optional: boolean;
}

export interface D1ContractSymbol {
  name: string;
  fields: D1ContractField[];
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
}

/**
 * Reads exported `routes` bindings and exported type shapes.
 * A file with interfaces but no `routes` map yields no bindings: the first
 * type and a matching name are not an identity.
 */
export function readContractAst(source: string, fileName: string): D1ContractAst {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const bindings: D1RouteBinding[] = [];
  const symbols: D1ContractSymbol[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableStatement(node) && isExported(node)) readRoutes(node, sf, bindings);
    if (ts.isInterfaceDeclaration(node) && isExported(node)) {
      symbols.push({ name: node.name.text, fields: readMembers(node.members, sf) });
    }
    if (ts.isTypeAliasDeclaration(node) && isExported(node) && ts.isTypeLiteralNode(node.type)) {
      symbols.push({ name: node.name.text, fields: readMembers(node.type.members, sf) });
    }
  };
  sf.forEachChild(visit);
  return { bindings, symbols };
}

/** The unique symbol of this name, or null when it is missing or duplicated. */
export function symbolFields(ast: D1ContractAst, name: string): D1ContractField[] | null {
  if (!name) return null;
  const found = ast.symbols.filter(item => item.name === name);
  if (found.length !== 1) return null;
  return found[0].fields;
}

function readRoutes(node: ts.VariableStatement, sf: ts.SourceFile, bindings: D1RouteBinding[]): void {
  for (const decl of node.declarationList.declarations) {
    if (!ts.isIdentifier(decl.name) || decl.name.text !== 'routes' || !decl.initializer) continue;
    const expr = unwrap(decl.initializer);
    if (!ts.isObjectLiteralExpression(expr)) continue;
    for (const property of expr.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const route = propertyName(property.name, sf);
      const value = unwrap(property.initializer);
      if (!route || !ts.isObjectLiteralExpression(value)) continue;
      const input = stringProp(value, 'input', sf);
      const output = stringProp(value, 'output', sf);
      if (!output) continue;
      bindings.push({ route, input, output });
    }
  }
}

function readMembers(members: ts.NodeArray<ts.TypeElement>, sf: ts.SourceFile): D1ContractField[] {
  const fields: D1ContractField[] = [];
  for (const member of members) {
    if (!ts.isPropertySignature(member) || !member.name || !member.type) continue;
    const name = propertyName(member.name, sf);
    const type = member.type.getText(sf).replace(/\s+/g, ' ').trim();
    if (!name || !type) continue;
    fields.push({ name, type, optional: !!member.questionToken });
  }
  return fields;
}

function stringProp(object: ts.ObjectLiteralExpression, key: string, sf: ts.SourceFile): string {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    if (propertyName(property.name, sf) !== key) continue;
    const value = unwrap(property.initializer);
    if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) return value.text;
  }
  return '';
}

function propertyName(name: ts.PropertyName, sf: ts.SourceFile): string {
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) return name.text;
  if (ts.isNumericLiteral(name)) return name.text;
  return name.getText(sf).trim();
}

function unwrap(node: ts.Expression): ts.Expression {
  let current = node;
  while (ts.isAsExpression(current) || ts.isParenthesizedExpression(current) || ts.isSatisfiesExpression(current)) {
    current = current.expression;
  }
  return current;
}

function isExported(node: ts.Node): boolean {
  return (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0;
}
