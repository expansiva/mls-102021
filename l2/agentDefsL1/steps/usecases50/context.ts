/// <mls fileReference="_102021_/l2/agentDefsL1/steps/usecases50/context.ts" enhancement="_blank"/>

import { isRecord } from '/_102021_/l2/agentDefsL1/helpers/d1Artifact.js';
import { qualifyDefPath } from '/_102021_/l2/agentDefsL1/helpers/d1Refs.js';
import { artifactFile } from '/_102021_/l2/agentDefsL1/helpers/d1Write.js';
import { readText } from '/_102021_/l2/agentDefsL1/helpers/d1Stor.js';
import { catalogInfo } from '/_102021_/l2/agentDefsL1/steps/domain30/io.js';
import {
  contractPath,
  entityPath,
  inputPaths,
  isSafeToken,
  type D1InputSnapshot,
  type D1SourceDigest,
} from '/_102021_/l2/agentDefsL1/steps/input20/contracts.js';
import { parseD1Source, sha256Text } from '/_102021_/l2/agentDefsL1/steps/input20/io.js';
import { readContractAst, type D1ContractAst, type D1ContractField } from '/_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.js';
import type {
  D1AccessGrant,
  D1CapabilityText,
  D1ContractPath,
  D1ContractSource,
  D1JourneyContext,
  D1OutboundEvent,
  D1PortSignature,
  D1RouteContext,
  D1RuleText,
  D1SourceFinding,
  D1SourceHash,
  D1SourceText,
  D1UsecaseContext,
  D1UsecaseEntity,
  D1UsecasePort,
  D1UsecaseRequest,
  D1UsecaseRoute,
  D1UsecaseSelection,
} from '/_102021_/l2/agentDefsL1/steps/usecases50/contracts.js';

const BLOCKING = new Set(['SOURCE_ABSENT', 'SOURCE_CHANGED', 'RULE_TEXT_ABSENT', 'CONTRACT_UNPARSED']);

export interface JourneyStepView {
  stepId: string;
  kind: string;
  entity: string;
  effect: string;
  transitionRef: string;
  description: string;
}

export interface JourneyView {
  journeyId: string;
  path: string;
  actorRef: string;
  goal: string;
  steps: JourneyStepView[];
}

export interface VerifiedBundle {
  findings: D1SourceFinding[];
  hashes: D1SourceHash[];
  moduleRuleText: Record<string, string> | null;
  moduleRulesPath: string;
  outbound: D1OutboundEvent[];
  integrationPath: string;
  contracts: D1ContractSource[];
  access: unknown | null;
  accessPath: string;
  needs: unknown | null;
  needsPath: string;
  journeys: JourneyView[];
  catalogs: Array<{ path: string; rules: Record<string, string> }>;
  bodies: Record<string, unknown | null>;
  entityPaths: Record<string, string>;
  files: D1SourceText[];
}

interface TransitionBody {
  transitionId: string;
  from: string[];
  to: string;
  by: string[];
  ruleRefs: string[];
  payload: string[];
  description: string;
}

/** Reads the snapshot's sources again. A file is kept only when its hash still matches. */
export async function loadVerifiedSources(
  project: number,
  moduleName: string,
  snapshot: D1InputSnapshot,
  entityIds: readonly string[],
): Promise<VerifiedBundle> {
  const paths = inputPaths(moduleName);
  const findings: D1SourceFinding[] = [];
  const hashes: D1SourceHash[] = [];
  const files: D1SourceText[] = [];
  const rules = await take(project, paths.rules, 'defs', snapshot.sources, findings, hashes, files);
  const integration = await take(project, paths.integration, 'defs', snapshot.sources, findings, hashes, files);
  const access = await take(project, paths.access, 'defs', snapshot.sources, findings, hashes, files);
  const needs = await take(project, paths.needs, 'json', snapshot.sources, findings, hashes, files);
  const bodies: Record<string, unknown | null> = {};
  const entityPaths: Record<string, string> = {};
  for (const entityId of [...new Set(entityIds)].sort()) {
    if (!isSafeToken(entityId)) continue;
    const path = entityPath(moduleName, entityId);
    entityPaths[entityId] = path;
    bodies[entityId] = await take(project, path, 'defs', snapshot.sources, findings, hashes, files);
  }
  const catalogs: VerifiedBundle['catalogs'] = [];
  const seenCatalog = new Set<string>();
  for (const body of Object.values(bodies)) {
    if (!isRecord(body) || typeof body.source !== 'string' || !body.source.trim()) continue;
    const source = body.source.trim();
    if (seenCatalog.has(source)) continue;
    seenCatalog.add(source);
    const text = await readCatalogText(source);
    if (text == null) {
      findings.push(absent(source));
      continue;
    }
    rememberFile(files, source, text);
    const sha256 = await sha256Text(text);
    hashes.push({ path: source, sha256 });
    const parsed = parseD1Source(text, 'defs');
    const rules = ruleTexts(parsed);
    if (!rules) {
      findings.push(absent(source, `Source ${source} did not parse. The usecase was not sent to the model.`));
      continue;
    }
    catalogs.push({ path: source, rules });
  }
  const journeys: JourneyView[] = [];
  for (const digest of snapshot.sources) {
    const journeyId = journeyIdFromPath(digest.path, moduleName);
    if (!journeyId) continue;
    const body = await take(project, digest.path, 'defs', snapshot.sources, findings, hashes, files);
    const view = body ? journeyView(journeyId, digest.path, body) : null;
    if (view) journeys.push(view);
  }
  journeys.sort((left, right) => left.journeyId.localeCompare(right.journeyId));
  const pages = new Set(snapshot.selection.pages.map(page => page.pageId));
  for (const route of snapshot.selection.routes) pages.add(route.page);
  const contracts: D1ContractSource[] = [];
  for (const pageId of [...pages].sort()) {
    if (!isSafeToken(pageId)) continue;
    const path = contractPath(moduleName, pageId);
    const body = await take(project, path, 'defs', snapshot.sources, findings, hashes, files);
    contracts.push({ pageId, path, source: typeof body === 'string' ? body : '' });
  }
  findings.sort((left, right) => `${left.path}\u0000${left.code}`.localeCompare(`${right.path}\u0000${right.code}`));
  hashes.sort((left, right) => left.path.localeCompare(right.path));
  return {
    findings,
    hashes,
    moduleRuleText: rules ? ruleTexts(rules) : null,
    moduleRulesPath: paths.rules,
    outbound: outboundEvents(integration),
    integrationPath: paths.integration,
    contracts,
    access,
    accessPath: paths.access,
    needs,
    needsPath: paths.needs,
    journeys,
    catalogs,
    bodies,
    entityPaths,
    files,
  };
}

