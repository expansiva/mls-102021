/// <mls fileReference="_102021_/l2/agentMaterializeL1/run/command.ts" enhancement="_blank"/>

/**
 * One command shape for the CLI and the Studio entry.
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
  outputDir: string;
  /** Empty means the repository root. A set value is the read root for this project only. */
  sourceRoot: string;
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
    outputDir: '',
    sourceRoot: '',
    budget: null,
  };
}

export function helpText(project: number): string {
  const projectNote = project > 0 ? `Current project: ${project}.` : 'Project comes from the host.';
  return [
    'agentMaterializeL1 materializes one module from its defs.',
    'The Studio entry and the CLI share one plan, one snapshot and one receipt.',
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
    'CLI, from the mls-base root:',
    '  tsx mls-102021/l1/agentMaterializeL1/nodejsMaterializeL1.ts --help',
    '  tsx mls-102021/l1/agentMaterializeL1/nodejsMaterializeL1.ts --project <id> --module <lowerCamel> [--stage simulate|structure|implement|verify] [--flow <id>] [--resume] [--output <dir>] [--source-root <dir>] [--workers <n>] [--timeout-ms <n>] [--repairs <n>] [--calls <n>]',
    '',
    'Defaults:',
    '  stage simulate — no model call and no write.',
    `  workers ${M1_CEILING.maxWorkers}, call timeout ${M1_CEILING.timeoutMs}ms, ${M1_CEILING.repairsPerArtifact} repair per artifact, ${M1_CEILING.repairsPerRun} repairs and ${M1_CEILING.callsPerRun} model calls per run.`,
    '  A stored or requested budget that is tighter wins. These ceilings are not raised.',
    '  Profile is appEnv in the project l5/project.json. Absent means presentation, not production.',
    '  development and presentation name DATABASE_URL_TEST and never fall back to DATABASE_URL.',
    '  production and homologation do not run stubs, synthetic seeds or a reset.',
    '  Receipts go to l1/<module>/materialization/agentMaterializeL1. --output only relocates that tree.',
    '  --source-root reads defs, l5/project.json and this project\'s sources from that directory. mls-102034 and mls-102027 stay on the repository root. Without it, every read stays on the repository root.',
    '  With --source-root, the scenario catalog is l1/<module>/materialization/agentMaterializeL1/scenarioCatalog.ts under that directory.',
  ].join('\n');
}

export function parseCliArgs(argv: readonly string[]): MaterializeCommand {
  const command = emptyCommand();
  const budget: BudgetRequest = {};
  let sawBudget = false;
  const flags = new Set(['--help', '--project', '--module', '--stage', '--flow', '--resume', '--output', '--source-root', '--workers', '--timeout-ms', '--repairs', '--calls']);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help') {
      command.help = true;
      continue;
    }
    if (token === '--resume') {
      command.resume = true;
      continue;
    }
    if (!token.startsWith('--')) {
      command.refusal = `Unexpected argument: ${token}.`;
      return command;
    }
    if (!flags.has(token)) {
      command.refusal = `Unknown flag: ${token}.`;
      return command;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      command.refusal = `Missing value for ${token}.`;
      return command;
    }
    index += 1;
    if (token === '--project') {
      if (!/^\d+$/.test(value) || Number(value) <= 0) {
        command.refusal = 'Project must be a positive id.';
        return command;
      }
      command.project = Number(value);
    } else if (token === '--module') {
      if (!moduleTokenOk(value)) {
        command.refusal = 'Module name must be lowerCamel (example: stockControl).';
        return command;
      }
      command.moduleName = value;
    } else if (token === '--stage') {
      if (!isStage(value)) {
        command.refusal = 'Stage must be simulate, structure, implement or verify.';
        return command;
      }
      command.stage = value;
    } else if (token === '--flow') {
      if (!flowTokenOk(value)) {
        command.refusal = 'Flow id must be a single token without a path.';
        return command;
      }
      command.flow = value;
    } else if (token === '--output') {
      if (!value || value.includes('..') || value.startsWith('-')) {
        command.refusal = 'Output directory must not contain .. .';
        return command;
      }
      command.outputDir = value;
    } else if (token === '--source-root') {
      if (!value || value.includes('..') || value.startsWith('-')) {
        command.refusal = 'Source root must not contain .. .';
        return command;
      }
      command.sourceRoot = value;
    } else if (token === '--workers') {
      const parsed = positive(value);
      if (parsed === null) {
        command.refusal = 'Workers must be a positive integer.';
        return command;
      }
      budget.maxWorkers = parsed;
      sawBudget = true;
    } else if (token === '--timeout-ms') {
      const parsed = positive(value);
      if (parsed === null) {
        command.refusal = 'Timeout must be a positive number of milliseconds.';
        return command;
      }
      budget.timeoutMs = parsed;
      sawBudget = true;
    } else if (token === '--repairs') {
      const parsed = positive(value);
      if (parsed === null) {
        command.refusal = 'Repairs must be a positive integer.';
        return command;
      }
      budget.repairsPerRun = parsed;
      sawBudget = true;
    } else if (token === '--calls') {
      const parsed = positive(value);
      if (parsed === null) {
        command.refusal = 'Calls must be a positive integer.';
        return command;
      }
      budget.callsPerRun = parsed;
      sawBudget = true;
    }
  }
  if (command.help) return command;
  if (!command.project) {
    command.refusal = 'Pass --project <id>.';
    return command;
  }
  if (!command.moduleName) {
    command.refusal = 'Pass --module <lowerCamel>.';
    return command;
  }
  command.budget = sawBudget ? budget : null;
  return command;
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

function positive(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return parsed;
}
