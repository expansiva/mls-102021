/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/workflows45/entityEnumType.test.ts" enhancement="_blank"/>

// d1_243 s1: an exported field that carries an entity enum uses <Entity>['<field>']. The list is the enum fields of
// the entities the process writes. A string field and an entity the process only cites stay out.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { entityEnumTypes, loadWorkflowContext } from '/_102021_/l2/agentMaterializeL1/steps/workflows45/context.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';

const PROJECT = 102099;
const MODULE = 'agents';
const FIXTURES = path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures');
const TOOL_ONTOLOGY = readFileSync(path.join(FIXTURES, 'toolOntology399835c1.recorded.txt'), 'utf8');
const AGENT_ONTOLOGY = readFileSync(path.join(FIXTURES, 'agentOntology399835c1.recorded.txt'), 'utf8');

void test('d1_243: Tool origin and status are the enum types; a string field and an entity with no enum are not', () => {
  assert.deepEqual(entityEnumTypes('Tool', TOOL_ONTOLOGY), [
    "Tool.origin: `Tool['origin']`",
    "Tool.status: `Tool['status']`",
  ]);
  assert.deepEqual(entityEnumTypes('Agent', AGENT_ONTOLOGY), []);
});

function entityUnit(entityId: string): M12Unit {
  const data = { entityId };
  return {
    unitId: entityId,
    defRef: '',
    outputRef: `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/${entityId}.ts`,
    output: '',
    definition: { artifactType: 'domainEntity', artifactId: entityId, moduleName: MODULE, dependencies: [], data },
    declared: { data },
  } as unknown as M12Unit;
}

void test('d1_243: the toolCatalogRefresh context names Tool origin and skips a cited entity enum', async () => {
  const processId = 'toolCatalogRefresh';
  const data = {
    processId,
    trigger: { kind: 'event', event: 'platform.releaseCatalogChanged' },
    occurrence: { entityId: 'Tool' },
    functions: ['applyReleaseCatalog'],
    operations: [{ operation: 'Tool.create', steps: ['rebuild'] }],
  };
  const unit = {
    unitId: processId,
    defRef: '',
    outputRef: `_${PROJECT}_/l1/${MODULE}/layer_2_application/workflows/${processId}.ts`,
    definition: { artifactType: 'workflowProcess', artifactId: processId, moduleName: MODULE, dependencies: [], data },
    declared: { data },
  } as unknown as M12Unit;
  const process = {
    processId,
    functions: [{ functionId: 'applyReleaseCatalog', description: 'Rebuilds the catalog and reads the agent draft title.' }],
  };
  const l4 = `export const workflows = ${JSON.stringify({ processes: [process] })} as const;\n`;
  const draft = `export const ontology = ${JSON.stringify({
    entityId: 'AgentDraft',
    title: 'agent draft',
    lifecycleStates: [],
    transitions: [],
    record: { fields: { situation: { type: 'enum', values: ['open', 'closed'] }, note: { type: 'string' } } },
  })} as const;\n`;
  const files: Record<string, string> = {
    [`_${PROJECT}_/l4/${MODULE}/workflows.defs.ts`]: l4,
    [`_${PROJECT}_/l4/${MODULE}/ontology/Tool.defs.ts`]: TOOL_ONTOLOGY,
    [`_${PROJECT}_/l4/${MODULE}/ontology/AgentDraft.defs.ts`]: draft,
  };
  const ctx = {
    run: { project: PROJECT, module: MODULE },
    units: [entityUnit('Tool'), entityUnit('AgentDraft'), unit],
    appEnv: 'test',
    read: async (ref: string) => files[ref] ?? null,
  };
  const loaded = await loadWorkflowContext(ctx as never, unit);
  assert.match(loaded.human, /Tool\.origin: `Tool\['origin'\]`/);
  assert.match(loaded.human, /Tool\.status: `Tool\['status'\]`/);
  assert.equal(loaded.human.includes("Tool['toolKey']"), false);
  assert.equal(loaded.human.includes("AgentDraft['situation']"), false);
});

void test('d1_243: the draft origin platform does not compile against Tool origin; appModule does', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'd243-'));
  const tool = `export type Tool = { origin: 'appModule' | 'cm' };\n`;
  const workflow = `import type { Tool } from './tool.js';\nexport interface ReleaseCatalogItem { toolKey: string; origin: Tool['origin']; }\n`;
  const platform = (origin: string) => `import type { ReleaseCatalogItem } from './toolCatalogRefresh.js';\nexport const item: ReleaseCatalogItem = { toolKey: 'agents.list', origin: '${origin}' };\n`;
  writeFileSync(path.join(dir, 'tool.ts'), tool);
  writeFileSync(path.join(dir, 'toolCatalogRefresh.ts'), workflow);
  writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { strict: true, target: 'ES2022', module: 'nodenext', moduleResolution: 'nodenext', noEmit: true, skipLibCheck: true },
    include: ['platform.ts', 'toolCatalogRefresh.ts', 'tool.ts'],
  }));
  const tsc = path.join(path.dirname(new URL(import.meta.url).pathname), '../../../../../node_modules/.bin/tsc');
  const run = (origin: string): string => {
    writeFileSync(path.join(dir, 'platform.ts'), platform(origin));
    try {
      execFileSync(tsc, ['-p', dir, '--pretty', 'false'], { encoding: 'utf8' });
      return '';
    } catch (error) {
      const failed = error as { stdout?: string; stderr?: string };
      return `${failed.stdout ?? ''}${failed.stderr ?? ''}`;
    }
  };
  const refused = run('platform');
  assert.match(refused, /"platform"/);
  assert.equal(run('appModule'), '');
});
