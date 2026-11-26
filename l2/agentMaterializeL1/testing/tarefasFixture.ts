/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/tarefasFixture.ts" enhancement="_blank"/>

// d1_324: the `tarefas` module the tests of the generator read, frozen at a commit of `mls-102047` (the tree of the checkout was replaced at `2af2a0fa`, tarefas of 102056 over it,
// and the tests that read it live broke). Only the git history is read (`git archive`), never the files of the checkout; the tree is extracted once into /tmp.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The parent of `2af2a0fa`: the `tarefas` with `cicloTarefa`/`avisoDiario` and the `AvisoVencimento` scenario. */
export const TAREFAS_COMMIT = 'acae9e28';
const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const TREE = `/tmp/d1_324_tarefas_${TAREFAS_COMMIT}`;

/** Root of the frozen tree: `l1/tarefas` and `l4/tarefas` under it. */
export function tarefasTree(): string {
  if (existsSync(path.join(TREE, 'l4/tarefas/workflows.defs.ts'))) return TREE;
  mkdirSync(TREE, { recursive: true });
  const archived = spawnSync('git', ['-C', path.join(BASE, 'mls-102047'), 'archive', TAREFAS_COMMIT, 'l1/tarefas', 'l4/tarefas'], { maxBuffer: 256 * 1024 * 1024 });
  if (archived.status !== 0) throw new Error(archived.stderr?.toString() || `git archive ${TAREFAS_COMMIT}`);
  const extracted = spawnSync('tar', ['-x', '-C', TREE], { input: archived.stdout });
  if (extracted.status !== 0) throw new Error(extracted.stderr?.toString() || 'tar');
  return TREE;
}
