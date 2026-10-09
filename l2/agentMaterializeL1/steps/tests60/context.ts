/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/tests60/context.ts" enhancement="_blank"/>

// What the model sees to propose the monitor cases of one page: the page contract (routes, JSDoc, types,
// rules, access), the request service def, the rule texts, the entities and the seed plan.

import { isRecord } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { readOptional } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { contractFile, fileRef, rulesFile, type M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import type { M12Context } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { ruleTexts } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';

export const M12_TESTS_TOOL = 'proposeMonitorCases' as const;

export const M12_TESTS_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['cases'],
  properties: {
    cases: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'routine', 'params', 'expect', 'mutating'],
        properties: {
          id: { type: 'string' },
          routine: { type: 'string' },
          params: { type: 'object' },
          paramFieldRefs: { type: 'object', additionalProperties: { type: 'string' } },
          expect: {
            type: 'object',
            additionalProperties: false,
            required: ['ok'],
            properties: {
              ok: { type: 'boolean' },
              errorCode: { type: 'string' },
              minItems: { type: 'integer' },
              shape: { type: 'string', enum: ['object', 'array', 'paginated'] },
              itemsKey: { type: 'string' },
            },
          },
          mutating: { type: 'boolean' },
        },
      },
    },
  },
};

export interface M12ContractRoute {
  route: string;
  kind: 'qry' | 'cmd';
  /** Top-level input member names (`details` for `details: { … }`), the `.required` vocabulary. */
  inputFields: string[];
  actors: string[];
  rules: string[];
}

/** The text of the `{ … }` that starts at `open` (an index of `{`), braces balanced; null when unbalanced. */
function balanced(source: string, open: number): string | null {
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open, index + 1);
    }
  }
  return null;
}

function topLevelMembers(body: string): string[] {
  const inner = body.slice(1, -1);
  const out: string[] = [];
  let depth = 0;
  let segment = '';
  for (const char of inner) {
    if (char === '{' || char === '[' || char === '(') depth += 1;
    if (char === '}' || char === ']' || char === ')') depth -= 1;
    if (char === ';' && depth === 0) { out.push(segment); segment = ''; continue; }
    segment += char;
  }
  out.push(segment);
  return out.map(item => /^\s*(?:readonly\s+)?([A-Za-z_][A-Za-z0-9_]*)\??\s*:/u.exec(item)?.[1] ?? '').filter(Boolean);
}

function literalList(clause: string, key: string): string[] {
  const match = new RegExp(`${key}\\s*:\\s*\\[([^\\]]*)\\]`, 'u').exec(clause);
  return match ? [...match[1].matchAll(/'([^']+)'/gu)].map(item => item[1]) : [];
}

/** The routes of a v2 page contract, read from its text (`'<route>': { kind; input; output; rules; access }`). */
export function contractRoutes(source: string, moduleName: string, pageId: string): M12ContractRoute[] {
  const routes: M12ContractRoute[] = [];
  const pattern = new RegExp(`'(${moduleName}\\.${pageId}\\.[A-Za-z0-9_]+)'\\s*:\\s*\\{`, 'gu');
  for (const match of source.matchAll(pattern)) {
    const open = (match.index ?? 0) + match[0].length - 1;
    const clause = balanced(source, open);
    if (!clause) continue;
    const kind = /kind\s*:\s*'(qry|cmd)'/u.exec(clause)?.[1] as 'qry' | 'cmd' | undefined;
    const inputAt = /input\s*:\s*\{/u.exec(clause);
    const input = inputAt ? balanced(clause, (inputAt.index ?? 0) + inputAt[0].length - 1) : null;
    const access = /access\s*:\s*\{[^}]*\}/u.exec(clause)?.[0] ?? '';
    routes.push({
      route: match[1],
      kind: kind ?? 'qry',
      inputFields: input ? topLevelMembers(input) : [],
      actors: literalList(access, 'actors'),
      rules: literalList(clause.replace(access, ''), 'rules'),
    });
  }
  return routes;
}