/**
 * The cut for one usecase: its routes, the rules those routes are subject to,
 * and the lifecycle or MDM capability that operation actually is.
 */
export function buildUsecaseContexts(input: {
  moduleName: string;
  usecases: readonly D1UsecaseSelection[];
  routes: readonly D1UsecaseRoute[];
  entities: readonly D1UsecaseEntity[];
  ports: readonly D1UsecasePort[];
  bundle: VerifiedBundle;
}): D1UsecaseContext[] {
  return input.usecases.map(usecase => oneContext(usecase, input));
}

export function formatUsecaseContext(context: D1UsecaseContext): string {
  const lines: string[] = [];
  if (context.lifecycle && context.transition) {
    const transition = context.transition;
    lines.push(`This operation is the lifecycle transition ${transition.transitionId}.`);
    lines.push(`From: ${transition.from.join(', ') || '(none)'}`);
    lines.push(`To: ${transition.to || '(none)'}`);
    lines.push(`By: ${transition.by.join(', ') || '(none)'}`);
    lines.push(`Payload: ${transition.payload.join(', ') || '(none)'}`);
    if (transition.description) lines.push(transition.description);
  } else {
    lines.push('This operation is not a lifecycle transition.');
  }
  for (const capability of context.capabilities) {
    lines.push(`Capability ${capability.name}`);
    lines.push(capability.text);
  }
  if (context.effectiveFields.length) {
    lines.push('Effective platform fields:');
    for (const field of context.effectiveFields) lines.push(`- ${field}`);
  }
  for (const route of context.routes) {
    lines.push('');
    lines.push(...routeLines(route));
  }
  if (context.rules.length) lines.push('');
  for (const rule of context.rules) {
    lines.push(`Rule ${rule.ruleId}`);
    lines.push(`Owner: ${rule.owner}`);
    lines.push(`Source: ${rule.source}`);
    lines.push(rule.text);
  }
  lines.push('');
  if (context.portId) {
    lines.push(`Port ${context.portId}`);
    for (const method of context.portMethods) {
      lines.push(`${method.name}(${method.params.join(', ')}): ${method.returns}`);
    }
    if (!context.portMethods.length) lines.push('(no method for this operation)');
  } else {
    lines.push('Port: (none). This operation does not use a repository port.');
  }
  if (context.effects.length) {
    lines.push('');
    for (const effect of context.effects) {
      lines.push(`Effect ${effect.eventId}`);
      lines.push(`On: ${effect.on}`);
      if (effect.kind) lines.push(`Kind: ${effect.kind}`);
      if (effect.to) lines.push(`To: ${effect.to}`);
      if (effect.description) lines.push(effect.description);
    }
  } else {
    lines.push('Effects: (none).');
  }
  for (const journey of context.journeys) {
    lines.push('');
    lines.push(`Journey ${journey.journeyId}`);
    if (journey.actorRef) lines.push(`Actor: ${journey.actorRef}`);
    if (journey.goal) lines.push(`Goal: ${journey.goal}`);
    for (const step of journey.steps) {
      const transition = step.transitionRef ? `, transition ${step.transitionRef}` : '';
      const description = step.description ? `: ${step.description}` : '';
      lines.push(`Step ${step.stepId} (${step.kind}${transition})${description}`);
    }
  }
  return lines.join('\n');
}

