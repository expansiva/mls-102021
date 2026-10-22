/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/requests50/context.ts" enhancement="_blank"/>

// What the model sees to write the request service (BFF) of one page: the contract (routes, JSDoc, types,
// rules, access), the request-service def, the recipe attempt, the generated usecases it may call, the rule
// texts and the platform signatures.

import { isRecord } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { PLATFORM_FILES } from '/_102021_/l2/agentMaterializeL1/emitters/context.js';
import { recordFieldFromGrant, recordFieldsFromGrant, scopeJoins } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';
import { importSpecifiers, repositoryProblems, usesNodeBuiltin } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { moduleMdmLinksSection } from '/_102021_/l2/agentMaterializeL1/helpers/m12MdmLinks.js';
import { readOptional } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { contractFile, fileRef, infoOfRef, rulesFile } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import { moduleSpecifier, workflowFile } from '/_102021_/l2/agentMaterializeL1/emitters/workflowEmit.js';
import { routeChildWrites } from '/_102021_/l2/agentMaterializeL1/emitters/processPorts.js';
import { recipeDraft, type M12Context, type M12RuleNotApplicable } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { readNotApplicable, type M12Repair } from '/_102021_/l2/agentMaterializeL1/helpers/m12ModelUnits.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { MDM_FACADE_REF, MDM_MODULE_REF, MDM_ONTOLOGY_REF, exportSignatures, mdmContextSection, mdmPlatformApiSection, ruleTexts } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';
import { contractRoutes, type M12ContractRoute } from '/_102021_/l2/agentMaterializeL1/steps/tests60/context.js';
import { REGISTRATION_REF, onboardingModuleId, registrationAccessSection } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/context.js';

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
  /** Routes whose input carries an MDM entity no usecase owns: the request writes it through `ctx.mdm`. */
  mdmInputs: M12MdmInput[];
  /** Routes that reach an operation of a workflow process: they call its service (§11). */
  workflowRoutes: M12WorkflowRoute[];
  human: string;
}

/** An entity of the module kept in the platform MDM that no usecase reads or writes. */
export interface M12UnownedMdmEntity {
  entityId: string;
  /** Its member name in a contract (`participante` for Participante). */
  key: string;
  /** The own-scope grants anchored on it (the record of the logged person), and the field the scope writes. */
  anchor: { grantIds: string[]; recordField: string } | null;
}

export interface M12MdmInput {
  route: string;
  entityId: string;
  key: string;
}

/** MDM entities of the module (`storageTarget: "mdm"`), owned or not. The source `unownedMdmEntities` filters. */
export function moduleMdmEntities(units: readonly M12Unit[]): Array<{ entityId: string; key: string }> {
  return units
    .filter(unit => unit.definition.artifactType === 'domainEntity' && unit.definition.data.storageTarget === 'mdm')
    .map(unit => String(unit.definition.data.entityId ?? unit.definition.artifactId))
    .filter(entityId => entityId.length > 0)
    .map(entityId => ({ entityId, key: entityId[0].toLowerCase() + entityId.slice(1) }));
}

function contractNamesEntity(contractText: string, entity: { entityId: string; key: string }): boolean {
  return new RegExp(`\\b(?:${entity.key}|${entity.entityId})\\b`, 'u').test(contractText);
}

/**
 * Platform MDM APIs for a request whose contract names an MDM entity a usecase already owns. Empty when the
 * contract names none, and empty when an unowned MDM entity is named: that path already includes
 * `mdmContextSection`, which carries the same lines.
 */
export function mdmPlatformSectionForRequest(contractText: string, units: readonly M12Unit[], ontologySource: string | null, facadeSource: string | null = null, moduleSource: string | null = null): string {
  const cited = moduleMdmEntities(units).filter(entity => contractNamesEntity(contractText, entity));
  if (!cited.length) return '';
  if (unownedMdmEntities(units).some(entity => contractNamesEntity(contractText, entity))) return '';
  return section('The platform APIs for MDM data (source: the platform MDM facade)', mdmPlatformApiSection(ontologySource, facadeSource, moduleSource));
}

