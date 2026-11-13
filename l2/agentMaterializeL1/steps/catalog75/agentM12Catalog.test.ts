/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/catalog75/agentM12Catalog.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { assistantCatalogFile, fileRef, type M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { buildM12PlannedSteps } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { createAgent } from '/_102021_/l2/agentMaterializeL1/steps/catalog75/agentM12Catalog.js';

const PROJECT = 102047;
const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', '102047');

interface FakeFile extends M12FileInfo {
  status: string;
  content: string;
  getContent(): Promise<string>;
  getValueInfo(): Promise<{ content: string }>;
}

function keyOf(info: M12FileInfo): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function infoOfRel(rel: string): M12FileInfo {
  const normalized = rel.split(path.sep).join('/');
  const level = Number(normalized.slice(1, 2));
  const rest = normalized.slice(3);
  const slash = rest.lastIndexOf('/');
  const folder = slash >= 0 ? rest.slice(0, slash) : '';
  const filename = slash >= 0 ? rest.slice(slash + 1) : rest;
  const doubled = filename.endsWith('.defs.ts');
  const dot = doubled ? filename.length - '.defs.ts'.length : filename.lastIndexOf('.');
  return { project: PROJECT, level, folder, shortName: filename.slice(0, dot), extension: doubled ? '.defs.ts' : filename.slice(dot) };
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function install(): Record<string, FakeFile> {
  const files: Record<string, FakeFile> = {};
  const put = (info: M12FileInfo, content: string): FakeFile => {
    const stored: FakeFile = {
      ...info, status: 'changed', content,
      getContent: async () => stored.content,
      getValueInfo: async () => ({ content: stored.content }),
    };
    files[keyOf(info)] = stored;
    return stored;
  };
  for (const full of walk(FIXTURE)) {
    const rel = path.relative(FIXTURE, full);
    put(infoOfRel(rel), readFileSync(full, 'utf8'));
  }
  const holder = globalThis as { mls?: unknown; __agentMaterializeL1Memory?: Map<string, string>; __agentMaterializeL1Created?: Set<string> };
  holder.__agentMaterializeL1Memory = new Map();
  holder.__agentMaterializeL1Created = new Set();
  holder.mls = {
    actualProject: PROJECT,
    stor: {
      files,
      getKeyToFile: keyOf,
      addOrUpdateFile: async (info: M12FileInfo) => files[keyOf(info)] ?? put(info, ''),
      localStor: {
        setContent: async (stored: FakeFile, value: { content?: string | null }) => { stored.content = value.content ?? ''; return true; },
      },
      server: { loadProjectInfoIfNeeded: async () => undefined },
    },
  };
  return files;
}

async function run(moduleName: string, raw?: string): Promise<string> {
  const agent = createAgent();
  const intents = await agent.beforePromptStep!(
    { agentName: 'x', agentDescription: 'x', visibility: 'public' } as IAgentMeta,
    { message: { orderAt: 'm', threadId: 't', content: '' }, task: { PK: 'task' } } as mls.msg.ExecutionContext,
    { stepId: 1 } as mls.msg.AIAgentStep,
    { stepId: 2, prompt: '' } as mls.msg.AIAgentStep,
    0,
    raw ?? JSON.stringify({ project: PROJECT, module: moduleName, scope: '', target: '', force: false }),
  ) as Array<{ traceMsg?: string }>;
  return String(intents[0]?.traceMsg ?? '');
}

function snapshot(files: Record<string, FakeFile>): Map<string, string> {
  return new Map(Object.entries(files).map(([key, file]) => [key, file.content]));
}

void test('catalog75 follows register70 only on a whole-module run', () => {
  const whole = buildM12PlannedSteps(PROJECT, { scope: 'tarefas', target: '', force: false }, [{ module: 'tarefas', layers: ['domain'], register: true }]);
  assert.deepEqual(whole.map(step => step.planning?.planId), ['domain10-tarefas', 'register70-tarefas', 'catalog75-tarefas', 'finalize80-tarefas']);
  const partial = buildM12PlannedSteps(PROJECT, { scope: '', target: 'l1/tarefas/x.defs.ts', force: true }, [{ module: 'tarefas', layers: ['domain'], register: false }]);
  assert.equal(partial.some(step => String(step.planning?.planId).startsWith('catalog75-')), false);
});

void test('writes the tarefas and compras catalogs, twice the same, and nothing else', async () => {
  const files = install();
  const before = snapshot(files);
  const tarefas = await run('tarefas');
  assert.match(tarefas, /^catalog: _102047_\/l1\/tarefas\/layer_2_application\/assistant\/assistantCatalog\.ts/);
  const tarefasText = files[keyOf(assistantCatalogFile(PROJECT, 'tarefas'))].content;
  assert.match(tarefasText, /"actionId": "tarefas.iniciar"/);
  assert.match(tarefasText, /tarefas\.inicio\.iniciarTarefa/);
  assert.match(tarefasText, /tarefas\.minhas_tarefas\.cmdIniciar/);
  assert.equal(tarefasText.includes('import '), false);

  const compras = await run('compras', `@@agentM12Catalog ${JSON.stringify({ project: PROJECT, module: 'compras', scope: '', target: '', force: false })}`);
  assert.match(compras, /^catalog: _102047_\/l1\/compras\/layer_2_application\/assistant\/assistantCatalog\.ts/);
  const comprasText = files[keyOf(assistantCatalogFile(PROJECT, 'compras'))].content;
  assert.match(comprasText, /"module": "compras"/);

  const again = await run('tarefas');
  assert.match(again, /^catalog:/);
  assert.equal(files[keyOf(assistantCatalogFile(PROJECT, 'tarefas'))].content, tarefasText);

  const changed = [...snapshot(files).entries()].filter(([key, content]) => before.get(key) !== content).map(([key]) => key);
  assert.deepEqual(changed.sort(), [keyOf(assistantCatalogFile(PROJECT, 'compras')), keyOf(assistantCatalogFile(PROJECT, 'tarefas'))].sort());
  assert.equal(fileRef(assistantCatalogFile(PROJECT, 'tarefas')).includes('assistantCatalog.ts'), true);
});

void test('a module with no live routes gets an empty catalog', async () => {
  const files = install();
  const project = files[keyOf({ project: PROJECT, level: 5, folder: '', shortName: 'project', extension: '.json' })];
  const parsed = JSON.parse(project.content) as { modules: Array<{ moduleName?: string; backend?: { routeKeys?: string[] } }> };
  const tarefas = parsed.modules.find(item => item.moduleName === 'tarefas');
  assert.ok(tarefas?.backend);
  tarefas.backend.routeKeys = [];
  project.content = `${JSON.stringify(parsed, null, 2)}\n`;
  const trace = await run('tarefas');
  assert.match(trace, /commands=0 queries=0/);
  const text = files[keyOf(assistantCatalogFile(PROJECT, 'tarefas'))].content;
  assert.match(text, /"commands": \[\]/);
  assert.match(text, /"queries": \[\]/);
  assert.match(text, /"schemaVersion": "assistant-catalog-v1"/);
});
