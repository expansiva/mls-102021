/// <mls fileReference="_102021_/l1/agentMaterializeL1/testing/nodeAdapter.ts" enhancement="_blank"/>

/**
 * Node read port for the scenario catalog. Read only. A database URL is not a file.
 * The monitor catalog stays in l2 and does not import this module.
 */

import { readFile } from 'node:fs/promises';

import type { MaterializeReadIo } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import { verifyBatch, type MaterializeVerificationRequest, type M1Checkpoint } from '/_102021_/l2/agentMaterializeL1/testing/verify.js';

const DATABASE_URL = /^(postgres|postgresql|mysql|mongodb):\/\//i;

export function nodeReadIo(): MaterializeReadIo {
  return {
    async read(ref: string): Promise<string | null> {
      if (!ref || ref.includes('..') || ref.includes('DATABASE_URL') || DATABASE_URL.test(ref)) return null;
      try {
        return await readFile(ref, 'utf8');
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'ENOENT' || code === 'EISDIR' || code === 'ENOTDIR') return null;
        throw error;
      }
    },
  };
}

export async function verifyCatalogFile(
  input: Omit<MaterializeVerificationRequest, 'io' | 'catalogRef'> & { catalogPath: string; io?: MaterializeReadIo },
): Promise<M1Checkpoint> {
  const io = input.io ?? nodeReadIo();
  return verifyBatch({
    handler: input.handler,
    io,
    catalogRef: input.catalogPath,
    observations: input.observations,
    runId: input.runId,
    commit: input.commit,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    monitorError: input.monitorError,
  });
}
