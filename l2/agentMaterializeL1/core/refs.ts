/// <mls fileReference="_102021_/l2/agentMaterializeL1/core/refs.ts" enhancement="_blank"/>

/**
 * Ref policy shared by the CLI and the Studio host: which ref is read and which is written.
 * Reads: the target project or a platform project. Writes: the target project only.
 */

/** Platform projects a run may read. Never written. */
export const PLATFORM_PROJECTS: ReadonlySet<string> = new Set(['102034', '102027']);

export interface ParsedRef {
  projectId: string;
  level: number;
  /** Path under `lN/`, e.g. `project.json` or `moduleName/layer_3_domain/x.ts`. */
  rest: string;
}

/** Qualified `_NNNNN_/lN/...` or local `lN/...` (target project). `..`, `\`, `/` prefix and empty segments are refused. */
export function parseRef(ref: string, project: number): ParsedRef | null {
  if (!ref || ref.includes('..') || ref.includes('\\') || ref.startsWith('/')) return null;
  const qualified = /^_(\d+)_\/l([1-7])\/(.+)$/.exec(ref);
  const local = /^l([1-7])\/(.+)$/.exec(ref);
  if (!qualified && !local) return null;
  const projectId = qualified ? qualified[1] : String(project);
  const level = Number(qualified ? qualified[2] : local![1]);
  const rest = qualified ? qualified[3] : local![2];
  if (rest.split('/').some(part => !part || part === '.' || part === '..')) return null;
  return { projectId, level, rest };
}

export function isPlatformRef(ref: string): boolean {
  const match = /^_(\d+)_\/l[1-7]\//.exec(ref);
  return !!match && PLATFORM_PROJECTS.has(match[1]);
}

export function readable(ref: string, project: number): boolean {
  const parsed = parseRef(ref, project);
  return !!parsed && (parsed.projectId === String(project) || PLATFORM_PROJECTS.has(parsed.projectId));
}

export function writable(ref: string, project: number): boolean {
  const parsed = parseRef(ref, project);
  return !!parsed && parsed.projectId === String(project);
}
