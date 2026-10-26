/// <mls fileReference="_102021_/l2/agentMaterializeL1/steps/usecases40/context.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import type { M12FileInfo } from '/_102021_/l2/agentMaterializeL1/helpers/m12Names.js';
import type { M12Unit } from '/_102021_/l2/agentMaterializeL1/helpers/m12Units.js';
import { loadUsecaseContext, usecaseAnswerProblems } from '/_102021_/l2/agentMaterializeL1/steps/usecases40/context.js';

const PROJECT = 102099;
const MODULE = 'fila';

function keyOf(info: M12FileInfo): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function ontology(value: unknown): string {
  return `export const definition = ${JSON.stringify(value)} as const;\n`;
}

const TAREFA_ONTOLOGY = ontology({
  title: 'Tarefa',
  record: { fields: { details: { fields: { atrasada: { type: 'boolean', derived: true } } } } },
});
const PARTICIPANTE_ONTOLOGY = ontology({
  title: 'Participante',
  subtype: 'Person',
  record: { fields: { details: { fields: { identification: { fields: { status: { type: 'string', derived: true } } } } } } },
});
const MDM_ONTOLOGY = ontology({
  groups: { identification: { fields: { name: { type: 'string' }, status: { type: 'string' } } } },
  subtypes: { Person: { fields: { privacyConsent: { type: 'boolean' } } } },
});
const RULES = `export const rules = ${JSON.stringify({ rules: { criadorPodeCriar: 'O participante que cria pode criar.' } })} as const;\n`;

function unit(artifactType: string, artifactId: string, data: Record<string, unknown>, outputRef: string, dependencies: string[] = []): M12Unit {
  const definition = { artifactType, artifactId, moduleName: MODULE, data, dependencies };
  return { definition, declared: definition, outputRef, defRef: outputRef.replace(/\.ts$/u, '.defs.ts'), output: { project: PROJECT, level: 1, folder: '', shortName: artifactId, extension: '.ts' } } as unknown as M12Unit;
}

test('an MDM entity a rule cites is read from the platform, and its derived fields are not gated', async () => {
  const previous = globalThis.mls;
  const rulesInfo: M12FileInfo = { project: PROJECT, level: 4, folder: MODULE, shortName: 'rules', extension: '.defs.ts' };
  const rulesFile = { ...rulesInfo, status: 'changed', getContent: async () => RULES, getValueInfo: async () => ({ content: RULES }) };
  (globalThis as { mls: unknown }).mls = {
    actualProject: PROJECT,
    stor: { files: { [keyOf(rulesInfo)]: rulesFile }, getKeyToFile: keyOf },
  };
  const files = new Map<string, string>([
    [`_${PROJECT}_/l4/${MODULE}/ontology/Tarefa.defs.ts`, TAREFA_ONTOLOGY],
    [`_${PROJECT}_/l4/${MODULE}/ontology/Participante.defs.ts`, PARTICIPANTE_ONTOLOGY],
    ['_102034_/l4/ontology/mdm.defs.ts', MDM_ONTOLOGY],
  ]);
  const read = async (ref: string) => files.get(ref) ?? null;
  const tarefaOntology = `_${PROJECT}_/l4/${MODULE}/ontology/Tarefa.defs.ts`;
  const participanteOntology = `_${PROJECT}_/l4/${MODULE}/ontology/Participante.defs.ts`;
  const usecase = unit('usecase', 'createTarefa', {
    usecaseId: 'createTarefa',
    entityId: 'Tarefa',
    operation: 'create',
    functions: [{ functionName: 'createTarefa', input: [{ name: 'titulo', type: 'string' }], output: [{ name: 'id', type: 'string' }] }],
    rulePlan: [{ ruleId: 'criadorPodeCriar', enforcement: 'local', origin: 'l4/fila/rules.defs.ts#criadorPodeCriar' }],
  }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/usecases/createTarefa.ts`, [tarefaOntology]);
  const tarefa = unit('domainEntity', 'tarefa', { entityId: 'Tarefa', storageTarget: 'moduleDatabase' }, `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/tarefa.ts`, [tarefaOntology]);
  const participante = unit('domainEntity', 'participante', { entityId: 'Participante', storageTarget: 'mdm' }, `_${PROJECT}_/l1/${MODULE}/layer_3_domain/entities/participante.ts`, [participanteOntology]);
  const port = unit('repositoryPort', 'tarefaRepository', { entityId: 'Tarefa', interfaceName: 'TarefaRepository' }, `_${PROJECT}_/l1/${MODULE}/layer_2_application/ports/tarefaRepository.ts`);
  const ctx = { run: { project: PROJECT, module: MODULE }, units: [usecase, tarefa, participante, port], read };
  try {
    const loaded = await loadUsecaseContext(ctx as never, usecase);
    const cited = loaded.human.split('## Entity cited by a rule: domainEntity participante')[1] ?? '';
    assert.ok(cited.length > 0, 'the cited MDM entity is in the context');
    assert.equal(cited.includes('through this port'), false);
    assert.match(cited, /Read it from the platform MDM; it has no repository port in this module\./u);
    assert.match(cited, /ctx\.mdm\.entity\.get\(\{ mdmId \}\)/u);
    assert.match(cited, /`details\.privacyConsent`/u);

    const header = loaded.header;
    const mdmRead = [
      header,
      "import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';",
      'export async function createTarefa(input: { titulo: string }, ctx: { mdm: { entity: { get(query: { mdmId: string }): Promise<{ details: { identification: { status: string } } }> } } }) {',
      '  const person = await ctx.mdm.entity.get({ mdmId: input.titulo });',
      '  const status = person.details.identification.status;',
      '  void status;',
      "  throw new AppError('X', 'y', 400, { ruleId: 'criadorPodeCriar' });",
      '}',
    ].join('\n');
    assert.deepEqual(await usecaseAnswerProblems(ctx as never, usecase, mdmRead, []), []);

    const storedRead = [
      header,
      "import { AppError } from '/_102034_/l1/server/layer_2_controllers/contracts.js';",
      'export async function createTarefa(input: { titulo: string }, ctx: unknown) {',
      '  const row = await tarefaRepository.get(input.titulo);',
      '  const late = row.details.atrasada;',
      '  void late;',
      "  throw new AppError('X', 'y', 400, { ruleId: 'criadorPodeCriar' });",
      '}',
    ].join('\n');
    const refused = await usecaseAnswerProblems(ctx as never, usecase, storedRead, []);
    assert.ok(refused.some(problem => problem.includes('details.atrasada')), refused.join('\n'));
  } finally {
    (globalThis as { mls: unknown }).mls = previous;
  }
});
