/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbCorpus.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectModuleDataAdapterFindings } from '/_102021_/l2/agentChangeBackend/helpers/cbAdapterNotes.js';
import {
  CB_CORPUS_PROJECT_IDS,
  diffCbCorpusBaseline,
  runCbCorpus,
  summarizeCbCorpus,
  type CbCorpusBaseline,
  type CbCorpusIo,
} from '/_102021_/l2/agentChangeBackend/helpers/cbCorpus.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../..');
const BASELINE_PATH = path.join(HERE, 'fixtures', 'cbCorpusBaseline.json');
const WEAKMAP_FIXTURE = path.join(HERE, 'fixtures', 'taskRepositoryAdapter.weakmap.txt');

function nodeIo(): CbCorpusIo {
  return {
    isDir: (absPath) => existsSync(absPath) && statSync(absPath).isDirectory(),
    isFile: (absPath) => existsSync(absPath) && statSync(absPath).isFile(),
    list: (absPath) => readdirSync(absPath),
    read: (absPath) => readFileSync(absPath, 'utf8'),
    join: (...parts) => path.join(...parts),
  };
}

void test('runCbCorpus skips missing projects instead of throwing', () => {
  const run = runCbCorpus(HERE, nodeIo());
  assert.equal(run.projects.length, CB_CORPUS_PROJECT_IDS.length);
  assert.ok(run.projects.every((p) => p.skipped && p.files.length === 0));
  assert.ok(run.projects.every((p) => /not on disk/.test(p.warning ?? '')));
});

void test('frozen WeakMap adapter is accused; a moduleData adapter is not', () => {
  const defective = readFileSync(WEAKMAP_FIXTURE, 'utf8');
  assert.match(defective, /new WeakMap/);
  assert.equal(defective.includes('ctx.data.moduleData'), false);
  const hit = collectModuleDataAdapterFindings(defective, 'taskrepositoryadapter', new Set(['task']));
  assert.equal(hit.length, 2, hit.join(' | '));
  assert.ok(hit.some((m) => /missing ctx\.data\.moduleData/.test(m)));
  assert.ok(hit.some((m) => /module-level Map\/WeakMap/.test(m)));

  const good = [
    'export function createTaskRepositoryAdapter(ctx: RequestContext) {',
    "  const getTable = () => ctx.data.moduleData.getTable<TaskRow>('task');",
    '  return { list: async () => (await getTable()).findMany() };',
    '}',
  ].join('\n');
  assert.deepEqual(collectModuleDataAdapterFindings(good, 'taskrepositoryadapter', new Set(['task'])), []);
});

void test('diffCbCorpusBaseline names the project/family and the new count', () => {
  const baseline: CbCorpusBaseline = {
    projects: {
      '102046': {
        moduleDataAdapter: { count: 0 },
        jsonbRowParse: { count: 7 },
        redundantPkIndex: { count: 20 },
        columnTypeMismatch: { count: 0 },
        detailsKey: { count: 8 },
        rawMdmAccess: { count: 0 },
      },
    },
  };
  const drifted: CbCorpusBaseline = {
    projects: {
      '102046': {
        moduleDataAdapter: { count: 2 },
        jsonbRowParse: { count: 7 },
        redundantPkIndex: { count: 20 },
        columnTypeMismatch: { count: 0 },
        detailsKey: { count: 8 },
        rawMdmAccess: { count: 0 },
      },
    },
  };
  const diffs = diffCbCorpusBaseline(drifted, baseline);
  assert.equal(diffs.length, 1);
  assert.equal(diffs[0], '102046 moduleDataAdapter: baseline 0, got 2');
});

const live = runCbCorpus(MLS_BASE, nodeIo());
const present = live.projects.filter((p) => !p.skipped);

void test('corpus guards match the versioned baseline', { skip: present.length === 0 ? 'cb corpus not on disk' : false }, (t) => {
  for (const project of live.projects) {
    if (project.skipped && project.warning) t.diagnostic(project.warning);
  }
  const expected = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as CbCorpusBaseline;
  const actual = summarizeCbCorpus(live);
  if (process.env.CB_CORPUS_REWRITE_BASELINE === '1') {
    writeFileSync(BASELINE_PATH, `${JSON.stringify(actual, null, 2)}\n`);
    t.diagnostic(`rewrote ${BASELINE_PATH}`);
  }
  const diffs = diffCbCorpusBaseline(actual, expected);
  assert.equal(diffs.length, 0, diffs.join('\n'));
});