export interface M12TestsContext {
  pageId: string;
  contract: M12FileInfo;
  routes: M12ContractRoute[];
  actor: string;
  entities: string[];
  human: string;
  /** Every input this page's cases are derived from (hashed by the caller). */
  inputs: string[];
}

function section(title: string, body: string): string {
  return `## ${title}\n\n${body.trim()}\n`;
}

function fence(lang: string, text: string): string {
  return `\`\`\`${lang}\n${text.trim()}\n\`\`\``;
}

/** The page of a controller unit and everything its cases are read from. */
export async function loadTestsContext(ctx: M12Context, controller: M12Unit, repair?: { problems: string[]; previous: string | null }): Promise<M12TestsContext> {
  const { project, module: moduleName } = ctx.run;
  const pageId = String(controller.definition.data.pageId ?? controller.unitId);
  const contract = contractFile(project, moduleName, pageId);
  const contractText = await readOptional(contract);
  if (!contractText) throw new Error(`CONTRACT_UNREAD: ${fileRef(contract)}`);
  const routes = contractRoutes(contractText, moduleName, pageId);
  if (!routes.length) throw new Error(`CONTRACT_NO_ROUTES: ${fileRef(contract)} has no route of ${moduleName}.${pageId}.`);
  const actor = routes.flatMap(route => route.actors)[0] ?? '';
  const service = ctx.units.find(unit => unit.layer === 'requests' && String(unit.definition.data.pageId ?? unit.unitId) === pageId);
  const entities = ctx.units.filter(unit => unit.definition.artifactType === 'domainEntity');
  const seeds = ctx.units.find(unit => unit.definition.artifactType === 'persistenceSeeds');
  const rulesSource = await readOptional(rulesFile(project, moduleName));
  const rules = ruleTexts(rulesSource, [...new Set(routes.flatMap(route => route.rules))].sort());

  const parts: string[] = [];
  parts.push(section('Task', [
    `Propose the monitor cases of page ${pageId} of module ${moduleName}: one BFF call per case, run against the generated backend in an in-memory store seeded from the definitions.`,
    `The page runs as actor \`${actor || '(none)'}\`. Cover every route below with at least one positive case, and the rules each route lists with a negative case when the rule can be broken through the route input.`,
  ].join('\n')));
  parts.push(section(`Contract ${fileRef(contract)} (the source of truth)`, fence('ts', contractText)));
  if (rules.length) parts.push(section('Rules (l4 text)', rules.map(rule => `- ${rule.ruleId}: ${rule.text}`).join('\n')));
  if (service) parts.push(section(`Request service def ${service.defRef}`, fence('json', JSON.stringify(service.definition.data, null, 2))));
  parts.push(section('Entities of the module (for paramFieldRefs)', entities.map(unit => {
    const fields = Array.isArray(unit.definition.data.fields) ? unit.definition.data.fields.filter(isRecord).map(field => String(field.name ?? '')).filter(Boolean) : [];
    return `- ${String(unit.definition.data.entityId ?? unit.definition.artifactId)}: ${fields.join(', ')}`;
  }).join('\n')));
  if (seeds) parts.push(section(`Seed plan ${seeds.defRef}`, fence('json', JSON.stringify(seeds.definition.data, null, 2).slice(0, 20000))));
  if (repair) {
    parts.push(section('Repair', [
      'The previous answer was refused. Fix exactly these problems and return every case again:',
      ...repair.problems.map(problem => `- ${problem}`),
      repair.previous ? `\nPrevious answer:\n${fence('json', repair.previous)}` : '',
    ].join('\n')));
  }
  return {
    pageId,
    contract,
    routes,
    actor,
    entities: entities.map(unit => String(unit.definition.data.entityId ?? unit.definition.artifactId)),
    human: parts.join('\n'),
    inputs: [contractText, service?.text ?? '', rulesSource ?? '', seeds?.text ?? '', ...entities.map(unit => unit.text)],
  };
}
