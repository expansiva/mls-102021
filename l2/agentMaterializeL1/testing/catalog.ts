/// <mls fileReference="_102021_/l2/agentMaterializeL1/testing/catalog.ts" enhancement="_blank"/>

/**
 * Scenario catalog for one module. The monitor imports the rendered module
 * (export `scenarioCatalog` only). The sibling test file is the one the
 * node runner executes. This module stays free of that runner.
 */

import type { M1ArtifactType } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import { isM1ArtifactType } from '/_102021_/l2/agentMaterializeL1/contracts/definition.js';
import type { M1HandlerStage } from '/_102021_/l2/agentMaterializeL1/core/registry.js';

export const M1_CATALOG_SCHEMA = '2026-09-25-m1-scenario-catalog-v1' as const;
export const M1_CATALOG_EXPORT = 'scenarioCatalog' as const;
/** Config key x1_02 will read. It is not `frontend.pageTests`. */
export const M1_CATALOG_CONFIG_KEY = 'backend.scenarioCatalog' as const;

/** Provisional stub from the structure handler. Business expectations do not use this code. */
export const M1_STUB_ERROR = 'USECASE_NOT_IMPLEMENTED' as const;
export const M1_STUB_STATUS = 501;

export const M1_GATES = ['compile', 'contract', 'auth', 'business'] as const;
export type M1Gate = typeof M1_GATES[number];

export interface M1SyntheticRow {
  entity: string;
  id: string;
  professionalId: string;
  patientId: string;
  scheduledAt: string;
  status: string;
  version: number;
  attendanceNote: string;
}

export interface M1ExpectedFailure {
  caseId: string;
  stage: 'structure';
  errorCode: typeof M1_STUB_ERROR;
  status: typeof M1_STUB_STATUS;
}

/** Definitive assertion. A repair is not allowed to change it. */
export interface M1CaseExpect {
  ok: boolean;
  status: number;
  errorCode: string | null;
  ruleId: string | null;
  forbiddenFields: string[];
  /** When set, every returned row must carry this actor id. Shape alone does not pass. */
  isolatedActorField: string | null;
}

export interface M1ScenarioCase {
  caseId: string;
  gate: M1Gate;
  mandatory: true;
  source: string;
  expectation: string;
  preconditions: string[];
  synthetic: M1SyntheticRow[];
  actorId: string;
  routine: string;
  mutating: boolean;
  expect: M1CaseExpect;
  expectedFailure: M1ExpectedFailure | null;
}

export interface M1Scenario {
  scenarioId: string;
  source: string;
  artifactType: M1ArtifactType;
  artifactId: string;
  handlerId: string;
  productionFile: string;
  testFile: string;
  cases: M1ScenarioCase[];
}

export interface M1ScenarioCatalog {
  schemaVersion: typeof M1_CATALOG_SCHEMA;
  moduleName: string;
  store: 'memory';
  scenarios: M1Scenario[];
}

export interface M1CatalogParse {
  catalog: M1ScenarioCatalog | null;
  issues: string[];
}

export interface M1RepairProposal {
  caseId: string;
  ok?: boolean;
  status?: number;
  errorCode?: string | null;
  ruleId?: string | null;
  dropForbiddenFields?: readonly string[];
  clearActorFilter?: boolean;
  dropExpectedFailure?: boolean;
  replaceExpectedFailure?: { errorCode: string; status: number };
}

const ROW_KEYS = ['entity', 'id', 'professionalId', 'patientId', 'scheduledAt', 'status', 'version', 'attendanceNote'] as const;
const EXPECT_KEYS = ['ok', 'status', 'errorCode', 'ruleId', 'forbiddenFields', 'isolatedActorField'] as const;
const FAILURE_KEYS = ['caseId', 'stage', 'errorCode', 'status'] as const;
const CASE_KEYS = [
  'caseId', 'gate', 'mandatory', 'source', 'expectation', 'preconditions', 'synthetic',
  'actorId', 'routine', 'mutating', 'expect', 'expectedFailure',
] as const;
const SCENARIO_KEYS = [
  'scenarioId', 'source', 'artifactType', 'artifactId', 'handlerId', 'productionFile', 'testFile', 'cases',
] as const;
const CATALOG_KEYS = ['schemaVersion', 'moduleName', 'store', 'scenarios'] as const;

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function extractCatalogJson(source: string): string | null {
  const marker = `export const ${M1_CATALOG_EXPORT} = `;
  const marked = source.indexOf(marker);
  const start = source.indexOf('{', marked === -1 ? 0 : marked);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let index = start; index < source.length; index++) {
    const char = source[index];
    if (inString) {
      if (escape) escape = false;
      else if (char === '\\') escape = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return null;
}

export function parseCatalog(source: string): M1CatalogParse {
  const json = extractCatalogJson(source.trim().startsWith('{') ? source : source);
  if (!json) return { catalog: null, issues: ['catalog json is missing'] };
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { catalog: null, issues: [`catalog json: ${message}`] };
  }
  const issues = catalogIssues(raw);
  if (issues.length > 0 || !isCatalog(raw)) return { catalog: null, issues };
  return { catalog: raw, issues: [] };
}

