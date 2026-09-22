/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1CreateAgentGraph.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AGENT_ROOT = path.resolve(HERE, '..');
const MLS_BASE = path.resolve(AGENT_ROOT, '../../..');
const ENTRY = path.join(AGENT_ROOT, 'agentDefsL1.ts');

const IMPORT_FROM = /\b(?:import|export)\s+(type\s+)?(?:([\s\S]*?)\s+from\s+)?['"]([^'"]+)['"]/g;
const FORBIDDEN_GLOBALS = /\b(?:window|document|indexedDB)\b|\bmls\.editor\b/g;
const FS_LEAK = /\b(?:node:fs|node:child_process|readFileSync|writeFileSync|Deno\.read|Deno\.write)\b/;

type Offence = { file: string; reason: string };

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
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

function isTypescriptSpecifier(spec: string): boolean {
  const bare = spec.startsWith('npm:') ? spec.slice(4) : spec;
  return bare === 'typescript' || bare.startsWith('typescript/') || bare.startsWith('typescript@');
}

function forbiddenImportReason(spec: string): string | null {
  if (isTypescriptSpecifier(spec)) return `typescript import (${spec})`;
  if (spec === 'node:fs' || spec === 'node:child_process' || spec === 'fs') return `filesystem import (${spec})`;
  if (/(?:^|\/)monaco(?:-editor)?(?:\/|$)/.test(spec)) return `static import of monaco (${spec})`;
  if (spec === 'lit' || spec.startsWith('lit/')) return `static import of lit (${spec})`;
  if (/(?:^|\/)widgets\//.test(spec)) return `static import of widgets (${spec})`;
  if (spec.includes('collabMessagesHelper')) return `static import of collabMessagesHelper (${spec})`;
  if (spec.includes('agentChangeBackend') || spec.includes('agentChangeFrontend') || spec.includes('agentPlannerL1') || spec.includes('agentCbMaterialize')) {
    return `static import of another agent (${spec})`;
  }
  if (spec.startsWith('/_102035_/') || spec.startsWith('/_102020_/')) return `static import outside this agent (${spec})`;
  return null;
}

function resolveInAgent(fromFile: string, spec: string): string | null {
  let candidate: string | null = null;
  if (spec.startsWith('/_102021_/l2/agentDefsL1/')) {
    candidate = path.join(MLS_BASE, 'mls-102021', spec.replace(/^\/_102021_\//, '').replace(/\.js$/, '.ts'));
  } else if (spec.startsWith('.')) {
    candidate = path.resolve(path.dirname(fromFile), spec.replace(/\.js$/, '.ts'));
  }
  if (!candidate || !existsSync(candidate)) return null;
  const rel = path.relative(AGENT_ROOT, candidate);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return candidate;
}

function stripStrings(source: string): string {
  return source
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, '""')
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

function relAgent(file: string): string {
  return path.relative(AGENT_ROOT, file).replace(/\\/g, '/');
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
      if (reason) offences.push({ file: relAgent(file), reason });
      const next = resolveInAgent(file, spec);
      if (next) queue.push(next);
    }
    const scanned = stripStrings(stripComments(source));
    FORBIDDEN_GLOBALS.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = FORBIDDEN_GLOBALS.exec(scanned))) {
      offences.push({ file: relAgent(file), reason: `prompt-hook graph uses ${match[0]}` });
    }
    if (FS_LEAK.test(scanned)) offences.push({ file: relAgent(file), reason: 'direct filesystem call' });
  }
  return { files, offences };
}

function walkTs(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      walkTs(full, out);
      continue;
    }
    if (name.endsWith('.ts') && !name.endsWith('.test.ts')) out.push(full);
  }
}

void test('createAgent stays inside agentDefsL1 and does not touch the filesystem', () => {
  const { files, offences } = walkCreateAgentGraph();
  const rels = files.map(relAgent);
  assert.ok(rels.includes('agentDefsL1.ts'));
  assert.ok(rels.includes('helpers/d1Core.ts'));
  assert.ok(rels.includes('helpers/d1Stor.ts'));
  assert.ok(rels.includes('steps/entry10/agentD1Entry.ts'));
  assert.ok(!rels.includes('helpers/d1TestHost.ts'));
  assert.deepEqual(offences, [], offences.map(item => `${item.file}: ${item.reason}`).join('\n'));
});

void test('the agent graph does not import typescript', () => {
  const { files } = walkCreateAgentGraph();
  const specifier = /(?:\bfrom\s+|\bimport\s*\(\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;
  const hits: string[] = [];
  for (const file of files) {
    const source = stripComments(readFileSync(file, 'utf8'));
    specifier.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = specifier.exec(source))) {
      if (isTypescriptSpecifier(match[1])) hits.push(`${relAgent(file)}: ${match[1]}`);
    }
  }
  assert.deepEqual(hits, []);
});

void test('product sources have no filesystem, console log, todo path or Portuguese user text', () => {
  const files: string[] = [];
  walkTs(AGENT_ROOT, files);
  const hits: string[] = [];
  for (const file of files) {
    if (file.endsWith(`${path.sep}d1TestHost.ts`)) continue;
    const source = readFileSync(file, 'utf8');
    const rel = relAgent(file);
    if (FS_LEAK.test(stripComments(source))) hits.push(`${rel}: filesystem`);
    if (/\bconsole\.log\b/.test(stripComments(source))) hits.push(`${rel}: console.log`);
    if (source.includes('todo/')) hits.push(`${rel}: todo path`);
    if (/[À-ÿ]/.test(source)) hits.push(`${rel}: non-English text`);
  }
  assert.deepEqual(hits, []);
});
