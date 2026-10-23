/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/tests60/testErrorCodes.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { M1_DEFINITION_SCHEMA, type M1Definition } from '/_102021_/l2/helpers/l1Defs/definition.js';
import { M12_SEED_MARKERS, testsGate } from '/_102021_/l2/agentMaterializeL1/helpers/m12Gates.js';
import { writeText } from '/_102021_/l2/agentMaterializeL1/helpers/m12Io.js';
import { createContext } from '/_102021_/l2/agentMaterializeL1/helpers/m12Materialize.js';
import { contractFile, fileRef, type M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { loadTestsContext, thrownErrorCodes } from '/_102021_/l2/agentMaterializeL1/steps/tests60/context.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = 102056;
const MODULE = 'onboarding';
const PAGE = 'my_access_completion';
// 102056 onboarding frozen at its commit dd06abf (byte copies, .txt so tsc skips them).
const FIXTURE = path.join(HERE, 'fixtures', 'onboarding_dd06abf');
const REQUEST_TS = path.join(FIXTURE, 'l1', MODULE, 'layer_2_application', 'requests', `${PAGE}.ts.txt`);
const CONTRACT_TS = path.join(FIXTURE, 'l2', MODULE, 'web', 'contracts', `${PAGE}.defs.ts.txt`);

interface FakeFile extends M12FileInfo {
  status: string;
  content: string;
  getContent(): Promise<string>;
  getValueInfo(): Promise<{ content: string }>;
}

function keyOf(info: M12FileInfo): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function fakeFile(info: M12FileInfo, content: string, status = 'changed'): FakeFile {
  const file: FakeFile = {
    ...info, status, content,
    getContent: async () => file.content,
    getValueInfo: async () => ({ content: file.content }),
  };
  return file;
}

function installStor(): void {
  const files: Record<string, FakeFile> = {};
  (globalThis as { mls: unknown }).mls = {
    actualProject: PROJECT,
    stor: {
      files,
      getKeyToFile: keyOf,
      addOrUpdateFile: async (params: M12FileInfo) => {
        const key = keyOf(params);
        const file = files[key] ?? fakeFile(params, '', 'new');
        files[key] = file;
        return file;
      },
      localStor: {
        setContent: async (file: FakeFile, value: { content?: string | null }) => { file.content = value.content ?? ''; return true; },
      },
    },
  };
}

function definition(artifactType: M1Definition['artifactType'], artifactId: string, data: Record<string, unknown>): M1Definition {
  return {
    schemaVersion: M1_DEFINITION_SCHEMA,
    artifactType,
    artifactId,
    moduleName: MODULE,
    status: 'generated',
    dependencies: [],
    data,
  };
}

function unit(layer: M12Unit['layer'], artifactType: M1Definition['artifactType'], folder: string, shortName: string): M12Unit {
  const def: M12FileInfo = { project: PROJECT, level: 1, folder, shortName, extension: '.defs.ts' };
  const output: M12FileInfo = { ...def, extension: '.ts' };
  const envelope = definition(artifactType, shortName, { pageId: PAGE });
  return {
    layer,
    unitId: shortName,
    def,
    defRef: fileRef(def),
    output,
    outputRef: fileRef(output),
    definition: envelope,
    declared: envelope,
    planIssue: '',
    text: '',
  };
}

void test('M12_SEED_MARKERS does not offer <seedSpare>', () => {
  assert.deepEqual([...M12_SEED_MARKERS], ['<seedRef>', '<seedValue>']);
});

void test('the tests gate refuses a case that still uses <seedSpare>', () => {
  const routes = [
    { route: 'm.p.load', kind: 'qry' as const, inputFields: ['id'] },
    { route: 'm.p.save', kind: 'cmd' as const, inputFields: ['name'] },
  ];
  const problems = testsGate([
    { id: 'm.p.load.ok', routine: 'm.p.load', params: { id: '<seedSpare>' }, paramFieldRefs: { id: 'Mesa.id' }, expect: { ok: true }, mutating: false },
    { id: 'm.p.save.ok', routine: 'm.p.save', params: { name: 'A' }, expect: { ok: true }, mutating: true },
  ], { routes, entities: ['Mesa'] });
  assert.ok(problems.some(item => item.includes('<seedSpare>') && item.includes('<seedRef>')), problems.join('\n'));
});

void test('the tests60 context of my_access_completion carries COUNTRY_NOT_IN_LIST with its ruleId', async () => {
  assert.equal(existsSync(REQUEST_TS), true, REQUEST_TS);
  assert.equal(existsSync(CONTRACT_TS), true, CONTRACT_TS);
  const requestSource = readFileSync(REQUEST_TS, 'utf8');
  const pairs = thrownErrorCodes(requestSource);
  assert.ok(pairs.some(item => item.code === 'COUNTRY_NOT_IN_LIST' && item.ruleId === 'countryFromModuleList'), JSON.stringify(pairs));

  installStor();
  const controller = unit('controllers', 'httpController', `${MODULE}/layer_1_external/adapters/http/controllers`, PAGE);
  const service = unit('requests', 'requestService', `${MODULE}/layer_2_application/requests`, PAGE);
  await writeText(contractFile(PROJECT, MODULE, PAGE), readFileSync(CONTRACT_TS, 'utf8'));
  await writeText(service.output, requestSource);
  const ctx = createContext({ project: PROJECT, module: MODULE, scope: MODULE, target: '', force: false }, [controller, service], 'presentation');
  const data = await loadTestsContext(ctx, controller);
  assert.match(data.human, /countryFromModuleList → COUNTRY_NOT_IN_LIST/);
});
