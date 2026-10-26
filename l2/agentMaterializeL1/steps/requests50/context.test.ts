/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/requests50/context.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import type { M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { loadRequestContext } from '/_102021_/l2/agentMaterializeL1/steps/requests50/context.js';

const PROJECT = 102099;
const MODULE = 'fila';
const PAGE = 'minhas';

function keyOf(info: M12FileInfo): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function file(info: M12FileInfo, content: string) {
  return { ...info, status: 'changed', getContent: async () => content, getValueInfo: async () => ({ content }) };
}

function unit(artifactType: string, artifactId: string, data: Record<string, unknown>, outputRef: string, dependencies: string[] = []): M12Unit {
  const definition = { artifactType, artifactId, moduleName: MODULE, data, dependencies };
  const output = { project: PROJECT, level: 1, folder: '', shortName: artifactId, extension: '.ts' };
  return { definition, declared: definition, outputRef, defRef: outputRef.replace(/\.ts$/u, '.defs.ts'), output, unitId: artifactId } as unknown as M12Unit;
}

const CONTRACT = `
export interface MinhasContracts {
  '${MODULE}.${PAGE}.abertas': { kind: 'qry'; input: {}; output: { title: string } };
  '${MODULE}.${PAGE}.notas': { kind: 'qry'; input: {}; output: { note: string } };
}
`;

const DOC = { raw: 'DOC_RAW_UNIQUE', purpose: 'DOC_PURPOSE_UNIQUE', input: 'DOC_INPUT_UNIQUE', processing: 'DOC_PROCESSING_UNIQUE', output: 'DOC_OUTPUT_UNIQUE' };

test('the request prompt drops route docs, compacts equal output fields, lists every usecase signature, and drops the def on repair', async () => {
  const previous = globalThis.mls;
  const contractInfo: M12FileInfo = { project: PROJECT, level: 2, folder: `${MODULE}/web/contracts`, shortName: PAGE, extension: '.defs.ts' };
  const listed = unit('usecase', 'listAbertas', { usecaseId: 'listAbertas', entityId: 'Tarefa' }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/listAbertas.ts`);
  const depended = unit('usecase', 'listNotas', { usecaseId: 'listNotas', entityId: 'Nota' }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/listNotas.ts`);
  const unused = unit('usecase', 'archiveTudo', { usecaseId: 'archiveTudo', entityId: 'Arquivo' }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/archiveTudo.ts`);
  const request = unit('requestService', PAGE, {
    pageId: PAGE,
    requests: [
      {
        route: `${MODULE}.${PAGE}.abertas`,
        doc: DOC,
        uses: ['listAbertas'],
        output: [{ kind: 'entity', path: 'title', entity: 'Task', fields: [{ field: 'title', path: 'title' }, { field: 'unresolved', path: 'title' }, { field: 'note', path: 'body' }] }],
      },
      {
        route: `${MODULE}.${PAGE}.notas`,
        doc: DOC,
        uses: [],
        output: [{ kind: 'entity', path: 'note', entity: 'Nota', fields: [{ field: 'note', path: 'note' }] }],
      },
    ],
  }, `_${PROJECT}_/l1/${MODULE}/layer_1_external/requests/${PAGE}.ts`, [depended.defRef]);
  const tarefa = unit('domainEntity', 'tarefa', { entityId: 'task' }, `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/tarefa.ts`);
  const nota = unit('domainEntity', 'nota', { entityId: 'Nota' }, `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/nota.ts`);
  const arquivo = unit('domainEntity', 'arquivo', { entityId: 'Arquivo' }, `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/arquivo.ts`);
  const listedInfo = listed.output;
  const dependedInfo = depended.output;
  const unusedInfo = unused.output;
  (globalThis as { mls: unknown }).mls = {
    actualProject: PROJECT,
    stor: {
      files: {
        [keyOf(contractInfo)]: file(contractInfo, CONTRACT),
        [keyOf(listedInfo)]: file(listedInfo, 'export async function listAbertas(input: { title: string }): Promise<{ title: string }> { return input; }\n'),
        [keyOf(dependedInfo)]: file(dependedInfo, 'export async function listNotas(input: { note: string }): Promise<{ note: string }> { return input; }\n'),
        [keyOf(unusedInfo)]: file(unusedInfo, 'export async function archiveTudo(input: { id: string }): Promise<{ id: string }> { return input; }\n'),
      },
      getKeyToFile: keyOf,
    },
  };
  const files = new Map<string, string>([
    [`_${PROJECT}_/l4/${MODULE}/ontology/task.defs.ts`, 'export const taskOntology = true;\n'],
    [`_${PROJECT}_/l4/${MODULE}/ontology/Nota.defs.ts`, 'export const notaOntology = true;\n'],
    [`_${PROJECT}_/l4/${MODULE}/ontology/Arquivo.defs.ts`, 'export const arquivoOntology = true;\n'],
  ]);
  const read = async (ref: string) => files.get(ref) ?? null;
  const ctx = { run: { project: PROJECT, module: MODULE }, units: [request, listed, depended, unused, tarefa, nota, arquivo], read };
  try {
    const loaded = await loadRequestContext(ctx as never, request);
    const human = loaded.human;
    assert.equal(human.includes('DOC_RAW_UNIQUE'), false);
    assert.equal(human.includes('DOC_PURPOSE_UNIQUE'), false);
    assert.match(human, /An output entry written as plain text has field equal to path, and the doc of each route is in the contract\./u);
    assert.match(human, /\["title",\{"field":"unresolved","path":"title"\},\{"field":"note","path":"body"\}\]/u);
    assert.equal(human.includes('"field":"title"'), false);
    assert.match(human, /export async function listAbertas/u);
    assert.match(human, /export async function listNotas/u);
    assert.match(human, /export async function archiveTudo/u);
    assert.match(human, /ontology\/task\.defs\.ts/u);
    assert.match(human, /ontology\/Nota\.defs\.ts/u);
    assert.equal(human.includes('ontology/Arquivo.defs.ts'), false);
    assert.equal(JSON.stringify(request.definition.data).includes('DOC_PURPOSE_UNIQUE'), true);
    const repaired = await loadRequestContext(ctx as never, request, { problems: ['PROBLEM_UNIQUE'], previous: 'export const previousAnswer = true;\n' });
    assert.equal(repaired.human.includes('Request service def'), false);
    assert.equal(repaired.human.includes('DOC_PURPOSE_UNIQUE'), false);
    assert.match(repaired.human, /The route hints were in the first request; your previous answer already follows them\./u);
    assert.match(repaired.human, /PROBLEM_UNIQUE/u);
    assert.match(repaired.human, /export const previousAnswer = true/u);
    assert.match(repaired.human, /export async function archiveTudo/u);
  } finally {
    (globalThis as { mls: unknown }).mls = previous;
  }
});
