/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/requests50/context.ts" enhancement="_blank"/>

// What the model sees to write the request service (BFF) of one page: the contract (routes, JSDoc, types,
// rules, access), the request-service def, the recipe attempt, the generated usecases it may call, the rule
// texts and the platform signatures.

import { isRecord } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { PLATFORM_FILES } from '/_102021_/l2/agentMaterializeL1/emitters/context.js';
import { importSpecifiers, usesNodeBuiltin } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { readOptional } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { contractFile, fileRef, rulesFile } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { recipeDraft, type M12Context, type M12RuleNotApplicable } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { readNotApplicable, type M12Repair } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { exportSignatures, ruleTexts } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';
import { contractRoutes, type M12ContractRoute } from '/_102021_/l2/agentMaterializeL1/steps/tests60/context.js';

export const M12_REQUEST_TOOL = 'writeRequestService' as const;
export const M12_REQUEST_TOOL_DESCRIPTION = 'Return the whole request service TypeScript file of the page, and the listed rules that do not apply to it';

function section(title: string, body: string): string {
  return `## ${title}\n\n${body.trim()}\n`;
}

function fence(lang: string, text: string): string {
  return `\`\`\`${lang}\n${text.trim()}\n\`\`\``;
}

export interface M12RequestContext {
  pageId: string;
  /** `export interface <Page>Contracts` of the page contract: the type `requests` is checked against. */
  contractsInterface: string;
  /** The import specifier of the page contract (`/_P_/l2/<mod>/web/contracts/<page>.defs.js`). */
  contractSpecifier: string;
  header: string;
  routes: M12ContractRoute[];
  contractRef: string;
  human: string;
}