/** Names the gate may accept on a transition payload. Contract inputs stay the authority. */
export function authorizedPayloadNames(
  request: D1UsecaseRequest,
  usecaseId: string,
  inputNames: readonly string[],
): Set<string> {
  const allowed = new Set(inputNames);
  const usecase = request.usecases.find(item => item.usecaseId === usecaseId);
  const entity = request.entities.find(item => item.entityId === usecase?.entity);
  const transition = entity?.transitions.find(item => item.transitionId === usecaseId);
  for (const path of transition?.payload || []) allowed.add(path);
  const context = request.contexts?.find(item => item.usecaseId === usecaseId);
  for (const route of context?.routes || []) {
    for (const field of route.inputFields) allowed.add(field.path);
  }
  return allowed;
}

export function blockingFinding(findings: readonly D1SourceFinding[]): D1SourceFinding | null {
  return findings.find(finding => BLOCKING.has(finding.code)) || null;
}

/** A file this context was built from no longer matches the snapshot. */
export async function blockingDrift(
  project: number,
  context: D1UsecaseContext,
  digests: readonly D1SourceDigest[],
): Promise<D1SourceFinding | null> {
  for (const source of context.sources) {
    const text = await readSource(project, source.path);
    if (text == null) return absent(source.path);
    const sha256 = await sha256Text(text);
    if (sha256 !== source.sha256) return changed(source.path);
    const digest = digests.find(item => item.path === source.path);
    if (digest?.sha256 && digest.sha256 !== sha256) return changed(source.path);
  }
  return null;
}

export function ontologyTransitions(body: unknown): TransitionBody[] {
  if (!isRecord(body) || !Array.isArray(body.transitions)) return [];
  const out: TransitionBody[] = [];
  for (const item of body.transitions) {
    if (!isRecord(item) || typeof item.transitionId !== 'string') continue;
    out.push({
      transitionId: item.transitionId,
      from: stringList(item.from),
      to: typeof item.to === 'string' ? item.to : '',
      by: stringList(item.by),
      ruleRefs: stringList(item.ruleRefs),
      payload: stringList(item.payload),
      description: typeof item.description === 'string' ? item.description : '',
    });
  }
  return out;
}

export function namespaceOf(body: unknown): string {
  if (!isRecord(body) || typeof body.roleTag !== 'string') return '';
  const roleTag = body.roleTag;
  return roleTag.includes('.') ? roleTag.slice(0, roleTag.indexOf('.')) : roleTag;
}

function oneContext(
  usecase: D1UsecaseSelection,
  input: { moduleName: string; routes: readonly D1UsecaseRoute[]; entities: readonly D1UsecaseEntity[]; ports: readonly D1UsecasePort[]; bundle: VerifiedBundle },
): D1UsecaseContext {
  const bundle = input.bundle;
  const entity = input.entities.find(item => item.entityId === usecase.entity) || null;
  const body = bundle.bodies[usecase.entity] ?? null;
  const transition = transitionFor(usecase, entity, body);
  const lifecycle = usecase.operation === 'transition' && Boolean(transition);
  const rules = rulesFor(usecase, entity, body, transition, bundle);
  const routes = routesFor(usecase, input.routes, bundle);
  const port = input.ports.find(item => item.entityId === usecase.entity) || null;
  const portMethods = port && entity?.storageTarget !== 'mdm' ? methodsFor(port, usecase.operation) : [];
  const effects = bundle.outbound.filter(event => event.on === `${usecase.entity}.${usecase.usecaseId}`);
  const journeys = journeysFor(usecase, routes.routes.map(route => route.page), bundle);
  const capabilities = capabilitiesFor(body, usecase.operation, entity?.storageTarget || '');
  const effectiveFields = entity?.storageTarget === 'mdm' && (usecase.operation === 'update' || usecase.operation === 'create')
    ? platformLeaves(body)
    : [];
  const depended = dependedPaths(input.moduleName, usecase, entity, routes.routes, rules.rules, effects, journeys, capabilities, bundle);
  const sources = hashesFor(depended, bundle);
  const findings = findingsFor(depended, rules.missing, routes.missing, bundle);
  return {
    usecaseId: usecase.usecaseId,
    lifecycle,
    transition: lifecycle ? transition : null,
    capabilities,
    effectiveFields,
    routes: routes.routes,
    rules: rules.rules,
    portId: port && entity?.storageTarget !== 'mdm' ? port.portId : '',
    portMethods,
    effects,
    journeys,
    findings,
    sources,
  };
}

function rulesFor(
  usecase: D1UsecaseSelection,
  entity: D1UsecaseEntity | null,
  body: unknown,
  transition: D1UsecaseContext['transition'],
  bundle: VerifiedBundle,
): { rules: D1RuleText[]; missing: D1SourceFinding[] } {
  const rules: D1RuleText[] = [];
  const missing: D1SourceFinding[] = [];
  const ids = ruleIdsFor(usecase, entity, body, transition);
  for (const ruleId of ids) {
    const resolved = resolveRule(ruleId, entity, bundle);
    if ('finding' in resolved) missing.push(resolved.finding);
    else rules.push(resolved.rule);
  }
  return { rules, missing };
}

