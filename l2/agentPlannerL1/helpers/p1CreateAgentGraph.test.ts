/// <mls fileReference="_102021_/l2/agentPlannerL1/helpers/p1CreateAgentGraph.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const P1_ROOT = path.resolve(HERE, '..');
const MLS_BASE = path.resolve(P1_ROOT, '../../..');
const ENTRY = path.join(P1_ROOT, 'agentPlannerL1.ts');

const IMPORT_FROM = /\b(?:import|export)\s+(type\s+)?(?:([\s\S]*?)\s+from\s+)?['"]([^'"]+)['"]/g;
const FORBIDDEN_GLOBALS = /\b(?:window|document|indexedDB)\b|\bmls\.editor\b/g;
const ALLOWED_102035 = new Set([
  '/_102035_/l2/solution/pool.js',
  '/_102035_/l2/solution/fs.js',
  '/_102035_/l2/solution/types.js',
]);
const ALLOWED_102021 = new Set([
  '/_102021_/l2/agentChangeBackend/helpers/cbDefsSource.js',
]);

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
  if (spec === 'lit' || spec.startsWith('lit/')) return `static import of lit (${spec})`;
  if (/(?:^|\/)widgets\//.test(spec)) return `static import of widgets (${spec})`;
  if (spec.includes('collabMessagesHelper')) return `static import of collabMessagesHelper (${spec})`;
  if (spec.includes('mls.editor')) return `static import of mls.editor (${spec})`;
  if (spec.includes('agentChangeBackend') && !ALLOWED_102021.has(spec)) {
    return `static import of agentChangeBackend (${spec})`;
  }
  if (spec.startsWith('/_102035_/') && !ALLOWED_102035.has(spec)) {
    return `static import of 102035 outside solution/{pool,fs,types} (${spec})`;
  }
  return null;
}

function resolveInProject(fromFile: string, spec: string): string | null {
  let candidate: string | null = null;
  if (spec.startsWith('/_102021_/')) {
    candidate = path.join(MLS_BASE, 'mls-102021', spec.replace(/^\/_102021_\//, '').replace(/\.js$/, '.ts'));
  } else if (spec.startsWith('.')) {
    candidate = path.resolve(path.dirname(fromFile), spec.replace(/\.js$/, '.ts'));
  }
  if (!candidate) return null;
  if (!existsSync(candidate)) return null;
  const rel = path.relative(P1_ROOT, candidate);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return candidate;
}

function stripStrings(source: string): string {
  return source
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, '""')
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

function globalOffences(source: string): string[] {
  const scanned = stripStrings(stripComments(source));
  const found: string[] = [];
  FORBIDDEN_GLOBALS.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FORBIDDEN_GLOBALS.exec(scanned))) found.push(match[0]);
  return found;
}

function relP1(file: string): string {
  return path.relative(P1_ROOT, file).replace(/\\/g, '/');
}

function walkCreateAgentGraph(entry = ENTRY): { files: string[]; offences: Offence[] } {
  const queue = [entry];
  const seen = new Set<string>();
  const files: string[] = [];
  const offences: Offence[] = [];

  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    files.push(file);
    const source = readFileSync(file, 'utf8');
    for (const spec of staticImportSpecifiers(source)) {
      const reason = forbiddenImportReason(spec);
      if (reason) offences.push({ file: relP1(file), reason });
      const next = resolveInProject(file, spec);
      if (next) queue.push(next);
    }
    for (const ident of globalOffences(source)) {
      offences.push({ file: relP1(file), reason: `prompt-hook graph uses ${ident}` });
    }
  }

  return { files, offences };
}

void test('createAgent static graph stays inside agentPlannerL1 and the three solution modules', () => {
  assert.equal(existsSync(ENTRY), true, `missing ${ENTRY}`);
  const { files, offences } = walkCreateAgentGraph();
  const rels = files.map(relP1);
  assert.ok(rels.includes('agentPlannerL1.ts'), 'entry must be in the graph');
  assert.ok(rels.includes('helpers/p1Core.ts'), 'p1Core must be in the graph');
  assert.ok(rels.includes('helpers/l1Inventory.ts'), 'l1Inventory must be in the graph');
  assert.ok(rels.includes('steps/entry10/agentP1Entry.ts'), 'entry10 must be in the graph');
  assert.ok(!rels.some(file => file.includes('agentChangeBackend')), 'agentChangeBackend leaked into the graph');
  assert.deepEqual(offences, [], offences.map(item => `${item.file}: ${item.reason}`).join('\n'));
});

void test('guard goes red on a forbidden 102035 import and on window', () => {
  const poisoned = [
    'import { createAgent } from "/_102035_/l2/agentNewSolution5/agentNewSolution5.js";',
    'import { addMessage } from "/_102025_/l2/collabMessagesHelper.js";',
    'import { ALL_STATUSES } from "/_102021_/l2/agentChangeBackend/helpers/cbShared.js";',
    'export function beforeP1EntryPromptStep() { return window.location; }',
  ].join('\n');
  const importHits = staticImportSpecifiers(poisoned)
    .map(forbiddenImportReason)
    .filter((reason): reason is string => Boolean(reason));
  assert.ok(importHits.some(reason => reason.includes('102035 outside')), importHits.join('\n'));
  assert.ok(importHits.some(reason => reason.includes('collabMessagesHelper')), importHits.join('\n'));
  assert.ok(importHits.some(reason => reason.includes('agentChangeBackend')), importHits.join('\n'));
  assert.deepEqual(globalOffences(poisoned), ['window']);
});
