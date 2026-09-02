/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbCreateAgentGraph.test.ts" enhancement="_blank"/>

// CB hooks must load on a host without Monaco or a DOM (CLI collab-msg). Studio compile stays in
// cbMaterializeIo; prompt hooks never read mls.editor, never decide by compilerResults, never call
// createStorFile(..., true), and never name window/document/indexedDB.

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CB_ROOT = path.resolve(HERE, '..');
const PROJECT_ROOT = path.resolve(CB_ROOT, '../..');

const IMPORT_FROM = /\b(?:import|export)\s+(type\s+)?(?:([\s\S]*?)\s+from\s+)?['"]([^'"]+)['"]/g;

const FORBIDDEN_IDENTS = /\bmonaco\b|\bmls\.editor\b|\bcompilerResults\b|\b(?:window|document|indexedDB)\b/g;

type Offence = { file: string; reason: string };

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function isTypeOnlyClause(clause: string | undefined, typeKeyword: string | undefined): boolean {
  if (typeKeyword) return true;
  if (!clause) return false;
  const trimmed = clause.trim();
  if (trimmed.startsWith('type ') || trimmed.startsWith('type\t')) return true;
  const inner = trimmed.match(/^\{([\s\S]*)\}$/);
  if (!inner) return false;
  const specs = inner[1].split(',').map(part => part.trim()).filter(Boolean);
  return specs.length > 0 && specs.every(spec => /^type\s/.test(spec));
}

function staticImportSpecifiers(source: string): string[] {
  const text = stripComments(source);
  const specs: string[] = [];
  IMPORT_FROM.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IMPORT_FROM.exec(text))) {
    if (isTypeOnlyClause(match[2], match[1])) continue;
    specs.push(match[3]);
  }
  return specs;
}

function forbiddenImportReason(spec: string): string | null {
  if (/(?:^|\/)monaco(?:-editor)?(?:\/|$)/.test(spec)) return `static import of monaco (${spec})`;
  if (spec.includes('collabMessagesHelper')) return `static import of collabMessagesHelper (${spec})`;
  if (spec.includes('mls.editor')) return `static import of mls.editor (${spec})`;
  return null;
}

function resolveInProject(fromFile: string, spec: string): string | null {
  let candidate: string | null = null;
  if (spec.startsWith('/_102021_/')) {
    candidate = path.join(PROJECT_ROOT, spec.replace(/^\/_102021_\//, '').replace(/\.js$/, '.ts'));
  } else if (spec.startsWith('.')) {
    candidate = path.resolve(path.dirname(fromFile), spec.replace(/\.js$/, '.ts'));
  }
  if (!candidate) return null;
  if (!existsSync(candidate)) return null;
  const rel = path.relative(CB_ROOT, candidate);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return candidate;
}

function isStudioIoModule(file: string): boolean {
  const base = path.basename(file);
  return /Studio/i.test(base) || base === 'cbMaterializeIo.ts';
}

function stripStrings(source: string): string {
  // Template literals are NOT stripped: a naive /`...`/ swallows code between adjacent templates
  // (saveDefs in cbShared) and would hide a real mls.editor on the write path.
  return source
    .replace(/'(?:\\.|[^'\\])*'/g, '""')
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

function stripRegexLiterals(source: string): string {
  return source.replace(/\/(?:\\.|[^/\n])+\/[gimsuy]*/g, '""');
}

function identOffences(source: string): string[] {
  const scanned = stripRegexLiterals(stripStrings(stripComments(source)));
  const found: string[] = [];
  FORBIDDEN_IDENTS.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FORBIDDEN_IDENTS.exec(scanned))) {
    found.push(match[0]);
  }
  return found;
}

function createStorFileNeedModelTrue(source: string): boolean {
  const scanned = stripStrings(stripComments(source));
  return /createStorFile\s*\([\s\S]*?,\s*true\b/.test(scanned);
}

function relCb(file: string): string {
  return path.relative(CB_ROOT, file).replace(/\\/g, '/');
}

function listCreateAgentFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...listCreateAgentFiles(full));
      continue;
    }
    if (!entry.endsWith('.ts') || entry.endsWith('.test.ts')) continue;
    if (entry.startsWith('nodejs')) continue;
    const source = readFileSync(full, 'utf8');
    if (/export function createAgent\s*\(/.test(source)) out.push(full);
  }
  return out;
}

function walkHookGraph(entries: string[]): { files: string[]; offences: Offence[] } {
  const queue = [...entries];
  const seen = new Set<string>();
  const files: string[] = [];
  const offences: Offence[] = [];

  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    if (isStudioIoModule(file)) continue;
    files.push(file);
    const source = readFileSync(file, 'utf8');
    for (const spec of staticImportSpecifiers(source)) {
      const reason = forbiddenImportReason(spec);
      if (reason) offences.push({ file: relCb(file), reason });
      const next = resolveInProject(file, spec);
      if (next) queue.push(next);
    }
    for (const ident of identOffences(source)) {
      offences.push({ file: relCb(file), reason: `hook graph uses ${ident}` });
    }
    if (createStorFileNeedModelTrue(source)) {
      offences.push({ file: relCb(file), reason: 'createStorFile(..., true) outside cbMaterializeIo' });
    }
  }

  return { files, offences };
}

void test('CB createAgent hook graph has no monaco/mls.editor/compilerResults/createStorFile(true)/window/document/indexedDB', () => {
  const entries = listCreateAgentFiles(CB_ROOT);
  assert.ok(entries.some(file => path.basename(file) === 'agentChangeBackend.ts'), 'root createAgent missing');
  assert.ok(entries.some(file => path.basename(file) === 'agentCbMaterialize.ts'), 'materialize createAgent missing');
  assert.ok(entries.length >= 8, `expected several CB createAgent entries, got ${entries.length}`);

  const { files, offences } = walkHookGraph(entries);
  const rels = files.map(relCb);

  assert.ok(rels.includes('agentChangeBackend.ts'), 'root must be in the graph');
  assert.ok(rels.includes('helpers/cbShared.ts'), 'hook writers must be in the graph');
  assert.ok(!rels.some(file => isStudioIoModule(file)), `Studio/Io leaked into hook graph:\n${rels.filter(file => isStudioIoModule(file)).join('\n')}`);

  assert.deepEqual(offences, [], offences.map(item => `${item.file}: ${item.reason}`).join('\n'));
});

void test('guard goes red on forbidden import AND forbidden global (mutation of the detector)', () => {
  const poisoned = [
    'import { compile } from "monaco-editor";',
    'import { addMessage } from "/_102025_/l2/collabMessagesHelper.js";',
    'export async function afterPromptStep() {',
    '  const errors = mls.editor.models.x.compilerResults.errors;',
    '  await createStorFile({ source: "x" }, true, false, false);',
    '  return window.location.href;',
    '}',
  ].join('\n');

  const importHits = staticImportSpecifiers(poisoned)
    .map(forbiddenImportReason)
    .filter((reason): reason is string => Boolean(reason));
  assert.ok(importHits.some(reason => reason.includes('monaco')), importHits.join('\n'));
  assert.ok(importHits.some(reason => reason.includes('collabMessagesHelper')), importHits.join('\n'));
  const idents = identOffences(poisoned);
  assert.ok(idents.includes('mls.editor'), idents.join(','));
  assert.ok(idents.includes('compilerResults'), idents.join(','));
  assert.ok(idents.includes('window'), idents.join(','));
  assert.equal(createStorFileNeedModelTrue(poisoned), true);
});
