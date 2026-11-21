/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/codeTokens.test.ts" enhancement="_blank"/>

// d1_258: the one reader of generated code. A regex literal, a string, a template and a comment are told apart as the TypeScript parser
// tells them, and the four readers that used to jump at `//` (adapterKeys, the two withoutComments, the type blocks of d1_257) and the
// masker of requests50 read the same way. The real case is the adapter of the repoHost that adapter17 refused (l4_p4_139 s1).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

import { maskCode, requestsObjectBodies } from '/_102021_/l2/agentMaterializeL1/helpers/codeScan.js';
import { codeOnly, scanCode, withoutComments, type CodeSpan } from '/_102021_/l2/agentMaterializeL1/helpers/codeTokens.js';
import { adapterKeys, adapterProblems } from '/_102021_/l2/agentMaterializeL1/steps/adapter17/adapter.js';
import { exportedTypeBlocks } from '/_102021_/l2/agentMaterializeL1/steps/external15/fixedTypes.js';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const STEPS = path.join(HERE, '../steps');
const REFUSED = readFileSync(path.join(STEPS, 'adapter17/fixtures/githubAdapterRefusedL4p4139.recorded.txt'), 'utf8');
// The recorded declaration imports the type from the old path of the runtime; the types are what the adapter is checked against.
const DECLARATION = readFileSync(path.join(STEPS, 'external15/fixtures/repoHostGithubF45e1e26.recorded.txt'), 'utf8')
  .replace('/_102034_/l1/server/layer_1_external/connections/external/types.js', '/_102034_/l2/shared/contracts/connections/externalSystem.js');

const kindsOf = (code: string) => scanCode(code).map(span => `${span.kind}:${code.slice(span.start, span.end)}`);

