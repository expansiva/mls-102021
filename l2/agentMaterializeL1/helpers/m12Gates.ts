/// <mls fileReference="_102021_/l2/agentMaterializeL1/helpers/m12Gates.ts" enhancement="_blank"/>

// Deterministic gates on what a model returns, before anything is written. Each problem is one line the
// repair prompt can act on.

import { isCatalogImport } from '/_102021_/l2/agentMaterializeL1/helpers/catalogSource.js';

export interface M12CodeGateInput {
  /** Declarations of sibling systems this module's connections name: the only files of a sibling an import may name (d1_208). */
  siblingImports?: readonly string[];
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
  /** The repository ports of the module (`DespesaRepository`); a name outside them is refused. */
  ports?: readonly string[];
  /** Connection gateways of the module (`<Connection>Gateway`), from `integrationOutbound` `connections`. */
  gateways?: readonly string[];
  /** `<Entity>Repository` of an `external` entity: refused, the usecase uses the gateway. */
  externalPort?: string;
  /** The usecase writes an external entity: the system outside meets its rules through the call (d1_196). */
  externalEntity?: boolean;
  /** Calls the def of the integration gives this usecase as consumer (`connections[].consumer`): the file must make each one (d1_219). */
  consumerCalls?: readonly M12ConsumerCall[];
  /** Events the def lists as effects of this usecase and binds to the platform publisher (d1_216): the file must publish each one. */
  publishers?: readonly M12EventPublisher[];
  /** Entities the L4 says this usecase's parent entity records (d1_221): the file must `create` each one through its port, after the calls above. */
  childRecords?: readonly M12ChildRecord[];
}

/** One entity the usecase records with the entity it writes, and the port that creates it. */
export interface M12ChildRecord {
  entityId: string;
  port: string;
}

/**
 * d1_221: the usecase records each child with its parent: the repository of the child's port is resolved and `<repository>.create(` is
 * called, and when the usecase makes calls of a connection (an outside parent) the record comes after the last of them, since the L4 says
 * it is written once the outside system accepts. Reading the port, importing it or naming it does not count.
 */
export function childRecordProblems(code: string, records: readonly M12ChildRecord[], afterOperations: readonly string[]): string[] {
  const clean = withoutComments(code);
  const problems: string[] = [];
  for (const record of records) {
    const bound = new RegExp(String.raw`(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*(?:await\s+)?resolveRepository\s*<\s*${record.port}\s*>`, 'u').exec(clean)?.[1] ?? '';
    const create = bound ? new RegExp(String.raw`\b${bound}\s*\.\s*create\s*\(`, 'u').exec(clean) : null;
    if (!create) {
      problems.push(`CHILD_RECORD_MISSING: the usecase must record ${record.entityId} with the entity it writes: \`const repository = resolveRepository<${record.port}>(ctx, '${record.port}')\` (with the \`bound\` context when in a transaction) and \`await repository.create(…)\`. Reading it, or importing the port, is not recording.`);
      continue;
    }
    const last = Math.max(-1, ...afterOperations.map(operation => {
      let at = -1;
      for (const match of clean.matchAll(new RegExp(String.raw`\.${operation}\s*\(`, 'gu'))) at = match.index ?? at;
      return at;
    }));
    if (last >= 0 && create.index < last) {
      problems.push(`CHILD_RECORD_BEFORE_CALL: ${record.entityId} is recorded only after the outside system accepts: move \`create\` after the call to ${afterOperations.join(', ')}.`);
    }
  }
  return problems;
}

/** One call of a connection that the usecase consumes. */
export interface M12ConsumerCall {
  connectionId: string;
  operationId: string;
}

/**
 * d1_219: the usecase the def names `consumer` of a call makes it: `gateway.<operation>(` is in the file. An import, a comment or the
 * name of the gateway does not count (the mold of `WORKFLOW_STEP_WITHOUT_CALL`, d1_204).
 */
export function consumerCallProblems(code: string, calls: readonly M12ConsumerCall[]): string[] {
  const clean = withoutComments(code);
  return calls
    .filter(call => !new RegExp(`\\.${call.operationId}\\s*\\(`, 'u').test(clean))
    .map(call => `GATEWAY_CALL_MISSING: the def names this usecase the consumer of ${call.connectionId}.${call.operationId}: the file must call \`gateway.${call.operationId}(input, ctx)\` on the \`${gatewayNameOf(call.connectionId)}\`. Importing the gateway type is not a call.`);
}