export async function loadRequestContext(ctx: M12Context, unit: M12Unit, repair?: M12Repair): Promise<M12RequestContext> {
  const { project, module: moduleName } = ctx.run;
  const pageId = String(unit.definition.data.pageId ?? unit.unitId);
  const contract = contractFile(project, moduleName, pageId);
  const contractRef = fileRef(contract);
  const contractText = await readOptional(contract);
  if (!contractText) throw new Error(`CONTRACT_UNREAD: ${contractRef}`);
  const routes = contractRoutes(contractText, moduleName, pageId);
  if (!routes.length) throw new Error(`CONTRACT_NO_ROUTES: ${contractRef} has no route of ${moduleName}.${pageId}.`);
  const header = `/// <mls fileReference="${unit.outputRef}" enhancement="_blank"/>`;
  const contractsInterface = /export\s+interface\s+([A-Za-z_][A-Za-z0-9_]*Contracts)\b/u.exec(contractText)?.[1] ?? '';
  if (!contractsInterface) throw new Error(`CONTRACT_INTERFACE_MISSING: ${contractRef} has no exported …Contracts interface.`);
  const contractSpecifier = `/${contractRef.replace(/\.defs\.ts$/u, '.defs.js')}`;
  const rulesSource = await readOptional(rulesFile(project, moduleName));
  const rules = ruleTexts(rulesSource, [...new Set(routes.flatMap(route => route.rules))].sort());

  const parts: string[] = [];
  parts.push(section('Task', [
    `Write the request service (BFF) of page ${pageId} of module ${moduleName}, file \`${unit.outputRef}\`.`,
    `It exports \`requests\`, typed exactly \`${requestsTypeOf(contractsInterface)}\` with \`import type { ${contractsInterface} } from '${contractSpecifier}'\`: one async function per route of the contract below, keyed by the route string, each returning exactly that route's output type, so the compiler proves the shape. The page controller calls \`requests["<route>"](params, ctx)\` after it checked the grant and the input shape.`,
    'Each function does what its JSDoc says: purpose, input, processing (filters, rules, compositions, calculations) and output, returning exactly the output type of the contract.',
  ].join('\n')));
  parts.push(section(`Contract ${contractRef} (the source of truth)`, fence('ts', contractText)));
  // Compact JSON: the def is a hint and its output tree is the largest section; indented, consultas (agendaClinica)
  // went past M12_PROMPT_LIMIT and was never sent (07/10).
  parts.push(section(`Request service def ${unit.defRef} (hints: uses, params and the output tree; where they diverge from the contract or the l4, the contract and the l4 win; an empty or unresolved field means "decide by the contract and the l4")`, fence('json', JSON.stringify(unit.definition.data))));
  const draft = await recipeDraft(ctx, unit);
  parts.push(section('Recipe attempt', 'source' in draft
    ? ['The deterministic recipe produced this file. Keep what is right; it is a draft, not the answer.', fence('ts', draft.source.slice(0, 16000))].join('\n\n')
    : `The deterministic recipe could not produce this request service: ${draft.refusal.slice(0, 4000)}`));
  if (rules.length) parts.push(section('Rules (l4 text)', rules.map(rule => `- ${rule.ruleId}: ${rule.text}`).join('\n')));
  // Every generated usecase of the module: what this page may call (the def's `uses` first).
  const uses = new Set(Array.isArray(unit.definition.data.requests)
    ? unit.definition.data.requests.filter(isRecord).flatMap(row => Array.isArray(row.uses) ? row.uses.map(String) : [])
    : []);
  const usecases = ctx.units.filter(item => item.definition.artifactType === 'usecase')
    .sort((left, right) => Number(uses.has(right.unitId)) - Number(uses.has(left.unitId)));
  for (const item of usecases) {
    const generated = await readOptional(item.output);
    if (!generated) continue;
    parts.push(section(`Usecase ${item.unitId}${uses.has(item.unitId) ? ' (named in the def)' : ''}`, [
      `Import from \`/${item.outputRef.replace(/\.ts$/u, '.js')}\`.`,
      fence('ts', exportSignatures(generated)),
    ].join('\n\n')));
  }
  for (const entity of ctx.units.filter(item => item.definition.artifactType === 'domainEntity')) {
    const ref = `_${project}_/l4/${moduleName}/ontology/${String(entity.definition.data.entityId ?? entity.definition.artifactId)}.defs.ts`;
    const text = await ctx.read(ref);
    if (text) parts.push(section(`l4 ontology ${ref} (source)`, fence('ts', text.slice(0, 20000))));
  }
  parts.push(section('Entities of the module', ctx.units.filter(item => item.definition.artifactType === 'domainEntity').map(item => {
    const fields = Array.isArray(item.definition.data.fields) ? item.definition.data.fields.filter(isRecord).map(field => `${String(field.name ?? '')}${field.derived ? ' (derived)' : ''}`) : [];
    return `- ${String(item.definition.data.entityId ?? item.definition.artifactId)}: ${fields.join(', ')}`;
  }).join('\n')));
  for (const ref of [PLATFORM_FILES.requestContext, PLATFORM_FILES.repositoryRegistry]) {
    const text = await ctx.read(ref);
    if (text) parts.push(section(`Platform ${ref}`, [`Import from \`/${ref.replace(/\.ts$/u, '.js')}\`.`, fence('ts', exportSignatures(text))].join('\n\n')));
  }
  if (repair) {
    parts.push(section('Repair', [
      'The previous answer was refused. Fix exactly these problems and return the whole file again:',
      ...repair.problems.map(problem => `- ${problem}`),
      repair.previous ? `\nPrevious answer:\n${fence('ts', repair.previous)}` : '',
    ].join('\n')));
  }
  return { pageId, contractsInterface, contractSpecifier, header, routes, contractRef, human: parts.join('\n') };
}

/**
 * A request that throws away the contract input type: a parameter `input: Record<string, unknown>` (a helper or a
 * route), or the input — or a name taken from it — cast to `Record<…>`. registrarAtendimento did
 * `const rawDetails = input.details; (rawDetails as Record<string, unknown>).attendanceNote` and read a path the
 * contract does not have (`details.details.attendanceNote`); with the contract type the compiler refuses it.
 */
export function untypedInputProblems(code: string): string[] {
  const problems: string[] = [];
  if (/\binput\s*\??\s*:\s*Record\s*</u.test(code)) {
    problems.push('Do not type a parameter `input: Record<string, unknown>`: a route function takes its contract input as `requests` declares it, and a helper takes `<Page>Contracts["<route>"]["input"]` (or the member it needs), so the compiler checks every path you read.');
  }
  const aliases = new Set(['input']);
  for (const match of code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*input\b[^;\n]*/gu)) aliases.add(match[1]);
  const roots = [...aliases].join('|');
  if (new RegExp(`\\b(?:${roots})\\b[\\w$.?\\[\\]'"]*\\s*\\)?\\s+as\\s+Record\\s*<`, 'u').test(code)) {
    problems.push('Do not cast the input (or a value taken from it) to `Record<…>`: read it through its contract type, which says where each field is (the attendance note is `input.details.details.attendanceNote`).');
  }
  return problems;
}