/** What the TypeScript parser says: the comments, the regex literals and the quoted strings, as [start, end] of the text. */
function typescriptSpans(code: string): { comment: string[]; regex: string[]; string: string[] } {
  const file = ts.createSourceFile('x.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const comment = new Set<string>();
  const regex: string[] = [];
  const string: string[] = [];
  const addComments = (ranges: ts.CommentRange[] | undefined) => { for (const range of ranges ?? []) comment.add(`${range.pos}:${range.end}`); };
  const visit = (node: ts.Node) => {
    addComments(ts.getLeadingCommentRanges(code, node.pos));
    addComments(ts.getTrailingCommentRanges(code, node.end));
    if (node.kind === ts.SyntaxKind.RegularExpressionLiteral) regex.push(`${node.getStart(file)}:${node.end}`);
    if (node.kind === ts.SyntaxKind.StringLiteral) string.push(`${node.getStart(file)}:${node.end}`);
    for (const child of node.getChildren(file)) visit(child);
  };
  visit(file);
  addComments(ts.getLeadingCommentRanges(code, file.endOfFileToken.pos));
  return { comment: [...comment].sort(), regex: regex.sort(), string: string.sort() };
}

function ours(code: string, kind: CodeSpan['kind']): string[] {
  return scanCode(code).filter(span => span.kind === kind).map(span => `${span.start}:${span.end}`).sort();
}

const CASES: Record<string, string> = {
  regexWithSlashes: "const clean = path.replace(/\\//g, '');\nexport default clean; // end",
  slashesInString: "const url = 'http://x.test//a' + \"b//c\"; // comment 'with quote'\nconst n = 1;",
  templateWithSlashes: 'const a = `https://x.test/${path}//${other}`; // after\nconst b = `${`in//ner`}`;',
  commentWithBrace: 'const o = {\n  // } \' "\n  a: 1, /* { [ ( */ b: 2,\n};',
  division: 'const r = a / b / c; const s = (a + b) / 2; const t = arr[0] / 2; // tail',
  regexAfterOperators: 'const a = x ? /a\\/b/ : /c/gi; const b = [/d/, /e[/]/]; const f = (/g/).test(h); return /i/.test(j);',
  regexClass: 'const re = /[/\\]]+/u; const q = a.b(/x/g, "y");',
  commentLikeRegexBody: 'const re = /a\\/\\/b/; const sl = "//"; // real',
  lineCommentThenRegex: '// one\nconst re = /two/; /* three */ const z = 4;',
};

void test('d1_258: regex literals, strings, templates and comments are told apart', () => {
  assert.deepEqual(kindsOf(CASES.regexWithSlashes), ['regex:/\\//g', "string:''", 'comment:// end']);
  assert.deepEqual(kindsOf(CASES.slashesInString), ["string:'http://x.test//a'", 'string:"b//c"', "comment:// comment 'with quote'"]);
  assert.deepEqual(kindsOf(CASES.division), ['comment:// tail']);
  assert.deepEqual(kindsOf(CASES.commentLikeRegexBody), ['regex:/a\\/\\/b/', 'string:"//"', 'comment:// real']);
  const template = kindsOf(CASES.templateWithSlashes);
  assert.ok(template.includes('comment:// after'));
  assert.ok(template.some(item => item.startsWith('template:`https://x.test/${')));
  assert.ok(template.some(item => item.startsWith('template:`in//ner`')));
});

void test('d1_258: the reader agrees with the TypeScript parser on comments, regex literals and strings', () => {
  for (const [name, code] of Object.entries(CASES)) {
    const expected = typescriptSpans(code);
    assert.deepEqual(ours(code, 'comment'), expected.comment, `${name}: comments`);
    assert.deepEqual(ours(code, 'regex'), expected.regex, `${name}: regex`);
    assert.deepEqual(ours(code, 'string'), expected.string, `${name}: strings`);
  }
  for (const [name, code] of [['refused adapter', REFUSED], ['declaration', DECLARATION]]) {
    const expected = typescriptSpans(code);
    assert.deepEqual(ours(code, 'comment'), expected.comment, `${name}: comments`);
    assert.deepEqual(ours(code, 'regex'), expected.regex, `${name}: regex`);
    assert.deepEqual(ours(code, 'string'), expected.string, `${name}: strings`);
  }
});

void test('d1_258: the masks keep the length and the lines, and withoutComments keeps what is not a comment', () => {
  for (const code of [...Object.values(CASES), REFUSED]) {
    for (const masked of [withoutComments(code), codeOnly(code), maskCode(code)]) {
      assert.equal(masked.length, code.length);
      assert.deepEqual([...masked].map(char => char === '\n'), [...code].map(char => char === '\n'));
    }
  }
  assert.equal(withoutComments(CASES.regexWithSlashes), "const clean = path.replace(/\\//g, '');\nexport default clean;       ");
  assert.equal(withoutComments(CASES.slashesInString).includes("'http://x.test//a'"), true);
  assert.equal(withoutComments(CASES.slashesInString).includes('"b//c"'), true);
  assert.equal(codeOnly('a = "}" + /}/ + `}`; // }').replace(/\s+/gu, ''), 'a=++;');
});

void test('d1_258: the adapter of the repoHost that adapter17 refused gets its keys and passes the gate', () => {
  assert.match(REFUSED, /replace\(\/\\\/\/g, ''\)/u);
  assert.deepEqual(adapterKeys(REFUSED), ['listarConteudo', 'lerArquivo', 'gravarArquivo']);
  const header = '/// <mls fileReference="_102047_/l1/repoHost/layer_1_external/connections/githubAdapter.ts" enhancement="_blank"/>';
  const problems = adapterProblems(REFUSED, DECLARATION, header, '/_102047_/l1/repoHost/layer_1_external/connections/github.js');
  assert.deepEqual(problems, []);
});

void test('d1_258: adapter keys read past a regex, a string, a template and a comment that hold braces and parentheses', () => {
  const adapter = [
    'const adapter: ExternalSystemAdapter = {',
    "  // } ) ' \"",
    "  a: async (x) => ({ p: x.p.replace(/\\//g, '').replace(/[)}]/g, ''), q: '//' }),",
    "  'b-c': (x) => `${x.y}//${'}'}`,",
    '  /* { ( */ d(x) { return /\\)\\}/.test(x) ? 1 : 2; },',
    '};',
    'export default adapter;',
  ].join('\n');
  assert.deepEqual(adapterKeys(adapter), ['a', 'b-c', 'd']);
  assert.deepEqual(adapterKeys('export default { x() { return 1; }, y: 2 };'), ['x', 'y']);
  assert.equal(adapterKeys('const nothing = 1;'), null);
});

void test('d1_258: type blocks are cut past a regex, a string and a comment with braces or semicolons', () => {
  const code = [
    "export type A = { a: '};' | 'b'; /* } ; */ c: number };",
    '// export type Ghost = { never: true };',
    "export interface B { x: string; // }\n  y?: `${string};`;\n}",
    "export type C = 'x' | 'y';",
  ].join('\n');
  const blocks = exportedTypeBlocks(code);
  assert.deepEqual(blocks.map(block => block.name), ['A', 'B', 'C']);
  assert.equal(blocks[0].text, "export type A = { a: '};' | 'b'; /* } ; */ c: number };");
  assert.match(blocks[1].text, /y\?: `\$\{string\};`;\n\}$/u);
  assert.equal(blocks[2].text, "export type C = 'x' | 'y';");
});

void test('d1_258: the masker of requests50 keeps its shape and no longer takes a regex for a comment', () => {
  const code = "export const requests = {\n  a: (x) => x.p.replace(/\\//g, ''),\n  b: (x) => `${x}//`, // tail\n  'c': 1,\n};";
  assert.deepEqual([...requestsObjectBodies(code).keys()], ['a', 'b', 'c']);
  assert.equal(maskCode("const s = 'ab'; // c").slice(0, 16), "const s = '__'; ");
});