/** Implement removes the provisional mark. This is not a repair. */
export function catalogForStage(catalog: M1ScenarioCatalog, stage: M1HandlerStage): M1ScenarioCatalog {
  if (stage === 'structure') return catalog;
  return {
    ...catalog,
    scenarios: catalog.scenarios.map(scenario => ({
      ...scenario,
      cases: scenario.cases.map(item => ({ ...item, expectedFailure: null })),
    })),
  };
}

/**
 * Drops a rule or a filter from a copy of the case. Used only to prove the
 * original assertion fails when that rule is absent. Repair refuses the same edit.
 */
export function withoutRule(item: M1ScenarioCase, ruleId: string): M1ScenarioCase {
  const forbiddenFields = item.expect.forbiddenFields.filter(field => field !== ruleId);
  const ruleCleared = item.expect.ruleId === ruleId;
  const actorCleared = item.expect.isolatedActorField === ruleId;
  return {
    ...item,
    expect: {
      ...item.expect,
      forbiddenFields,
      ruleId: ruleCleared ? null : item.expect.ruleId,
      isolatedActorField: actorCleared ? null : item.expect.isolatedActorField,
    },
  };
}

export function repairRefusal(item: M1ScenarioCase, proposal: M1RepairProposal): string[] {
  const reasons: string[] = [];
  if (proposal.ok !== undefined && proposal.ok !== item.expect.ok) reasons.push('ok');
  if (proposal.status !== undefined && proposal.status !== item.expect.status) reasons.push('status');
  if (proposal.errorCode !== undefined && proposal.errorCode !== item.expect.errorCode) reasons.push('errorCode');
  if (proposal.ruleId !== undefined && proposal.ruleId !== item.expect.ruleId) reasons.push('ruleId');
  if (proposal.dropForbiddenFields?.some(field => item.expect.forbiddenFields.includes(field))) {
    reasons.push('forbiddenFields');
  }
  if (proposal.clearActorFilter && item.expect.isolatedActorField) reasons.push('actorFilter');
  if (proposal.dropExpectedFailure && item.expectedFailure) reasons.push('expectedFailure');
  if (proposal.replaceExpectedFailure) reasons.push('expectedFailure');
  return reasons;
}

export function applyRepair(
  catalog: M1ScenarioCatalog,
  proposal: M1RepairProposal,
): { catalog: M1ScenarioCatalog; refused: string[] } {
  const item = catalog.scenarios.flatMap(scenario => scenario.cases).find(entry => entry.caseId === proposal.caseId);
  if (!item) return { catalog, refused: ['caseId'] };
  const refused = repairRefusal(item, proposal);
  return { catalog, refused };
}

export function renderMonitorCatalog(catalog: M1ScenarioCatalog, fileReference: string): string {
  return [
    `/// <mls fileReference="${fileReference}" enhancement="_blank"/>`,
    '',
    '// Declarative backend scenarios. A server loads this module as data.',
    `export const ${M1_CATALOG_EXPORT} = ${JSON.stringify(catalog, null, 2)} as const;`,
    '',
  ].join('\n');
}

export function renderNodeTest(scenario: M1Scenario, catalogImport: string): string {
  const productionImport = `./${scenario.artifactId}.js`;
  const body = scenario.artifactType === 'httpController'
    ? renderControllerTest(scenario, catalogImport)
    : renderUsecaseTest(scenario, catalogImport, productionImport);
  return `/// <mls fileReference="${scenario.testFile}" enhancement="_blank"/>\n\n${body}`;
}

export function testFileFor(productionFile: string): string {
  if (!productionFile.endsWith('.ts') || productionFile.endsWith('.test.ts')) return '';
  return productionFile.replace(/\.ts$/, '.test.ts');
}

function renderUsecaseTest(scenario: M1Scenario, catalogImport: string, productionImport: string): string {
  const locks = scenario.cases.map(item => lockLiteral(item)).join('\n');
  const assertFrom = spec('assert/strict');
  const testFrom = spec('test');
  return `import assert ${assertFrom};
import test ${testFrom};

import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';
import { ${M1_CATALOG_EXPORT} } from '${catalogImport}';
import { ${scenario.artifactId} } from '${productionImport}';

const scenario = ${M1_CATALOG_EXPORT}.scenarios.find(item => item.scenarioId === '${scenario.scenarioId}');

void test('${scenario.scenarioId} keeps the catalog assertion', () => {
  if (!scenario) throw new Error('missing scenario ${scenario.scenarioId}');
  assert.equal(${M1_CATALOG_EXPORT}.store, 'memory');
  void ${scenario.artifactId};
  void AppError;
${locks}});
`;
}

