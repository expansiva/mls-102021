/// <mls fileReference="_102021_/l2/agentMaterializeL1/state/localBindings.ts" enhancement="_blank"/>

/**
 * One state, writer and project-lock protocol for every host (m1_32). The host gives the
 * `LocalFiles` port: the CLI over node fs, the Studio over the stor. No node import here.
 * Output, receipt and definition status are separate writes: a crash between them must not
 * leave status generated without the output.
 *
 * The writer and the lock are files. `claim` creates the file only when it is absent,
 * `release` removes it only when this holder wrote it. A file left by an interrupted run is
 * not removed by the next run: the refusal names the file and its holder (`busyDetail` in state/maintain.ts).
 * The stor has no compare-and-swap, so two Studio processes racing the same absent file are
 * not serialized. The CLI create is exclusive on disk.
 */

import type { MaterializationReceipt } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { receiptPathFor } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import type { MaterializeReadIo } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import type { MaterializeOwnedRemoval, MaterializeStateStore } from '/_102021_/l2/agentMaterializeL1/core/state.js';
import { projectLockRef } from '/_102021_/l2/agentMaterializeL1/register/reconcileL5.js';
import {
  lockHolder,
  M1_WRITER_SCHEMA,
  parseWriterRecord,
  selectRemoval,
  writerRef,
} from '/_102021_/l2/agentMaterializeL1/state/maintain.js';

export interface LocalFiles {
  read(ref: string): Promise<string | null>;
  write(ref: string, body: string): Promise<void>;
  remove(ref: string): Promise<boolean>;
  /** True when this call created the file. False when it already existed. */
  createExclusive(ref: string, body: string): Promise<boolean>;
}

export interface LocalWriter {
  claim(moduleName: string, holder: string): Promise<boolean>;
  release(moduleName: string, holder: string): Promise<void>;
}

export interface LocalProjectLock {
  claim(projectId: number, holder: string): Promise<boolean>;
  release(projectId: number, holder: string): Promise<void>;
}

export function createLocalBindings(io: MaterializeReadIo, files: LocalFiles): {
  state: MaterializeStateStore;
  writer: LocalWriter;
  projectLock: LocalProjectLock;
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
  const writer: LocalWriter = {
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
  const projectLock: LocalProjectLock = {
    claim: (projectId, holder) => files.createExclusive(projectLockRef(projectId), `${JSON.stringify({ holder })}\n`),
    async release(projectId: number, holder: string): Promise<void> {
      if (lockHolder(await files.read(projectLockRef(projectId))) !== holder) return;
      await files.remove(projectLockRef(projectId));
    },
  };
  return { state, writer, projectLock };
}