/**
 * The MDM entities of the module no usecase owns. inscricaoEvento (15/10): the D1 gave Participante no usecase, the
 * request prompt carried no MDM API, and `inscreverEmEvento` had nothing to write the participant with. Read from
 * the defs only: an entity with `storageTarget: "mdm"` and no usecase whose `entityId` is it.
 */
export function unownedMdmEntities(units: readonly M12Unit[]): M12UnownedMdmEntity[] {
  const owned = new Set(units.filter(unit => unit.definition.artifactType === 'usecase').map(unit => String(unit.definition.data.entityId ?? '')));
  const grants = units.filter(unit => unit.definition.artifactType === 'accessScope')
    .flatMap(unit => Array.isArray(unit.definition.data.grants) ? unit.definition.data.grants.filter(isRecord) : []);
  return moduleMdmEntities(units)
    .filter(entity => !owned.has(entity.entityId))
    .map(entity => {
      const entityId = entity.entityId;
      const anchored = grants.filter(grant => grant.scopeMode === 'own' && grant.anchorEntity === entityId);
      const recordField = anchored.map(grant => recordFieldFromGrant(grant)).find(Boolean) ?? '';
      return {
        entityId,
        key: entity.key,
        anchor: anchored.length ? { grantIds: anchored.map(grant => String(grant.grantId ?? '')), recordField } : null,
      };
    });
}

/** The prompt section for the unowned MDM entities a contract names; '' when it names none. */
export function unownedMdmSection(moduleName: string, entities: readonly M12UnownedMdmEntity[]): string {
  if (!entities.length) return '';
  const lines = [
    `No usecase of this module reads or writes ${entities.map(entity => entity.entityId).join(', ')}: they are kept in the platform`,
    'MDM, and this request service reads and writes them itself, through `ctx.mdm` (inside a command, through the',
    '`bound` ctx). A usecase that takes their id (a `<entity>Id` of another record) receives it from here.',
  ];
  for (const entity of entities) {
    lines.push('', `${entity.entityId} (\`${entity.key}\` in the contract), MDM type \`'${moduleName}.${entity.entityId}'\`:`);
    if (entity.anchor) {
      const field = entity.anchor.recordField;
      lines.push(
        `- It is the anchor of the own scope (${entity.anchor.grantIds.join(', ')}): the ${entity.entityId} of a session is the logged`,
        '  person. Its mdmId is `ctx.sessionContext.actorId`: when the login is found in the MDM the platform replaces the',
        `  actor id with the person's mdmId (\`ctx.sessionContext.person.mdmId\`)${field ? `, and the controller writes that same value into \`${field}\`` : ''}.`,
        `  Use it as the id of this ${entity.entityId}${field ? ` and as the \`${field}\` of a record you create` : ''}; never take it from the input and never create`,
        `  another ${entity.entityId} for the actor. No actorId: \`new AppError('FORBIDDEN_ACTOR', 'You have no identity for this scope.', 403)\`.`,
      );
    }
    lines.push(
      `- A route whose input carries \`${entity.key}\`: \`ctx.mdm.entity.get({ mdmId })\` (null: \`NOT_FOUND\` 404), then`,
      '  `ctx.mdm.entity.update({ mdmId, expectedVersion: <the version read>, patch })` with the fields the input carries,',
      `  flat (below), then \`ctx.mdm.entity.attachRole(mdmId, '${moduleName}.${entity.entityId}')\` so the module finds it.`,
      `- A route whose output has \`${entity.key}\`: \`get\` it by the id the record carries and build the contract shape from the`,
      '  flat document the engine returns.',
    );
  }
  return lines.join('\n');
}

