/// <mls fileReference="_102021_/l2/agentDefsL1/helpers/d1TestHost.ts" enhancement="_blank"/>

import type { D1FileInfo } from '/_102021_/l2/agentDefsL1/helpers/d1Core.js';

export interface StoredFile {
  project: number;
  level: number;
  folder: string;
  shortName: string;
  extension: string;
  status: string;
  versionRef: string;
  content: string;
  updatedAt: string;
  getValueInfo: () => Promise<{ content: string }>;
  getContent: () => Promise<string>;
}

export interface TestHost {
  files: Record<string, StoredFile>;
  writes: string[];
  setProject: (project: number) => void;
}

export function fileKey(info: { project: number; level: number; folder: string; shortName: string; extension: string }): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function blankFile(params: { project: number; level: number; folder: string; shortName: string; extension: string; status?: string }): StoredFile {
  const file: StoredFile = {
    project: params.project,
    level: params.level,
    folder: params.folder,
    shortName: params.shortName,
    extension: params.extension,
    status: params.status || 'new',
    versionRef: '0',
    content: '',
    updatedAt: 'created',
    getValueInfo: async () => ({ content: file.content }),
    getContent: async () => file.content,
  };
  return file;
}

export function installStudio(project: number): TestHost {
  const files: Record<string, StoredFile> = {};
  const writes: string[] = [];
  const host: TestHost = {
    files,
    writes,
    setProject(next: number) {
      (globalThis as { mls: { actualProject: number } }).mls.actualProject = next;
    },
  };
  (globalThis as { mls: unknown }).mls = {
    actualProject: project,
    events: { addEventListener() {}, removeEventListener() {}, dispatch() {} },
    stor: {
      files,
      getKeyToFile: fileKey,
      addOrUpdateFile: async (params: StoredFile) => {
        const file = blankFile(params);
        files[fileKey(file)] = file;
        return file;
      },
      localStor: {
        setContent: async (file: StoredFile, value: { content?: string | null }) => {
          file.content = value.content || '';
          file.updatedAt = 'written';
          writes.push(fileKey(file));
          return true;
        },
        deleteFile(file: StoredFile) {
          file.status = 'deleted';
          file.updatedAt = 'deleted';
        },
      },
    },
  };
  return host;
}

export function seed(host: TestHost, info: D1FileInfo, content: string, updatedAt = 'seed'): StoredFile {
  const stored = blankFile(info);
  stored.content = content;
  stored.status = 'changed';
  stored.updatedAt = updatedAt;
  host.files[fileKey(stored)] = stored;
  return stored;
}

/** Host stor whose diskPath closes over a private field. Detaching the method throws. */
export class HostStor {
  readonly #base = '/data/mls-base';
  readonly files: Record<string, StoredFile> = {};
  readonly writes: string[] = [];

  getKeyToFile(info: D1FileInfo): string {
    return fileKey(info);
  }

  async addOrUpdateFile(params: D1FileInfo & { status?: string }): Promise<StoredFile> {
    const file = blankFile(params);
    this.files[fileKey(file)] = file;
    return file;
  }

  readonly localStor = {
    setContent: async (file: StoredFile, value: { content?: string | null }) => {
      file.content = value.content || '';
      file.updatedAt = 'written';
      this.writes.push(fileKey(file));
      return true;
    },
    listFolder: (project: number, level: number, folder: string): D1FileInfo[] => {
      return Object.values(this.files)
        .filter(file => file.project === project && file.level === level && file.folder === folder && file.status !== 'deleted')
        .map(file => ({
          project: file.project,
          level: file.level,
          folder: file.folder,
          shortName: file.shortName,
          extension: file.extension,
        }));
    },
    deleteFile: (file: StoredFile) => {
      file.status = 'deleted';
      file.updatedAt = 'deleted';
    },
  };

  diskPath(info: D1FileInfo): string {
    return `${this.#base}/mls-${info.project}/l${info.level}/${info.folder}/${info.shortName}${info.extension}`;
  }
}

export function installClassHost(project: number, host: HostStor): void {
  (globalThis as { mls: unknown }).mls = {
    actualProject: project,
    events: { addEventListener() {}, removeEventListener() {}, dispatch() {} },
    stor: host,
  };
}
