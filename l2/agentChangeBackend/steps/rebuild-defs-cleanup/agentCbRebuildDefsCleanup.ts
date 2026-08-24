/// <mls fileReference="_102021_/l2/agentChangeBackend/steps/rebuild-defs-cleanup/agentCbRebuildDefsCleanup.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Terminal cleanup for the `/rebuild defs` CLI command only (no LLM). Mirrors the changeFrontend
// rebuild-defs-cleanup: after the gen-* steps regenerated every l1 `.defs.ts`, this soft-deletes the
// DERIVED backend artifacts (materialized `.ts`: domain/port/adapter/table/usecase/controller +
// seeds.ts + registerRepositories.ts + the l1 contract mirror `.ts`/`.d.ts`) so the module's l1 tree
// keeps ONLY the `.defs.ts` source of truth. A later `/rebuild all` re-materializes the `.ts` from the
// fresh defs. This closes the "stale .ts masks a worker bug" class (runs c–h) — see B2.
//
// Runs at the END of the defs-only path (gen-http routes here when cliCommand === 'rebuild-defs',
// skipping cb-materialize / cb-gen-seeds / cb-seed-assets / cb-register / cb-validate-all — NONE of
// those materialize in defs-only). Deletion is a soft-delete (status='deleted', recoverable from the
// collab-fs trash), scoped to the run's modules and to level-1 non-`.defs.ts` files.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { deleteFile } from '/_102027_/l2/libStor.js';
import { enqueueNext, createUpdateStatusIntent, logPrefix } from '/_102021_/l2/agentChangeBackend/helpers/cbShared.js';
import { isGeneratedBackendFolder, listBackendL1ArchiveKeys } from '/_102021_/l2/agentChangeBackend/helpers/cbArchive.js';

const AGENT_NAME = 'agentCbRebuildDefsCleanup';
const MAX_TRACE_PATHS = 60;
// Everything under l1/<module>/ that is NOT the .defs.ts source of truth is a derived materialization.
const DERIVED_EXTENSIONS = new Set(['.ts', '.test.ts', '.d.ts']);

interface CleanupArgs { modules: string[]; }

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102021,
    agentFolder: 'agentChangeBackend/steps/rebuild-defs-cleanup',
    agentDescription: 'Soft-delete derived l1 .ts after a /rebuild defs, keeping only .defs.ts',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const { modules } = parseArgs(step.prompt);
    const project = mls.actualProject || 0;
    const deleted: string[] = [];

    for (const file of Object.values(mls.stor.files) as any[]) {
      if (!file || file.project !== project || file.level !== 1 || file.status === 'deleted') continue;
      const extension = String(file.extension || '');
      if (!DERIVED_EXTENSIONS.has(extension)) continue; // keep .defs.ts (the source of truth)
      const folder = String(file.folder || '');
      if (!isGeneratedBackendFolder(folder, modules)) continue;
      await deleteFile(file);
      deleted.push(`_${project}_/l1/${folder}/${file.shortName}${extension}`);
    }

    const trace = `rebuild-defs: 0 materializados, ${deleted.length} .ts soft-deletados` +
      (deleted.length === 0 ? ' (nada derivado a remover)' : `:\n${summarize(deleted)}`);
    return [
      enqueueNext(context, parentStep, step, 'cb-finalize', 'agentCbFinalizeStatus', 'Finalizar status (defs-only)', {}),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} ${message}`);
    // Best-effort: a cleanup failure must not fail the whole rebuild-defs tree — the defs are already
    // regenerated and the stale .ts are recoverable and re-materializable. Still advance to finalize.
    return [
      enqueueNext(context, parentStep, step, 'cb-finalize', 'agentCbFinalizeStatus', 'Finalizar status (defs-only)', {}),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `REBUILD-DEFS-CLEANUP-SKIPPED: ${message}`),
    ];
  }
}

export { isGeneratedBackendFolder, listBackendL1ArchiveKeys } from '/_102021_/l2/agentChangeBackend/helpers/cbArchive.js';

/** Soft-delete every l1 artifact of the module (defs and derived .ts). Platform trash, never `rm`. */
export async function archiveGeneratedBackendModule(project: number, moduleName: string): Promise<string[]> {
  const keys = listBackendL1ArchiveKeys(mls.stor.files as Record<string, any>, project, moduleName);
  const archived: string[] = [];
  for (const key of keys) {
    const file = (mls.stor.files as Record<string, any>)[key];
    if (!file) continue;
    await deleteFile(file);
    archived.push(key);
  }
  return archived;
}

function summarize(paths: string[]): string {
  if (paths.length <= MAX_TRACE_PATHS) return paths.join('\n');
  return `${paths.slice(0, MAX_TRACE_PATHS).join('\n')}\n…(+${paths.length - MAX_TRACE_PATHS} more)`;
}

function parseArgs(prompt: string | undefined): CleanupArgs {
  const parsed = prompt ? JSON.parse(prompt) as Record<string, unknown> : {};
  const modules = Array.isArray(parsed.modules)
    ? parsed.modules.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  return { modules };
}
