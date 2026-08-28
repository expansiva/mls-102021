/// <mls fileReference="_102021_/l2/agentChangeBackend/helpers/cbLifecycle.ts" enhancement="_blank"/>

// Entity-lifecycle workflows (`l4/<module>/workflows/*.defs.ts`) are not generation owners — the
// scan drops them on purpose. They ARE the declared cycle of an entity: states + fromStates→toState.
// gen-domain used to ask the model for "status transitions" with only the ontology enum, so it
// invented terminals that the matrix does not have; the usecase then called that map and rejected
// a declared pair (pending→completed). Pure helpers so the payload and the gate stay unit-testable
// without the cbShared runtime graph.

export interface CbLifecycleTransition {
  transitionId: string;
  fromStates: string[];
  toState: string;
}

export interface CbEntityLifecycle {
  workflowId: string;
  entityRef: string;
  moduleName: string;
  states: string[];
  initialState: string;
  /** States the l4 file labelled terminal — informational. The matrix is the authority. */
  declaredTerminalStates: string[];
  transitions: CbLifecycleTransition[];
}

/** Compact per-entity payload for gen-domain / gen-usecase. */
export interface CbLifecyclePrompt {
  workflowId: string;
  entityRef: string;
  states: string[];
  initialState: string;
  /** States with NO outgoing edge in `allowed`. Empty = no state is terminal. */
  terminalStates: string[];
  allowed: Record<string, string[]>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(readString).filter(Boolean) : [];
}

/** Same shape `isEntityLifecycle` recognises, plus the transition rows. */
export function parseEntityLifecycle(parsed: Record<string, unknown>, moduleName = ''): CbEntityLifecycle | null {
  const entityRef = readString(parsed.entityRef);
  if (!entityRef || !Array.isArray(parsed.states) || !Array.isArray(parsed.transitions)) return null;
  const states = uniqueSorted(readStringArray(parsed.states));
  const transitions: CbLifecycleTransition[] = [];
  for (const raw of parsed.transitions) {
    if (!isRecord(raw)) continue;
    const toState = readString(raw.toState);
    const fromStates = uniqueSorted(readStringArray(raw.fromStates));
    if (!toState || !fromStates.length) continue;
    transitions.push({
      transitionId: readString(raw.transitionId),
      fromStates,
      toState,
    });
  }
  if (!transitions.length && !states.length) return null;
  return {
    workflowId: readString(parsed.workflowId),
    entityRef,
    moduleName,
    states,
    initialState: readString(parsed.initialState) || states[0] || '',
    declaredTerminalStates: uniqueSorted(readStringArray(parsed.terminalStates)),
    transitions,
  };
}

export function allowedMatrix(lifecycle: CbEntityLifecycle): Record<string, string[]> {
  const map = new Map<string, Set<string>>();
  for (const state of lifecycle.states) map.set(state, new Set());
  for (const t of lifecycle.transitions) {
    if (!map.has(t.toState)) map.set(t.toState, new Set());
    for (const from of t.fromStates) {
      const set = map.get(from) ?? new Set<string>();
      set.add(t.toState);
      map.set(from, set);
    }
  }
  const out: Record<string, string[]> = {};
  for (const [from, tos] of [...map].sort(([a], [b]) => a.localeCompare(b))) {
    out[from] = [...tos].sort();
  }
  return out;
}

export function compactLifecycleForPrompt(lifecycle: CbEntityLifecycle): CbLifecyclePrompt {
  const allowed = allowedMatrix(lifecycle);
  return {
    workflowId: lifecycle.workflowId,
    entityRef: lifecycle.entityRef,
    states: uniqueSorted(lifecycle.states.length ? lifecycle.states : Object.keys(allowed)),
    initialState: lifecycle.initialState,
    terminalStates: Object.entries(allowed).filter(([, tos]) => tos.length === 0).map(([from]) => from).sort(),
    allowed,
  };
}

