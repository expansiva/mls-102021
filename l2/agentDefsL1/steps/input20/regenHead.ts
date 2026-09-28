/// <mls fileReference="_102021_/l2/agentDefsL1/steps/input20/regenHead.ts" enhancement="_blank"/>

// Regenerates the head fixture's backend.json and effort.json with the real producers, so the
// fixture can be checked instead of hand-made (d1_37). backend: the deterministic repair/stamp of
// agentPlannerL1 plan20 (no model call) over the recorded plan. effort: the pure builder of
// agentPlannerL2 effort40 over that backend and the recorded menu. Test support only: it installs
// the in-memory host. regenHead.test.ts reads the fixture from disk and calls it.

import { installStudio, seed } from '/_102021_/l2/agentDefsL1/helpers/d1TestHost.js';
import { fileInfoFromDisplay } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { loadP1PlanSources } from '/_102021_/l2/agentPlannerL1/steps/plan20/agentP1Plan.js';
import type { P1BackendFile } from '/_102021_/l2/agentPlannerL1/steps/plan20/contracts.js';
import { formatP1BackendGate, repairP1Backend, validateP1Backend } from '/_102021_/l2/agentPlannerL1/steps/plan20/gate.js';
import { buildP2EffortFile, parseP2BackendFile } from '/_102020_/l2/agentPlannerL2/steps/effort40/contracts.js';
import { formatP2EffortGate, validateP2Effort } from '/_102020_/l2/agentPlannerL2/steps/effort40/gate.js';
import type { P2MenuFile } from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';

/** Skip reason for the step agent tests seeded by the head fixture (node:test `{ skip }`). */
export const HEAD_SEED_V11_SKIP = 'd1_37: input20/fixtures/head is a v1.1 snapshot the current producers refuse (P1_BACKEND_PAGE); re-enable after regenerating head with input20/regenHead.ts';

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