/** Problems of a model-written request service. Empty = the gate passes. */
export function requestGate(code: string, input: {
  header: string;
  /** The page `…Contracts` interface; '' skips the typing check (unit tests of other rules). */
  contractsInterface?: string;
  routes: readonly M12ContractRoute[];
  project: number;
  moduleName: string;
  pageId: string;
  waived: ReadonlySet<string>;
}): string[] {
  const problems: string[] = [];
  if ((code.split('\n')[0]?.trim() ?? '') !== input.header) problems.push(`The first line must be exactly: ${input.header}`);
  // The declared type may contain `=>` (the type the prompt asks for): match up to the `= {` of the value.
  if (!/export\s+const\s+requests\b[\s\S]{0,400}?=\s*\{/u.test(code)) problems.push('The file must export `const requests = { … }`, one function per contract route.');
  if (input.contractsInterface) {
    const contracts = input.contractsInterface;
    const mapped = new RegExp(`export\\s+const\\s+requests\\s*:\\s*\\{\\s*\\[\\s*K\\s+in\\s+keyof\\s+${contracts}\\s*\\]\\s*:\\s*\\(\\s*input\\s*:\\s*${contracts}\\s*\\[\\s*K\\s*\\]\\s*\\[\\s*['"]input['"]\\s*\\][\\s\\S]{0,200}?Promise<\\s*${contracts}\\s*\\[\\s*K\\s*\\]\\s*\\[\\s*['"]output['"]\\s*\\]\\s*>`, 'u');
    if (!mapped.test(code)) problems.push(`\`requests\` must be typed \`${requestsTypeOf(contracts)}\`: the compiler then proves every route exists, reads its contract input and returns exactly its contract output.`);
  }
  if (/\bas\s+unknown\s+as\b/u.test(code) || /\bas\s+any\b/u.test(code)) {
    problems.push('No `as unknown as` and no `as any`: they hide a wrong shape from the compiler (a list returned as `{}` reached a page that way). Build the value with its type, or convert a field with String()/Number().');
  }
  problems.push(...untypedInputProblems(code));
  if (/\bas\s+Parameters\s*</u.test(code)) {
    problems.push('No `as Parameters<typeof <usecase>>[0]`: it forces the contract input onto the usecase input and hides a field the usecase reads that the contract does not send (createProfissional read `input.details.person` and threw). Build the usecase input field by field from the contract input.');
  }
  for (const route of input.routes) {
    if (!code.includes(`"${route.route}"`) && !code.includes(`'${route.route}'`)) problems.push(`Route ${route.route} of the contract has no function in requests.`);
    if (route.kind === 'cmd' && !code.includes('runInTransaction')) problems.push(`Command ${route.route} must run inside ctx.data.moduleData.runInTransaction (the contract command is atomic).`);
    for (const ruleId of route.rules) {
      if (!input.waived.has(ruleId) && !code.includes(ruleId)) problems.push(`Rule ${ruleId} of ${route.route} is not applied: name it where it is applied (a ruleId of an AppError, or a comment on the calculation).`);
    }
  }
  const known = new Set(input.routes.map(route => route.route));
  for (const match of code.matchAll(new RegExp(`["'](${input.moduleName}\\.${input.pageId}\\.[A-Za-z0-9_]+)["']\\s*:`, 'gu'))) {
    if (!known.has(match[1])) problems.push(`requests has ${match[1]}, which is not a route of the contract.`);
  }
  const ownL1 = `/_${input.project}_/l1/${input.moduleName}/`;
  const ownContracts = `/_${input.project}_/l2/${input.moduleName}/web/contracts/`;
  for (const specifier of importSpecifiers(code)) {
    if (!specifier.startsWith('/') || !specifier.endsWith('.js')) { problems.push(`Import "${specifier}" must start with / and end with .js.`); continue; }
    if (!specifier.startsWith('/_102034_/l1/') && !specifier.startsWith(ownL1) && !specifier.startsWith(ownContracts)) {
      problems.push(`Import "${specifier}" is outside the platform (/_102034_/l1/), this module (${ownL1}) and its contracts (${ownContracts}).`);
    }
  }
  if (usesNodeBuiltin(code)) problems.push('No node: import.');
  if (/\bfetch\s*\(/u.test(code)) problems.push('No fetch().');
  if (/\blocalStorage\b|\bsessionStorage\b/u.test(code)) problems.push('No browser storage.');
  if (/catch\s*(\([^)]*\))?\s*\{\s*\}/u.test(code)) problems.push('No empty catch: an error names its cause.');
  return problems;
}

/**
 * A route rule the request names only in a comment that hands it to a usecase ("createItemComanda enforces
 * itensSomenteEmComandaAberta"). The handoff holds only when that usecase carries the ruleId in its code; the usecase
 * gate then makes it read the record the rule is about. On 06/10 neither side checked the comanda of a launched item.
 */
export async function delegatedRuleProblems(
  code: string,
  ruleIds: readonly string[],
  readUsecase: (name: string) => Promise<string | null>,
): Promise<string[]> {
  const usecases = [...new Set(importSpecifiers(code)
    .filter(specifier => specifier.includes('/layer_2_application/usecases/'))
    .map(specifier => (specifier.split('/').pop() ?? '').replace(/\.js$/u, '')))];
  const problems: string[] = [];
  for (const ruleId of ruleIds) {
    if (code.includes(`'${ruleId}'`) || code.includes(`"${ruleId}"`)) continue;
    const lines = code.split('\n').filter(line => line.includes(ruleId));
    for (const name of usecases.filter(item => lines.some(line => new RegExp(`\\b${item}\\b`, 'u').test(line)))) {
      const source = await readUsecase(name);
      if (source && (source.includes(`'${ruleId}'`) || source.includes(`"${ruleId}"`))) continue;
      problems.push(`Rule ${ruleId} is handed to ${name} in a comment, but ${name} does not apply it (no AppError with ruleId '${ruleId}'). Check it here: read the record the rule is about through its usecase and throw an AppError with ruleId '${ruleId}' when it is broken.`);
    }
  }
  return problems;
}

export async function requestAnswerProblems(ctx: M12Context, unit: M12Unit, code: string, notApplicable: readonly M12RuleNotApplicable[]): Promise<string[]> {
  const data = await loadRequestContext(ctx, unit);
  const ruleIds = [...new Set(data.routes.flatMap(route => route.rules))];
  const waived = readNotApplicable(notApplicable, ruleIds);
  const waivedIds = new Set(waived.items.map(item => item.ruleId));
  const readUsecase = (name: string): Promise<string | null> => ctx.read(`_${ctx.run.project}_/l1/${ctx.run.module}/layer_2_application/usecases/${name}.ts`);
  return [
    ...waived.problems,
    ...requestGate(code, { header: data.header, contractsInterface: data.contractsInterface, routes: data.routes, project: ctx.run.project, moduleName: ctx.run.module, pageId: data.pageId, waived: waivedIds }),
    ...await delegatedRuleProblems(code, ruleIds.filter(ruleId => !waivedIds.has(ruleId)), readUsecase),
  ];
}

/**
 * The type `requests` has: one function per contract route, taking exactly that route's input and returning exactly
 * its output. The input was `Record<string, unknown>` until 07/10: registrarAtendimento read
 * `details.attendanceNote` where the contract sends `details.details.attendanceNote`, and nothing caught it.
 */
export function requestsTypeOf(contractsInterface: string): string {
  return `{ [K in keyof ${contractsInterface}]: (input: ${contractsInterface}[K]['input'], ctx: RequestContext) => Promise<${contractsInterface}[K]['output']> }`;
}

/**
 * The annotation of `requests` is set mechanically to the contract-mapped type (a model kept typing it with the
 * bare `…Contracts` interface, or with `Record<…unknown>`, which hid the output shape from the compiler), and the
 * two type imports it needs are added when missing. Nothing else in the file changes; the compiler proves the
 * result, and a function whose output differs from the contract is a compile error the repair receives.
 */
export function normalizeRequestsTyping(code: string, contractsInterface: string, contractSpecifier: string): string {
  const mapped = requestsTypeOf(contractsInterface);
  let next = code.replace(/(export\s+const\s+requests)\s*:[\s\S]{0,800}?=\s*\{/u, `$1: ${mapped} = {`);
  if (next === code) next = code.replace(/(export\s+const\s+requests)\s*=\s*\{/u, `$1: ${mapped} = {`);
  next = next.replace(/\}\s*satisfies\s+[A-Za-z_][A-Za-z0-9_]*\s*;/u, '};');
  const imports: string[] = [];
  if (!new RegExp(`import\\s+(?:type\\s+)?\\{[^}]*\\b${contractsInterface}\\b[^}]*\\}\\s+from`, 'u').test(next)) imports.push(`import type { ${contractsInterface} } from '${contractSpecifier}';`);
  if (!/import\s+(?:type\s+)?\{[^}]*\bRequestContext\b[^}]*\}\s+from/u.test(next)) imports.push("import type { RequestContext } from '/_102034_/l1/server/layer_2_controllers/contracts.js';");
  if (imports.length) {
    const lines = next.split('\n');
    lines.splice(1, 0, ...imports);
    next = lines.join('\n');
  }
  return next;
}
