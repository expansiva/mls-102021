/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/catalog75/describe.ts" enhancement="_blank"/>

import { asArray, asRecord, asString } from '/_102020_/l2/helpers/assistantCatalog/asCatalog.js';
import { extractExportedObject, flattenType, parseContractSource } from '/_102020_/l2/helpers/assistantCatalog/asSource.js';
import type { AsTypeNode } from '/_102020_/l2/helpers/assistantCatalog/asTypes.js';

export interface CatalogWriteUsecase {
  entityId: string;
  operation: string;
  transitionRef: string;
}

export interface TitleOfCommandInput {
  usecaseText: string;
  journeyTexts: readonly string[];
  sharedPageText: string;
  purpose: string;
}

export interface TitleOfQueryInput {
  entity: string;
  journeyTexts: readonly string[];
  sharedPageText: string;
  purpose: string;
}

export interface RouteAccess {
  actors: string[];
  rules: string[];
}

export interface CatalogPage {
  address: string;
  recordParam?: string;
}

export interface PageOfRouteInput {
  route: string;
  project: string;
  module: string;
  configText: string;
  sharedPageText?: string;
}

interface JourneyStep {
  journeyId: string;
  stepId: string;
  kind: string;
  entity: string;
  title: string;
  effect: string;
  transitionRef: string;
}

interface PageStepRef {
  journeyId: string;
  stepId: string;
}

export function titleOfCommand(input: TitleOfCommandInput): string {
  const usecase = readWriteUsecase(input.usecaseText);
  const steps = readJourneySteps(input.journeyTexts).filter(step => stepMatchesUsecase(step, usecase));
  const onPage = pageStepIndex(readPageSteps(input.sharedPageText));
  const listed = steps.filter(step => onPage.has(stepKey(step.journeyId, step.stepId)));
  const chosen = listed.length
    ? listed.reduce((best, step) => (onPage.get(stepKey(step.journeyId, step.stepId))! < onPage.get(stepKey(best.journeyId, best.stepId))! ? step : best))
    : steps[0];
  return chosen?.title || input.purpose;
}

export function titleOfQuery(input: TitleOfQueryInput): string {
  const steps = new Map(readJourneySteps(input.journeyTexts).map(step => [stepKey(step.journeyId, step.stepId), step]));
  for (const ref of readPageSteps(input.sharedPageText)) {
    const step = steps.get(stepKey(ref.journeyId, ref.stepId));
    if (step && (step.kind === 'locate' || step.kind === 'inspect') && step.entity === input.entity && step.title) return step.title;
  }
  return input.purpose;
}

export function accessOfRoute(contractSource: string, route: string): RouteAccess {
  const parsed = parseContractSource(contractSource);
  const node = routeNode(parsed.types, route);
  if (!node || node.kind !== 'object') return { actors: [], rules: [] };
  const rules = node.fields.find(field => field.name === 'rules');
  const access = node.fields.find(field => field.name === 'access');
  const actors = access?.type.kind === 'object' ? access.type.fields.find(field => field.name === 'actors') : undefined;
  return {
    actors: actors ? stringList(actors.type, parsed.types, `actors of ${route}`) : [],
    rules: rules ? stringList(rules.type, parsed.types, `rules of ${route}`) : [],
  };
}

export function pageOfRoute(input: PageOfRouteInput): CatalogPage | undefined {
  const pageId = input.route.split('.')[1] ?? '';
  if (!pageId) return undefined;
  const address = pageAddress(input.configText, input.project, input.module, pageId);
  if (!address) return undefined;
  const recordParam = input.sharedPageText ? urlRecordParam(input.sharedPageText) : undefined;
  return recordParam ? { address, recordParam } : { address };
}

export function optionsOnly(contractSource: string, route: string): boolean {
  const parsed = parseContractSource(contractSource);
  const node = routeNode(parsed.types, route);
  if (!node || node.kind !== 'object') return false;
  const outputField = node.fields.find(field => field.name === 'output')?.type;
  if (!outputField) return false;
  const output = resolveType(outputField, parsed.types);
  if (output.kind !== 'object' || output.fields.length === 0) return false;
  return output.fields.every(field => {
    const type = resolveType(field.type, parsed.types);
    return type.kind === 'array' && optionItem(type.of, parsed.types);
  });
}

function readWriteUsecase(source: string): CatalogWriteUsecase {
  const data = asRecord(exportedObject(source, 'usecase').data);
  const entityId = asString(data.entityId);
  const operation = asString(data.operation);
  if (!entityId || !operation) throw new Error('usecase is missing entityId or operation');
  return { entityId, operation, transitionRef: asString(data.transitionRef) };
}

