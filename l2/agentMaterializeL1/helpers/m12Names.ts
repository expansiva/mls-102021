/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Names.ts" enhancement="_blank"/>

// File identities. A ref is `_<project>_/l<level>/<folder>/<shortName><extension>`; the stor key is the parts.

import type { M12Layer } from '/_102021_/l2/agentMaterializeL1/helpers/m12Core.js';

export interface M12FileInfo {
  project: number;
  level: number;
  folder: string;
  shortName: string;
  extension: string;
}

const DOUBLE_EXTENSIONS = ['.defs.ts', '.test.ts', '.d.ts'];

export function fileRef(info: M12FileInfo): string {
  const folder = info.folder ? `${info.folder}/` : '';
  return `_${info.project}_/l${info.level}/${folder}${info.shortName}${info.extension}`;
}

/**
 * The file of a ref. Accepts `_N_/lK/...`, the import form `/_N_/lK/....js` (read as its `.ts`) and a
 * local `lK/...` (the current project). Null for anything else, `..` included.
 */
export function infoOfRef(ref: string, project: number): M12FileInfo | null {
  let value = String(ref || '').trim();
  if (!value || value.includes('..') || value.includes('\\')) return null;
  if (value.startsWith('/_')) {
    value = value.slice(1);
    if (value.endsWith('.defs.js')) value = `${value.slice(0, -'.defs.js'.length)}.defs.ts`;
    else if (value.endsWith('.js')) value = `${value.slice(0, -3)}.ts`;
  }
  const qualified = /^_(\d+)_\/l([1-7])\/(.+)$/u.exec(value);
  const local = /^l([1-7])\/(.+)$/u.exec(value);
  if (!qualified && !local) return null;
  const projectId = qualified ? Number(qualified[1]) : project;
  const level = Number(qualified ? qualified[2] : local![1]);
  const rest = qualified ? qualified[3] : local![2];
  if (rest.split('/').some(part => !part || part === '.')) return null;
  const slash = rest.lastIndexOf('/');
  const folder = slash >= 0 ? rest.slice(0, slash) : '';
  const filename = slash >= 0 ? rest.slice(slash + 1) : rest;
  const doubled = DOUBLE_EXTENSIONS.find(item => filename.endsWith(item));
  const dot = doubled ? filename.length - doubled.length : filename.lastIndexOf('.');
  if (dot <= 0) return null;
  const shortName = filename.slice(0, dot);
  const extension = doubled || filename.slice(dot);
  if (shortName.includes('.') && !(level === 5 && shortName === 'runtime.project')) return null;
  return { project: projectId, level, folder, shortName, extension };
}

/** The `.ts` a def materializes into: same folder, same name. */
export function outputOfDef(def: M12FileInfo): M12FileInfo {
  return { ...def, extension: '.ts' };
}

/** The def of a `.defs.ts` or of the `.ts` generated from it. */
export function defOfRef(ref: string, project: number): M12FileInfo | null {
  const info = infoOfRef(ref, project);
  if (!info || info.level !== 1) return null;
  if (info.extension === '.defs.ts') return info;
  if (info.extension === '.ts') return { ...info, extension: '.defs.ts' };
  return null;
}

/** Folder of this agent's run files inside the module. */
export function runFolder(moduleName: string): string {
  return `${moduleName}/pipeline/${'agentMaterializeL1'}`;
}

/** One status file per unit and layer: one owner per file (the step or worker of that unit). */
export function unitStatusFile(project: number, moduleName: string, layer: M12Layer, unitId: string): M12FileInfo {
  return { project, level: 1, folder: `${runFolder(moduleName)}/${layer}`, shortName: unitId, extension: '.json' };
}

/** Raw model answers and the bytes a unit had before its first attempt. */
export function unitDraftFile(project: number, moduleName: string, layer: M12Layer, unitId: string, part: string): M12FileInfo {
  return { project, level: 1, folder: `${runFolder(moduleName)}/drafts/${layer}`, shortName: `${unitId}_${part}`, extension: '.txt' };
}

export function reportFile(project: number, moduleName: string): M12FileInfo {
  return { project, level: 1, folder: runFolder(moduleName), shortName: 'report', extension: '.json' };
}

/** How the last l5 registration of the module ended (register70 writes, finalize80 reads). */
export function registrationFile(project: number, moduleName: string): M12FileInfo {
  return { project, level: 1, folder: runFolder(moduleName), shortName: 'registration', extension: '.json' };
}

export function projectJsonFile(project: number): M12FileInfo {
  return { project, level: 5, folder: '', shortName: 'project', extension: '.json' };
}

export function rulesFile(project: number, moduleName: string): M12FileInfo {
  return { project, level: 4, folder: moduleName, shortName: 'rules', extension: '.defs.ts' };
}

export function contractFile(project: number, moduleName: string, pageId: string): M12FileInfo {
  return { project, level: 2, folder: `${moduleName}/web/contracts`, shortName: pageId, extension: '.defs.ts' };
}

/** The monitor test file of one page: next to its controller, `pageTests` export (skills/monitorTests.md). */
export function pageTestsFile(project: number, moduleName: string, pageId: string): M12FileInfo {
  return { project, level: 1, folder: `${moduleName}/layer_1_external/adapters/http/controllers`, shortName: pageId, extension: '.test.ts' };
}