function ruleIdsFor(
  usecase: D1UsecaseSelection,
  entity: D1UsecaseEntity | null,
  body: unknown,
  transition: D1UsecaseContext['transition'],
): string[] {
  if (usecase.operation === 'transition') return transition ? [...transition.ruleRefs] : [];
  const onTransitions = new Set(ontologyTransitions(body).flatMap(item => item.ruleRefs));
  const cited = entity?.rules.map(rule => rule.ruleId) || [];
  const fromBody = isRecord(body) ? stringList(body.rules) : [];
  const pool = cited.length ? cited : fromBody;
  const ids: string[] = [];
  for (const ruleId of pool) {
    if (onTransitions.has(ruleId) || ids.includes(ruleId)) continue;
    ids.push(ruleId);
  }
  for (const rule of entity?.rules || []) {
    if (rule.owner === 'platform' && !ids.includes(rule.ruleId)) ids.push(rule.ruleId);
  }
  return ids;
}

function resolveRule(
  ruleId: string,
  entity: D1UsecaseEntity | null,
  bundle: VerifiedBundle,
): { rule: D1RuleText } | { finding: D1SourceFinding } {
  const placed = entity?.rules.find(rule => rule.ruleId === ruleId);
  const owner = placed?.owner || (bundle.moduleRuleText && ruleId in bundle.moduleRuleText ? 'module' : 'platform');
  if (owner === 'platform') {
    const catalog = bundle.catalogs.find(item => item.path === placed?.source) || bundle.catalogs[0];
    const text = catalog?.rules[ruleId];
    if (!catalog || typeof text !== 'string') {
      return { finding: ruleMissing(ruleId, placed?.source || catalog?.path || bundle.moduleRulesPath) };
    }
    return { rule: { ruleId, owner: 'platform', source: catalog.path, text } };
  }
  const text = bundle.moduleRuleText?.[ruleId];
  if (!bundle.moduleRuleText || typeof text !== 'string') return { finding: ruleMissing(ruleId, bundle.moduleRulesPath) };
  return { rule: { ruleId, owner: 'module', source: bundle.moduleRulesPath, text } };
}

function routesFor(
  usecase: D1UsecaseSelection,
  routes: readonly D1UsecaseRoute[],
  bundle: VerifiedBundle,
): { routes: D1RouteContext[]; missing: D1SourceFinding[] } {
  const out: D1RouteContext[] = [];
  const missing: D1SourceFinding[] = [];
  for (const routeId of usecase.routes) {
    const route = routes.find(item => item.route === routeId);
    const page = route?.page || '';
    const contract = bundle.contracts.find(item => item.pageId === page);
    const contractPath = contract?.path || '';
    const actors = pageActors(bundle.needs, page);
    const access = grantsFor(bundle.access, actors, usecase.entity);
    if (!contract?.source) {
      out.push(emptyRoute(routeId, page, contractPath, access, contractPath
        ? `Route ${routeId} has no contract source in ${contractPath}.`
        : `Route ${routeId} has no contract.`));
      continue;
    }
    const ast = readContractAst(contract.source, contract.path);
    const found = ast.bindings.filter(item => item.route === routeId);
    if (found.length !== 1) {
      out.push(emptyRoute(routeId, page, contract.path, access, `Route ${routeId} has no contract binding in ${contract.path}.`));
      continue;
    }
    if (ast.unparsed.length) {
      missing.push({
        code: 'CONTRACT_UNPARSED',
        path: contract.path,
        message: `Contract ${contract.path} did not close: ${ast.unparsed.join(' ')} The usecase was not sent to the model.`,
      });
    }
    const input = symbolFields(ast, found[0].input);
    const output = symbolFields(ast, found[0].output);
    if (!input) missing.push(symbolMissing(contract.path, routeId, found[0].input));
    if (!output) missing.push(symbolMissing(contract.path, routeId, found[0].output));
    out.push({
      route: routeId,
      page,
      contractPath: contract.path,
      inputSymbol: input?.label || found[0].input,
      outputSymbol: output?.label || found[0].output,
      inputFields: input ? flattenFields(input.fields) : [],
      outputFields: output ? flattenFields(output.fields) : [],
      unbound: '',
      access,
    });
  }
  return { routes: out, missing };
}

function journeysFor(usecase: D1UsecaseSelection, pages: string[], bundle: VerifiedBundle): D1JourneyContext[] {
  const cited = new Map<string, Set<string>>();
  for (const pageId of pages) {
    for (const ref of pageCitations(bundle.needs, pageId)) {
      const set = cited.get(ref.journeyId) || new Set<string>();
      set.add(ref.stepId);
      cited.set(ref.journeyId, set);
    }
  }
  const out: D1JourneyContext[] = [];
  for (const journey of bundle.journeys) {
    const steps = cited.get(journey.journeyId);
    if (!steps) continue;
    const hasTransition = journey.steps.some(step => step.transitionRef);
    const hasOtherWrite = journey.steps.some(step => step.kind === 'act' && step.effect && step.effect !== 'transition');
    const matched = journey.steps.filter(step => {
      if (step.transitionRef) return step.transitionRef === usecase.usecaseId && (steps.has(step.stepId) || usecase.operation === 'transition');
      if (usecase.operation === 'transition' || hasTransition || hasOtherWrite) return false;
      return steps.has(step.stepId) && (step.kind === 'locate' || step.kind === 'inspect') && step.entity === usecase.entity;
    });
    if (!matched.length) continue;
    out.push({
      journeyId: journey.journeyId,
      path: journey.path,
      actorRef: journey.actorRef,
      goal: journey.goal,
      steps: matched.map(step => ({
        stepId: step.stepId,
        kind: step.kind,
        transitionRef: step.transitionRef,
        description: step.description,
      })),
    });
  }
  return out;
}

