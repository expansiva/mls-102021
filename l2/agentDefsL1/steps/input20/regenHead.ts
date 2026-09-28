/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/regenHead.ts" enhancement="_blank"/>

// Regenerates the head fixture's backend.json and effort.json with the real producers, so the
// fixture can be checked instead of hand-made (d1_37). backend: the deterministic repair/stamp of
// agentPlannerL1 plan20 (no model call) over the recorded plan. effort: the pure builder of
// agentPlannerL2 effort40 over that backend and the recorded menu. Test support only: it installs
// the in-memory host. regenHead.test.ts reads the fixture from disk and calls it.

import { fileKey, installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { executeP1Entry } from '/_102021_/l2/agentPlannerL1/helpers/p1Core.js';
import { executeP1Plan, loadP1PlanSources } from '/_102021_/l2/agentPlannerL1/steps/plan20/agentP1Plan.js';
import { writePoolMessage } from '/_102035_/l2/solution/pool.js';
import { loadP2MenuSources } from '/_102020_/l2/agentPlannerL2/steps/menu20/agentP2Menu.js';
import { buildP2NeedsFile, buildP2NeedsMessage } from '/_102020_/l2/agentPlannerL2/steps/needs30/contracts.js';
import { formatP2NeedsGate, validateP2Needs } from '/_102020_/l2/agentPlannerL2/steps/needs30/gate.js';
import type { P1BackendFile } from '/_102021_/l2/agentPlannerL1/steps/plan20/contracts.js';
import { formatP1BackendGate, repairP1Backend, validateP1Backend } from '/_102021_/l2/agentPlannerL1/steps/plan20/gate.js';
import { buildP2EffortFile, parseP2BackendFile } from '/_102020_/l2/agentPlannerL2/steps/effort40/contracts.js';
import { formatP2EffortGate, validateP2Effort } from '/_102020_/l2/agentPlannerL2/steps/effort40/gate.js';
import type { P2MenuFile } from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import { buildD2InputSnapshot } from '/_102020_/l2/agentDefsL2/steps/input20/gate.js';
import { readD2InputBundle, writeAcceptedD2Input } from '/_102020_/l2/agentDefsL2/steps/input20/io.js';
import { generateD2Contracts } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';

/** Skip reason for the step agent tests seeded by the head fixture (node:test `{ skip }`). */
export const HEAD_SEED_V11_SKIP = 'd1_37: input20/fixtures/head is a v1.1 snapshot the current producers refuse (P1_BACKEND_PAGE); head cannot be regenerated (d1_39); re-enable by porting the test to input20/fixtures/current';

const MODULE = 'agendaClinica';
const PROJECT = 102047;
export const HEAD_BACKEND = `l4/${MODULE}/pool/l2/web/backend.json`;
export const HEAD_EFFORT = `l4/${MODULE}/pool/l2/web/effort.json`;
const HEAD_MENU = `l4/${MODULE}/pool/l2/web/menu.json`;

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function required(files: Readonly<Record<string, string>>, logical: string): string {
  const text = files[logical];
  if (text === undefined) throw new Error(`head fixture has no ${logical}.`);
  return text;
}

/**
 * `files` maps each head fixture logical path (`.defs.ts`, not the stored `.defs.txt`) to its text.
 * Returns the bytes the producers write (`writeJson`: two spaces, trailing newline).
 */
export async function regenerateHead(files: Readonly<Record<string, string>>): Promise<{ backend: string; effort: string }> {
  const host = installStudio(PROJECT);
  for (const [logical, text] of Object.entries(files)) {
    const info = fileInfoFromDisplay(PROJECT, logical);
    if (info) seed(host, info, text, 'head');
  }
  const sources = await loadP1PlanSources(MODULE);
  const recorded = JSON.parse(required(files, HEAD_BACKEND)) as P1BackendFile;
  const backend = repairP1Backend(recorded, sources.needs, sources.ontology, sources.inventory, sources.l4diff, sources.actors);
  const planGate = validateP1Backend(backend, sources.needs, sources.ontology);
  if (!planGate.ok) throw new Error(formatP1BackendGate(planGate.issues));

  const menu = JSON.parse(required(files, HEAD_MENU)) as P2MenuFile;
  const previousEffort = JSON.parse(required(files, HEAD_EFFORT)) as { meta?: { generatedAt?: string } };
  const now = new Date(previousEffort.meta?.generatedAt || '');
  if (Number.isNaN(now.getTime())) throw new Error('head effort.json has no meta.generatedAt to replay.');
  const effort = buildP2EffortFile({ menu, backend: parseP2BackendFile(JSON.parse(json(backend))), now });
  const effortGate = validateP2Effort(effort, menu, { screenStatusFromAction: true });
  if (!effortGate.ok) throw new Error(formatP2EffortGate(effortGate.issues));
  return { backend: json(backend), effort: json(effort) };
}

/**
 * The current seed (d1_39): `input20/fixtures/current`. Its inputs are copied byte for byte from
 * `mls-102047` git HEAD (`l4/agendaClinica` defs, `pipeline/pipeline.json`, `pool/l2/web/menu.json`,
 * `pool/l1/web/l4diff.json`, last change `97ad95e`). Its outputs come only from the producers, run in
 * this order over those inputs, with no model call:
 * needs30 (build + gate + the l2→l1 message) → agentPlannerL1 entry10 → plan20 (`executeP1Plan`)
 * → effort40 (build + gate) → agentDefsL2 input20 (snapshot) → contracts30 (`generateD2Contracts`).
 * The page contracts are outputs too (d1_40): they come from the same plan revision as backend.json,
 * so every backend route has its binding. `now` and the thread are fixed so the bytes repeat.
 */
export const CURRENT_NOW = '2026-09-25T11:40:00.000Z';
/** Thread and round of the recorded l4 message of that run; mode is the one needs30/entry10 process. */
export const CURRENT_RECEIVED = { thread: 'agendaClinica-20260925113404', round: 1, mode: 'estimate' } as const;
export const CURRENT_NEEDS = `l4/${MODULE}/pool/l1/web/needs.json`;
export const CURRENT_PLANNER = `l4/${MODULE}/pool/l1/pipeline.json`;
/** Folder of the page contracts contracts30 writes (`<pageId>.defs.ts`). */
export const CURRENT_CONTRACTS = `l2/${MODULE}/web/contracts/`;

/** Outputs of the producers over the current seed inputs, as `writeJson` writes them. */
export async function regenerateCurrent(files: Readonly<Record<string, string>>): Promise<Record<string, string>> {
  const host = installStudio(PROJECT);
  for (const [logical, text] of Object.entries(files)) {
    if (logical === CURRENT_NEEDS || logical === HEAD_BACKEND || logical === HEAD_EFFORT || logical === CURRENT_PLANNER) continue;
    if (logical.startsWith(CURRENT_CONTRACTS)) continue;
    const info = fileInfoFromDisplay(PROJECT, logical);
    if (info) seed(host, info, text, 'current');
  }
  const now = new Date(CURRENT_NOW);
  const menu = JSON.parse(required(files, HEAD_MENU)) as P2MenuFile;
  const menuSources = await loadP2MenuSources(MODULE);
  const needs = buildP2NeedsFile({ menu, sources: menuSources.sources, grants: menuSources.grants, processes: menuSources.processes, now });
  const needsGate = validateP2Needs(needs, menu, menuSources.sources, menuSources.grants);
  if (!needsGate.ok) throw new Error(formatP2NeedsGate(needsGate.issues));
  seed(host, fileInfoFromDisplay(PROJECT, CURRENT_NEEDS)!, json(needs), 'current');
  await writePoolMessage(MODULE, buildP2NeedsMessage({ file: needs, received: CURRENT_RECEIVED }), now);

  const entry = await executeP1Entry({ kind: 'hand', moduleName: MODULE }, now);
  if ('refusal' in entry) throw new Error(entry.refusal);
  const plan = await executeP1Plan(MODULE, now);
  const effort = buildP2EffortFile({ menu, backend: parseP2BackendFile(JSON.parse(json(plan.backend))), now });
  const effortGate = validateP2Effort(effort, menu, { screenStatusFromAction: true });
  if (!effortGate.ok) throw new Error(formatP2EffortGate(effortGate.issues));
  seed(host, fileInfoFromDisplay(PROJECT, HEAD_EFFORT)!, json(effort), 'current');

  const identity = { project: PROJECT, module: MODULE };
  const bundle = await readD2InputBundle(identity);
  const snapshot = await buildD2InputSnapshot(identity, bundle.artifacts, null);
  await writeAcceptedD2Input(identity, snapshot);
  const contracts = await generateD2Contracts(identity, snapshot, bundle.artifacts);

  const written = (logical: string): string => {
    const content = host.files[fileKey(fileInfoFromDisplay(PROJECT, logical)!)]?.content;
    if (typeof content !== 'string') throw new Error(`producers wrote no ${logical}.`);
    return content;
  };
  return {
    [CURRENT_NEEDS]: json(needs),
    [HEAD_BACKEND]: written(HEAD_BACKEND),
    [HEAD_EFFORT]: json(effort),
    [CURRENT_PLANNER]: written(CURRENT_PLANNER),
    ...Object.fromEntries(contracts.manifest.units.map(unit => [unit.artifactPath, written(unit.artifactPath)])),
  };
}
