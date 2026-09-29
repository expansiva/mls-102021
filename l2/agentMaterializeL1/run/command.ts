/// <mls fileReference="_102021_/l2/agentMaterializeL1/run/command.ts" enhancement="_blank"/>

/**
 * Command of the Studio entry.
 * Omitted stage means simulate: no model call and no write.
 * A flow that matches nothing is a refusal. The parser does not ask which file to open.
 */

import { isRecord } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { M1_CEILING, type BudgetRequest } from '/_102021_/l2/agentMaterializeL1/run/budget.js';

export const M1_ENTRY_STAGES = ['simulate', 'structure', 'implement', 'verify'] as const;
export type M1EntryStage = typeof M1_ENTRY_STAGES[number];

export const M1_AGENT_NAME = 'agentMaterializeL1';

export interface MaterializeCommand {
  help: boolean;
  refusal: string;
  project: number;
  moduleName: string;
  /** Null means the safe default, simulate, unless resume loads a ledger stage. */
  stage: M1EntryStage | null;
  flow: string;
  resume: boolean;
  budget: BudgetRequest | null;
}

export function emptyCommand(): MaterializeCommand {
  return {
    help: false,
    refusal: '',
    project: 0,
    moduleName: '',
    stage: null,
    flow: '',
    resume: false,
    budget: null,
  };
}

export function helpText(project: number): string {
  const projectNote = project > 0 ? `Current project: ${project}.` : 'Project comes from the host.';
  return [
    'agentMaterializeL1 materializes one module from its defs.',
    'The agent runs in the Studio browser: one plan, one snapshot and one receipt.',
    projectNote,
    '',
    'Studio:',
    '  @@agentMaterializeL1 /help',
    '  @@agentMaterializeL1 <module> /simulate',
    '  @@agentMaterializeL1 <module> /structure',
    '  @@agentMaterializeL1 <module> /implement',
    '  @@agentMaterializeL1 <module> /verify',
    '  @@agentMaterializeL1 <module> /resume',
    '  Add flow:<id> to select one flow and the defs it depends on. An unknown flow is refused. The agent does not ask which file to open.',
    '',
    'Defaults:',
    '  stage simulate — no model call and no write.',
    `  workers ${M1_CEILING.maxWorkers}, call timeout ${M1_CEILING.timeoutMs}ms, ${M1_CEILING.repairsPerArtifact} repair per artifact, ${M1_CEILING.repairsPerRun} repairs and ${M1_CEILING.callsPerRun} model calls per run.`,
    '  A stored or requested budget that is tighter wins. These ceilings are not raised.',
    '  Profile is appEnv in the project l5/project.json. Absent means presentation, not production.',
    '  development and presentation name DATABASE_URL_TEST and never fall back to DATABASE_URL.',
    '  production and homologation do not run stubs, synthetic seeds or a reset.',
    '  Receipts go to l1/<module>/materialization/agentMaterializeL1.',
  ].join('\n');
}

export function parseStudioPrompt(prompt: string, project: number): MaterializeCommand {
  const command = emptyCommand();
  command.project = project > 0 ? project : 0;
  let raw = String(prompt || '');
  raw = raw.replace(/@@\s*_102021_\/l2\/agentMaterializeL1/gi, ' ');
  raw = raw.replace(/@@\s*_102021_agentMaterializeL1/gi, ' ');
  raw = raw.replace(/@@\s*agentMaterializeL1/gi, ' ');
  if (raw.includes('..')) {
    command.refusal = "Path must not contain '..'.";
    return command;
  }
  const tokens = raw.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const flags = tokens.filter(token => token.startsWith('/'));
  const words = tokens.filter(token => !token.startsWith('/') && !token.toLowerCase().startsWith('flow:'));
  const flowToken = tokens.find(token => token.toLowerCase().startsWith('flow:'));
  if (flowToken) {
    const flow = flowToken.slice('flow:'.length);
    if (!flowTokenOk(flow)) {
      command.refusal = 'Flow id must be a single token without a path.';
      return command;
    }
    command.flow = flow;
  }
  if (flags.length !== 1) {
    command.refusal = 'Pass one command: /simulate, /structure, /implement, /verify, /resume or /help.';
    return command;
  }
  const name = flags[0].slice(1).toLowerCase();
  if (name === 'help') {
    if (words.length > 0) {
      command.refusal = `Unexpected argument: ${words[0]}.`;
      return command;
    }
    command.help = true;
    return command;
  }
  if (words.length !== 1) {
    command.refusal = words.length === 0
      ? 'Pass @@agentMaterializeL1 <lowerCamel> /simulate, /structure, /implement, /verify or /resume.'
      : `Unexpected argument: ${words[1]}.`;
    return command;
  }
  if (!moduleTokenOk(words[0])) {
    command.refusal = 'Module name must be lowerCamel (example: stockControl).';
    return command;
  }
  command.moduleName = words[0];
  if (name === 'resume') {
    command.resume = true;
    return command;
  }
  if (!isStage(name)) {
    command.refusal = `Unknown command: /${name}.`;
    return command;
  }
  command.stage = name;
  if (!command.project) {
    command.refusal = 'Project identity is missing.';
    return command;
  }
  return command;
}

/** The matched defs plus every selected def they depend on. The rest of the module stays out. */
export function unitsForFlow(units: readonly PlanUnitInput[], flow: string): PlanUnitInput[] {
  if (!flow) return [...units];
  const byPath = new Map(units.map(unit => [unit.defPath, unit]));
  const chosen = new Map<string, PlanUnitInput>();
  const pending = units.filter(unit => matchesFlow(unit, flow));
  for (const unit of pending) chosen.set(unit.defPath, unit);
  for (let index = 0; index < pending.length; index += 1) {
    const definition = pending[index].definition;
    const raw = isRecord(definition) ? definition : {};
    const dependencies = Array.isArray(raw.dependencies) ? raw.dependencies : [];
    for (const dep of dependencies) {
      if (typeof dep !== 'string' || chosen.has(dep)) continue;
      const found = byPath.get(dep);
      if (!found) continue;
      chosen.set(dep, found);
      pending.push(found);
    }
  }
  return [...chosen.values()].sort((left, right) => left.defPath < right.defPath ? -1 : left.defPath > right.defPath ? 1 : 0);
}

export function matchesFlow(unit: PlanUnitInput, flow: string): boolean {
  if (!flow) return true;
  const raw = isRecord(unit.definition) ? unit.definition : {};
  const data = isRecord(raw.data) ? raw.data : {};
  if (raw.artifactId === flow) return true;
  if (data.pageId === flow || data.usecaseId === flow || data.entityId === flow) return true;
  return unit.defPath.endsWith(`/${flow}.defs.ts`);
}

export function moduleTokenOk(value: string): boolean {
  return /^[a-z][A-Za-z0-9]*$/.test(value);
}

function flowTokenOk(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_]*$/.test(value) && !value.includes('/') && !value.includes('..');
}

function isStage(value: string): value is M1EntryStage {
  return (M1_ENTRY_STAGES as readonly string[]).includes(value);
}
