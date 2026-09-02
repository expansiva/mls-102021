/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbProjectTsc.ts" enhancement="_blank"/>

// Pure grouping of `tsc -p tsconfig.backend.json --noEmit` diagnostics so the CB validate-all
// compile gate can use the project compiler when Monaco is absent. No fs, no spawn — the I/O
// lives in cbMaterializeIo. Browser path never calls this: Monaco stays the in-studio compile.

export interface TscDiagnostic {
  project: number;
  folder: string;
  shortName: string;
  code: string;
  message: string;
}

const TSC_ERROR = /(?:^|\s)(?:.*[/\\])?mls-(\d+)[/\\]l1[/\\](.+?)\.ts\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.*)$/u;

export function parseTscDiagnostics(output: string): TscDiagnostic[] {
  const out: TscDiagnostic[] = [];
  for (const raw of output.split(/\r?\n/)) {
    const line = raw.replace(/\u001b\[[0-9;]*m/g, '');
    const match = TSC_ERROR.exec(line);
    if (!match) continue;
    const rest = match[2];
    const slash = rest.lastIndexOf('/');
    if (slash <= 0) continue;
    out.push({
      project: Number(match[1]),
      folder: rest.slice(0, slash),
      shortName: rest.slice(slash + 1),
      code: match[5],
      message: match[6].trim(),
    });
  }
  return out;
}

export function mlsBaseFromDiskPath(abs: string): string | null {
  const normalized = abs.replace(/\\/g, '/');
  const match = /^(.*)\/mls-\d+(?:\/|$)/.exec(normalized);
  return match ? match[1] : null;
}

/** Group tsc errors onto `${folder}::${shortName}`. In-scope files always appear (possibly empty);
 * other l1 files of the same module appear only when they have errors (seeds.ts, dto, …). */
export function groupTscErrorsByFile(
  diagnostics: readonly TscDiagnostic[],
  files: Array<{ folder: string; shortName: string }>,
  project: number,
): Map<string, string[]> {
  const wanted = new Set(files.map(file => `${file.folder}::${file.shortName}`));
  const modulePrefix = files[0] ? `${files[0].folder.split('/')[0]}/` : '';
  const errors = new Map<string, string[]>();
  for (const file of files) errors.set(`${file.folder}::${file.shortName}`, []);
  for (const item of diagnostics) {
    if (item.project !== project) continue;
    const key = `${item.folder}::${item.shortName}`;
    const inModule = modulePrefix !== '' && (item.folder === modulePrefix.slice(0, -1) || item.folder.startsWith(modulePrefix));
    if (!wanted.has(key) && !inModule) continue;
    const list = errors.get(key) ?? [];
    if (list.length < 12) list.push(`${item.code}: ${item.message}`);
    errors.set(key, list);
  }
  for (const [key, list] of [...errors]) {
    if (!wanted.has(key) && list.length === 0) errors.delete(key);
  }
  return errors;
}

export type CompileGatePath = 'monaco' | 'project-tsc' | 'unavailable';

export interface CompileModuleTrace {
  path: CompileGatePath;
  reason?: string;
  rawDiagnostics: number;
  afterFilter: number;
  files: number;
}

export function countGroupedDiagnostics(grouped: Map<string, string[]>): number {
  let n = 0;
  for (const list of grouped.values()) n += list.length;
  return n;
}

export function formatCompileModuleTrace(trace: CompileModuleTrace): string {
  const reason = trace.reason ? ` reason=${trace.reason}` : '';
  return `[cb-compile] path=${trace.path}${reason} files=${trace.files} raw=${trace.rawDiagnostics} afterFilter=${trace.afterFilter}`;
}

/** Instrument the project-tsc path: spawn-null vs parsed vs leftover after the in-module filter. */
export function traceProjectTscResult(
  output: string | null,
  files: Array<{ folder: string; shortName: string }>,
  project: number,
  reasonIfNull: string,
): { grouped: Map<string, string[]> | null; trace: CompileModuleTrace } {
  if (output === null) {
    return {
      grouped: null,
      trace: { path: 'unavailable', reason: reasonIfNull, rawDiagnostics: 0, afterFilter: 0, files: files.length },
    };
  }
  const parsed = parseTscDiagnostics(output);
  const grouped = groupTscErrorsByFile(parsed, files, project);
  return {
    grouped,
    trace: {
      path: 'project-tsc',
      rawDiagnostics: parsed.length,
      afterFilter: countGroupedDiagnostics(grouped),
      files: files.length,
    },
  };
}

export function mergeCompileTargets(
  inScope: Array<{ folder: string; shortName: string; real: string }>,
  compiled: Map<string, string[]>,
): Array<{ folder: string; shortName: string; real: string }> {
  const seen = new Set(inScope.map(item => `${item.folder}::${item.real}`));
  const extra: Array<{ folder: string; shortName: string; real: string }> = [];
  for (const key of compiled.keys()) {
    if (seen.has(key)) continue;
    const sep = key.indexOf('::');
    if (sep <= 0) continue;
    const folder = key.slice(0, sep);
    const real = key.slice(sep + 2);
    if (!real) continue;
    extra.push({ folder, shortName: real.toLowerCase(), real });
  }
  return extra.length ? [...inScope, ...extra] : inScope;
}