/** The grant ids a contract route lists in its `access`. */
export function routeGrantIds(contractText: string, route: string): string[] {
  const at = contractText.indexOf(`'${route}':`);
  if (at < 0) return [];
  const access = /\baccess\s*:\s*\{([^}]*)\}/u.exec(contractText.slice(at, at + 4000))?.[1] ?? '';
  const grants = /\bgrants\s*:\s*\[([^\]]*)\]/u.exec(access)?.[1] ?? '';
  return [...grants.matchAll(/['"]([A-Za-z0-9_]+)['"]/gu)].map(match => match[1]);
}

/**
 * Who may call each route and what they may see (materializadorL1.md §9 and the own scope per entity). The controller
 * lets in a caller who holds ONE grant of the route; this service decides, by the grants the caller holds, which
 * records belong to them and which fields go back. '' when no route has a grant.
 */
export function accessSection(routes: readonly M12ContractRoute[], contractText: string, grants: readonly Record<string, unknown>[]): string {
  const byId = new Map(grants.map(grant => [String(grant.grantId ?? ''), grant]));
  const lines: string[] = [];
  let shared = false;
  for (const route of routes) {
    const ids = routeGrantIds(contractText, route.route).filter(id => byId.has(id));
    if (!ids.length) continue;
    const actors = new Set(ids.map(id => String(byId.get(id)!.actorRef ?? '')));
    if (actors.size > 1) shared = true;
    lines.push(`- ${route.route}:`);
    for (const id of ids) {
      const grant = byId.get(id)!;
      const mode = String(grant.scopeMode ?? '');
      const parts = [`${id}: actor \`${String(grant.actorRef ?? '')}\`, scope ${mode}`];
      if (mode === 'own') {
        const direct = Object.entries(recordFieldsFromGrant(grant)).map(([entityId, field]) => `${entityId}.${field} = the caller`);
        const joins = scopeJoins(grant).map(join => `${join.entityId} through ${join.steps.join(', then ')}`);
        if (direct.length) parts.push(`own records: ${direct.join('; ')}`);
        if (joins.length) parts.push(`own by join: ${joins.join('; ')}`);
      }
      const allowed = Array.isArray(grant.allowedFields) ? grant.allowedFields.map(String) : [];
      if (String(grant.disclosure ?? '') === 'fieldsOnly' && allowed.length) parts.push(`sees only: ${allowed.join(', ')}`);
      lines.push(`  - ${parts.join('; ')}`);
    }
  }
  if (!lines.length) return '';
  return [
    'The controller lets a caller in when they hold ONE grant of the route (the role of the grant is among',
    '`ctx.sessionContext.actorScope`: an item equal to the actor, or ending with `:<actor>`). The caller is',
    '`ctx.sessionContext.actorId`.',
    '- Own scope: when the caller holds only own grants for the route, the records of an entity listed under "own records"',
    '  are theirs when that column equals `ctx.sessionContext.actorId`; an entity "own by join" is theirs when the chain',
    '  reaches the caller (list the records of the first entity that are theirs, keep the ones the chain points to).',
    '  Apply it where the JSDoc says the route works on the caller\'s records; a route whose JSDoc lists public records',
    '  (published events, a catalog) lists them as the JSDoc says. An entity a broader grant the caller also holds',
    '  covers (organization, related) is not narrowed by an own grant.',
    ...(shared ? ['- A route of several roles returns to each caller only what their grants disclose ("sees only"): leave',
      '  out of the output a field none of the caller\'s grants allows, as the contract type permits.'] : []),
    '',
    ...lines,
  ].join('\n');
}

export interface M12WorkflowRoute {
  route: string;
  processId: string;
  operation: string;
  /** The import specifier of the workflow service of the process. */
  specifier: string;
}

/**
 * The routes of a page whose usecase is an operation of a workflow process (materializadorL1.md §11): the handler of
 * such a route calls the function of the process, which reuses the usecase. The operation of a usecase is
 * `Entidade.<operation>`, or `Entidade.<transitionRef>` for a transition, as the process def lists it.
 */
export function workflowRoutes(units: readonly M12Unit[], requestDef: Record<string, unknown>, project: number, moduleName: string): M12WorkflowRoute[] {
  const processes = units.filter(unit => unit.definition.artifactType === 'workflowProcess');
  if (!processes.length) return [];
  const usecaseOperation = new Map<string, string[]>();
  for (const unit of units.filter(item => item.definition.artifactType === 'usecase')) {
    const entityId = String(unit.definition.data.entityId ?? '');
    const ops = [String(unit.definition.data.operation ?? ''), String(unit.definition.data.transitionRef ?? '')].filter(Boolean).map(op => `${entityId}.${op}`);
    usecaseOperation.set(unit.unitId, ops);
  }
  const out: M12WorkflowRoute[] = [];
  const requests = Array.isArray(requestDef.requests) ? requestDef.requests.filter(isRecord) : [];
  for (const request of requests) {
    const route = String(request.route ?? '');
    for (const usecaseId of Array.isArray(request.uses) ? request.uses.map(String) : []) {
      for (const process of processes) {
        const operations = Array.isArray(process.definition.data.operations) ? process.definition.data.operations.filter(isRecord).map(row => String(row.operation ?? '')) : [];
        const operation = (usecaseOperation.get(usecaseId) ?? []).find(op => operations.includes(op));
        if (!operation) continue;
        const processId = String(process.definition.data.processId ?? process.unitId);
        if (out.some(item => item.route === route && item.processId === processId)) continue;
        out.push({ route, processId, operation, specifier: moduleSpecifier(workflowFile(project, moduleName, processId)) });
      }
    }
  }
  return out;
}

/** A page whose routes reach a process and a file that never imports its workflow service. */
export function workflowRouteProblems(code: string, routes: readonly M12WorkflowRoute[]): string[] {
  const missing = new Map<string, M12WorkflowRoute[]>();
  for (const route of routes) if (!code.includes(route.specifier)) missing.set(route.specifier, [...(missing.get(route.specifier) ?? []), route]);
  return [...missing.entries()].map(([specifier, items]) => `${items.map(item => `${item.route} (${item.operation})`).join(', ')} reach the process ${items[0].processId}: call its function from \`${specifier}\` (it reuses the usecase and keeps the occurrence), not the usecase alone.`);
}

/** The routes of a contract whose input carries one of the unowned MDM entities. */
export function mdmInputRoutes(routes: readonly M12ContractRoute[], entities: readonly M12UnownedMdmEntity[]): M12MdmInput[] {
  return routes.flatMap(route => entities
    .filter(entity => route.inputFields.includes(entity.key))
    .map(entity => ({ route: route.route, entityId: entity.entityId, key: entity.key })));
}

/** A route that receives an unowned MDM entity and a file that never writes the MDM. */
export function mdmInputProblems(code: string, inputs: readonly M12MdmInput[]): string[] {
  if (!inputs.length || /\bmdm\.entity\.(?:update|create)\s*\(/u.test(code)) return [];
  return inputs.map(input => `Route ${input.route} receives \`${input.key}\` (${input.entityId}, kept in the platform MDM, with no usecase): write it with \`ctx.mdm.entity.update\` (see the MDM section), do not drop it.`);
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
  const links = await moduleMdmLinksSection(ctx);
  if (links) parts.push(section('Links of the platform MDM (source: the compact keys each link is stored under)', links));
  const scopeGrants = ctx.units.filter(item => item.definition.artifactType === 'accessScope')
    .flatMap(item => Array.isArray(item.definition.data.grants) ? item.definition.data.grants.filter(isRecord) : []);
  // The workflow service of the processes the page reaches (§11): the function of the process, not the usecase.
  const flows = workflowRoutes(ctx.units, unit.definition.data, project, moduleName);
  for (const specifier of [...new Set(flows.map(item => item.specifier))]) {
    const items = flows.filter(item => item.specifier === specifier);
    const info = infoOfRef(specifier, project);
    const generated = info ? await readOptional(info) : null;
    parts.push(section(`Workflow service of process ${items[0].processId} (these routes go through it)`, [
      ...items.map(item => `- ${item.route}: operation ${item.operation}`),
      '',
      `Import from \`${specifier}\`. The handler of each route above calls the function of the process that the l4 prose names for that step (open the occurrence, advance it, reassign who acts): the function reuses the usecase, keeps the Task of the occurrence and decides; this service does not open a Task or call the usecase of that operation on its own. Pass \`ctx\` (or \`bound\` inside a command).`,
      generated ? fence('ts', exportSignatures(generated)) : '(the workflow service was not generated: the phase before this one failed for it)',
    ].join('\n')));
  }
  // The children a route writes with its parent and no usecase writes (the checklist items of a task): through the
  // port of the child, which the run gave the methods they need.
  const childWrites = (await routeChildWrites(ctx.units.map(item => item.declared), ctx.read, project, moduleName))
    .filter(write => routes.some(route => route.route === write.route));
  for (const child of [...new Set(childWrites.map(write => write.child))]) {
    const port = ctx.units.find(item => item.definition.artifactType === 'repositoryPort' && String(item.definition.data.entityId ?? '') === child);
    const entity = ctx.units.find(item => item.definition.artifactType === 'domainEntity' && String(item.definition.data.entityId ?? '') === child);
    if (!port) continue;
    const portName = String(port.definition.data.interfaceName ?? '');
    const generated = await readOptional(port.output);
    const entitySource = entity ? await readOptional(entity.output) : null;
    parts.push(section(`${child} written with its parent (no usecase writes it: through its port)`, [
      ...childWrites.filter(write => write.child === child).map(write => `- ${write.route} (${write.parent}.${write.operation}): \`input.${write.inputKey}\` carries the ${child} records; each points to the ${write.parent} by \`${write.foreignKey}\`.`),
      '',
      `Write them inside the command transaction through \`resolveRepository<${portName}>(bound, '${portName}')\`, importing the port from \`/${port.outputRef.replace(/\.ts$/u, '.js')}\` and typing the records with the entity. A new record is a whole entity: \`id: ctx.idGenerator.newId()\`, \`version: 1\`, the \`${childWrites.find(write => write.child === child)?.foreignKey}\` of the parent, the fields the input carries and the initial values of the others. On an edit, the input list is the whole list: list the stored records of the parent, update the ones that come with their id, create the ones without id, delete the ones that are no longer in the list. Never declare a repository type of your own.`,
      generated ? fence('ts', exportSignatures(generated)) : '',
      entitySource ? fence('ts', exportSignatures(entitySource)) : '',
    ].join('\n')));
  }
  const access = accessSection(routes, contractText, scopeGrants);
  if (access) parts.push(section('Access of the routes (source: the contract access and the module access scope)', access));
  const unowned = unownedMdmEntities(ctx.units)
    .filter(entity => contractNamesEntity(contractText, entity));
  if (unowned.length) {
    parts.push(section('MDM entities with no usecase (source: the defs and the access scope of the module)', unownedMdmSection(moduleName, unowned)));
    parts.push(section('The platform MDM (source: how the engine stores and returns these entities today)', mdmContextSection(moduleName, await ctx.read(MDM_ONTOLOGY_REF), await ctx.read(MDM_FACADE_REF), [], await ctx.read(MDM_MODULE_REF))));
  } else {
    const platformApis = mdmPlatformSectionForRequest(contractText, ctx.units, await ctx.read(MDM_ONTOLOGY_REF), await ctx.read(MDM_FACADE_REF), await ctx.read(MDM_MODULE_REF));
    if (platformApis) parts.push(platformApis);
  }
  for (const ref of [PLATFORM_FILES.requestContext, PLATFORM_FILES.repositoryRegistry]) {
    const text = await ctx.read(ref);
    if (text) parts.push(section(`Platform ${ref}`, [`Import from \`/${ref.replace(/\.ts$/u, '.js')}\`.`, fence('ts', exportSignatures(text))].join('\n\n')));
  }
  const l5Config = await ctx.read(`_${project}_/l5/config.json`);
  if (onboardingModuleId(l5Config) === moduleName) {
    parts.push(registrationAccessSection(moduleName, l5Config, await ctx.read(REGISTRATION_REF)));
  }
  if (repair) {
    parts.push(section('Repair', [
      'The previous answer was refused. Fix exactly these problems and return the whole file again:',
      ...repair.problems.map(problem => `- ${problem}`),
      repair.previous ? `\nPrevious answer:\n${fence('ts', repair.previous)}` : '',
    ].join('\n')));
  }
  const mdmInputs = mdmInputRoutes(routes, unowned);
  return { pageId, contractsInterface, contractSpecifier, header, routes, contractRef, mdmInputs, workflowRoutes: flows, human: parts.join('\n') };
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
    ...mdmInputProblems(code, data.mdmInputs),
    ...workflowRouteProblems(code, data.workflowRoutes),
    // A repository the file types for itself compiles and has no such method at run time (minhas_tarefas declared
    // `create`/`delete` for ItemChecklist, whose port has neither: "repo.create is not a function", tarefas 16/10).
    ...repositoryProblems(code, ctx.units.filter(item => item.definition.artifactType === 'repositoryPort').map(item => String(item.definition.data.interfaceName ?? item.definition.artifactId))),
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
