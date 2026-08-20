/// <mls fileReference="_102021_/l2/agentChangeBackend/localDocRefs.test.ts" enhancement="_blank"/>

// No file in this project may point at a document that exists ONLY on one machine.
//
// WHY THIS EXISTS. On 2026-08-18 a sweep found **25 references to `todo/*.md`** in 16 files across
// five agents — in `flow.json` specFirst fields, in `spec.md` headers, and in the comments of helpers
// that carry load-bearing reasons ("REPORT ONLY — never blocks (decision §8.2 of todo/…)"). This
// project reaches other developers through the Studio; the `todo/` folder never leaves the author's
// disk. So every one of those was a dead end for everybody except one person, and the reader could
// not even tell it was dead — a path looks openable.
//
// The rule that replaced them: **whatever a maintainer needs in order to change the code correctly
// must live in what ships** — `flow.json`, `spec.md`, the per-step `CHANGELOG.md`, or the code. A
// citation to a local document is the symptom of a reason that stayed outside.
//
// Verifying that before deleting is the part worth keeping: it is how the IM2 `spec.md` was found
// describing FOUR routes and a route A that hands off to agentNewMolecule2 — a design abandoned on
// 2026-08-14. A stale shipped record is worse than a broken link, and only reading for the reason
// finds it.
//
// Provenance TAGS are fine and are not what this checks: "(decision D6)" next to a sentence that
// states the decision reads like a commit id. What is banned is the PATH — the thing that promises a
// file the reader does not have.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** This agent's root — everything it ships through the Studio. */
const ROOT = dirname(fileURLToPath(import.meta.url));
const SELF = fileURLToPath(import.meta.url);

const EXTENSIONS = ['.ts', '.json', '.md'];

/** A path into the author's control folder, and an absolute home path. Both are machine-local. */
const PATTERNS: { code: string; re: RegExp; fix: string }[] = [
  {
    code: 'todo_path',
    re: /(?:\.\/)?todo\/[A-Za-z0-9._/-]+\.md/g,
    fix: 'state the reason where it ships (spec.md / flow.json / the step CHANGELOG), then drop the path',
  },
  {
    code: 'absolute_path',
    re: /\/(?:Users|home)\/[A-Za-z0-9._-]+\//g,
    fix: 'never hard-code a machine path — derive it, or name the file relative to the project',
  },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXTENSIONS.some(ext => entry.endsWith(ext)) && full !== SELF) out.push(full);
  }
  return out;
}

test('no file points at a document that exists only on one machine', () => {
  const offences: string[] = [];

  for (const file of walk(ROOT)) {
    const source = readFileSync(file, 'utf8');
    const lines = source.split('\n');
    for (const { code, re, fix } of PATTERNS) {
      lines.forEach((line, index) => {
        for (const match of line.matchAll(re)) {
          offences.push(`${code}: ${relative(ROOT, file)}:${index + 1} → '${match[0]}' — ${fix}`);
        }
      });
    }
  }

  assert.deepEqual(offences, [], `\n${offences.join('\n')}\n`);
});