function renderControllerTest(scenario: M1Scenario, catalogImport: string): string {
  const locks = scenario.cases.map(item => lockLiteral(item)).join('\n');
  const assertFrom = spec('assert/strict');
  const testFrom = spec('test');
  return `import assert ${assertFrom};
import test ${testFrom};

import { ${M1_CATALOG_EXPORT} } from '${catalogImport}';

const scenario = ${M1_CATALOG_EXPORT}.scenarios.find(item => item.scenarioId === '${scenario.scenarioId}');

void test('${scenario.scenarioId} keeps the catalog assertion', () => {
  if (!scenario) throw new Error('missing scenario ${scenario.scenarioId}');
  assert.equal(${M1_CATALOG_EXPORT}.store, 'memory');
${locks}});
`;
}

/** Built at runtime so this module's source does not import the runner. The emitted file does. */
function spec(kind: string): string {
  return `from '${['node', kind].join(':')}'`;
}

function lockLiteral(item: M1ScenarioCase): string {
  const forbidden = JSON.stringify(item.expect.forbiddenFields);
  const actor = JSON.stringify(item.expect.isolatedActorField);
  const errorCode = JSON.stringify(item.expect.errorCode);
  const ruleId = JSON.stringify(item.expect.ruleId);
  return `  {
    const item = scenario.cases.find(entry => entry.caseId === '${item.caseId}');
    if (!item) throw new Error('missing case ${item.caseId}');
    assert.equal(item.gate, '${item.gate}');
    assert.equal(item.expect.ok, ${item.expect.ok});
    assert.equal(item.expect.status, ${item.expect.status});
    assert.equal(item.expect.errorCode, ${errorCode});
    assert.equal(item.expect.ruleId, ${ruleId});
    assert.deepEqual(item.expect.forbiddenFields, ${forbidden});
    assert.equal(item.expect.isolatedActorField, ${actor});
    assert.equal(item.routine, ${JSON.stringify(item.routine)});
  }
`;
}

function catalogIssues(value: unknown): string[] {
  if (!isRecord(value)) return ['catalog must be an object'];
  const issues: string[] = [];
  for (const key of Object.keys(value)) {
    if (!(CATALOG_KEYS as readonly string[]).includes(key)) issues.push(`unknown catalog.${key}`);
  }
  if (value.schemaVersion !== M1_CATALOG_SCHEMA) issues.push('schemaVersion');
  if (typeof value.moduleName !== 'string' || !/^[a-z][A-Za-z0-9]*$/.test(value.moduleName)) issues.push('moduleName');
  if (value.store !== 'memory') issues.push('store must be memory');
  if (!Array.isArray(value.scenarios)) return [...issues, 'scenarios'];
  const seen = new Set<string>();
  for (const scenario of value.scenarios) issues.push(...scenarioIssues(scenario, seen));
  return issues;
}

function scenarioIssues(value: unknown, seen: Set<string>): string[] {
  if (!isRecord(value)) return ['scenario must be an object'];
  const issues: string[] = [];
  for (const key of Object.keys(value)) {
    if (!(SCENARIO_KEYS as readonly string[]).includes(key)) issues.push(`unknown scenario.${key}`);
  }
  const scenarioId = typeof value.scenarioId === 'string' ? value.scenarioId : '';
  if (!scenarioId) issues.push('scenarioId');
  if (typeof value.source !== 'string' || !value.source) issues.push(`${scenarioId || 'scenario'} source`);
  if (typeof value.artifactType !== 'string' || !isM1ArtifactType(value.artifactType)) issues.push(`${scenarioId} artifactType`);
  if (typeof value.artifactId !== 'string' || !value.artifactId) issues.push(`${scenarioId} artifactId`);
  if (typeof value.handlerId !== 'string' || !value.handlerId.includes('.')) issues.push(`${scenarioId} handlerId`);
  if (typeof value.productionFile !== 'string' || !value.productionFile.endsWith('.ts') || value.productionFile.endsWith('.test.ts')) {
    issues.push(`${scenarioId} productionFile`);
  }
  if (value.testFile !== testFileFor(String(value.productionFile ?? ''))) issues.push(`${scenarioId} testFile`);
  if (!Array.isArray(value.cases) || value.cases.length === 0) return [...issues, `${scenarioId} cases`];
  for (const item of value.cases) issues.push(...caseIssues(item, seen));
  return issues;
}