function dependedPaths(
  moduleName: string,
  usecase: D1UsecaseSelection,
  entity: D1UsecaseEntity | null,
  routes: readonly D1RouteContext[],
  rules: readonly D1RuleText[],
  effects: readonly D1OutboundEvent[],
  journeys: readonly D1JourneyContext[],
  capabilities: readonly D1CapabilityText[],
  bundle: VerifiedBundle,
): string[] {
  const paths = new Set<string>();
  const ontology = bundle.entityPaths[usecase.entity];
  if (ontology) paths.add(ontology);
  if (routes.length) {
    paths.add(bundle.accessPath);
    paths.add(bundle.needsPath);
  }
  for (const route of routes) if (route.contractPath) paths.add(route.contractPath);
  if (rules.some(rule => rule.owner === 'module') || usecase.operation === 'transition') paths.add(bundle.moduleRulesPath);
  for (const rule of rules) if (rule.owner === 'platform') paths.add(rule.source);
  for (const rule of entity?.rules || []) {
    if (rule.owner === 'platform' && rule.source) paths.add(rule.source);
  }
  if (capabilities.length) {
    for (const catalog of bundle.catalogs) paths.add(catalog.path);
  }
  if (effects.length || usecase.operation === 'transition') paths.add(bundle.integrationPath);
  for (const journey of journeys) paths.add(journey.path);
  for (const pageId of routes.map(route => route.page)) {
    for (const cite of pageCitations(bundle.needs, pageId)) {
      paths.add(`l4/${moduleName}/journeys/${cite.journeyId}.defs.ts`);
    }
  }
  return [...paths];
}

function hashesFor(paths: readonly string[], bundle: VerifiedBundle): D1SourceHash[] {
  const out: D1SourceHash[] = [];
  for (const path of paths) {
    const hash = bundle.hashes.find(item => item.path === path);
    if (hash && !out.some(item => item.path === hash.path)) out.push(hash);
  }
  out.sort((left, right) => left.path.localeCompare(right.path));
  return out;
}

function findingsFor(
  paths: readonly string[],
  ruleMissingFindings: readonly D1SourceFinding[],
  routeMissing: readonly D1SourceFinding[],
  bundle: VerifiedBundle,
): D1SourceFinding[] {
  const needed = new Set(paths);
  for (const finding of ruleMissingFindings) needed.add(finding.path);
  for (const finding of routeMissing) needed.add(finding.path);
  const out = bundle.findings.filter(finding => needed.has(finding.path));
  for (const finding of [...ruleMissingFindings, ...routeMissing]) {
    if (!out.some(item => item.code === finding.code && item.path === finding.path && item.message === finding.message)) out.push(finding);
  }
  out.sort((left, right) => `${left.path}\u0000${left.code}`.localeCompare(`${right.path}\u0000${right.code}`));
  return out;
}

function transitionFor(
  usecase: D1UsecaseSelection,
  entity: D1UsecaseEntity | null,
  body: unknown,
): D1UsecaseContext['transition'] {
  const fromBody = ontologyTransitions(body).find(item => item.transitionId === usecase.usecaseId);
  if (fromBody) {
    return {
      transitionId: fromBody.transitionId,
      from: fromBody.from,
      to: fromBody.to,
      by: fromBody.by,
      ruleRefs: fromBody.ruleRefs,
      payload: fromBody.payload,
      description: fromBody.description,
    };
  }
  const fromEntity = entity?.transitions.find(item => item.transitionId === usecase.usecaseId);
  if (!fromEntity) return null;
  return {
    transitionId: fromEntity.transitionId,
    from: fromEntity.from,
    to: fromEntity.to,
    by: fromEntity.by,
    ruleRefs: fromEntity.ruleRefs,
    payload: fromEntity.payload || [],
    description: fromEntity.description || '',
  };
}

function methodsFor(port: D1UsecasePort, operation: string): D1PortSignature[] {
  const signatures = port.signatures || [];
  const found = signatures.filter(method => method.name === operation);
  if (found.length) return found;
  if (port.methods.includes(operation)) return [{ name: operation, params: [], returns: '' }];
  return [];
}

export function capabilityNames(body: unknown): string[] {
  if (!isRecord(body) || !isRecord(body.capabilities)) return [];
  const caps = body.capabilities;
  return Object.keys(caps).filter(name => typeof caps[name] === 'string').sort();
}

export function platformFieldPaths(body: unknown): string[] {
  return platformLeaves(body);
}

