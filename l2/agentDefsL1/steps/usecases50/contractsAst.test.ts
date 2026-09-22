/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { readContractAst, symbolFields, type D1ContractAst, type D1ContractField, type D1ContractSymbol, type D1RouteBinding } from '/_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLANNER_CONTRACTS = path.resolve(HERE, '../../../../../mls-102020/l2/agentPlannerL2/steps/contracts30/fixtures/contracts');

const SAMPLES = [
  `
    export interface ListConsultaOutput { id: string; attendanceNote: string; }
    export interface ReceptionOut { id: string; status: string; }
    export const routes = { "agendaClinica.consultas.qryListConsulta": { output: "ReceptionOut" } } as const;
  `,
  `
    export interface In { id: string; attendanceNote: string; }
    export interface Out { id: string; }
    export const routes = { "agendaClinica.agenda.cmdRegistrarAtendimento": { input: "In", output: "Out" } } as const;
  `,
  'export interface ListConsultaOutput { id: string; status: string; attendanceNote: string; }\nexport type Out0 = { id: string; status: string; attendanceNote: string }[];\nexport interface Out1 { id: string }\nexport const routes = { "agendaClinica.agenda.qryListConsulta": { output: "Out0" }, "agendaClinica.agenda.cmdGo": { output: "Out1" } } as const;\n',
  `
    export interface Wide { id: string; attendanceNote: string; }
    export const routes = { "agendaClinica.consultas.qryListConsulta": value as Wide } as const;
  `,
  `
    export interface Item { id: string; note?: string; }
    export type Items = Item[];
    export type Wrapped = (Item)[];
    export type Generic = Array<Item>;
    export type ReadonlyItems = ReadonlyArray<Item>;
    export type Inline = { id: string; note?: string }[];
    export type Obj = { id: string; note?: string };
    export type Ignored = string;
    export type UnionArray = (string | number)[];
    interface Hidden { secret: string }
    const routes = { "hidden.route": { output: "Item" } };
    export const routes = { "shown.route": { input: "Item", output: "Items" } } as const;
  `,
  `
    export interface Note {
      label: string; // trailing
      raw: '};';
      title?: string;
      id: string /* keep */ | number;
    }
    export const routes = {
      "mod.page.qry": { input: "Note", output: "Note" },
    } as const satisfies Record<string, unknown>;
  `,
  `
    export interface Named { "a-b": string; ["c-d"]: number; 1: boolean; new: string; }
    export interface Indexed { [key: string]: string; id: string; }
    export const routes = { [\`mod.page.qry\`]: { output: "Named" }, "mod.page.cmd": ({ output: "Indexed" }) } as const;
  `,
  'export interface Esc { id: string; }\nexport const routes = { "line\\n": { output: "Esc" }, "quote\\"": { output: "Esc" } } as const;\n',
];

void test('the scanner matches the typescript reader on contract shapes', () => {
  const files = readdirSync(PLANNER_CONTRACTS).filter(name => name.endsWith('.defs.ts')).sort();
  const sources = [
    ...SAMPLES.map((source, index) => ({ fileName: `sample-${index}.defs.ts`, source })),
    ...files.map(name => ({ fileName: name, source: readFileSync(path.join(PLANNER_CONTRACTS, name), 'utf8') })),
  ];
  const mismatches: string[] = [];
  for (const item of sources) {
    const got = readContractAst(item.source, item.fileName);
    const expected = readWithTypescript(item.source, item.fileName);
    if (got.unparsed.length) mismatches.push(`${item.fileName} unparsed: ${got.unparsed.join(' | ')}`);
    if (JSON.stringify(view(got)) !== JSON.stringify(expected)) {
      mismatches.push(`${item.fileName}\n got ${JSON.stringify(view(got))}\n exp ${JSON.stringify(expected)}`);
    }
  }
  assert.deepEqual(mismatches, []);
});

