/// <mls fileReference="_102021_/l1/agentMaterializeL1/localState.ts" enhancement="_blank"/>

/**
 * Local disk adapter for the frozen state port. The state, writer and project-lock protocol
 * is the l2 one shared with Studio (state/localBindings.ts, m1_32). This file adds only the
 * proof seams, which read the process environment.
 * One file rename is atomic. Studio stor has no compare-and-swap. This adapter does not pretend it does.
 *
 * M1_CRASH_AFTER and M1_TOUCH_REF are proof seams. Unset, they do nothing.
 */

import type { MaterializeReadIo } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import type { MaterializeStateStore } from '/_102021_/l2/agentMaterializeL1/core/state.js';
import type { MaterializeWriter } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import { createLocalBindings as sharedBindings, type LocalFiles, type LocalProjectLock } from '/_102021_/l2/agentMaterializeL1/state/localBindings.js';
import type { WriteBoundary } from '/_102021_/l2/agentMaterializeL1/state/maintain.js';

export type { LocalFiles };

export function createLocalBindings(io: MaterializeReadIo, files: LocalFiles): {
  state: MaterializeStateStore;
  writer: MaterializeWriter;
  projectLock: LocalProjectLock;
  onBoundary: (boundary: WriteBoundary) => Promise<void>;
} {
  return { ...sharedBindings(io, files), onBoundary: boundary => applyProofSeam(files, boundary) };
}

async function applyProofSeam(files: LocalFiles, boundary: WriteBoundary): Promise<void> {
  const touch = process.env.M1_TOUCH_REF;
  if (boundary === 'before-promote' && touch) {
    const current = await files.read(touch);
    if (current !== null) await files.write(touch, `${current}\n/* touched */\n`);
  }
  if (process.env.M1_CRASH_AFTER === boundary) {
    throw new Error(`M1_CRASH_AFTER ${boundary}`);
  }
}