function capabilitiesFor(body: unknown, operation: string, storage: string): D1CapabilityText[] {
  if (storage !== 'mdm' || !isRecord(body) || !isRecord(body.capabilities)) return [];
  const caps = body.capabilities;
  const names = Object.keys(caps).filter(name => capabilityApplies(name, operation));
  const out: D1CapabilityText[] = [];
  for (const name of names) {
    const text = caps[name];
    if (typeof text === 'string') out.push({ name, text });
  }
  return out;
}

export function capabilityApplies(name: string, operation: string): boolean {
  if (operation === 'update') return name === 'edit.platformFields' || name.startsWith('edit.');
  if (operation === 'create') return name.startsWith('register.') || name === 'create';
  if (operation === 'list' || operation === 'get') return name.startsWith('read.') || name.startsWith('locate.') || name.startsWith('list');
  return false;
}

function platformLeaves(body: unknown): string[] {
  if (!isRecord(body) || !isRecord(body.record) || !isRecord(body.record.fields)) return [];
  const out: string[] = [];
  walkPlatform(body.record.fields, '', '', out);
  out.sort((left, right) => left.localeCompare(right));
  return out;
}

function walkPlatform(fields: Record<string, unknown>, prefix: string, inherited: string, out: string[]): void {
  for (const [key, raw] of Object.entries(fields)) {
    if (!isRecord(raw)) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    const owner = typeof raw.owner === 'string' ? raw.owner : inherited;
    if (isRecord(raw.fields)) {
      walkPlatform(raw.fields, path, owner, out);
      continue;
    }
    if (owner !== 'platform' || raw.derived === true) continue;
    out.push(path);
  }
}

function routeLines(route: D1RouteContext): string[] {
  const lines = [`Route ${route.route}`, `Contract: ${route.contractPath || '(none)'}`];
  if (route.unbound) lines.push(route.unbound);
  if (route.inputSymbol) {
    lines.push(`Input ${route.inputSymbol}`);
    lines.push(...fieldLines(route.inputFields));
  }
  if (route.outputSymbol) {
    lines.push(`Output ${route.outputSymbol}`);
    lines.push(...fieldLines(route.outputFields));
  }
  for (const grant of route.access) {
    lines.push(`Access grant ${grant.grantId}`);
    lines.push(`Actor: ${grant.actorRef}`);
    lines.push(`Scope: ${grant.scope || '(none)'}`);
    if (grant.anchorEntity) lines.push(`Anchor: ${grant.anchorEntity}`);
    if (grant.scopeDetail) lines.push(grant.scopeDetail);
    lines.push(`Disclosure ${grant.disclosure || '(none)'}${grant.disclosureDetail ? `: ${grant.disclosureDetail}` : ''}`);
    if (grant.allowedFields.length) {
      lines.push('Allowed fields:');
      for (const field of grant.allowedFields) lines.push(`- ${field}`);
    }
  }
  if (!route.access.length) lines.push('Access: (none for this route).');
  return lines;
}

function fieldLines(fields: readonly D1ContractPath[]): string[] {
  return fields.map(field => `- ${field.path}${field.optional ? '?' : ''}: ${field.type}`);
}

function emptyRoute(route: string, page: string, contractPath: string, access: D1AccessGrant[], unbound: string): D1RouteContext {
  return {
    route,
    page,
    contractPath,
    inputSymbol: '',
    outputSymbol: '',
    inputFields: [],
    outputFields: [],
    unbound,
    access,
  };
}

function symbolFields(ast: D1ContractAst, symbol: string): { label: string; fields: D1ContractField[] } | null {
  const found = ast.symbols.filter(item => item.name === symbol);
  if (found.length !== 1) return null;
  const item = found[0];
  if (item.shape === 'array' && item.element) {
    const inner = ast.symbols.filter(entry => entry.name === item.element);
    if (inner.length !== 1) return null;
    return { label: `${symbol}: array of ${item.element}`, fields: inner[0].fields };
  }
  if (item.shape === 'array' && !item.fields.length) return null;
  return { label: symbol, fields: item.fields };
}

function flattenFields(fields: readonly D1ContractField[]): D1ContractPath[] {
  const out: D1ContractPath[] = [];
  for (const field of fields) out.push(...flattenType(field.name, field.type, field.optional));
  return out;
}

function flattenType(path: string, type: string, optional: boolean): D1ContractPath[] {
  const inner = objectBody(type.trim());
  if (inner === null) return [{ path, type, optional }];
  const members = objectMembers(inner);
  if (!members) return [{ path, type, optional }];
  const out: D1ContractPath[] = [{ path, type: 'object', optional }];
  for (const member of members) out.push(...flattenType(`${path}.${member.name}`, member.type, member.optional));
  return out;
}

function objectBody(type: string): string | null {
  if (!type.startsWith('{')) return null;
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  for (let index = 0; index < type.length; index += 1) {
    const char = type[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) inString = false;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        if (type.slice(index + 1).trim()) return null;
        return type.slice(1, index);
      }
    }
  }
  return null;
}

