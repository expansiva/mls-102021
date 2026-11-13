/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/catalog75/agentM12Catalog.ts" enhancement="_blank"/>

// Writes one assistant catalog at the end of a whole-module materialization, and on its own over a module
// already generated. Call: @@agentM12Catalog {"project":<current>,"module":"<module>","scope":"","target":"","force":false}

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { asArray, asRecord, asString } from '/_102020_/l2/helpers/assistantCatalog/asCatalog.js';
import { extractExportedObject } from '/_102020_/l2/helpers/assistantCatalog/asSource.js';
import { M12_CATALOG_AGENT_NAME, clip, errorText, parseM12StepInvocation, type M12RunArgs } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';
import { updateM12Status } from '/_102021_/l2/agentMaterializeL1/helpers/m12Intents.js';
import { writeSource } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import type { M12Context } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { assistantCatalogFile, fileRef, projectJsonFile, type M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { loadRun } from '/_102021_/l2/agentMaterializeL1/helpers/m12Phase.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { buildAssistantCatalog } from '/_102021_/l2/agentMaterializeL1/steps/catalog75/assistantCatalogBuild.js';

export function createAgent(): IAgentAsync {
  return { agentName: M12_CATALOG_AGENT_NAME, agentProject: 102021, agentFolder: 'agentMaterializeL1/steps/catalog75', agentDescription: 'Emit the assistant catalog of one module', visibility: 'public', beforePromptStep };
}

/** Drops an optional @@agentM12Catalog prefix so the same JSON the planned step carries also works alone. */
export function catalogStepArgs(value: string): string {
  return String(value || '').replace(/^\s*@@\s*(?:_102021_\/l2\/agentMaterializeL1\/steps\/catalog75\/)?agentM12Catalog(?:\s+|$)/iu, '').trim();
}

function defsIn(project: number, level: number, folder: string): M12FileInfo[] {
  const files = Object.values(mls.stor.files) as Array<M12FileInfo & { status?: string }>;
  return files
    .filter(file => file && file.project === project && file.level === level && file.folder === folder && file.extension === '.defs.ts' && file.status !== 'deleted' && file.shortName)
    .map(file => ({ project: file.project, level: file.level, folder: file.folder, shortName: file.shortName, extension: file.extension }))
    .sort((left, right) => left.shortName < right.shortName ? -1 : left.shortName > right.shortName ? 1 : 0);
}

async function readTexts(ctx: M12Context, files: readonly M12FileInfo[]): Promise<string[]> {
  const out: string[] = [];
  for (const file of files) {
    const text = await ctx.read(fileRef(file));
    if (text) out.push(text);
  }
  return out;
}

function unitTexts(units: readonly M12Unit[], folder: string): string[] {
  return units
    .filter(unit => unit.def.folder === folder)
    .sort((left, right) => left.def.shortName < right.def.shortName ? -1 : left.def.shortName > right.def.shortName ? 1 : 0)
    .map(unit => unit.text);
}

function routeKeysOf(projectText: string, moduleName: string): string[] {
  let parsed: unknown;
  try { parsed = JSON.parse(projectText || '{}'); } catch { return []; }
  const node = asArray(asRecord(parsed).modules).map(item => asRecord(item)).find(item => asString(item.moduleName) === moduleName);
  return asArray(asRecord(node?.backend).routeKeys).map(asString).filter(Boolean);
}

async function journeyTexts(ctx: M12Context, project: number, moduleName: string): Promise<string[]> {
  const folder = `${moduleName}/journeys`;
  const files = defsIn(project, 4, folder).filter(file => file.shortName !== 'index');
  const indexText = await ctx.read(fileRef({ project, level: 4, folder, shortName: 'index', extension: '.defs.ts' }));
  const ordered = indexText
    ? asArray(asRecord(extractExportedObject(indexText)).journeys).map(item => asString(asRecord(item).journeyId)).filter(Boolean)
    : [];
  const ids = files.map(file => file.shortName);
  const ranked = [...ordered.filter(id => ids.includes(id)), ...ids.filter(id => !ordered.includes(id))];
  const byName = new Map(files.map(file => [file.shortName, file]));
  return readTexts(ctx, ranked.map(id => byName.get(id)).filter((file): file is M12FileInfo => Boolean(file)));
}

/** Reads the module and writes its catalog. Returns the trace. The only write is assistantCatalog.ts. */
export async function emitAssistantCatalog(run: M12RunArgs): Promise<string> {
  const { ctx } = await loadRun(run);
  const { project, module: moduleName } = run;
  const projectText = await ctx.read(fileRef(projectJsonFile(project))) ?? '';
  const config = await ctx.read(fileRef({ project, level: 5, folder: '', shortName: 'config', extension: '.json' })) ?? '';
  const l2 = (folder: string) => readTexts(ctx, defsIn(project, 2, `${moduleName}/web/${folder}`));
  const { text, catalog } = buildAssistantCatalog({
    project: String(project),
    module: moduleName,
    routeKeys: routeKeysOf(projectText, moduleName),
    requests: unitTexts(ctx.units, `${moduleName}/layer_2_application/requests`),
    contracts: await l2('contracts'),
    ontology: await readTexts(ctx, defsIn(project, 4, `${moduleName}/ontology`)),
    usecases: unitTexts(ctx.units, `${moduleName}/layer_2_application/usecases`),
    journeys: await journeyTexts(ctx, project, moduleName),
    integration: await ctx.read(fileRef({ project, level: 4, folder: moduleName, shortName: 'integration', extension: '.defs.ts' })),
    workflows: await ctx.read(fileRef({ project, level: 4, folder: moduleName, shortName: 'workflows', extension: '.defs.ts' })),
    workflowOperations: unitTexts(ctx.units, `${moduleName}/layer_2_application/workflows`),
    sharedPages: await l2('shared'),
    config,
  });
  const info = assistantCatalogFile(project, moduleName);
  await writeSource(info, text);
  return `catalog: ${fileRef(info)} commands=${catalog.commands.length} queries=${catalog.queries.length}`;
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const run = parseM12StepInvocation(catalogStepArgs(args || step.prompt || ''), Number(mls.actualProject || 0));
  if (run.kind === 'refusal') return [updateM12Status(context, parentStep, step, hookSequential, 'failed', run.diagnostic)];
  try {
    const trace = await emitAssistantCatalog(run);
    return [updateM12Status(context, parentStep, step, hookSequential, 'completed', clip(trace, 3000))];
  } catch (error) {
    return [updateM12Status(context, parentStep, step, hookSequential, 'failed', clip(errorText(error)))];
  }
}
