/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/emitPersistenceReplay.test.ts" enhancement="_blank"/>

// d1_294 s2, d1_293 s2 and d1_295 s2: replay of the generated trees at fixed commits (git show, never the bench).
// PainelRecebiveis stays ddm. Recorded tables have neither timeSeries, retentionDays nor timeField.
// Every recorded table def re-renders to the same bytes, and every recorded table file re-emits to the same bytes, with no error.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { emitPersistence } from '/_102021_/l2/agentMaterializeL1/emitters/emitPersistence.js';
import { parseDefinitionSource, readDefinition, renderDefinition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { parseP1Entity } from '/_102021_/l2/agentPlannerL1/steps/plan20/contracts.js';

const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const TREES = [{ repo: 'mls-102047', commit: 'a2d6e7e5' }, { repo: 'mls-102056', commit: '4c0b77f' }];
const TABLE_DEF = /^l1\/[^/]+\/layer_1_external\/adapters\/persistence\/[^/]+\.defs\.ts$/u;

function git(repo: string, ...args: string[]): string {
  const run = spawnSync('git', ['-C', path.join(BASE, repo), ...args], { maxBuffer: 64 * 1024 * 1024 });
  if (run.status !== 0) throw new Error(run.stderr?.toString() || `git ${args.join(' ')}`);
  return run.stdout.toString();
}

function filesAt(repo: string, commit: string): string[] {
  return git(repo, 'ls-tree', '-r', '--name-only', commit).split('\n').filter(Boolean);
}

function show(repo: string, commit: string, file: string): string {
  return git(repo, 'show', `${commit}:${file}`);
}

function jsonBody(source: string): unknown {
  const matched = source.match(/export const \w+ = (\{[\s\S]*\}) as const(?: satisfies [^;]+)?;/u);
  if (!matched) throw new Error('definition object is missing');
  return JSON.parse(matched[1]) as unknown;
}

void test('d1_294 s2: PainelRecebiveis stays ddm and recorded tables replay byte for byte with no error', async () => {
  const families = new Map<string, string>();
  const seenTables: string[] = [];
  for (const tree of TREES) {
    const names = filesAt(tree.repo, tree.commit);
    const texts = new Map<string, string>();
    const read = async (ref: string): Promise<string | null> => {
      const logical = ref.replace(/^_\d+_\//u, '');
      if (texts.has(logical)) return texts.get(logical) ?? null;
      if (!names.includes(logical)) return null;
      const body = show(tree.repo, tree.commit, logical);
      texts.set(logical, body);
      return body;
    };
    for (const file of names.filter(item => /^l4\/[^/]+\/ontology\/[^/]+\.defs\.ts$/u.test(item) && !item.endsWith('/index.defs.ts'))) {
      const source = await read(file);
      if (!source) continue;
      let parsed: unknown;
      try {
        parsed = jsonBody(source);
      } catch {
        continue;
      }
      const entity = parseP1Entity(parsed);
      if (!entity) continue;
      families.set(`${tree.repo}/${file}`, entity.family);
    }
    for (const file of names.filter(item => TABLE_DEF.test(item))) {
      const source = await read(file);
      if (!source) continue;
      const parsed = parseDefinitionSource(source);
      if (!('definition' in parsed)) continue;
      const definition = readDefinition(parsed.definition);
      if ('issues' in definition || definition.artifactType !== 'table') continue;
      const rendered = renderDefinition(definition, `_${tree.repo.slice(4)}_/${file}`);
      assert.ok(!('issues' in rendered), `${file} ${'issues' in rendered ? rendered.issues.join(' ') : ''}`);
      if (!('issues' in rendered)) assert.equal(rendered.source, source, `${tree.repo}/${file} def`);
      const output = file.replace(/\.defs\.ts$/u, '.ts');
      const recorded = names.includes(output) ? await read(output) : null;
      if (recorded) {
        const emitted = await emitPersistence('persistence.table', definition, `_${tree.repo.slice(4)}_/${output}`, read);
        assert.equal('code' in emitted, false, `${output} ${'code' in emitted ? `${emitted.code} ${emitted.detail}` : ''}`);
        if (!('code' in emitted)) assert.equal(emitted.source, recorded, `${tree.repo}/${output}`);
      }
      const data = definition.data as { timeSeries?: unknown; retentionDays?: unknown; timeField?: unknown };
      assert.equal(data.timeSeries, undefined, file);
      assert.equal(data.retentionDays, undefined, file);
      assert.equal(data.timeField, undefined, file);
      seenTables.push(`${tree.repo}/${file}`);
    }
  }
  assert.equal(families.get('mls-102047/l4/financeiro/ontology/PainelRecebiveis.defs.ts'), 'ddm');
  assert.ok(seenTables.length > 0, 'the replay read no table');
});
