/// <mls fileReference="_102021_/l2/agentNewReleaseL1/helpers/report.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { planNewReleaseL1 } from '/_102021_/l2/agentNewReleaseL1/helpers/plan.js';
import { editNotes, parseNewReleaseInvocation, reportNewRelease } from '/_102021_/l2/agentNewReleaseL1/helpers/report.js';
import type { ChangeEffortFile } from '/_102035_/l2/solution/poolPlan.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const MASTER = '102021';

test('invocation accepts one module and refuses a missing or extra argument', () => {
  assert.deepEqual(parseNewReleaseInvocation('@@agentNewReleaseL1 tarefas'), { ok: true, module: 'tarefas' });
  assert.deepEqual(parseNewReleaseInvocation('tarefas'), { ok: true, module: 'tarefas' });
  const help = 'Usage: @@agentNewReleaseL1 <module>';
  assert.deepEqual(parseNewReleaseInvocation('@@agentNewReleaseL1'), { ok: false, help });
  assert.deepEqual(parseNewReleaseInvocation(''), { ok: false, help });
  assert.deepEqual(parseNewReleaseInvocation('@@agentNewReleaseL1 tarefas extra'), { ok: false, help });
});

test('R1 report names both edits and both materialize commands', () => {
  const effort = JSON.parse(readFileSync(join(HERE, 'fixtures', 'R1.changeEffort.json'), 'utf8')) as ChangeEffortFile;
  const defs = loadTarefas();
  const plan = planNewReleaseL1(effort, MASTER, defs);
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  const message = reportNewRelease(editNotes(effort, MASTER, plan.edits.map(edit => edit.path)), plan.targets);
  assert.match(message, /l1\/tarefas\/layer_2_application\/requests\/minhas_tarefas\.defs\.ts: added novaTarefaPrioridadeMedia/u);
  assert.match(message, /l1\/tarefas\/layer_2_application\/usecases\/createTarefa\.defs\.ts: added novaTarefaPrioridadeMedia/u);
  assert.match(message, /@@agentMaterializeL1 \{"target":"l1\/tarefas\/layer_2_application\/requests\/minhas_tarefas\.defs\.ts"\}/u);
  assert.match(message, /@@agentMaterializeL1 \{"target":"l1\/tarefas\/layer_2_application\/usecases\/createTarefa\.defs\.ts"\}/u);
  assert.equal(message.trim().split('\n').length, 4);
});

function loadTarefas(): Record<string, string> {
  const defs: Record<string, string> = {};
  const root = join(HERE, '../../helpers/effort/fixtures/tarefas');
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      if (statSync(abs).isDirectory()) {
        walk(abs);
        continue;
      }
      if (!name.endsWith('.defs.txt')) continue;
      const rel = relative(root, abs).replace(/\.txt$/u, '.ts');
      defs[`l1/tarefas/${rel}`] = readFileSync(abs, 'utf8');
    }
  };
  walk(root);
  return defs;
}
