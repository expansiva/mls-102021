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

export interface AcceptedPlanSeed {
  thread: string;
  /** Pool short name of the implement in pool/l1. */
  messageShort: string;
  /** Pool display path (`l4/<module>/pool/l1/<short>.json`). */
  messageFile: string;
  planner: StoredFile;
  message: StoredFile;
}

/**
 * Seeds the state the newRelease leaves after the user accepts the effort: an approved L1 planner
 * trace planned in `estimate`, the accepted `web/*.json` files and one `implement` in pool/l1.
 * `plan` overrides the plan files' bytes; `withMessage: false` leaves pool/l1 empty.
 */
export function seedAcceptedPlan(
  host: TestHost,
  project: number,
  moduleName: string,
  options: { stamp?: string; plannerMode?: 'estimate' | 'implement'; withMessage?: boolean; plan?: Record<string, string> } = {},
): AcceptedPlanSeed {
  const stamp = options.stamp || '20260927100000';
  const thread = `${moduleName}-${stamp}`;
  const artifacts = ['pool/l2/web/menu.json', 'pool/l1/web/needs.json', 'pool/l2/web/backend.json', 'pool/l2/web/effort.json'];
  for (const artifact of artifacts) {
    const parts = artifact.split('/');
    const name = parts.pop() as string;
    seed(host, {
      project, level: 4, folder: `${moduleName}/${parts.join('/')}`, shortName: name.replace(/\.json$/, ''), extension: '.json',
    }, options.plan?.[artifact] ?? `${JSON.stringify({ moduleName, artifact })}\n`);
  }
  const mode = options.plannerMode || 'estimate';
  const planner = seed(host, { project, level: 4, folder: `${moduleName}/pool/l1`, shortName: 'pipeline', extension: '.json' }, `${JSON.stringify({
    schemaVersion: '2026-09-20-p1-pipeline-v1',
    flowId: 'agentPlannerL1',
    moduleName,
    status: 'complete',
    steps: { plan20: { status: 'approved', updatedAt: 'seed', artifactPaths: [`l4/${moduleName}/pool/l2/web/backend.json`] } },
    thread,
    round: 1,
    pool: [
      { at: 'seed', file: `l4/${moduleName}/pool/l1/${stamp}_${thread}_1.json`, from: 'l2', to: 'l1', thread, round: 1, mode, outcome: 'processed' },
    ],
  }, null, 2)}\n`, `planner-${project}`);
  const messageShort = `${stamp.slice(0, 12)}59_${thread}_1`;
  const message = seed(host, { project, level: 4, folder: `${moduleName}/pool/l1`, shortName: messageShort, extension: '.json' }, `${JSON.stringify({
    from: 'l4', to: 'l1', thread, round: 1, mode: 'implement', subject: 'effort accepted', artifacts, body: '',
  }, null, 2)}\n`);
  if (options.withMessage === false) message.status = 'deleted';
  return { thread, messageShort, messageFile: `l4/${moduleName}/pool/l1/${messageShort}.json`, planner, message };
}
