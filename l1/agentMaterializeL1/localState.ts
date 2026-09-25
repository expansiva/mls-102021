/// <mls fileReference="_102021_/l1/agentMaterializeL1/localState.ts" enhancement="_blank"/>

/**
 * Local disk adapter for the frozen state port.
 * One file rename is atomic. Output, receipt and definition status are separate
 * writes: a crash between them must not leave status generated without the output.
 * Studio stor has no compare-and-swap. This adapter does not pretend it does.
 *
 * M1_CRASH_AFTER and M1_TOUCH_REF are proof seams. Unset, they do nothing.
 */

import type { MaterializationReceipt } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { receiptPathFor } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import type { MaterializeReadIo } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import type { MaterializeOwnedRemoval, MaterializeStateStore } from '/_102021_/l2/agentMaterializeL1/core/state.js';
import type { MaterializeWriter } from '/_102021_/l2/agentMaterializeL1/run/execute.js';
import {
  M1_WRITER_SCHEMA,
  parseWriterRecord,
  selectRemoval,
  writerRef,
  type WriteBoundary,
} from '/_102021_/l2/agentMaterializeL1/state/maintain.js';

export interface LocalFiles {
  read(ref: string): Promise<string | null>;
  write(ref: string, body: string): Promise<void>;
  remove(ref: string): Promise<boolean>;
  /** True when this call created the file. False when it already existed. */
  createExclusive(ref: string, body: string): Promise<boolean>;
}

export function createLocalBindings(io: MaterializeReadIo, files: LocalFiles): {
  state: MaterializeStateStore;
  writer: MaterializeWriter;
  onBoundary: (boundary: WriteBoundary) => Promise<void>;
} {
  const state: MaterializeStateStore = {
    async readReceipt(defPath: string): Promise<MaterializationReceipt | null> {
      const path = receiptPathFor(defPath);
      if (!path) return null;
      const text = await io.read(path);
      if (!text) return null;
      try {
        return JSON.parse(text) as MaterializationReceipt;
      } catch {
        return null;
      }
    },
    async writeReceipt(receipt: MaterializationReceipt): Promise<void> {
      const path = receiptPathFor(receipt.defPath);
      if (!path) throw new Error('Receipt path is empty.');
      await files.write(path, `${JSON.stringify(receipt)}\n`);
    },
    async readOwned(outputPath: string): Promise<Uint8Array | null> {
      const text = await io.read(outputPath);
      return text === null ? null : new TextEncoder().encode(text);
    },
    async writeOwned(outputPath: string, body: Uint8Array): Promise<void> {
      await files.write(outputPath, new TextDecoder().decode(body));
    },
    async removeOwned(owned: readonly string[], requested: readonly string[]): Promise<MaterializeOwnedRemoval> {
      const plan = selectRemoval(owned, requested);
      const removed: string[] = [];
      const kept = [...plan.keep];
      for (const path of plan.remove) {
        if (await files.remove(path)) removed.push(path);
        else kept.push(path);
      }
      return { removed, kept };
    },
    async readRevision(defPath: string): Promise<string | null> {
      const receipt = await this.readReceipt(defPath);
      return receipt?.semanticHash ?? null;
    },
  };
  const writer: MaterializeWriter = {
    async claim(moduleName: string, holder: string): Promise<boolean> {
      const body = `${JSON.stringify({ schemaVersion: M1_WRITER_SCHEMA, moduleName, holder })}\n`;
      return files.createExclusive(writerRef(moduleName), body);
    },
    async release(moduleName: string, holder: string): Promise<void> {
      const text = await files.read(writerRef(moduleName));
      const record = text ? parseWriterRecord(text) : null;
      if (!record || record.holder !== holder || record.moduleName !== moduleName) return;
      await files.remove(writerRef(moduleName));
    },
  };
  return { state, writer, onBoundary: boundary => applyProofSeam(files, boundary) };
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