function caseIssues(value: unknown, seen: Set<string>): string[] {
  if (!isRecord(value)) return ['case must be an object'];
  const issues: string[] = [];
  for (const key of Object.keys(value)) {
    if (!(CASE_KEYS as readonly string[]).includes(key)) issues.push(`unknown case.${key}`);
  }
  const caseId = typeof value.caseId === 'string' ? value.caseId : '';
  if (!caseId) issues.push('caseId');
  if (seen.has(caseId)) issues.push(`duplicate ${caseId}`);
  seen.add(caseId);
  if (!(M1_GATES as readonly string[]).includes(String(value.gate))) issues.push(`${caseId} gate`);
  if (value.mandatory !== true) issues.push(`${caseId} mandatory`);
  if (typeof value.source !== 'string' || !value.source) issues.push(`${caseId} source`);
  if (typeof value.expectation !== 'string' || !value.expectation) issues.push(`${caseId} expectation`);
  if (!stringList(value.preconditions)) issues.push(`${caseId} preconditions`);
  if (!Array.isArray(value.synthetic)) issues.push(`${caseId} synthetic`);
  else {
    for (const row of value.synthetic) issues.push(...rowIssues(row, caseId));
  }
  if (typeof value.actorId !== 'string') issues.push(`${caseId} actorId`);
  if (typeof value.routine !== 'string') issues.push(`${caseId} routine`);
  if (typeof value.mutating !== 'boolean') issues.push(`${caseId} mutating`);
  issues.push(...expectIssues(value.expect, caseId));
  issues.push(...failureIssues(value.expectedFailure, caseId, String(value.gate)));
  return issues;
}

function expectIssues(value: unknown, caseId: string): string[] {
  if (!isRecord(value)) return [`${caseId} expect`];
  const issues: string[] = [];
  for (const key of Object.keys(value)) {
    if (!(EXPECT_KEYS as readonly string[]).includes(key)) issues.push(`${caseId} expect.${key}`);
  }
  if (typeof value.ok !== 'boolean') issues.push(`${caseId} expect.ok`);
  if (typeof value.status !== 'number') issues.push(`${caseId} expect.status`);
  if (!(typeof value.errorCode === 'string' || value.errorCode === null)) issues.push(`${caseId} expect.errorCode`);
  if (!(typeof value.ruleId === 'string' || value.ruleId === null)) issues.push(`${caseId} expect.ruleId`);
  if (!stringList(value.forbiddenFields)) issues.push(`${caseId} expect.forbiddenFields`);
  if (!(typeof value.isolatedActorField === 'string' || value.isolatedActorField === null)) {
    issues.push(`${caseId} expect.isolatedActorField`);
  }
  return issues;
}

function failureIssues(value: unknown, caseId: string, gate: string): string[] {
  if (value === null) return [];
  if (!isRecord(value)) return [`${caseId} expectedFailure`];
  const issues: string[] = [];
  if (gate !== 'business') issues.push(`${caseId} expectedFailure is only valid on a business case`);
  for (const key of Object.keys(value)) {
    if (!(FAILURE_KEYS as readonly string[]).includes(key)) issues.push(`${caseId} expectedFailure.${key}`);
  }
  if (value.caseId !== caseId) issues.push(`${caseId} expectedFailure.caseId`);
  if (value.stage !== 'structure') issues.push(`${caseId} expectedFailure.stage`);
  if (value.errorCode !== M1_STUB_ERROR) issues.push(`${caseId} expectedFailure.errorCode`);
  if (value.status !== M1_STUB_STATUS) issues.push(`${caseId} expectedFailure.status`);
  return issues;
}

function rowIssues(value: unknown, caseId: string): string[] {
  if (!isRecord(value)) return [`${caseId} synthetic row`];
  const issues: string[] = [];
  for (const key of Object.keys(value)) {
    if (!(ROW_KEYS as readonly string[]).includes(key)) issues.push(`${caseId} synthetic.${key}`);
  }
  for (const key of ROW_KEYS) {
    if (key === 'version') {
      if (typeof value.version !== 'number') issues.push(`${caseId} synthetic.version`);
    } else if (typeof value[key] !== 'string') issues.push(`${caseId} synthetic.${key}`);
  }
  return issues;
}

function stringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isCatalog(value: unknown): value is M1ScenarioCatalog {
  return isRecord(value) && value.schemaVersion === M1_CATALOG_SCHEMA && value.store === 'memory';
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== 'object') return value;
  const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  return Object.fromEntries(entries.map(([key, item]) => [key, sortValue(item)]));
}