function objectMembers(body: string): Array<{ name: string; type: string; optional: boolean }> | null {
  const members: Array<{ name: string; type: string; optional: boolean }> = [];
  let index = 0;
  while (index < body.length) {
    while (index < body.length && /[\s,;]/.test(body[index])) index += 1;
    if (index >= body.length) break;
    const mark = index;
    const name = readMemberName(body, index);
    if (!name) return null;
    index = name.end;
    while (index < body.length && /\s/.test(body[index])) index += 1;
    let optional = false;
    if (body[index] === '?') {
      optional = true;
      index += 1;
      while (index < body.length && /\s/.test(body[index])) index += 1;
    }
    if (body[index] !== ':') return null;
    index += 1;
    const typed = readMemberType(body, index);
    if (!typed) return null;
    index = typed.end;
    if (index === mark) return null;
    members.push({ name: name.text, type: typed.text, optional });
  }
  return members;
}

function readMemberName(body: string, index: number): { text: string; end: number } | null {
  const quote = body[index];
  if (quote === '"' || quote === "'") {
    let end = index + 1;
    let escaped = false;
    while (end < body.length) {
      const char = body[end];
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) return { text: body.slice(index + 1, end), end: end + 1 };
      end += 1;
    }
    return null;
  }
  const match = /^[A-Za-z_$][\w$]*/.exec(body.slice(index));
  if (!match) return null;
  return { text: match[0], end: index + match[0].length };
}

function readMemberType(body: string, start: number): { text: string; end: number } | null {
  let index = start;
  while (index < body.length && /\s/.test(body[index])) index += 1;
  const from = index;
  let depthBrace = 0;
  let depthBracket = 0;
  let depthParen = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  while (index < body.length) {
    const char = body[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) inString = false;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      index += 1;
      continue;
    }
    const flat = depthBrace === 0 && depthBracket === 0 && depthParen === 0;
    if (flat && (char === ',' || char === ';')) break;
    if (char === '{') depthBrace += 1;
    else if (char === '}') {
      if (depthBrace === 0) break;
      depthBrace -= 1;
    } else if (char === '[') depthBracket += 1;
    else if (char === ']') {
      if (depthBracket === 0) break;
      depthBracket -= 1;
    } else if (char === '(') depthParen += 1;
    else if (char === ')') {
      if (depthParen === 0) break;
      depthParen -= 1;
    }
    index += 1;
  }
  const text = body.slice(from, index).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return { text, end: index };
}

function pageActors(needs: unknown, pageId: string): string[] {
  if (!isRecord(needs) || !Array.isArray(needs.pages)) return [];
  const page = needs.pages.find(item => isRecord(item) && item.pageId === pageId);
  if (!isRecord(page)) return [];
  return stringList(page.actors);
}

function grantsFor(access: unknown, actors: readonly string[], entityId: string): D1AccessGrant[] {
  if (!isRecord(access) || !Array.isArray(access.grants)) return [];
  const out: D1AccessGrant[] = [];
  for (const grant of access.grants) {
    if (!isRecord(grant) || typeof grant.grantId !== 'string') continue;
    const actorRef = typeof grant.actorRef === 'string' ? grant.actorRef : '';
    if (!actors.includes(actorRef) || !stringList(grant.entityRefs).includes(entityId)) continue;
    const scope = isRecord(grant.dataScope) ? grant.dataScope : {};
    const disclosure = isRecord(grant.disclosure) ? grant.disclosure : {};
    out.push({
      grantId: grant.grantId,
      actorRef,
      scope: typeof scope.mode === 'string' ? scope.mode : '',
      anchorEntity: typeof scope.anchorEntity === 'string' ? scope.anchorEntity : '',
      scopeDetail: typeof scope.description === 'string' ? scope.description : '',
      disclosure: typeof disclosure.mode === 'string' ? disclosure.mode : '',
      disclosureDetail: typeof disclosure.description === 'string' ? disclosure.description : '',
      allowedFields: stringList(disclosure.allowedFields),
    });
  }
  return out;
}

function pageCitations(needs: unknown, pageId: string): Array<{ journeyId: string; stepId: string }> {
  if (!isRecord(needs) || !Array.isArray(needs.pages)) return [];
  const page = needs.pages.find(item => isRecord(item) && item.pageId === pageId);
  if (!isRecord(page)) return [];
  const out: Array<{ journeyId: string; stepId: string }> = [];
  for (const bucket of ['reads', 'writes']) {
    const rows = page[bucket];
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!isRecord(row)) continue;
      for (const ref of stringList(row.from)) {
        const match = /^journey:([^/]+)\/([^/]+)$/.exec(ref);
        if (match) out.push({ journeyId: match[1], stepId: match[2] });
      }
    }
  }
  return out;
}

function symbolMissing(path: string, route: string, symbol: string): D1SourceFinding {
  return {
    code: 'CONTRACT_UNPARSED',
    path,
    message: `Route ${route} symbol ${symbol} has no declared form in ${path}. The usecase was not sent to the model.`,
  };
}

function ruleMissing(ruleId: string, path: string): D1SourceFinding {
  return {
    code: 'RULE_TEXT_ABSENT',
    path,
    message: `Rule ${ruleId} has no text in ${path}. The usecase was not sent to the model.`,
  };
}

