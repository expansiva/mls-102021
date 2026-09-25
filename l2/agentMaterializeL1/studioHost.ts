/// <mls fileReference="_102021_/l2/agentMaterializeL1/studioHost.ts" enhancement="_blank"/>

/**
 * Studio IO. Reads and writes go through the host stor. No node, fs or typescript import.
 * The project mode is the appEnv field of l5/project.json, the same field the server reads.
 */

import { createStorFile } from '/_102027_/l2/libStor.js';
import { parseDefinitionSource, receiptPathFor, type MaterializationReceipt } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import type { MaterializeReadIo } from '/_102021_/l2/agentMaterializeL1/core/io.js';
import type { MaterializeOwnedRemoval, MaterializeStateStore } from '/_102021_/l2/agentMaterializeL1/core/state.js';
import type { PlanUnitInput } from '/_102021_/l2/agentMaterializeL1/planner/plan.js';
import { structureRunners } from '/_102021_/l2/agentMaterializeL1/handlers/structure/runners.js';
import type { MaterializeRunHost } from '/_102021_/l2/agentMaterializeL1/run/execute.js';

interface StorFile {
  project?: number;
  level?: number;
  folder?: string;
  shortName?: string;
  extension?: string;
  status?: string;
  getContent?: () => Promise<unknown>;
  getValueInfo?: () => Promise<{ content?: unknown }>;
}

interface FileRef {
  project: number;
  level: number;
  folder: string;
  shortName: string;
  extension: string;
}

export async function loadStudioUnits(project: number, moduleName: string): Promise<PlanUnitInput[]> {
  const units: PlanUnitInput[] = [];
  for (const stored of Object.values(files())) {
    if (stored.project !== project || stored.extension !== '.defs.ts' || !stored.shortName) continue;
    const folder = stored.folder || '';
    if (!folder.split('/').includes(moduleName)) continue;
    const text = await readStored(stored);
    if (!text) continue;
    const parsed = parseDefinitionSource(text);
    if (!('definition' in parsed)) continue;
    const level = stored.level ?? 1;
    units.push({
      defPath: `_${project}_/l${level}/${folder}/${stored.shortName}.defs.ts`,
      definition: parsed.definition,
    });
  }
  units.sort((left, right) => left.defPath < right.defPath ? -1 : left.defPath > right.defPath ? 1 : 0);
  return units;
}

export async function readStudioProfile(project: number): Promise<{ mode: unknown; declared: boolean }> {
  for (const stored of Object.values(files())) {
    if (stored.project !== project || stored.folder !== 'l5' || stored.shortName !== 'project' || stored.extension !== '.json') continue;
    const text = await readStored(stored);
    if (!text) return { mode: undefined, declared: false };
    try {
      const parsed = JSON.parse(text) as { appEnv?: unknown };
      if (typeof parsed.appEnv === 'string' && parsed.appEnv) return { mode: parsed.appEnv, declared: true };
    } catch {
      return { mode: undefined, declared: false };
    }
  }
  return { mode: undefined, declared: false };
}

export function createStudioHost(project: number): MaterializeRunHost {
  const io: MaterializeReadIo = {
    async read(ref: string): Promise<string | null> {
      const file = fileFromRef(project, ref);
      if (!file) return null;
      return readStored(lookup(file));
    },
  };
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
      await writeRef(project, path, `${JSON.stringify(receipt)}\n`);
    },
    async readOwned(outputPath: string): Promise<Uint8Array | null> {
      const text = await io.read(outputPath);
      return text === null ? null : new TextEncoder().encode(text);
    },
    async writeOwned(outputPath: string, body: Uint8Array): Promise<void> {
      await writeRef(project, outputPath, new TextDecoder().decode(body));
    },
    async removeOwned(owned: readonly string[], requested: readonly string[]): Promise<MaterializeOwnedRemoval> {
      const removed: string[] = [];
      const kept: string[] = [];
      for (const path of requested) {
        const file = fileFromRef(project, path);
        if (!owned.includes(path) || path.endsWith('/') || !file) {
          kept.push(path);
          continue;
        }
        const stored = lookup(file);
        if (!stored || stored.status === 'deleted') {
          kept.push(path);
          continue;
        }
        stored.status = 'deleted';
        removed.push(path);
      }
      return { removed, kept };
    },
    async readRevision(defPath: string): Promise<string | null> {
      const receipt = await this.readReceipt(defPath);
      return receipt?.semanticHash ?? null;
    },
  };
  return { io, state, runners: structureRunners };
}

function files(): Record<string, StorFile> {
  const stor = mls.stor as { files?: Record<string, StorFile> };
  return stor.files || {};
}

function lookup(file: FileRef): StorFile | null {
  const key = mls.stor.getKeyToFile(file);
  return (mls.stor.files as Record<string, StorFile>)[key] || null;
}

async function readStored(stored: StorFile | null): Promise<string | null> {
  if (!stored || stored.status === 'deleted') return null;
  if (stored.getValueInfo) {
    try {
      const local = await stored.getValueInfo();
      if (typeof local?.content === 'string') return local.content;
    } catch { /* fall through to getContent */ }
  }
  if (!stored.getContent) return null;
  const content = await stored.getContent();
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object') return `${JSON.stringify(content)}\n`;
  return null;
}

async function writeRef(project: number, ref: string, body: string): Promise<void> {
  const file = fileFromRef(project, ref);
  if (!file) throw new Error(`Refused a write outside the module tree: ${ref}`);
  if (file.shortName.includes('.')) throw new Error(`Refused a file name with an extra dot: ${file.shortName}`);
  const stored = lookup(file);
  if (!stored || stored.status === 'deleted') {
    await createStorFile({ ...file, source: body, status: 'new' }, false, false, false);
    return;
  }
  await mls.stor.localStor.setContent(stored as mls.stor.IFileInfo, { contentType: 'string', content: body });
}

function fileFromRef(project: number, ref: string): FileRef | null {
  if (!ref || ref.includes('..') || ref.includes('\\') || ref.startsWith('/')) return null;
  const qualified = /^_(\d+)_\/l([1-7])\/(.+)$/.exec(ref);
  const local = /^l([1-7])\/(.+)$/.exec(ref);
  const projectId = qualified ? Number(qualified[1]) : project;
  const level = qualified ? Number(qualified[2]) : local ? Number(local[1]) : 0;
  const rest = qualified ? qualified[3] : local ? local[2] : '';
  if (!rest || projectId !== project || !level) return null;
  const slash = rest.lastIndexOf('/');
  const folder = slash >= 0 ? rest.slice(0, slash) : '';
  const filename = slash >= 0 ? rest.slice(slash + 1) : rest;
  const doubled = ['.defs.ts', '.test.ts', '.d.ts'].find(item => filename.endsWith(item));
  const dot = doubled ? filename.length - doubled.length : filename.lastIndexOf('.');
  if (dot <= 0) return null;
  const shortName = filename.slice(0, dot);
  const extension = doubled || filename.slice(dot);
  if (!shortName || shortName.includes('.') || folder.split('/').some(part => !part || part === '.' || part === '..')) return null;
  return { project, level, folder, shortName, extension };
}
