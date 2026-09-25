/// <mls fileReference="_102021_/l2/agentMaterializeL1/handlers/persistence/runners.ts" enhancement="_blank"/>

/**
 * Bodies for the persistence.* handlers. The registry list stays owned by m1_01.
 * A table file and an unapplied migration are separate receipt rows.
 */

import {
  outputPathFromDefPath,
  readDefinition,
} from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { M1_STRUCTURE_HANDLERS } from '/_102021_/l2/agentMaterializeL1/core/registry.js';
import type { HandlerCall, HandlerOutcome, MaterializeHandlerRunner } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import { emitPersistence } from '/_102021_/l2/agentMaterializeL1/handlers/persistence/emitPersistence.js';

export const persistenceRunners: Readonly<Record<string, MaterializeHandlerRunner>> = {
  'persistence.table': call => runPersistence(call),
  'persistence.repositoryAdapter': call => runPersistence(call),
  'persistence.repositoryRegistration': call => runPersistence(call),
  'persistence.persistenceSeeds': call => runPersistence(call),
  'persistence.integrationOutbound': call => runPersistence(call),
};

export function persistenceHandlerIds(): string[] {
  return Object.values(M1_STRUCTURE_HANDLERS).map(item => item.id).filter(id => id.startsWith('persistence.')).sort();
}

export async function runPersistence(call: HandlerCall): Promise<HandlerOutcome> {
  const parsed = readDefinition(call.definition);
  if ('issues' in parsed) return failed('DEFINITION', parsed.issues.join(' '));
  const output = outputPathFromDefPath(call.unit.defPath);
  if (!output) return failed('OUTPUT_PATH', `${call.unit.defPath} has no output file.`);
  const produced = await emitPersistence(call.handler.id, parsed, output, call.read);
  if ('code' in produced) return failed(produced.code, produced.detail);
  const text = produced.source.endsWith('\n') ? produced.source : `${produced.source}\n`;
  return {
    files: { [output]: text },
    observations: [],
    failure: null,
    seeds: produced.seeds,
    resets: false,
    runsStub: produced.runsStub,
    evidences: produced.evidences,
  };
}

function failed(code: string, detail: string): HandlerOutcome {
  return { files: {}, observations: [], failure: { code, detail }, seeds: false, resets: false, runsStub: false };
}
