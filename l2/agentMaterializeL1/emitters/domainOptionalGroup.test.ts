/// <mls fileReference="_102021_/l2/agentMaterializeL1/emitters/domainOptionalGroup.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { parseDefinitionExport } from '/_102021_/l2/agentMaterializeL1/emitters/usecaseIntent.js';
import { domainOptionalPaths } from '/_102021_/l2/agentMaterializeL1/emitters/domainOptional.js';
import { emitDomain } from '/_102021_/l2/agentMaterializeL1/emitters/emit.js';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ENTITY = parseDefinitionExport(readFileSync(path.join(HERE, 'fixtures/telegramBotEntity.recorded.txt'), 'utf8'));
const ONTOLOGY = readFileSync(path.join(HERE, 'fixtures/telegramBotOntology.recorded.txt'), 'utf8');

void test('d1_320: an optional object with a required field inside is optional on an entity the module stores; the container stays', () => {
  assert.ok(ENTITY);
  const optional = domainOptionalPaths(ENTITY, ONTOLOGY);
  assert.ok(optional);
  assert.equal(optional.has('details.lastCheck'), true);
  assert.equal(optional.has('details.pause'), true);
  assert.equal(optional.has('details'), false, 'the details container of the record is always there');
  assert.equal(optional.has('details.accessKey'), false, 'a required field stays required');
  assert.equal(optional.has('details.lastCheck.checkedAt'), false, 'and inside the object the required field stays required');
  const source = emitDomain(ENTITY, '_102047_/l1/telegram/layer_3_domain/entities/telegramBot.ts', optional).source;
  assert.match(source, /lastCheck\?: \{/u);
  assert.match(source, /pause\?: \{/u);
  assert.match(source, /checkedAt: string;/u);
  assert.match(source, /details: \{/u);
});

void test('d1_320: an object the l4 requires is required; an MDM entity keeps the old rule (the engine shapes the group)', () => {
  const required = ONTOLOGY.replace(/("lastCheck": \{\s*"type": "object")/u, '$1,\n        "required": true');
  const optional = domainOptionalPaths(ENTITY as never, required);
  assert.ok(optional);
  assert.equal(optional.has('details.lastCheck'), false);
  assert.equal(optional.has('details.pause'), true);
  const mdm = { ...ENTITY, data: { ...(ENTITY as { data: Record<string, unknown> }).data, storageTarget: 'mdm' } } as never;
  assert.equal(domainOptionalPaths(mdm, ONTOLOGY)?.has('details.lastCheck'), false);
});
