/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Gates.ts" enhancement="_blank"/>

// Deterministic gates on what a model returns, before anything is written. Each problem is one line the
// repair prompt can act on.

export interface M12CodeGateInput {
  header: string;
  functionName: string;
  project: number;
  moduleName: string;
  ruleIds: readonly string[];
  /** Record paths the l4 marks derived (`details.disponivel`); a usecase calculates them, never reads them. */
  derivedPaths?: readonly string[];
  /** The def's operation (`list`, `create`, …): a list applies every filter its input declares. */
  operation?: string;
  /** Module rules about the state of a parent record of this entity, with the port that reads that parent. */
  parentRules?: readonly M12ParentRule[];
  /** For a transition usecase: its id and the state it leads to, from the l4 lifecycle. */
  transition?: { transitionId: string; to: string };
}

/**
 * A transition usecase that never writes the state it leads to. The repository's `transition(record, id)` stores the
 * record as given (the id is a label), so a usecase that passes the read record unchanged bumps the version and
 * leaves the state where it was (confirmarConsulta kept `scheduled`, agendaClinica 07/10).
 */
export function transitionTargetProblems(code: string, transition?: { transitionId: string; to: string }): string[] {
  if (!transition || !transition.to) return [];
  if (code.includes(`'${transition.to}'`) || code.includes(`"${transition.to}"`)) return [];
  return [`Transition ${transition.transitionId} leads to '${transition.to}', and the file never writes that state: set it on the record (\`status: '${transition.to}'\`, with the payload fields) before \`repository.transition(record, '${transition.transitionId}')\`, which stores the record as given.`];
}

/** A rule whose text names a parent of the usecase entity (`itensSomenteEmComandaAberta` → the Comanda of an item). */
export interface M12ParentRule {
  ruleId: string;
  /** Parent entity → its repository port (`Comanda` → `ComandaRepository`). */
  parents: ReadonlyArray<{ entityId: string; port: string }>;
}

/**
 * A rule about a parent record that the file names but does not enforce: its ruleId is there, the parent is never
 * read. createItemComanda put `ruleId: 'itensSomenteEmComandaAberta'` on a "comanda and item are required" check and
 * never read the comanda, so an item was launched in a closed comanda. Naming the rule obliges reading the parent.
 */
export function parentRuleProblems(code: string, parentRules: readonly M12ParentRule[]): string[] {
  const problems: string[] = [];
  for (const rule of parentRules) {
    if (!code.includes(`'${rule.ruleId}'`) && !code.includes(`"${rule.ruleId}"`)) continue;
    for (const parent of rule.parents) {
      if (new RegExp(`\\bresolveRepository\\s*<\\s*${parent.port}\\s*>`, 'u').test(code)) continue;
      problems.push(`Rule ${rule.ruleId} is about the ${parent.entityId} of this record, and the file never reads it: resolve \`resolveRepository<${parent.port}>(ctx, '${parent.port}')\`, read that ${parent.entityId} and check its state. A ruleId put on another check does not enforce the rule.`);
    }
  }
  return problems;
}