export function lifecycleForEntity(lifecycles: readonly CbEntityLifecycle[] | undefined, entityId: string): CbLifecyclePrompt | undefined {
  if (!entityId || !lifecycles?.length) return undefined;
  const found = lifecycles.find(lc => lc.entityRef === entityId);
  return found ? compactLifecycleForPrompt(found) : undefined;
}

export function pairKey(from: string, to: string): string {
  return `${from}>${to}`;
}

export function allowedPairs(lifecycle: CbEntityLifecycle): Set<string> {
  const pairs = new Set<string>();
  const matrix = allowedMatrix(lifecycle);
  for (const [from, tos] of Object.entries(matrix)) {
    for (const to of tos) pairs.add(pairKey(from, to));
  }
  return pairs;
}

/**
 * A generated `*_STATUS_TRANSITIONS` map (domain skill) or any `Record<Status, Status[]>` object
 * of that name. The usecase typically only calls `canTransition*`; the pairs live on this map.
 */
export function extractStatusTransitionMap(source: string): Record<string, string[]> | null {
  const marker = /_STATUS_TRANSITIONS(?:\s*:\s*Record<[^>]+>)?\s*=\s*\{/.exec(source);
  if (!marker) return null;
  const open = source.indexOf('{', marker.index + marker[0].length - 1);
  const inner = sliceBraces(source, open);
  if (inner == null) return null;
  return parseStringListMap(inner);
}

export function collectLifecycleContradictionFindings(input: {
  lifecycle: CbEntityLifecycle | CbLifecyclePrompt | undefined;
  source?: string;
  invariants?: readonly string[];
  label?: string;
}): string[] {
  const lifecycle = asLifecycle(input.lifecycle);
  if (!lifecycle) return [];
  const allowed = allowedPairs(lifecycle);
  if (!allowed.size) return [];
  const denied = new Set<string>();
  const map = input.source ? extractStatusTransitionMap(input.source) : null;
  if (map) {
    for (const pair of allowed) {
      const [from, to] = pair.split('>');
      const tos = map[from];
      if (!tos || !tos.includes(to)) denied.add(pair);
    }
  }
  for (const pair of deniedPairsFromInvariants(input.invariants ?? [], lifecycle)) denied.add(pair);
  const where = input.label ? `${input.label} ` : '';
  const workflow = lifecycle.workflowId || lifecycle.entityRef;
  return [...denied].sort().map(pair => {
    const [from, to] = pair.split('>');
    return `lifecycle contradiction -> ${where}denies ${from}→${to} which l4 workflow ${workflow} allows`;
  });
}

function asLifecycle(value: CbEntityLifecycle | CbLifecyclePrompt | undefined): CbEntityLifecycle | undefined {
  if (!value) return undefined;
  if ('transitions' in value) return value;
  const transitions: CbLifecycleTransition[] = [];
  for (const [from, tos] of Object.entries(value.allowed)) {
    for (const to of tos) {
      const existing = transitions.find(t => t.toState === to);
      if (existing) existing.fromStates.push(from);
      else transitions.push({ transitionId: '', fromStates: [from], toState: to });
    }
  }
  return {
    workflowId: value.workflowId,
    entityRef: value.entityRef,
    moduleName: '',
    states: value.states,
    initialState: value.initialState,
    declaredTerminalStates: value.terminalStates,
    transitions,
  };
}

function deniedPairsFromInvariants(invariants: readonly string[], lifecycle: CbEntityLifecycle): Set<string> {
  const denied = new Set<string>();
  const allowed = allowedPairs(lifecycle);
  const states = new Set([
    ...lifecycle.states,
    ...lifecycle.transitions.flatMap(t => [t.toState, ...t.fromStates]),
  ]);
  if (!invariants.length || !states.size) return denied;
  const known = (token: string) => states.has(token);

  for (const raw of invariants) {
    const text = raw.trim();
    if (!text) continue;

    const allowLists = new Map<string, Set<string>>();
    const fromTo = /\bfrom\s+([A-Za-z][A-Za-z0-9_]*)\s+to\s+((?:[A-Za-z][A-Za-z0-9_]*)(?:\s*,\s*|\s+or\s+[A-Za-z][A-Za-z0-9_]*)*)/gi;
    let match: RegExpExecArray | null;
    while ((match = fromTo.exec(text)) !== null) {
      const from = match[1];
      if (!known(from)) continue;
      const tos = match[2].split(/\s*,\s*|\s+or\s+/).map(s => s.trim()).filter(known);
      if (!tos.length) continue;
      const set = allowLists.get(from) ?? new Set<string>();
      for (const to of tos) set.add(to);
      allowLists.set(from, set);
    }
    if (allowLists.size) {
      for (const pair of allowed) {
        const [from, to] = pair.split('>');
        const listed = allowLists.get(from);
        if (listed && !listed.has(to)) denied.add(pair);
      }
    }

    const terminalPhrase = /\b([A-Za-z][A-Za-z0-9_]*(?:\s*(?:,|and)\s+[A-Za-z][A-Za-z0-9_]*)*)\s+are\s+terminal(?:\s+states?)?/gi;
    while ((match = terminalPhrase.exec(text)) !== null) {
      for (const state of match[1].split(/\s*(?:,|and)\s+/).map(s => s.trim()).filter(known)) {
        for (const pair of allowed) {
          if (pair.startsWith(`${state}>`)) denied.add(pair);
        }
      }
    }

    const mustNot = /must not transition(?:\s+back)?(?:\s+from\s+([A-Za-z][A-Za-z0-9_]*(?:\s*(?:,|and|or)\s+[A-Za-z][A-Za-z0-9_]*)*))?\s+to\s+((?:[A-Za-z][A-Za-z0-9_]*)(?:\s*(?:,|or|and)\s+[A-Za-z][A-Za-z0-9_]*)*)/gi;
    while ((match = mustNot.exec(text)) !== null) {
      const tos = splitStates(match[2]).filter(known);
      const froms = match[1] ? splitStates(match[1]).filter(known) : leadingStates(text.slice(0, match.index), known);
      const sources = froms.length ? froms : [...states];
      for (const from of sources) {
        for (const to of tos) {
          const pair = pairKey(from, to);
          if (allowed.has(pair)) denied.add(pair);
        }
      }
    }

    const cannot = /cannot transition from\s+([A-Za-z][A-Za-z0-9_\$\{\}\.]*)\s+to\s+([A-Za-z][A-Za-z0-9_\$\{\}\.]*)/gi;
    while ((match = cannot.exec(text)) !== null) {
      const from = match[1];
      const to = match[2];
      if (known(from) && known(to) && allowed.has(pairKey(from, to))) denied.add(pairKey(from, to));
    }
  }
  return denied;
}

function leadingStates(prefix: string, known: (token: string) => boolean): string[] {
  const tail = prefix.split(/[.;]/).pop() || prefix;
  const found: string[] = [];
  const re = /\b([A-Za-z][A-Za-z0-9_]*)\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(tail)) !== null) {
    if (known(match[1])) found.push(match[1]);
  }
  return uniqueSorted(found);
}

function splitStates(text: string): string[] {
  return text.split(/\s*(?:,|and|or)\s+/).map(s => s.trim()).filter(Boolean);
}

function parseStringListMap(inner: string): Record<string, string[]> | null {
  const map: Record<string, string[]> = {};
  const entry = /(?:['"]([A-Za-z_][A-Za-z0-9_]*)['"]|([A-Za-z_][A-Za-z0-9_]*))\s*:\s*\[([^\]]*)\]/g;
  let match: RegExpExecArray | null;
  while ((match = entry.exec(inner)) !== null) {
    const key = match[1] || match[2];
    const values = match[3].split(',').map(item => item.replace(/['"`\s]/g, '')).filter(Boolean);
    map[key] = values;
  }
  return Object.keys(map).length ? map : null;
}

function sliceBraces(source: string, open: number): string | null {
  if (open < 0 || source[open] !== '{') return null;
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return null;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}