/** One event a usecase publishes, and the function of the generated `outbound.ts` that does it. */
export interface M12EventPublisher {
  eventId: string;
  fn: string;
}

function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/(^|[^:\\])\/\/[^\n]*/gu, '$1 ');
}

/** The arguments of the call whose `(` is at `open`, split at the top level, and the index after its `)`. */
function callArguments(text: string, open: number): { args: string[]; end: number } {
  const args: string[] = [];
  let depth = 0;
  let quote = '';
  let start = open + 1;
  for (let index = open; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') quote = char;
    else if (char === '(' || char === '[' || char === '{') depth += 1;
    else if (char === ')' || char === ']' || char === '}') {
      depth -= 1;
      if (depth === 0) {
        const last = text.slice(start, index).trim();
        if (last) args.push(last);
        return { args, end: index + 1 };
      }
    } else if (char === ',' && depth === 1) {
      args.push(text.slice(start, index).trim());
      start = index + 1;
    }
  }
  return { args, end: text.length };
}

/** Index after the `}` that closes the block opened at `open`, with strings skipped. */
function blockEnd(text: string, open: number): number {
  let depth = 0;
  let quote = '';
  for (let index = open; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === '\\') index += 1;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') quote = char;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return text.length;
}

/** The position sits in a `try { … }` block that has a `catch`: the catch would hold a refusal the transaction must see. */
function insideTryWithCatch(text: string, position: number): boolean {
  for (const match of text.matchAll(/\btry\s*\{/gu)) {
    const open = (match.index ?? 0) + match[0].length - 1;
    if (open > position) break;
    const end = blockEnd(text, open);
    if (position < end && /^\s*catch\b/u.test(text.slice(end))) return true;
  }
  return false;
}

/** `const bound: RequestContext = { ...ctx, data: { ...ctx.data, moduleData: tx } }`: the context a transaction binds, with nothing else changed. */
function boundContextDeclared(code: string, name: string): boolean {
  const escaped = name.replace(/\$/gu, '\\$');
  return new RegExp(`(?:const|let)\\s+${escaped}\\b[^=]*=\\s*\\{\\s*\\.\\.\\.ctx\\s*,\\s*data\\s*:\\s*\\{\\s*\\.\\.\\.ctx\\.data\\s*,\\s*moduleData\\s*:\\s*[\\w$]+\\s*\\}\\s*\\}`, 'u').test(code);
}

/**
 * d1_216: the usecase that does the `on` of an event publishes it. The call must be in the file (an import does not count), awaited and
 * not caught, with the context the transaction binds. The platform refuses an event whose module is not the one running, and queues it
 * in the transaction of that context: `ctx` outside the transaction, a literal or a copy that sets `moduleId` would break one or the other.
 */
export function eventPublishProblems(code: string, publishers: readonly M12EventPublisher[]): string[] {
  const clean = withoutComments(code);
  const problems: string[] = [];
  const inTransaction = /\.runInTransaction\s*\(/u.test(clean);
  for (const publisher of publishers) {
    const calls = [...clean.matchAll(new RegExp(`(?<![\\w$.])${publisher.fn}\\s*\\(`, 'gu'))];
    if (calls.length === 0) {
      problems.push(`EVENT_NOT_PUBLISHED: the usecase must publish ${publisher.eventId}: call \`await ${publisher.fn}(record, bound)\` after the write, inside \`ctx.data.moduleData.runInTransaction\`. Importing ${publisher.fn} is not a call.`);
      continue;
    }
    for (const match of calls) {
      const open = (match.index ?? 0) + match[0].length - 1;
      const { args, end } = callArguments(clean, open);
      if (!/\bawait\s+$/u.test(clean.slice(0, match.index)) || /^\s*\.\s*(catch|then)\b/u.test(clean.slice(end)) || insideTryWithCatch(clean, match.index ?? 0)) {
        problems.push(`EVENT_PUBLISH_SWALLOWED: ${publisher.fn} must be awaited and its error must go through: a refused event throws and the transaction rolls back. No .catch, no .then, no try/catch around the call, no call without await.`);
      }
      const context = args[1] ?? '';
      if (context === 'ctx') {
        problems.push(`EVENT_OUTSIDE_TRANSACTION: ${publisher.fn} must receive the \`bound\` context of the transaction, not \`ctx\`: the event commits or rolls back with the write only through it.`);
      } else if (!/^[A-Za-z_$][\w$]*$/u.test(context) || !boundContextDeclared(clean, context)) {
        problems.push(`EVENT_CONTEXT_FORGED: the context argument of ${publisher.fn} must be the variable \`const bound: RequestContext = { ...ctx, data: { ...ctx.data, moduleData: tx } }\` of the runInTransaction callback. Not a literal, not a copy that sets moduleId.`);
      } else if (!inTransaction) {
        problems.push(`EVENT_OUTSIDE_TRANSACTION: ${publisher.fn} runs outside ctx.data.moduleData.runInTransaction.`);
      }
    }
  }
  return [...new Set(problems)];
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
export function undeclaredInputProblems(source: string): string[] {
  // A comment that ends a sentence with `input.` and is followed by code read as a member access (`input.const`, d1_196).
  const code = source.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/(^|[^:'"`])\/\/[^\n]*/gu, '$1');
  const declared = new Set(inputMembers(source));
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

const OUTBOUND_GATEWAY = '/layer_1_external/adapters/integration/outbound.js';

/** `<connectionId>` with the first letter upper, plus `Gateway`. */
export function gatewayNameOf(connectionId: string): string {
  return `${connectionId.charAt(0).toUpperCase()}${connectionId.slice(1)}Gateway`;
}

export interface M12ConnectionRow {
  connectionId: string;
  operationId: string;
  consumer: string;
  effect?: string;
  entityRefs: string[];
}

/** Rows of `integrationOutbound.data.connections` that name a connection and an operation. */
export function connectionRowsOf(data: unknown): M12ConnectionRow[] {
  if (!data || typeof data !== 'object') return [];
  const rows = (data as { connections?: unknown }).connections;
  if (!Array.isArray(rows)) return [];
  const out: M12ConnectionRow[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const record = row as { connectionId?: unknown; operationId?: unknown; consumer?: unknown; effect?: unknown; entityRefs?: unknown };
    const connectionId = typeof record.connectionId === 'string' ? record.connectionId : '';
    const operationId = typeof record.operationId === 'string' ? record.operationId : '';
    const consumer = typeof record.consumer === 'string' ? record.consumer : '';
    if (!/^[A-Za-z_$][\w$]*$/u.test(connectionId) || !/^[A-Za-z_$][\w$]*$/u.test(operationId)) continue;
    const entityRefs = Array.isArray(record.entityRefs) ? record.entityRefs.filter((item): item is string => typeof item === 'string') : [];
    const effect = typeof record.effect === 'string' && record.effect ? record.effect : undefined;
    out.push({ connectionId, operationId, consumer, effect, entityRefs });
  }
  return out;
}

type M12PortUnit = { definition: { artifactType: string; artifactId: string; data: unknown } };

/** Entity ids whose `domainEntity` has `storageTarget: 'external'`. */
export function externalEntityIds(units: readonly M12PortUnit[]): Set<string> {
  const ids = new Set<string>();
  for (const unit of units) {
    if (unit.definition.artifactType !== 'domainEntity') continue;
    const data = unit.definition.data as { storageTarget?: unknown; entityId?: unknown };
    if (data.storageTarget === 'external' && typeof data.entityId === 'string' && data.entityId) ids.add(data.entityId);
  }
  return ids;
}

/**
 * Repository port names of the module. A port of an `external` entity is omitted: that entity has no local port.
 */
export function repositoryPortNames(units: readonly M12PortUnit[], nameOf: (unit: M12PortUnit) => string): string[] {
  const external = externalEntityIds(units);
  const names: string[] = [];
  for (const unit of units) {
    if (unit.definition.artifactType !== 'repositoryPort') continue;
    const entityId = String((unit.definition.data as { entityId?: unknown }).entityId ?? '');
    if (external.has(entityId)) continue;
    const name = nameOf(unit);
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

/** `<Entity>Repository` when the usecase entity is `external`; otherwise undefined. */
export function externalRepositoryPort(units: readonly M12PortUnit[], entityId: string): string | undefined {
  return entityId && externalEntityIds(units).has(entityId) ? `${entityId}Repository` : undefined;
}

/** Gateway names of the module, one per `connectionId` on its `integrationOutbound` defs. */
export function moduleGatewayNames(units: readonly { definition: { artifactType: string; data: unknown } }[]): string[] {
  const names: string[] = [];
  for (const unit of units) {
    if (unit.definition.artifactType !== 'integrationOutbound') continue;
    for (const row of connectionRowsOf(unit.definition.data)) {
      const name = gatewayNameOf(row.connectionId);
      if (!names.includes(name)) names.push(name);
    }
  }
  return names;
}

/** Names a file imports from a repository port or from a known connection gateway. */
export function portImports(code: string, knownGateways?: readonly string[]): Set<string> {
  const out = new Set<string>();
  const allowed = new Set(knownGateways ?? []);
  for (const match of code.matchAll(/\bimport\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/gu)) {
    const fromPort = match[2].includes('/layer_2_application/ports/');
    const fromGateway = match[2].includes(OUTBOUND_GATEWAY);
    if (!fromPort && !fromGateway) continue;
    for (const part of match[1].split(',')) {
      const name = part.replace(/^\s*type\s+/u, '').split(/\s+as\s+/u).pop()?.trim();
      if (!name) continue;
      if (fromGateway && !allowed.has(name)) continue;
      out.add(name);
    }
  }
  return out;
}

/**
 * A usecase, request or workflow that reaches a connection outside its gateway.
 * The message names the gateway the file should resolve.
 */
export function gatewayBypassProblems(code: string): string[] {
  const names = new Set<string>();
  for (const match of code.matchAll(/\bimport\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/gu)) {
    if (match[2].includes('callConnection')) names.add('callConnection');
    for (const part of match[1].split(',')) {
      const name = part.replace(/^\s*type\s+/u, '').split(/\s+as\s+/u).pop()?.trim();
      if (name === 'callConnection' || name === 'fetch' || name === 'XMLHttpRequest') names.add(name);
    }
  }
  for (const match of code.matchAll(/\bimport\s+(?:type\s+)?([A-Za-z_$][\w$]*)\s*from\s*['"]([^'"]+)['"]/gu)) {
    if (match[1] === 'callConnection' || match[1] === 'fetch' || match[1] === 'XMLHttpRequest' || match[2].includes('callConnection')) names.add(match[1]);
  }
  if (/\bcallConnection\s*\(/u.test(code)) names.add('callConnection');
  if (/\bfetch\s*\(/u.test(code)) names.add('fetch');
  if (/\bXMLHttpRequest\b/u.test(code)) names.add('XMLHttpRequest');
  if (names.size === 0) return [];
  const listed = [...names].map(name => `\`${name}\``).join(', ');
  return [`GATEWAY_BYPASS: ${listed} reaches a connection outside its gateway. Resolve the gateway (\`resolveRepository<<Connection>Gateway>(ctx, '<Connection>Gateway')\`, imported from \`layer_1_external/adapters/integration/outbound.js\`) and call its method. Do not write HTTP.`];
}

/**
 * Repository problems: a repository type declared in the file, or a `resolveRepository<X>` whose X is not imported
 * from a port. Either one hides the entity's field names from the compiler (fecharComanda read `item.quantity`
 * through its own `ItemComandaRepository`; the field is `details.quantidade`).
 */
export function repositoryProblems(code: string, knownPorts?: readonly string[], knownGateways?: readonly string[], externalPort?: string): string[] {
  const problems: string[] = [];
  const externalRefusal = (name: string): string => `\`${name}\` is not a repository of this module. The entity is kept outside the module: read and write it only through the connection gateway (\`resolveRepository<<Connection>Gateway>(ctx, '<Connection>Gateway')\`, imported from \`layer_1_external/adapters/integration/outbound.js\`). Do not use a table or \`ctx.mdm\` for it.`;
  // aprovarDespesa typed `resolveRepository<{ get(id: string): … }>(ctx, 'ColaboradorRepository')`: an inline type
  // escapes the port check below, and that port does not exist (Colaborador lives in the MDM), so every call threw.
  if (/\bresolveRepository\s*<\s*\{/u.test(code)) {
    problems.push('Do not type a repository inline (`resolveRepository<{ … }>`): use a port of this module, imported from layer_2_application/ports. An entity kept in the platform MDM has no port: read it with `ctx.mdm.entity.get`.');
  }
  if (knownPorts) {
    // Lazy up to the call: the type argument may itself hold `<…>` (`Promise<Colaborador>`).
    for (const match of code.matchAll(/\bresolveRepository\b[^;]*?\(\s*[A-Za-z_$][\w$]*\s*,\s*['"]([^'"]+)['"]/gu)) {
      if (externalPort && match[1] === externalPort) {
        problems.push(externalRefusal(match[1]));
        continue;
      }
      if (!knownPorts.includes(match[1])) problems.push(`\`resolveRepository(ctx, '${match[1]}')\`: ${match[1]} is not a repository port of this module (its ports: ${knownPorts.join(', ') || 'none'}). An entity kept in the platform MDM is read with \`ctx.mdm.entity.get\`.`);
    }
  }
  for (const match of code.matchAll(/^\s*(?:export\s+)?(?:interface|type)\s+([A-Za-z0-9_]*Repository)\b/gmu)) {
    if (externalPort && match[1] === externalPort) {
      problems.push(externalRefusal(match[1]));
      continue;
    }
    problems.push(`Do not declare the repository type \`${match[1]}\`: import the port from \`/_<project>_/l1/<module>/layer_2_application/ports/…\` and type the records with its entity.`);
  }
  const ports = portImports(code, knownGateways);
  for (const match of code.matchAll(/\bresolveRepository\s*<\s*([A-Za-z0-9_]+)\s*>/gu)) {
    if (externalPort && match[1] === externalPort) {
      problems.push(externalRefusal(match[1]));
      continue;
    }
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
    if (!specifier.startsWith('/_102034_/l1/') && !isCatalogImport(specifier) && !specifier.startsWith(ownModule) && !(input.siblingImports ?? []).includes(specifier)) {
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
  problems.push(...repositoryProblems(code, input.ports, input.gateways, input.externalPort));
  problems.push(...gatewayBypassProblems(code));
  problems.push(...versionProblems(code));
  problems.push(...derivedReadProblems(code, input.derivedPaths ?? []));
  if (input.operation === 'list') problems.push(...listFilterProblems(code));
  problems.push(...parentRuleProblems(code, input.parentRules ?? []));
  problems.push(...transitionTargetProblems(code, input.transition));
  problems.push(...undeclaredInputProblems(code));
  problems.push(...eventPublishProblems(code, input.publishers ?? []));
  problems.push(...consumerCallProblems(code, input.consumerCalls ?? []));
  problems.push(...childRecordProblems(code, input.childRecords ?? [], (input.consumerCalls ?? []).map(call => call.operationId)));
  // The rules of a write on an external entity are met by the external system: the call answers (or refuses) with them.
  for (const ruleId of input.externalEntity ? [] : input.ruleIds) {
    if (!code.includes(`'${ruleId}'`) && !code.includes(`"${ruleId}"`)) problems.push(`Rule ${ruleId} is not enforced: no AppError carries ruleId '${ruleId}'.`);
  }
  return problems;
}

/** The marker values a generated case may carry (skills/monitorTests.md); the frontend never sees a row value. */
export const M12_SEED_MARKERS = ['<seedRef>', '<seedValue>'] as const;
const SEED_SPARE = '<seedSpare>';

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

function walkParams(params: Record<string, unknown>, prefix = ''): Array<{ path: string; value: string }> {
  const out: Array<{ path: string; value: string }> = [];
  for (const [key, value] of Object.entries(params)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.push({ path, value });
    else if (value && typeof value === 'object' && !Array.isArray(value)) out.push(...walkParams(value as Record<string, unknown>, path));
  }
  return out;
}

function markerParams(params: Record<string, unknown>): string[] {
  return walkParams(params)
    .filter(item => (M12_SEED_MARKERS as readonly string[]).includes(item.value))
    .map(item => item.path);
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
    for (const param of walkParams(item.params)) {
      if (param.value === SEED_SPARE) {
        problems.push(`Case ${item.id}: param ${param.path} uses ${SEED_SPARE}; use <seedRef> of an existing record.`);
      }
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