/** Top-level members of the exported `…Input` interface of a usecase file; empty when there is none. */
export function inputMembers(code: string): string[] {
  const at = /export\s+interface\s+\w+Input\b[^{]*\{/u.exec(code);
  if (!at) return [];
  const out: string[] = [];
  let depth = 1;
  let lineDepth = 1;
  let line = '';
  const take = (): void => {
    const member = lineDepth === 1 ? /^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\??\s*:/u.exec(line) : null;
    if (member) out.push(member[1]);
  };
  for (let index = (at.index ?? 0) + at[0].length; index < code.length && depth > 0; index += 1) {
    const char = code[index];
    if (char === '\n') {
      take();
      line = '';
      lineDepth = depth;
      continue;
    }
    line += char;
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
  }
  take();
  return out;
}

/**
 * A usecase that reads an input member its own `…Input` interface does not declare. The interface extends
 * `Record<string, unknown>`, so the read compiles and is `undefined` at run time: createComanda declared only
 * `mesaId` (the number is the system's) and then required `input.number`, so no comanda could be opened (07/10).
 * Reads through a name bound to the input (`const raw = input;`) count too.
 */
export function undeclaredInputProblems(code: string): string[] {
  const declared = new Set(inputMembers(code));
  if (declared.size === 0) return [];
  const roots = new Set(['input']);
  for (const match of code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*input\b\s*(?:as\s+[^;\n]+)?;/gu)) roots.add(match[1]);
  const rootList = [...roots].join('|');
  const read = new Set<string>();
  for (const match of code.matchAll(new RegExp(`\\b(?:${rootList})\\s*\\??\\.\\s*([A-Za-z_$][\\w$]*)`, 'gu'))) read.add(match[1]);
  for (const match of code.matchAll(new RegExp(`\\b(?:${rootList})\\s*\\[\\s*['"]([A-Za-z_$][\\w$]*)['"]\\s*\\]`, 'gu'))) read.add(match[1]);
  const extra = [...read].filter(name => !declared.has(name));
  return extra.length
    ? [`The file reads ${extra.map(name => `\`input.${name}\``).join(', ')}, which its input interface does not declare: no caller sends it, so it is always undefined. A value the system sets (a number from a sequence, the initial state) is calculated here (for a sequence: list the records and take the highest number plus one), never read from the input.`]
    : [];
}

/**
 * A list usecase that declares a filter in its input and never reads it (listItemComanda took `comandaId` and
 * returned the items of every comanda). A member counts as read through `input.<name>`, through a name bound to the
 * input (`const raw: Record<string, unknown> = input; raw.<name>`), or by destructuring one of them.
 */
export function listFilterProblems(code: string): string[] {
  const roots = new Set(['input']);
  for (const match of code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*input\b\s*(?:as\s+[^;\n]+)?;/gu)) roots.add(match[1]);
  const rootList = [...roots].join('|');
  const unread: string[] = [];
  for (const member of inputMembers(code)) {
    if (member === 'page' || member === 'pageSize') continue;
    const property = new RegExp(`\\b(?:${rootList})\\s*\\??\\.\\s*${member}\\b|\\b(?:${rootList})\\s*\\[\\s*['"]${member}['"]\\s*\\]`, 'u');
    const destructured = new RegExp(`\\{[^}]*\\b${member}\\b[^}]*\\}\\s*(?::[^=;]+)?=\\s*(?:${rootList})\\b`, 'u');
    if (!property.test(code) && !destructured.test(code)) unread.push(member);
  }
  return unread.length
    ? [`The list declares the filter(s) ${unread.map(name => `\`${name}\``).join(', ')} in its input and never applies them: a caller that passes one gets every record. Apply each filter the input declares (a filter that is absent from the call does not narrow), or drop it from the input when the l4 capabilities do not list it.`]
    : [];
}

const IMPORT_SPECIFIER = /\b(?:import|export)\s[^'"]*?\bfrom\s+['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s+['"]([^'"]+)['"]/gu;

/**
 * A Node built-in reached from the file (`import … from 'node:fs'`, `import('node:fs')`, `require('node:fs')`). Only
 * a module specifier counts: a local named `node` (`let node: unknown`, as the MDM recipe writes) is not an import.
 */
export function usesNodeBuiltin(code: string): boolean {
  return importSpecifiers(code).some(specifier => specifier.startsWith('node:')) || /\brequire\s*\(\s*['"]node:/u.test(code);
}

export function importSpecifiers(code: string): string[] {
  const out: string[] = [];
  for (const match of code.matchAll(IMPORT_SPECIFIER)) out.push(match[1] ?? match[2] ?? match[3] ?? '');
  return out;
}

/** Parameters of the exported usecase function, counted at depth 0 of its parameter list; -1 when not found. */
export function usecaseParameterCount(code: string, functionName: string): number {
  const at = new RegExp(`export\\s+async\\s+function\\s+${functionName}\\s*\\(`, 'u').exec(code);
  if (!at) return -1;
  let depth = 0;
  let count = 0;
  let seen = false;
  for (let index = (at.index ?? 0) + at[0].length; index < code.length; index += 1) {
    const char = code[index];
    if (char === '(' || char === '{' || char === '[' || char === '<') depth += 1;
    else if (char === ')' && depth === 0) return seen ? count + 1 : 0;
    else if (char === ')' || char === '}' || char === ']' || (char === '>' && code[index - 1] !== '=')) depth -= 1;
    else if (char === ',' && depth === 0) {
      // A trailing comma before `)` is not a parameter.
      const rest = code.slice(index + 1).trimStart();
      if (rest.startsWith(')')) continue;
      count += 1;
    } else if (!/\s/u.test(char)) seen = true;
  }
  return -1;
}

/** Names a file imports from a repository port of the module (`…/layer_2_application/ports/….js`). */
export function portImports(code: string): Set<string> {
  const out = new Set<string>();
  for (const match of code.matchAll(/\bimport\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/gu)) {
    if (!match[2].includes('/layer_2_application/ports/')) continue;
    for (const part of match[1].split(',')) {
      const name = part.replace(/^\s*type\s+/u, '').split(/\s+as\s+/u).pop()?.trim();
      if (name) out.add(name);
    }
  }
  return out;
}

/**
 * Repository problems: a repository type declared in the file, or a `resolveRepository<X>` whose X is not imported
 * from a port. Either one hides the entity's field names from the compiler (fecharComanda read `item.quantity`
 * through its own `ItemComandaRepository`; the field is `details.quantidade`).
 */
export function repositoryProblems(code: string): string[] {
  const problems: string[] = [];
  for (const match of code.matchAll(/^\s*(?:export\s+)?(?:interface|type)\s+([A-Za-z0-9_]*Repository)\b/gmu)) {
    problems.push(`Do not declare the repository type \`${match[1]}\`: import the port from \`/_<project>_/l1/<module>/layer_2_application/ports/…\` and type the records with its entity.`);
  }
  const ports = portImports(code);
  for (const match of code.matchAll(/\bresolveRepository\s*<\s*([A-Za-z0-9_]+)\s*>/gu)) {
    if (!ports.has(match[1])) problems.push(`\`resolveRepository<${match[1]}>\`: ${match[1]} must be imported from a port of this module (layer_2_application/ports).`);
  }
  return [...new Set(problems)];
}