void test('an unclosed export is declared and a closed file is not', () => {
  const broken = readContractAst('export interface Broken { id: string', 'agenda.defs.ts');
  assert.equal(broken.unparsed.some(item => item.includes('Broken') && item.includes('agenda.defs.ts')), true);
  assert.equal(symbolFields(broken, 'Broken')?.some(field => field.name === 'id'), true);
  const closed = readContractAst('export interface Broken { id: string }', 'agenda.defs.ts');
  assert.deepEqual(closed.unparsed, []);
});

function view(ast: D1ContractAst): { bindings: D1RouteBinding[]; symbols: D1ContractSymbol[]; assertions: string[] } {
  return { bindings: ast.bindings, symbols: ast.symbols, assertions: ast.assertions };
}

function readWithTypescript(source: string, fileName: string): { bindings: D1RouteBinding[]; symbols: D1ContractSymbol[]; assertions: string[] } {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const bindings: D1RouteBinding[] = [];
  const symbols: D1ContractSymbol[] = [];
  const assertions: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableStatement(node) && isExported(node)) readRoutes(node, sf, bindings, assertions);
    if (ts.isInterfaceDeclaration(node) && isExported(node)) {
      symbols.push({ name: node.name.text, fields: readMembers(node.members, sf), shape: 'object', element: '' });
    }
    if (ts.isTypeAliasDeclaration(node) && isExported(node)) readAlias(node, sf, symbols);
  };
  sf.forEachChild(visit);
  return { bindings, symbols, assertions };
}

function readRoutes(node: ts.VariableStatement, sf: ts.SourceFile, bindings: D1RouteBinding[], assertions: string[]): void {
  for (const decl of node.declarationList.declarations) {
    if (!ts.isIdentifier(decl.name) || decl.name.text !== 'routes' || !decl.initializer) continue;
    const expr = unwrap(decl.initializer);
    if (!ts.isObjectLiteralExpression(expr)) continue;
    for (const property of expr.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const route = propertyName(property.name, sf);
      if (!route) continue;
      const value = unwrap(property.initializer);
      if (!ts.isObjectLiteralExpression(value)) {
        if (expressionAsserts(property.initializer)) assertions.push(route);
        continue;
      }
      const input = stringProp(value, 'input', sf);
      const output = stringProp(value, 'output', sf);
      if (!output) continue;
      bindings.push({ route, input, output });
    }
  }
}

function readAlias(node: ts.TypeAliasDeclaration, sf: ts.SourceFile, symbols: D1ContractSymbol[]): void {
  const element = arrayElement(node.type);
  if (element) {
    if (ts.isTypeLiteralNode(element)) {
      symbols.push({ name: node.name.text, fields: readMembers(element.members, sf), shape: 'array', element: '' });
      return;
    }
    if (ts.isTypeReferenceNode(element) && ts.isIdentifier(element.typeName)) {
      symbols.push({ name: node.name.text, fields: [], shape: 'array', element: element.typeName.text });
      return;
    }
    symbols.push({ name: node.name.text, fields: [], shape: 'array', element: '' });
    return;
  }
  if (ts.isTypeLiteralNode(node.type)) {
    symbols.push({ name: node.name.text, fields: readMembers(node.type.members, sf), shape: 'object', element: '' });
  }
}

function arrayElement(type: ts.TypeNode): ts.TypeNode | null {
  let current = type;
  while (ts.isParenthesizedTypeNode(current)) current = current.type;
  if (ts.isArrayTypeNode(current)) return unwrapType(current.elementType);
  if (ts.isTypeReferenceNode(current) && ts.isIdentifier(current.typeName)) {
    const name = current.typeName.text;
    const arg = current.typeArguments?.[0];
    if ((name === 'Array' || name === 'ReadonlyArray') && arg) return unwrapType(arg);
  }
  return null;
}

function unwrapType(type: ts.TypeNode): ts.TypeNode {
  let current = type;
  while (ts.isParenthesizedTypeNode(current)) current = current.type;
  return current;
}

function expressionAsserts(node: ts.Expression): boolean {
  let current = node;
  while (ts.isParenthesizedExpression(current)) current = current.expression;
  return ts.isAsExpression(current) || ts.isSatisfiesExpression(current);
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