function rememberFile(files: D1SourceText[], path: string, text: string): void {
  if (!path || !text || files.some(item => item.path === path)) return;
  files.push({ path, text });
}

async function take(
  project: number,
  path: string,
  kind: 'defs' | 'json',
  digests: readonly D1SourceDigest[],
  findings: D1SourceFinding[],
  hashes: D1SourceHash[],
  files: D1SourceText[],
): Promise<unknown | null> {
  const opened = await openVerified(project, path, digests);
  if ('finding' in opened) {
    findings.push(opened.finding);
    return null;
  }
  rememberFile(files, path, opened.text);
  if (path.includes('/web/contracts/')) {
    hashes.push({ path, sha256: opened.sha256 });
    return opened.text;
  }
  const parsed = parseD1Source(opened.text, kind);
  if (parsed == null) {
    findings.push(absent(path, `Source ${path} did not parse. The usecase was not sent to the model.`));
    return null;
  }
  hashes.push({ path, sha256: opened.sha256 });
  return parsed;
}

async function openVerified(
  project: number,
  path: string,
  digests: readonly D1SourceDigest[],
): Promise<{ text: string; sha256: string } | { finding: D1SourceFinding }> {
  const digest = digests.find(item => item.path === path);
  if (!digest) return { finding: absent(path, `Source ${path} has no snapshot hash. The usecase was not sent to the model.`) };
  const text = await readLogical(project, path);
  if (text == null) return { finding: absent(path) };
  const sha256 = await sha256Text(text);
  if (!digest.sha256 || digest.sha256 !== sha256 || digest.state === 'missing') return { finding: changed(path) };
  return { text, sha256 };
}

async function readSource(project: number, path: string): Promise<string | null> {
  if (path.includes('/_') && path.includes('_/')) return readCatalogText(path.startsWith('/') ? path : `/${path}`);
  return readLogical(project, path);
}

async function readLogical(project: number, logicalPath: string): Promise<string | null> {
  const info = artifactFile(project, qualifyDefPath(project, logicalPath));
  if (!info) return null;
  return readText(info);
}

async function readCatalogText(source: string): Promise<string | null> {
  const info = catalogInfo(source);
  if (!info) return null;
  return readText(info);
}

function journeyView(journeyId: string, path: string, body: unknown): JourneyView | null {
  if (!isRecord(body)) return null;
  const business = isRecord(body.business) ? body.business : null;
  if (!business) return null;
  const steps: JourneyStepView[] = [];
  if (Array.isArray(business.steps)) {
    for (const step of business.steps) {
      if (!isRecord(step) || typeof step.stepId !== 'string') continue;
      steps.push({
        stepId: step.stepId,
        kind: typeof step.kind === 'string' ? step.kind : '',
        entity: typeof step.entity === 'string' ? step.entity : '',
        effect: typeof step.effect === 'string' ? step.effect : '',
        transitionRef: typeof step.transitionRef === 'string' ? step.transitionRef : '',
        description: typeof step.description === 'string' ? step.description : '',
      });
    }
  }
  return {
    journeyId,
    path,
    actorRef: typeof business.actorRef === 'string' ? business.actorRef : '',
    goal: typeof business.goal === 'string' ? business.goal : '',
    steps,
  };
}

function journeyIdFromPath(path: string, moduleName: string): string {
  const prefix = `l4/${moduleName}/journeys/`;
  if (!path.startsWith(prefix) || !path.endsWith('.defs.ts')) return '';
  const id = path.slice(prefix.length, -'.defs.ts'.length);
  if (!id || id.includes('/') || id === 'index') return '';
  return id;
}

function outboundEvents(value: unknown): D1OutboundEvent[] {
  if (!isRecord(value) || !Array.isArray(value.outbound)) return [];
  const out: D1OutboundEvent[] = [];
  for (const item of value.outbound) {
    if (!isRecord(item)) continue;
    const eventId = typeof item.event === 'string' ? item.event : typeof item.eventId === 'string' ? item.eventId : '';
    const on = typeof item.on === 'string' ? item.on : '';
    if (!eventId || !on) continue;
    const event: D1OutboundEvent = { eventId, on };
    if (typeof item.kind === 'string') event.kind = item.kind;
    if (typeof item.to === 'string') event.to = item.to;
    if (typeof item.description === 'string') event.description = item.description;
    out.push(event);
  }
  return out;
}

function ruleTexts(value: unknown): Record<string, string> | null {
  if (!isRecord(value) || !isRecord(value.rules)) return null;
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value.rules)) {
    if (typeof item === 'string') out[key] = item;
    else if (item !== undefined) out[key] = JSON.stringify(item);
  }
  return out;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function absent(path: string, message?: string): D1SourceFinding {
  return {
    code: 'SOURCE_ABSENT',
    path,
    message: message || `Source ${path} is absent. The usecase was not sent to the model.`,
  };
}

function changed(path: string): D1SourceFinding {
  return {
    code: 'SOURCE_CHANGED',
    path,
    message: `Source ${path} changed after the approved snapshot. The usecase was not sent to the model.`,
  };
}