function readJourneySteps(sources: readonly string[]): JourneyStep[] {
  const steps: JourneyStep[] = [];
  for (const source of sources) {
    const journey = exportedObject(source, 'journey');
    const journeyId = asString(journey.journeyId);
    if (!journeyId) throw new Error('journey is missing journeyId');
    for (const item of asArray(asRecord(journey.business).steps)) {
      const step = asRecord(item);
      const stepId = asString(step.stepId);
      if (!stepId) throw new Error(`journey ${journeyId} has a step without stepId`);
      steps.push({
        journeyId,
        stepId,
        kind: asString(step.kind),
        entity: asString(step.entity),
        title: asString(step.title),
        effect: asString(step.effect),
        transitionRef: asString(step.transitionRef),
      });
    }
  }
  return steps;
}

function readPageSteps(source: string): PageStepRef[] {
  return asArray(exportedObject(source, 'shared page').journeys).flatMap(item => {
    const step = asString(asRecord(item).step);
    const slash = step.indexOf('/');
    if (slash <= 0) return [];
    return [{ journeyId: step.slice(0, slash), stepId: step.slice(slash + 1) }];
  });
}

function stepMatchesUsecase(step: JourneyStep, usecase: CatalogWriteUsecase): boolean {
  if (step.kind !== 'act' || step.entity !== usecase.entityId) return false;
  if (usecase.operation === 'transition') return step.transitionRef === usecase.transitionRef && step.transitionRef !== '';
  return step.effect === usecase.operation;
}

function pageStepIndex(refs: readonly PageStepRef[]): Map<string, number> {
  const index = new Map<string, number>();
  refs.forEach((ref, position) => {
    const key = stepKey(ref.journeyId, ref.stepId);
    if (!index.has(key)) index.set(key, position);
  });
  return index;
}

function stepKey(journeyId: string, stepId: string): string {
  return `${journeyId}/${stepId}`;
}

function routeNode(types: Record<string, AsTypeNode>, route: string): AsTypeNode | undefined {
  for (const node of Object.values(types)) {
    if (node.kind !== 'object') continue;
    const field = node.fields.find(item => item.name === route);
    if (field) return field.type;
  }
  return undefined;
}

function stringList(node: AsTypeNode, types: Record<string, AsTypeNode>, label: string, depth = 0): string[] {
  if (depth > 8) throw new Error(`${label}: type nesting is too deep`);
  if (node.kind === 'literal') return [...node.values];
  if (node.kind === 'tuple') return node.items.flatMap(item => stringList(item, types, label, depth + 1));
  if (node.kind === 'array') return stringList(node.of, types, label, depth + 1);
  if (node.kind === 'ref') {
    const resolved = types[node.name];
    if (!resolved) throw new Error(`${label}: unresolved type ${node.name}`);
    return stringList(resolved, types, label, depth + 1);
  }
  throw new Error(`${label}: cannot read a string list from ${node.kind}`);
}

function pageAddress(configText: string, project: string, moduleName: string, pageId: string): string {
  const root = JSON.parse(configText) as unknown;
  const projects = asRecord(asRecord(root).projects);
  const projectNode = projects[project];
  if (!projectNode) return '';
  const modules = asArray(asRecord(projectNode).modules);
  const moduleNode = modules.map(item => asRecord(item)).find(item => asString(item.moduleId) === moduleName);
  if (!moduleNode) return '';
  const pages = asArray(asRecord(moduleNode.frontend).pages);
  const page = pages.map(item => asRecord(item)).find(item => asString(item.pageId) === pageId);
  const fromPage = asString(page?.route);
  if (fromPage) return fromPage;
  const navigation = asArray(moduleNode.navigation);
  const link = navigation.map(item => asRecord(item)).find(item => asString(item.id) === pageId);
  return asString(link?.href);
}

function urlRecordParam(source: string): string | undefined {
  const params = asRecord(asRecord(exportedObject(source, 'shared page').entry).params);
  const names = Object.keys(params).filter(name => {
    const sources = asArray(asRecord(params[name]).sources).filter((item): item is string => typeof item === 'string');
    return sources.length === 1 && sources[0] === 'url';
  });
  return names.length === 1 ? names[0] : undefined;
}

function resolveType(node: AsTypeNode, types: Record<string, AsTypeNode>): AsTypeNode {
  if (node.kind !== 'ref') return node;
  return types[node.name] ?? { kind: 'primitive', name: 'unknown' };
}

function optionItem(node: AsTypeNode, types: Record<string, AsTypeNode>): boolean {
  const leaves = flattenType(node, types);
  if (leaves.length !== 2 || leaves.some(leaf => !leaf.path || leaf.path.includes('.'))) return false;
  const id = leaves.find(leaf => leaf.path === 'id');
  const label = leaves.find(leaf => leaf.path !== 'id');
  return id?.type.kind === 'primitive' && id.type.name === 'string'
    && label?.type.kind === 'primitive' && label.type.name === 'string';
}

function exportedObject(source: string, label: string): Record<string, unknown> {
  const value = extractExportedObject(source);
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label}: exported object is missing`);
  return value as Record<string, unknown>;
}
