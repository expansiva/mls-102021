/// <mls fileReference="_102021_/l2/agentMaterializeL1/core/state.ts" enhancement="_blank"/>

/**
 * State-store port frozen for m1_08. Simulate accepts only MaterializeStateReader.
 * `running` stays on the receipt stage; it is not a fifth definition status.
 * removeOwned deletes listed files the manifest owns and never a directory.
 */

import type { MaterializationReceipt } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';

export interface MaterializeStateReader {
  readReceipt(defPath: string): Promise<MaterializationReceipt | null>;
}

export interface MaterializeOwnedRemoval {
  removed: string[];
  kept: string[];
}

export interface MaterializeStateStore extends MaterializeStateReader {
  writeReceipt(receipt: MaterializationReceipt): Promise<void>;
  readOwned(outputPath: string): Promise<Uint8Array | null>;
  writeOwned(outputPath: string, body: Uint8Array): Promise<void>;
  removeOwned(owned: readonly string[], requested: readonly string[]): Promise<MaterializeOwnedRemoval>;
  /** Semantic hash last promoted for this def, or null when the store has no revision. */
  readRevision(defPath: string): Promise<string | null>;
}