/**
 * A version the usecase increments before a write. The repository adapter compares the incoming version with the
 * stored one and increments it itself, so `version: current.version + 1` is always refused with
 * CONCURRENCY_CONFLICT (fecharComanda and cancelarItemComanda did this).
 */
export function versionProblems(code: string): string[] {
  const increments = /\bversion\s*:\s*[^,\n;}]*\+\s*1\b|\.version\s*\+\s*1\b|\.version\s*\+\+|\.version\s*\+=/u;
  return increments.test(code)
    ? ['Do not add 1 to the version: a write carries the version that was read, unchanged; the repository compares it with the stored row and increments it (a record with version + 1 is refused with CONCURRENCY_CONFLICT).']
    : [];
}

interface M12Binding { name: string; at: number; source: 'repository' | 'other' | { from: string } }

/** Where each local name is bound, in source order: a repository read, a slice of another name, or anything else. */
function bindings(code: string): M12Binding[] {
  const out: M12Binding[] = [];
  const name = '[A-Za-z_$][\\w$]*';
  const declared = new RegExp(`\\b(?:const|let|var)\\s+(${name}|\\[\\s*${name}\\s*\\])\\s*(?::[^=;]+)?=\\s*([^;\\n]*)`, 'gu');
  for (const match of code.matchAll(declared)) {
    const bound = match[1].replace(/^\[\s*|\s*\]$/gu, '');
    const value = match[2];
    let source: M12Binding['source'] = 'other';
    if (/^await\s+[\w$.]+\.\s*(?:get|list|findOne|findMany)\s*\(/u.test(value)) source = 'repository';
    else {
      const slice = /^(?:await\s+)?([A-Za-z_$][\w$]*)\s*(?:\?\.)?\s*(?:\[|\.\s*(?:find|filter|at|slice|sort|toSorted)\s*\()/u.exec(value);
      if (slice) source = { from: slice[1] };
    }
    out.push({ name: bound, at: match.index ?? 0, source });
  }
  for (const match of code.matchAll(new RegExp(`\\bfor\\s*\\(\\s*(?:const|let|var)\\s+(${name})\\s+of\\s+(${name})`, 'gu'))) {
    out.push({ name: match[1], at: match.index ?? 0, source: { from: match[2] } });
  }
  const callback = new RegExp(`(${name})\\s*\\.\\s*(?:find|filter|map|some|every|forEach|flatMap|findIndex|sort|toSorted)\\s*\\(\\s*(?:async\\s*)?\\(?\\s*(${name})`, 'gu');
  for (const match of code.matchAll(callback)) out.push({ name: match[2], at: (match.index ?? 0) + match[0].length, source: { from: match[1] } });
  return out.sort((a, b) => a.at - b.at);
}

/** True when `name`, as bound just before `at`, holds records read from a repository. */
function fromRepository(all: readonly M12Binding[], name: string, at: number, depth = 0): boolean {
  if (depth > 8) return false;
  const binding = [...all].reverse().find(item => item.name === name && item.at < at);
  if (!binding) return false;
  if (binding.source === 'repository') return true;
  if (binding.source === 'other') return false;
  return fromRepository(all, binding.source.from, binding.at, depth + 1);
}

/**
 * A derived field read from a record the usecase got from a repository (`mesa.details.disponivel` after
 * `const mesa = await mesaRepository.get(id)`). The l4 says it is calculated every time; a stored copy is absent or
 * stale (createComanda refused every mesa: createMesa does not store `disponivel`). A value the usecase calculated
 * itself, or the caller's filter (`input.details?.disponivel`), is not a stored record and passes. Only dotted paths
 * are checked: a bare name would match any `input.<name>`.
 */
export function derivedReadProblems(code: string, derivedPaths: readonly string[]): string[] {
  const problems: string[] = [];
  const all = bindings(code);
  for (const path of derivedPaths) {
    if (!path.includes('.')) continue;
    const tail = path.split('.').map(part => part.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')).join('\\s*\\??\\.\\s*');
    const pattern = new RegExp(`([A-Za-z_$][\\w$]*)\\s*\\??\\.\\s*${tail}\\b`, 'gu');
    if ([...code.matchAll(pattern)].some(match => fromRepository(all, match[1], match.index ?? 0))) {
      problems.push(`Do not read the derived field \`${path}\` from a record the repository returned: the l4 marks it derived, so it is not stored (or is stale). Calculate it from its description (its rule) into a local value and use that.`);
    }
  }
  return problems;
}

/** Problems of a model-written usecase file. Empty = the gate passes. */
export function usecaseGate(code: string, input: M12CodeGateInput): string[] {
  const problems: string[] = [];
  const firstLine = code.split('\n')[0]?.trim() ?? '';
  if (firstLine !== input.header.trim()) problems.push(`The first line must be exactly: ${input.header.trim()}`);
  const exported = new RegExp(`export\\s+async\\s+function\\s+${input.functionName}\\s*\\(`, 'u');
  if (!exported.test(code)) problems.push(`The file must export \`async function ${input.functionName}(input, ctx)\`.`);
  else if (usecaseParameterCount(code, input.functionName) !== 2) {
    problems.push(`\`${input.functionName}\` takes exactly two parameters, \`(input, ctx: RequestContext)\`: every usecase of the module is called that way. Resolve repositories inside with \`resolveRepository<Port>(ctx, '<Port>')\`; drop the \`ports\` parameter of the scaffold.`);
  }
  const ownModule = `/_${input.project}_/l1/${input.moduleName}/`;
  for (const specifier of importSpecifiers(code)) {
    if (!specifier.startsWith('/') || !specifier.endsWith('.js')) {
      problems.push(`Import "${specifier}" must start with / and end with .js.`);
      continue;
    }
    if (!specifier.startsWith('/_102034_/l1/') && !specifier.startsWith(ownModule)) {
      problems.push(`Import "${specifier}" is outside the platform (/_102034_/l1/) and this module (${ownModule}).`);
    }
  }
  if (usesNodeBuiltin(code)) problems.push('No node: import.');
  if (/\bfetch\s*\(/u.test(code)) problems.push('No fetch().');
  if (/\blocalStorage\b|\bsessionStorage\b/u.test(code)) problems.push('No browser storage.');
  if (/catch\s*(\([^)]*\))?\s*\{\s*\}/u.test(code)) problems.push('No empty catch: an error names its cause.');
  if (/\bas\s+unknown\s+as\b/u.test(code) || /\bas\s+any\b/u.test(code)) {
    problems.push('No `as unknown as` and no `as any`: they hide from the compiler an output that differs from the declared type (a list usecase returned a bare array while declaring { items, hasMore }). Return a value built with the declared type.');
  }
  problems.push(...repositoryProblems(code));
  problems.push(...versionProblems(code));
  problems.push(...derivedReadProblems(code, input.derivedPaths ?? []));
  if (input.operation === 'list') problems.push(...listFilterProblems(code));
  problems.push(...parentRuleProblems(code, input.parentRules ?? []));
  problems.push(...transitionTargetProblems(code, input.transition));
  problems.push(...undeclaredInputProblems(code));
  for (const ruleId of input.ruleIds) {
    if (!code.includes(`'${ruleId}'`) && !code.includes(`"${ruleId}"`)) problems.push(`Rule ${ruleId} is not enforced: no AppError carries ruleId '${ruleId}'.`);
  }
  return problems;
}

/** The marker values a generated case may carry (skills/monitorTests.md); the frontend never sees a row value. */
export const M12_SEED_MARKERS = ['<seedRef>', '<seedValue>', '<seedSpare>'] as const;

export interface M12TestCase {
  id: string;
  routine: string;
  params: Record<string, unknown>;
  paramFieldRefs?: Record<string, string>;
  expect: { ok: boolean; errorCode?: string; minItems?: number; shape?: 'object' | 'array' | 'paginated'; itemsKey?: string };
  mutating: boolean;
}

export interface M12TestsGateInput {
  routes: ReadonlyArray<{ route: string; kind: 'qry' | 'cmd'; inputFields: readonly string[] }>;
  entities: readonly string[];
}

function markerParams(params: Record<string, unknown>, prefix = ''): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string' && (M12_SEED_MARKERS as readonly string[]).includes(value)) out.push(path);
    else if (value && typeof value === 'object' && !Array.isArray(value)) out.push(...markerParams(value as Record<string, unknown>, path));
  }
  return out;
}

/** Problems of the monitor cases a model proposed for one page. Empty = the gate passes. */
export function testsGate(cases: readonly M12TestCase[], input: M12TestsGateInput): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const byRoute = new Map(input.routes.map(route => [route.route, route]));
  for (const item of cases) {
    if (!item.id || !/^[A-Za-z0-9_.-]+$/u.test(item.id)) problems.push(`Case id "${item.id}" must be letters, digits, ".", "_" or "-".`);
    if (ids.has(item.id)) problems.push(`Case id ${item.id} is repeated.`);
    ids.add(item.id);
    const route = byRoute.get(item.routine);
    if (!route) { problems.push(`Case ${item.id}: routine ${item.routine} is not a route of this page's contract.`); continue; }
    if (item.mutating !== (route.kind === 'cmd')) problems.push(`Case ${item.id}: mutating must be ${route.kind === 'cmd'} for a ${route.kind} route.`);
    if (item.id.endsWith('.required')) {
      const field = item.id.split('.').slice(-2, -1)[0] ?? '';
      if (!route.inputFields.includes(field)) problems.push(`Case ${item.id}: a ".required" id names an input field of the route; ${field} is not one.`);
      if (item.expect.ok) problems.push(`Case ${item.id}: a ".required" case expects ok: false.`);
    }
    for (const path of markerParams(item.params)) {
      const ref = item.paramFieldRefs?.[path];
      if (!ref) { problems.push(`Case ${item.id}: param ${path} carries a seed marker and needs paramFieldRefs.${path} = "<Entity>.<field>".`); continue; }
      const entity = ref.split('.')[0];
      if (!input.entities.includes(entity)) problems.push(`Case ${item.id}: paramFieldRefs.${path} names ${entity}, which is not an entity of this module.`);
    }
  }
  for (const route of input.routes) {
    if (!cases.some(item => item.routine === route.route && item.expect.ok)) problems.push(`Route ${route.route} has no positive case (expect.ok: true).`);
  }
  return problems;
}
